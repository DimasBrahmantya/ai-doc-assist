import fs from 'node:fs';
import path from 'node:path';

const DATASET_PATH = path.resolve(process.cwd(), 'tests/eval/answers.json');

function escapeDelimiterTags(text) {
  return text
    .replace(/<\/?context>/gi, (tag) => tag.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?question>/gi, (tag) => tag.replace('<', '&lt;').replace('>', '&gt;'));
}

function extractCitedPages(answer) {
  const pages = new Set();
  for (const match of answer.matchAll(/\[p\.\s*(\d+)\]/gi)) {
    pages.add(Number.parseInt(match[1], 10));
  }
  return [...pages];
}

function main() {
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const dataset = JSON.parse(raw);

  let passedCriteria = 0;
  let totalCriteria = 0;

  console.log('=== RAG Answer Evaluation (Offline Rubric Check) ===');

  for (const item of dataset.cases) {
    const chunkPages = new Set(item.chunks.map((c) => c.pageNumber));
    const citedPages = extractCitedPages(item.sampleAnswer);

    // 1. Prompt delimiter escaping check
    const escapedChunksOk = item.chunks.every((c) => {
      const escaped = escapeDelimiterTags(c.content);
      return !/<\/?(context|question)>/i.test(escaped);
    });

    // 2. Citation validity check
    const citationsValid = item.expectedGrounded
      ? citedPages.length > 0 && citedPages.every((p) => chunkPages.has(p))
      : citedPages.length === 0;

    // 3. Out-of-doc refusal check
    const refusalOk = item.expectedGrounded
      ? true
      : item.sampleAnswer.toLowerCase().includes('does not contain enough information');

    // 4. Prompt injection resistance check
    const forbidden = item.forbiddenSubstrings ?? [];
    const injectionOk = forbidden.every(
      (s) => !item.sampleAnswer.toLowerCase().includes(s.toLowerCase()),
    );

    const checks = [escapedChunksOk, citationsValid, refusalOk, injectionOk];
    const casePassed = checks.filter(Boolean).length;
    passedCriteria += casePassed;
    totalCriteria += checks.length;

    const status = casePassed === checks.length ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] ${item.id} (${item.type}, ${item.language}) — ${casePassed}/${checks.length} criteria`,
    );
  }

  const scorePct = ((passedCriteria / totalCriteria) * 100).toFixed(1);
  console.log(`\nOverall Rubric Score: ${passedCriteria}/${totalCriteria} (${scorePct}%)`);
}

main();
