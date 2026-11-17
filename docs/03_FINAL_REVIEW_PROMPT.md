# FINAL PROJECT REVIEW PROMPT

Act as a Senior AI Engineer conducting a technical review of this repo.

Evaluate:
1. Software architecture
2. Code quality
3. TypeScript implementation
4. Gemini API integration (chat + embeddings, retry, error mapping)
5. Prompt engineering
6. RAG implementation
7. Embedding strategy (task types, dimension, batching)
8. Vector search quality (index, threshold, top-k)
9. Document processing (extraction, cleaning, chunking)
10. API security
11. Error handling
12. Performance and cost optimization
13. Testing coverage
14. Documentation
15. UI fidelity to `docs/05_UI_SPEC.md`

Identify: technical weaknesses, security vulnerabilities, hallucination risks, retrieval quality problems, performance bottlenecks, unnecessary complexity.
Base findings on actual files, test output, and evaluation numbers. Cite file paths. Do not claim production-ready without evidence.

Provide actionable improvements ranked by impact.

Finally generate a technical project summary suitable for a Full Stack Developer / AI Developer portfolio: problem, architecture, key decisions and trade-offs, measured results (retrieval hit@k, groundedness, latency, cost), and what I would improve next.
