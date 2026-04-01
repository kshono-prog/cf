"use client";
import { useEffect, useState } from "react";

type ToastMessage = {
  id: number;
  text: string;
  type: "exp" | "badge" | "levelup";
};

let toastId = 0;
const listeners: Array<(msg: ToastMessage) => void> = [];

export function showExpToast(text: string, type: ToastMessage["type"] = "exp") {
  const msg: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach((l) => l(msg));
}

export function RpgExpToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 3000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  const COLORS = {
    exp: "bg-indigo-600",
    badge: "bg-purple-600",
    levelup: "bg-yellow-500",
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${COLORS[t.type]} text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg animate-bounce`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
