"use client";

/** The themed shore for unexpected wrecks. */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-abyss px-6 text-center">
      <p className="text-xs uppercase tracking-epic text-ink-dim mb-4">
        Driven off course
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-light text-ink max-w-md">
        Even the best helmsman meets a rogue wave
      </h1>
      <p className="text-sm text-ink-dim mt-4 max-w-sm leading-relaxed">
        Something went wrong beneath the surface. Your journal and
        discoveries are safe on your device.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 px-8 py-3 font-display tracking-epic uppercase text-gold-bright border border-gold/40 rounded-full hover:bg-gold/10 hover:border-gold transition-colors cursor-pointer"
      >
        Back to sea
      </button>
    </main>
  );
}
