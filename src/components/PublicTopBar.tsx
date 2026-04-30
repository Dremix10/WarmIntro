// Minimal "alma" wordmark linking to / for public pages (login, demo,
// request-access, forgot/reset-password, etc.). Internal pages already
// have their own NavHeader. The wordmark is a bounce-back path —
// otherwise users dropped onto /login or /forgot-password have no way
// to return to the marketing landing without retyping the URL.

export function PublicTopBar() {
  return (
    <header className="absolute left-0 right-0 top-0 z-30 px-6 py-5 sm:px-8">
      <a
        href="/"
        className="inline-block text-2xl italic font-[family-name:var(--font-fraunces)] text-[#1B3B5F] transition-opacity hover:opacity-80"
        aria-label="alma — home"
      >
        alma
      </a>
    </header>
  );
}
