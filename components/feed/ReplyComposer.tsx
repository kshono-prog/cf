"use client";

type Props = {
  value: string;
  disabled: boolean;
  submitting: boolean;
  viewerConnected: boolean;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
};

export function ReplyComposer(props: Props) {
  const { value, disabled, submitting, viewerConnected, onChange, onSubmit } = props;

  if (!viewerConnected) {
    return (
      <div className="surface-subtle px-4 py-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
          Reply
        </div>
        <div className="mt-1.5 text-sm font-medium text-[var(--text)]">
          返信するにはウォレット接続
        </div>
        <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
          返信は読めます。書き込みたいときは、右上のウォレットから接続してください。
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
        Reply
      </div>
      <label className="mt-1.5 block text-sm font-medium text-[var(--text)]">
        ひとこと返信
      </label>
      <textarea
        className="input mt-2 min-h-[88px] w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="感想や応援メッセージを短く送れます。"
      />
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-[11px] leading-5 text-[var(--text-subtle)]">
          接続中のウォレットで返信を送ります。
        </p>
        <button
          type="button"
          className="btn px-3.5 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSubmit}
          disabled={disabled || submitting || value.trim().length === 0}
        >
          {submitting ? "送信中…" : "返信を送る"}
        </button>
      </div>
    </div>
  );
}
