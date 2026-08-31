"use client";

import { useState } from "react";

export function ShareLinkPanel({ shareUrl }: { shareUrl: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!shareUrl) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={shareUrl}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-64 cell-input rounded px-2 py-1.5 text-xs font-mono"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded bg-[#2f6f8f] text-white text-xs font-medium px-3 py-1.5 hover:bg-[#265a72] transition-colors"
      >
        {copied ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}
