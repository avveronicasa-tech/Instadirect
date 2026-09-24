import { LucideIcon } from "lucide-react";

export default function StatCard({
  titulo,
  valor,
  legenda,
  icon: Icon,
  destaque,
}: {
  titulo: string;
  valor: number;
  legenda: string;
  icon: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{titulo}</p>
        <Icon size={18} className="text-gray-400" strokeWidth={2} />
      </div>
      <p className="mt-3 text-3xl font-semibold">{valor}</p>
      <p
        className={`mt-1 text-xs ${
          destaque ? "text-emerald-600 font-medium" : "text-gray-400"
        }`}
      >
        {legenda}
      </p>
    </div>
  );
}
