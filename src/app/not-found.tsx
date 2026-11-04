import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-5xl font-extrabold">This page isn’t here</h1>
        <p className="mt-3 text-ink-soft">The link may be old, or the board may have been deleted.</p>
        <Link className="btn btn-primary mt-6" href="/dashboard">Go to my boards</Link>
      </div>
    </main>
  );
}
