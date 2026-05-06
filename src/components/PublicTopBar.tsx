// Minimal Alma wordmark linking to / for public pages (login, demo,
// request-access, forgot/reset-password, etc.). Internal pages already
// have their own NavHeader. The wordmark is a bounce-back path —
// otherwise users dropped onto /login or /forgot-password have no way
// to return to the marketing landing without retyping the URL.

import Image from "next/image";
import Link from "next/link";

export function PublicTopBar() {
  return (
    <header className="absolute left-0 right-0 top-0 z-30 px-6 py-5 sm:px-8">
      <Link
        href="/"
        className="inline-block transition-opacity hover:opacity-80"
        aria-label="alma — home"
      >
        <Image
          src="/brand/alma-wordmark-cream.webp"
          alt="Alma"
          width={220}
          height={93}
          priority
          className="h-10 w-auto mix-blend-multiply"
        />
      </Link>
    </header>
  );
}
