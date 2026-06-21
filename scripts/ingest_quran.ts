/**
 * ingest_quran.ts — Quran Ingestion Pipeline for D1 + Vectorize
 *
 * Usage:
 *   npx tsx scripts/ingest_quran.ts              # local (wrangler dev)
 *   npx tsx scripts/ingest_quran.ts --env production  # remote D1
 *
 * What it does:
 * 1. Fetches 6236 verses from quran.com API
 * 2. Inserts surahs + verses into D1
 * 3. Generates embeddings via Workers AI @cf/baai/bge-small-en-v1.5
 * 4. Stores vectors in Vectorize index: axiomid-search
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN in env
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const QURAN_API = "https://api.quran.com/api/v4";
const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
const BATCH_SIZE = 50; // verses per batch for embedding
const VECTORIZE_INDEX = "axiomid-search";

interface Surah {
  id: number;
  name_arabic: string;
  name_english: string;
  number_of_ayahs: number;
  revelation_type: string;
}

interface Verse {
  id: number;
  verse_key: string; // "1:1"
  text_uthmani: string;
}

// ─── Step 1: Fetch Surahs ────────────────────────────────────────────────────

async function fetchSurahs(): Promise<Surah[]> {
  console.log("📖 Fetching surah list...");
  const res = await fetch(`${QURAN_API}/chapters`);
  if (!res.ok) throw new Error(`Failed to fetch surahs: ${res.status}`);
  const data = (await res.json()) as { chapters: Surah[] };
  return data.chapters.map((c) => ({
    id: c.id,
    name_arabic: c.name_arabic,
    name_english: c.name_english,
    number_of_ayahs: c.number_of_ayahs,
    revelation_type: c.revelation_type,
  }));
}

// ─── Step 2: Fetch Verses (all 6236) ─────────────────────────────────────────

async function fetchVerses(): Promise<Verse[]> {
  console.log("📄 Fetching all verses...");
  const verses: Verse[] = [];
  // quran.com API paginates at 50 verses per page
  const totalPages = Math.ceil(6236 / 50);

  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(
      `${QURAN_API}/verses/uthmani?page=${page}&per_page=50`
    );
    if (!res.ok) throw new Error(`Failed to fetch verses page ${page}: ${res.status}`);
    const data = (await res.json()) as { verses: Verse[] };
    verses.push(...data.verses);
    if (page % 10 === 0) console.log(`  → ${verses.length}/6236 verses fetched`);
  }

  console.log(`  ✓ ${verses.length} verses fetched`);
  return verses;
}

// ─── Step 3: Fetch English Translations ───────────────────────────────────────

async function fetchTranslations(verseIds: number[]): Promise<Map<number, string>> {
  console.log("🌐 Fetching English translations...");
  const translations = new Map<number, string>();
  const totalPages = Math.ceil(verseIds.length / 50);

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * 50;
    const batch = verseIds.slice(start, start + 50);

    const res = await fetch(
      `${QURAN_API}/quran/translations/131?verse_key=${batch.map((_, i) => {
        const verse = { id: batch[i] };
        return `${Math.floor((verse.id - 1) / 10) + 1}:${((verse.id - 1) % 10) + 1}`;
      }).join(",")}`
    ).catch(() => null);

    // Fallback: fetch individually if batch fails
    if (!res || !res.ok) {
      for (const verseId of batch) {
        const surah = Math.floor((verseId - 1) / 10) + 1;
        const verse = ((verseId - 1) % 10) + 1;
        try {
          const r = await fetch(
            `${QURAN_API}/quran/translations/131?verse_key=${surah}:${verse}`
          );
          if (r.ok) {
            const d = (await r.json()) as { translations: { text: string }[] };
            if (d.translations?.[0]) {
              translations.set(verseId, d.translations[0].text);
            }
          }
        } catch { /* skip */ }
      }
    }

    if (page % 10 === 0) console.log(`  → ${translations.size}/${verseIds.length} translations`);
  }

  console.log(`  ✓ ${translations.size} translations fetched`);
  return translations;
}

// ─── Step 4: Generate Embeddings ──────────────────────────────────────────────

