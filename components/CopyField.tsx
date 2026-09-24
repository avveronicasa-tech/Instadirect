"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(value);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate">
          {value || "—"}
        </code>
        <button
          type="button"
          onClick={copiar}
          disabled={!value}
          className="shrink-0 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          title="Copiar"
        >
          {copiado ? (
            <Check size={16} className="text-emerald-600" />
          ) : (
            <Copy size={16} className="text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
}
