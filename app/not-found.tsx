import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-semibold text-[var(--color-primary)]">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Tautan yang kamu buka tidak ada. Kembali ke inbox untuk lanjut.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-6 py-3 font-display font-semibold text-white transition hover:bg-[var(--color-primary2)]"
      >
        Buka inbox
      </Link>
    </main>
  );
}