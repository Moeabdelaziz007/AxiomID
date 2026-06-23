/**
 * ingest_truth.ts — Truth Ingestion Pipeline for D1 + Vectorize
 *
 * Usage:
 *   npx tsx scripts/ingest_truth.ts              # local (wrangler dev)
 *   npx tsx scripts/ingest_truth.ts --env production  # remote D1
 *
 * What it does:
 * 1. Fetches 6236 verses from external API
 * 2. Inserts chapters + verses into D1
 * 3. Generates embeddings via Workers AI @cf/baai/bge-small-en-v1.5
 * 4. Stores vectors in Vectorize index: axiomid-truth
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN in env
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const TRUTH_API = "https://api.quran.com/api/v4";
const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
const BATCH_SIZE = 50;
const VECTORIZE_INDEX = "axiomid-truth";

interface Chapter {
  id: number;
  name_arabic: string;
  name_english: string;
  number_of_ayahs: number;
  revelation_type: string;
}

interface VerseEntry {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

async function fetchChapters(): Promise<Chapter[]> {
  console.log("Fetching chapter list...");
  const res = await fetch(`${TRUTH_API}/chapters`);
  if (!res.ok) throw new Error(`Failed to fetch chapters: ${res.status}`);
  const data = (await res.json()) as { chapters: Chapter[] };
  return data.chapters.map((c) => ({
    id: c.id,
    name_arabic: c.name_arabic,
    name_english: c.name_english,
    number_of_ayahs: c.number_of_ayahs,
    revelation_type: c.revelation_type,
  }));
}

async function fetchVerses(): Promise<VerseEntry[]> {
  console.log("Fetching all verses...");
  const verses: VerseEntry[] = [];
  const totalPages = Math.ceil(6236 / 50);

  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(
      `${TRUTH_API}/verses/uthmani?page=${page}&per_page=50`
    );
    if (!res.ok) throw new Error(`Failed to fetch verses page ${page}: ${res.status}`);
    const data = (await res.json()) as { verses: VerseEntry[] };
    verses.push(...data.verses);
    if (page % 10 === 0) console.log(`  -> ${verses.length}/6236 verses fetched`);
  }

  console.log(`  OK ${verses.length} verses fetched`);
  return verses;
}

async function fetchTranslations(verseIds: number[]): Promise<Map<number, string>> {
  console.log("Fetching translations...");
  const translations = new Map<number, string>();
  const totalPages = Math.ceil(verseIds.length / 50);

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * 50;
    const batch = verseIds.slice(start, start + 50);

    const res = await fetch(
      `${TRUTH_API}/quran/translations/131?verse_key=${batch.map((_, i) => {
        const v = { id: batch[i] };
        return `${Math.floor((v.id - 1) / 10) + 1}:${((v.id - 1) % 10) + 1}`;
      }).join(",")}`
    ).catch(() => null);

    if (!res || !res.ok) {
      for (const verseId of batch) {
        const chapter = Math.floor((verseId - 1) / 10) + 1;
        const verse = ((verseId - 1) % 10) + 1;
        try {
          const r = await fetch(
            `${TRUTH_API}/quran/translations/131?verse_key=${chapter}:${verse}`
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

    if (page % 10 === 0) console.log(`  -> ${translations.size}/${verseIds.length} translations`);
  }

  console.log(`  OK ${translations.size} translations fetched`);
  return translations;
}

async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  console.log(`Generating embeddings for ${texts.length} texts...`);
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

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
      console.log(`  -> ${embeddings.length}/${texts.length} embeddings`);
    }
  }

  console.log(`  OK ${embeddings.length} embeddings generated`);
  return embeddings;
}

function insertD1(chapters: Chapter[], verses: VerseEntry[], translations: Map<number, string>, remote: boolean) {
  const flag = remote ? "--remote" : "";
  const db = "truth-db";

  console.log("Inserting chapters into D1...");
  for (const c of chapters) {
    const sql = `INSERT OR IGNORE INTO truth_chapters (id, name_ar, name_en, verse_count, revelation_type) VALUES (${c.id}, '${c.name_arabic.replace(/'/g, "''")}', '${c.name_english.replace(/'/g, "''")}', ${c.number_of_ayahs}, '${c.revelation_type}')`;
    execSync(`wrangler d1 execute ${db} ${flag} --command "${sql}"`, { stdio: "pipe" });
  }
  console.log(`  OK ${chapters.length} chapters inserted`);

  console.log("Inserting verses into D1...");
  let inserted = 0;
  for (const v of verses) {
    const [chapterNum, verseNum] = v.verse_key.split(":").map(Number);
    const translation = translations.get(v.id) || "";
    const text = v.text_uthmani.replace(/'/g, "''");
    const trans = translation.replace(/'/g, "''");
    const section = Math.ceil(chapterNum / 4);

    const sql = `INSERT OR IGNORE INTO truth_verses (id, chapter_id, verse_number, text_ar, text_en, section, embedding_id) VALUES (${v.id}, ${chapterNum}, ${verseNum}, '${text}', '${trans}', ${section}, NULL)`;
    execSync(`wrangler d1 execute ${db} ${flag} --command "${sql}"`, { stdio: "pipe" });
    inserted++;
    if (inserted % 500 === 0) console.log(`  -> ${inserted}/${verses.length} verses`);
  }
  console.log(`  OK ${inserted} verses inserted`);
}

function storeVectors(
  verses: VerseEntry[],
  embeddings: number[][],
  remote: boolean
) {
  const flag = remote ? "--remote" : "";

  console.log("Storing vectors in Vectorize...");
  const vectors = verses.map((v, i) => ({
    id: `verse-${v.id}`,
    values: embeddings[i],
    namespace: "truth",
    metadata: {
      verse_key: v.verse_key,
      verse_id: v.id,
    },
  }));

  const batchFile = "/tmp/vectorize-batch.json";
  writeFileSync(batchFile, JSON.stringify({ vectors }));

  execSync(
    `wrangler vectorize insert ${VECTORIZE_INDEX} ${flag} --file ${batchFile}`,
    { stdio: "pipe" }
  );

  unlinkSync(batchFile);
  console.log(`  OK ${vectors.length} vectors stored`);
}

async function main() {
  const remote = process.argv.includes("--env") && process.argv.includes("production");
  console.log(`\nTRUTH Ingestion Pipeline`);
  console.log(`   Mode: ${remote ? "PRODUCTION (remote D1)" : "LOCAL (dev D1)"}`);
  console.log(`   Model: ${EMBEDDING_MODEL}`);
  console.log(`   Index: ${VECTORIZE_INDEX}\n`);

  const chapters = await fetchChapters();
  const verses = await fetchVerses();
  const translations = await fetchTranslations(verses.map((v) => v.id));

  const textsToEmbed = verses.map((v) => {
    const translation = translations.get(v.id) || "";
    return `${v.text_uthmani} ${translation}`;
  });
  const embeddings = await generateEmbeddings(textsToEmbed);

  insertD1(chapters, verses, translations, remote);
  storeVectors(verses, embeddings, remote);

  console.log("\nIngestion complete!");
  console.log(`   ${chapters.length} chapters, ${verses.length} verses, ${embeddings.length} vectors`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
