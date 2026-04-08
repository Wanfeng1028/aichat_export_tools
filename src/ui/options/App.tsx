export function OptionsApp() {
  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-panel backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-tide">Options</p>
        <h1 className="mt-2 text-4xl font-semibold">Preferences</h1>
        <p className="mt-4 text-sm text-slate-600">
          Settings are intentionally minimal in the MVP. Preferred export format, filename templates, and site permission
          controls will be expanded in later milestones.
        </p>
      </section>
    </main>
  );
}
