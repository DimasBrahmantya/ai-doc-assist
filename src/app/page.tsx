export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-text">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rail text-accent font-bold">
          AI
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Document Assistant</h1>
        <p className="mt-2 text-sm text-muted">
          Project initialized. UI and RAG pipeline will be built phase by phase.
        </p>
      </div>
    </main>
  );
}
