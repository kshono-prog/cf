export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-gray-500 text-sm">
      {/* ロゴサイズ調整 */}
      <img
        src="/icon/logo-creatorfounding.svg"
        alt="Creator Founding"
        className="h-12 w-auto opacity-90"
      />

      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
        <span className="font-medium">loading</span>

        {/* . .. ... を順に見せる */}
        <span
          className="inline-flex w-[1.8em] justify-start"
          aria-hidden="true"
        >
          <span className="animate-dot1">.</span>
          <span className="animate-dot2">.</span>
          <span className="animate-dot3">.</span>
        </span>
      </div>

      {/* CSSはグローバル（styled-jsx不使用） */}
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
