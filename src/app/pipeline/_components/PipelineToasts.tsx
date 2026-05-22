import type { ToastMsg } from "../_lib/types";

export function PipelineToasts({ toasts }: { toasts: ToastMsg[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`rounded-xl border shadow-lg px-4 py-3 text-sm ${
            toast.kind === "error"
              ? "bg-white border-[#C86B4F]/40 text-[#14182A]"
              : "bg-white border-[#D9CFB5] text-[#14182A]"
          }`}
        >
          <p
            className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${
              toast.kind === "error" ? "text-[#C86B4F]" : "text-[#2E5A88]"
            }`}
          >
            {toast.kind === "error" ? "Reverted" : "Heads up"}
          </p>
          <p>{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
