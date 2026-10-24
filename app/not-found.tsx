import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl">We could not find that page</h1>
        <p className="mt-3 text-muted">The link may be wrong or the page may have moved.</p>
        <Link href="/" className="btn-primary mt-6">Go to the home page</Link>
      </main>
    </>
  );
}
