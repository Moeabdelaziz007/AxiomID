/**
 * ingest_truth.ts — Truth Ingestion Pipeline for D1 + Vectorize
 *
 * Usage:
 *   cd backend && npx wrangler d1 execute truth-db --remote --file ...
 *
 * What it does:
 * 1. Fetches 6236 verses from quran.com API
 * 2. Writes batch SQL for D1 insertion
 * 3. Generates embeddings via Workers AI @cf/baai/bge-base-en-v1.5
 * 4. Stores vectors in Vectorize index: axiomid-truth
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN for embeddings
 * D1 uses wrangler OAuth (wrangler login)
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";

const TRUTH_API = "https://api.quran.com/api/v4";
const WORKER_URL = "https://axiomid-backend.amrikyy.workers.dev";
const SHARED_SECRET = process.env.SHARED_SECRET_TOKEN_VERCEL_CF || "";
const BATCH_SIZE = 50;
const VECTORIZE_INDEX = "axiomid-truth";
const WORK_DIR = "/tmp/truth-ingest";

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
  const data = (await res.json()) as {
    chapters: {
      id: number;
      name_arabic: string;
      translated_name: { name: string };
      verses_count: number;
      revelation_place: string;
    }[];
  };
  return data.chapters.map((c) => ({
    id: c.id,
    name_arabic: c.name_arabic,
    name_english: c.translated_name.name,
    number_of_ayahs: c.verses_count,
    revelation_type: c.revelation_place,
  }));
}

async function fetchVerses(): Promise<VerseEntry[]> {
  console.log("Fetching all verses...");
  const verses: VerseEntry[] = [];
  const totalPages = 604;

  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(
      `${TRUTH_API}/verses/by_page/${page}?per_page=20&fields=text_uthmani`
    );
    if (!res.ok) throw new Error(`Failed to fetch verses page ${page}: ${res.status}`);
    const data = (await res.json()) as { verses: { id: number; verse_key: string; text_uthmani: string }[] };
    for (const v of data.verses) {
      verses.push({ id: v.id, verse_key: v.verse_key, text_uthmani: v.text_uthmani });
    }
    if (page % 50 === 0) console.log(`  -> ${verses.length}/6236 verses fetched`);
  }

  console.log(`  OK ${verses.length} verses fetched`);
  return verses;
}

async function fetchTranslations(): Promise<string[]> {
  console.log("Fetching translations...");
  const res = await fetch(`${TRUTH_API}/quran/translations/19?page=1&per_page=7000`);
  if (!res.ok) throw new Error(`Failed to fetch translations: ${res.status}`);
  const data = (await res.json()) as { translations: { text: string }[] };
  const texts = data.translations.map((t) => t.text);
  console.log(`  OK ${texts.length} translations fetched`);
  return texts;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`Generating embeddings for ${texts.length} texts via Worker...`);
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${WORKER_URL}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shared-Secret": SHARED_SECRET,
      },
      body: JSON.stringify({ texts: batch }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Embedding failed at batch ${i}: ${err}`);
    }

    const body = (await res.json()) as { embeddings: number[][] };
    embeddings.push(...body.embeddings);

    if (Math.floor(i / BATCH_SIZE) % 10 === 0) {
      console.log(`  -> ${embeddings.length}/${texts.length} embeddings`);
    }
  }

  console.log(`  OK ${embeddings.length} embeddings generated`);
  return embeddings;
}

function esc(s: string): string {
  return (s || "").replace(/'/g, "''");
}

function writeBatchSql(chapters: Chapter[], verses: VerseEntry[], translations: string[]): string[] {
  const files: string[] = [];

  // Chapters batch
  let sql = "";
  for (const c of chapters) {
    sql += `INSERT OR IGNORE INTO truth_chapters (id, name_ar, name_en, verse_count, revelation_type) VALUES (${c.id}, '${esc(c.name_arabic)}', '${esc(c.name_english)}', ${c.number_of_ayahs}, '${c.revelation_type}');\n`;
  }
  const chapterFile = `${WORK_DIR}/chapters.sql`;
  writeFileSync(chapterFile, sql);
  files.push(chapterFile);
  console.log(`  Wrote ${chapters.length} chapter inserts to ${chapterFile}`);

  // Verses in batches of 500
  const VERSE_BATCH = 500;
  for (let i = 0; i < verses.length; i += VERSE_BATCH) {
    const batch = verses.slice(i, i + VERSE_BATCH);
    let vsql = "";
    for (const v of batch) {
      const [chapterNum, verseNum] = v.verse_key.split(":").map(Number);
      const translation = translations[v.id - 1] || "";
      const text = esc(v.text_uthmani);
      const trans = esc(translation);
      const section = Math.ceil(chapterNum / 4);
      vsql += `INSERT OR IGNORE INTO truth_verses (id, chapter_id, verse_number, text_ar, text_en, section, embedding_id) VALUES (${v.id}, ${chapterNum}, ${verseNum}, '${text}', '${trans}', ${section}, NULL);\n`;
    }
    const vFile = `${WORK_DIR}/verses_${Math.floor(i / VERSE_BATCH)}.sql`;
    writeFileSync(vFile, vsql);
    files.push(vFile);
  }
  console.log(`  Wrote ${Math.ceil(verses.length / VERSE_BATCH)} verse batch files`);

  return files;
}

function executeD1Batch(files: string[], remote: boolean) {
  const flag = remote ? "--remote" : "";
  for (const f of files) {
    console.log(`  Executing ${f}...`);
    execSync(`cd backend && npx wrangler d1 execute truth-db ${flag} --file ${f}`, { stdio: "pipe" });
  }
}

function storeVectors(verses: VerseEntry[], embeddings: number[][]) {
  console.log("Storing vectors in Vectorize...");

  // Vectorize max 1000 vectors per batch
  const VEC_BATCH = 1000;
  for (let i = 0; i < verses.length; i += VEC_BATCH) {
    const batchVerses = verses.slice(i, i + VEC_BATCH);
    const batchEmbeddings = embeddings.slice(i, i + VEC_BATCH);

    const vectors = batchVerses.map((v, j) => ({
      id: `verse-${v.id}`,
      values: batchEmbeddings[j],
      namespace: "truth",
      metadata: {
        verse_key: v.verse_key,
        verse_id: v.id,
      },
    }));

    const batchFile = `${WORK_DIR}/vectors_${Math.floor(i / VEC_BATCH)}.json`;
    const ndjson = vectors.map((v) => JSON.stringify(v)).join("\n");
    writeFileSync(batchFile, ndjson);

    execSync(
      `cd backend && npx wrangler vectorize insert ${VECTORIZE_INDEX} --file ${batchFile}`,
      { stdio: "pipe" }
    );

    unlinkSync(batchFile);
    if (Math.floor(i / VEC_BATCH) % 5 === 0) {
      console.log(`  -> ${Math.min(i + VEC_BATCH, verses.length)}/${verses.length} vectors`);
    }
  }

  console.log(`  OK ${verses.length} vectors stored`);
}

async function main() {
  const remote = process.argv.includes("--env") && process.argv.includes("production");

  console.log(`\nTRUTH Ingestion Pipeline`);
  console.log(`   Mode: ${remote ? "PRODUCTION (remote D1)" : "LOCAL (dev D1)"}`);
  console.log(`   Index: ${VECTORIZE_INDEX}\n`);

  mkdirSync(WORK_DIR, { recursive: true });

  const chapters = await fetchChapters();
  const verses = await fetchVerses();
  const translations = await fetchTranslations();

  console.log("\nWriting batch SQL files...");
  const sqlFiles = writeBatchSql(chapters, verses, translations);

  if (remote) {
    console.log("\nExecuting D1 batch inserts...");
    executeD1Batch(sqlFiles, remote);
  } else {
    console.log("\nSkipping D1 inserts (local mode not supported, use --env production)");
  }

  const textsToEmbed = verses.map((v) => {
    const translation = translations[v.id - 1] || "";
    return `${v.text_uthmani} ${translation}`;
  });
  const embeddings = await generateEmbeddings(textsToEmbed);
  storeVectors(verses, embeddings);

  console.log("\nIngestion complete!");
  console.log(`   ${chapters.length} chapters, ${verses.length} verses, ${embeddings.length} vectors`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