async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  console.log(`🧠 Generating embeddings for ${texts.length} texts...`);
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    // Workers AI run via wrangler REST API
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: batch }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Embedding failed at batch ${i}: ${err}`);
    }

    const data = (await res.json()) as { result: number[][] };
    embeddings.push(...data.result);

    if (Math.floor(i / BATCH_SIZE) % 10 === 0) {
      console.log(`  → ${embeddings.length}/${texts.length} embeddings`);
    }
  }

  console.log(`  ✓ ${embeddings.length} embeddings generated`);
  return embeddings;
}

// ─── Step 5: Insert into D1 ───────────────────────────────────────────────────

function insertD1(surahs: Surah[], verses: Verse[], translations: Map<number, string>, remote: boolean) {
  const flag = remote ? "--remote" : "";
  const db = "iqra-db";

  console.log("💾 Inserting surahs into D1...");
  for (const s of surahs) {
    const sql = `INSERT OR IGNORE INTO quran_surahs (id, name_ar, name_en, ayat_count, revelation_type) VALUES (${s.id}, '${s.name_arabic.replace(/'/g, "''")}', '${s.name_english.replace(/'/g, "''")}', ${s.number_of_ayahs}, '${s.revelation_type}')`;
    execSync(`wrangler d1 execute ${db} ${flag} --command "${sql}"`, { stdio: "pipe" });
  }
  console.log(`  ✓ ${surahs.length} surahs inserted`);

  console.log("💾 Inserting verses into D1...");
  let inserted = 0;
  for (const v of verses) {
    const [surahNum, verseNum] = v.verse_key.split(":").map(Number);
    const translation = translations.get(v.id) || "";
    const text = v.text_uthmani.replace(/'/g, "''");
    const trans = translation.replace(/'/g, "''");
    const juz = Math.ceil(surahNum / 4); // simplified juz mapping

    const sql = `INSERT OR IGNORE INTO quran_verses (id, surah_id, verse_number, text_ar, text_en, juz, embedding_id) VALUES (${v.id}, ${surahNum}, ${verseNum}, '${text}', '${trans}', ${juz}, NULL)`;
    execSync(`wrangler d1 execute ${db} ${flag} --command "${sql}"`, { stdio: "pipe" });
    inserted++;
    if (inserted % 500 === 0) console.log(`  → ${inserted}/${verses.length} verses`);
  }
  console.log(`  ✓ ${inserted} verses inserted`);
}

// ─── Step 6: Store Vectors in Vectorize ───────────────────────────────────────

function storeVectors(
  verses: Verse[],
  embeddings: number[][],
  remote: boolean
) {
  const flag = remote ? "--remote" : "";

  console.log("🔮 Storing vectors in Vectorize...");
  const vectors = verses.map((v, i) => ({
    id: `verse-${v.id}`,
    values: embeddings[i],
    namespace: "quran",
    metadata: {
      verse_key: v.verse_key,
      verse_id: v.id,
    },
  }));

  // Vectorize batch upsert via wrangler
  const batchFile = "/tmp/vectorize-batch.json";
  writeFileSync(batchFile, JSON.stringify({ vectors }));

  execSync(
    `wrangler vectorize insert ${VECTORIZE_INDEX} ${flag} --file ${batchFile}`,
    { stdio: "pipe" }
  );

  unlinkSync(batchFile);
  console.log(`  ✓ ${vectors.length} vectors stored`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const remote = process.argv.includes("--env") && process.argv.includes("production");
  console.log(`\n🕌 IQRA Quran Ingestion Pipeline`);
  console.log(`   Mode: ${remote ? "PRODUCTION (remote D1)" : "LOCAL (dev D1)"}`);
  console.log(`   Model: ${EMBEDDING_MODEL}`);
  console.log(`   Index: ${VECTORIZE_INDEX}\n`);

  // Fetch
  const surahs = await fetchSurahs();
  const verses = await fetchVerses();
  const translations = await fetchTranslations(verses.map((v) => v.id));

  // Generate embeddings (uses English translation text for semantic search)
  const textsToEmbed = verses.map((v) => {
    const translation = translations.get(v.id) || "";
    return `${v.text_uthmani} ${translation}`;
  });
  const embeddings = await generateEmbeddings(textsToEmbed);

  // Store
  insertD1(surahs, verses, translations, remote);
  storeVectors(verses, embeddings, remote);

  console.log("\n✅ Ingestion complete!");
  console.log(`   ${surahs.length} surahs, ${verses.length} verses, ${embeddings.length} vectors`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
