"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Zap,
  Workflow,
  Send,
  Users,
  Activity,
  Store,
  Settings,
  Moon,
  Plus,
  Check,
  LogOut,
} from "lucide-react";
import { contasConectadas } from "@/lib/mock-data";

const gerenciar = [
  { label: "Painel", icon: Home, href: "/" },
  { label: "Automações", icon: Zap, href: "/automacoes" },
  { label: "Fluxos", icon: Workflow, href: "/fluxos" },
  { label: "Disparos", icon: Send, href: "/disparos" },
  { label: "Contatos", icon: Users, href: "/contatos" },
  { label: "Atividade", icon: Activity, href: "/atividade" },
];

const sistema = [
  { label: "Loja", icon: Store, href: "/loja" },
  { label: "Configuração", icon: Settings, href: "/setup" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[300px] shrink-0 border-r border-brand-border bg-white flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6">
        <span className="text-xl font-semibold tracking-tight">InstaDirect.</span>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 mb-2 text-[11px] font-medium text-gray-400">
            Gerenciar
          </p>
          <ul className="space-y-1">
            {gerenciar.map(({ label, icon: Icon, href }) => {
              const ativo = pathname === href;
              return (
                <li key={label}>
                  <Link
                    href={href}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      ativo
                        ? "border border-gray-900 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={17} strokeWidth={2} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="px-3 mb-2 text-[11px] font-medium text-gray-400">
            Sistema
          </p>
          <ul className="space-y-1">
            {sistema.map(({ label, icon: Icon, href }) => {
              const ativo = pathname === href;
              return (
                <li key={label}>
                  <Link
                    href={href}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      ativo
                        ? "border border-gray-900 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={17} strokeWidth={2} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="px-3 pb-4 border-t border-brand-border pt-4 space-y-3">
        {contasConectadas.map((conta) => (
          <div
            key={conta.handle}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200"
          >
            <span className="w-7 h-7 rounded-full bg-brand-purple text-white text-xs font-semibold flex items-center justify-center">
              {conta.inicial}
            </span>
            <span className="text-sm font-medium flex-1 truncate">
              {conta.handle}
            </span>
            {conta.conectada && <Check size={16} className="text-brand-purple" />}
          </div>
        ))}

        <Link
          href="/setup"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-purple hover:bg-purple-50 rounded-lg"
        >
          <Plus size={16} /> Conectar outra conta
        </Link>

        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Moon size={17} strokeWidth={2} />
          Tema escuro
        </button>

        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut size={17} strokeWidth={2} />
          Sair
        </button>

        <p className="px-3 text-xs text-gray-400">Criado por Ricardo Tenório</p>
      </div>
    </aside>
  );
}
