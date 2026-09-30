"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Plus, Upload, Workflow, Download } from "lucide-react";
import type { FlowGraph, Gatilho } from "@/lib/flow-types";

type Fluxo = {
  id: number;
  nome: string;
  trigger: Gatilho;
  keywords: string[];
  ativo: boolean;
  grafo: FlowGraph;
};

const rotuloGatilho: Record<Gatilho, string> = {
  comment: "Comentário",
  story_reply: "Resposta a story",
  dm: "DM",
};

export default function FluxosPage() {
  const [fluxos, setFluxos] = useState<Fluxo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const inputImportarRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setCarregando(true);
    const res = await fetch("/api/flows");
    setFluxos(await res.json());
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarNovo() {
    const nome = prompt("Nome do fluxo:", "Novo fluxo");
    if (nome === null) return;
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    const fluxo = await res.json();
    window.location.href = `/fluxos/${fluxo.id}`;
  }

  async function excluir(id: number) {
    if (!confirm("Excluir esse fluxo?")) return;
    await fetch(`/api/flows/${id}`, { method: "DELETE" });
    carregar();
  }

  async function duplicar(id: number) {
    await fetch(`/api/flows/${id}/duplicate`, { method: "POST" });
    carregar();
  }

  async function exportarUm(id: number, nome: string) {
    const res = await fetch(`/api/flows/${id}`);
    const f = await res.json();
    baixarJson(
      {
        formato: 1,
        fluxos: [
          {
            name: f.nome,
            descricao: f.descricao,
            trigger: f.trigger,
            match_type: f.match_type,
            keywords: f.keywords,
            public_replies: f.public_replies,
            nodes: f.grafo.nodes,
            edges: f.grafo.edges,
          },
        ],
      },
      nome
    );
  }

  async function exportarTodos() {
    const detalhes = await Promise.all(
      fluxos.map((f) => fetch(`/api/flows/${f.id}`).then((r) => r.json()))
    );
    baixarJson(
      {
        formato: 1,
        fluxos: detalhes.map((f) => ({
          name: f.nome,
          descricao: f.descricao,
          trigger: f.trigger,
          match_type: f.match_type,
          keywords: f.keywords,
          public_replies: f.public_replies,
          nodes: f.grafo.nodes,
          edges: f.grafo.edges,
        })),
      },
      "todos-os-fluxos"
    );
  }

  function baixarJson(conteudo: unknown, nomeArquivo: string) {
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomeArquivo.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const texto = await arquivo.text();
    let conteudo;
    try {
      conteudo = JSON.parse(texto);
    } catch {
      alert("Esse arquivo não é um JSON válido.");
      return;
    }
    const res = await fetch("/api/flows/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conteudo),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.erro || "Não foi possível importar.");
      return;
    }
    if (inputImportarRef.current) inputImportarRef.current.value = "";
    carregar();
  }

  async function alternarAtivo(id: number, ativo: boolean) {
    setFluxos((prev) => prev.map((f) => (f.id === id ? { ...f, ativo } : f)));
    await fetch(`/api/flows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1100px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Fluxos</h1>
            <p className="text-gray-500 text-sm mt-1">
              Conversas com caminhos diferentes. Quando um fluxo e uma
              automação usam a mesma palavra-chave, o fluxo tem prioridade.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarTodos}
              disabled={fluxos.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <Download size={16} /> Exportar todos
            </button>
            <input
              ref={inputImportarRef}
              type="file"
              accept="application/json"
              onChange={importar}
              className="hidden"
              id="importar-fluxo"
            />
            <label
              htmlFor="importar-fluxo"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <Upload size={16} /> Importar
            </label>
            <button
              onClick={criarNovo}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-purple text-white rounded-lg hover:opacity-90"
            >
              <Plus size={16} /> Novo fluxo
            </button>
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : fluxos.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
            <Workflow size={28} className="text-gray-300" />
            Nenhum fluxo ainda. Crie um novo ou importe um arquivo .json.
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {fluxos.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-4">
                <Link href={`/fluxos/${f.id}`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{f.nome}</p>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        f.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {f.ativo ? "ativo" : "pausado"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rotuloGatilho[f.trigger]}
                    {f.keywords?.length > 0 ? ` · ${f.keywords.join(", ")}` : ""} ·{" "}
                    {f.grafo?.nodes?.length ?? 0} blocos
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alternarAtivo(f.id, !f.ativo)}
                    className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    {f.ativo ? "Pausar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => exportarUm(f.id, f.nome)}
                    className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    Exportar
                  </button>
                  <button
                    onClick={() => duplicar(f.id)}
                    className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => excluir(f.id)}
                    className="text-xs font-medium border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
