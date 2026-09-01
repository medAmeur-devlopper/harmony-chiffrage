"use client";

import { useState, useRef } from "react";

export function ShareLinkPanel({ shareUrl }: { shareUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!shareUrl) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for HTTP (clipboard API requires HTTPS)
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand("copy");
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        readOnly
        value={shareUrl}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-64 cell-input rounded px-2 py-1.5 text-xs font-mono"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="rounded bg-[#2f6f8f] text-white text-xs font-medium px-3 py-1.5 hover:bg-[#265a72] transition-colors"
      >
        {copied ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}
