'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-5xl font-extrabold">This page stopped working</h1>
        <p className="mt-3 text-ink-soft">Your saved boards are safe. Reload the page to carry on.</p>
        <button type="button" className="btn btn-primary mt-6" onClick={reset}>Reload this page</button>
      </div>
    </main>
  );
}
