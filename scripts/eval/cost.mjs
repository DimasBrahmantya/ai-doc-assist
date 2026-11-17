import fs from 'node:fs';
import path from 'node:path';

const DATASET_PATH = path.resolve(process.cwd(), 'tests/eval/cost-samples.json');

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(idx, sortedValues.length - 1))];
}

function main() {
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const data = JSON.parse(raw);
  const { pricingPerMillionTokensUsd: rates, requests } = data;

  const totals = requests.map((r) => r.totalMs).sort((a, b) => a - b);
  const embeds = requests.map((r) => r.embedMs).sort((a, b) => a - b);
  const searches = requests.map((r) => r.searchMs).sort((a, b) => a - b);
  const generates = requests.map((r) => r.generateMs).sort((a, b) => a - b);

  let totalCostUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalEmbeddingTokens = 0;

  for (const r of requests) {
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    totalEmbeddingTokens += r.embeddingTokens;

    const reqCost =
      (r.inputTokens / 1_000_000) * rates.chatInput +
      (r.outputTokens / 1_000_000) * rates.chatOutput +
      (r.embeddingTokens / 1_000_000) * rates.embeddingInput;
    totalCostUsd += reqCost;
  }

  const avgCostPerReq = totalCostUsd / requests.length;
  const estCostPer100 = avgCostPerReq * 100;

  console.log('=== RAG Cost & Latency Evaluation ===');
  console.log(`Sample requests : ${requests.length}`);
  console.log(`Embed latency   : p50=${percentile(embeds, 50)}ms, p95=${percentile(embeds, 95)}ms`);
  console.log(`Search latency  : p50=${percentile(searches, 50)}ms, p95=${percentile(searches, 95)}ms`);
  console.log(`Generate latency: p50=${percentile(generates, 50)}ms, p95=${percentile(generates, 95)}ms`);
  console.log(`Total latency   : p50=${percentile(totals, 50)}ms, p95=${percentile(totals, 95)}ms`);
  console.log(
    `Tokens (total)  : input=${totalInputTokens}, output=${totalOutputTokens}, embedding=${totalEmbeddingTokens}`,
  );
  console.log(`Est. cost / 100 questions: $${estCostPer100.toFixed(4)} USD`);
  console.log(`Pricing note    : ${rates.sourceNote}`);
}

main();
