import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Not found</h1>
        <p className="mt-2 text-muted">
          This page or recipe doesn&apos;t exist. It may have been deleted.
        </p>
        <Link href="/recipes" className="mt-4 inline-block text-accent underline">
          Go to the recipes
        </Link>
      </div>
    </main>
  );
}
