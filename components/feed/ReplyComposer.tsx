"use client";

type Props = {
  value: string;
  disabled: boolean;
  submitting: boolean;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
};

export function ReplyComposer(props: Props) {
  const { value, disabled, submitting, onChange, onSubmit } = props;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        Reply
      </div>
      <label className="mt-1.5 block text-sm font-medium text-gray-700">
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
        <p className="text-[11px] leading-5 text-gray-500">
          ウォレット接続中のアドレスで返信を送ります。
        </p>
        <button
          type="button"
          className="rounded-full bg-slate-950 px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          onClick={onSubmit}
          disabled={disabled || submitting || value.trim().length === 0}
        >
          {submitting ? "送信中…" : "返信を送る"}
        </button>
      </div>
    </div>
  );
}
