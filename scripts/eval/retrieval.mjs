import fs from 'node:fs';
import path from 'node:path';

const DATASET_PATH = path.resolve(process.cwd(), 'tests/eval/retrieval.json');

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function lexicalCosine(queryTokens, docTokens) {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;
  const qFreq = new Map();
  for (const t of queryTokens) qFreq.set(t, (qFreq.get(t) ?? 0) + 1);
  const dFreq = new Map();
  for (const t of docTokens) dFreq.set(t, (dFreq.get(t) ?? 0) + 1);

  let dot = 0;
  let qNorm = 0;
  let dNorm = 0;

  for (const [term, count] of qFreq.entries()) {
    qNorm += count * count;
    dot += count * (dFreq.get(term) ?? 0);
  }
  for (const count of dFreq.values()) {
    dNorm += count * count;
  }

  if (qNorm === 0 || dNorm === 0) return 0;
  return dot / (Math.sqrt(qNorm) * Math.sqrt(dNorm));
}

function main() {
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const dataset = JSON.parse(raw);

  const docsById = new Map(dataset.documents.map((d) => [d.id, d]));
  const total = dataset.questions.length;

  let hit1 = 0;
  let hit3 = 0;
  let hit6 = 0;
  let rrSum = 0;

  for (const item of dataset.questions) {
    const doc = docsById.get(item.documentId);
    if (!doc) {
      throw new Error(`Missing document "${item.documentId}" for ${item.id}`);
    }

    const qTokens = tokenize(item.question);
    const ranked = doc.pages
      .map((p) => ({
        page: p.page,
        score: lexicalCosine(qTokens, tokenize(p.content)),
      }))
      .sort((a, b) => b.score - a.score);

    const expected = new Set(item.expectedPages);
    const top1 = ranked.slice(0, 1).some((r) => expected.has(r.page));
    const top3 = ranked.slice(0, 3).some((r) => expected.has(r.page));
    const top6 = ranked.slice(0, 6).some((r) => expected.has(r.page));

    if (top1) hit1 += 1;
    if (top3) hit3 += 1;
    if (top6) hit6 += 1;

    const firstRankIdx = ranked.findIndex((r) => expected.has(r.page));
    if (firstRankIdx !== -1) {
      rrSum += 1 / (firstRankIdx + 1);
    }
  }

  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  console.log('=== RAG Retrieval Evaluation (Offline Lexical Baseline) ===');
  console.log(`Questions : ${total}`);
  console.log(`hit@1     : ${hit1}/${total} (${pct(hit1)})`);
  console.log(`hit@3     : ${hit3}/${total} (${pct(hit3)})`);
  console.log(`hit@6     : ${hit6}/${total} (${pct(hit6)})`);
  console.log(`MRR       : ${(rrSum / total).toFixed(4)}`);
  console.log(
    '\nNote: Replace lexical scorer with Gemini embeddings + Supabase match_document_chunks for live pgvector benchmarking.',
  );
}

main();
