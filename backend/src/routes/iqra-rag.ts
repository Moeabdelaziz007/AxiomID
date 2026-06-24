/**
 * iqra-rag.ts — DEPRECATED.
 *
 * The IQRA Quran RAG endpoint has been superseded by the Truth RAG pipeline in
 * `truth-rag.ts`. This module is retained only as a thin compatibility shim so
 * any lingering imports keep resolving; it forwards to the new handlers.
 *
 * TODO: delete this file once no imports remain (`git rm`).
 */

export { handleTruthAsk as handleIqraAsk, handleDailyTruth as handleDailyAyah } from "./truth-rag";
