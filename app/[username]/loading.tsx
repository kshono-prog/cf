import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-sm text-[var(--text-subtle)]">
      <Image
        src="/icon/logo-creatorfounding.svg"
        alt="Creator Founding"
        width={240}
        height={64}
        className="loading-logo h-12 w-auto opacity-90"
      />

      <div className="text-center">
        <div className="text-sm font-medium text-[var(--text)]">
          ページを準備しています
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs tracking-[0.12em] text-[var(--text-subtle)]">
          <span>読み込み中</span>
        <span
          className="inline-flex w-[1.8em] justify-start"
          aria-hidden="true"
        >
          <span className="animate-dot1">.</span>
          <span className="animate-dot2">.</span>
          <span className="animate-dot3">.</span>
        </span>
        </div>
      </div>

      <style>{`
        @keyframes dotBlink {
          0%, 20% { opacity: 0; }
          30%, 100% { opacity: 1; }
        }
        .animate-dot1 {
          animation: dotBlink 1.2s infinite;
          animation-delay: 0s;
        }
        .animate-dot2 {
          animation: dotBlink 1.2s infinite;
          animation-delay: 0.2s;
        }
        .animate-dot3 {
          animation: dotBlink 1.2s infinite;
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}
