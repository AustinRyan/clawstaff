"use client";

import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3 flex items-center gap-3">
      <AlertTriangle size={16} className="text-secondary flex-shrink-0" />
      <p className="text-xs text-secondary font-mono">
        Showing demo data — no live agents connected.
      </p>
    </div>
  );
}
