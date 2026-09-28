"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Download, Upload, Workflow } from "lucide-react";

type Fluxo = {
  id: number;
  nome: string;
  gatilho_palavra: string | null;
  ativo: boolean;
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

  async function exportar(id: number, nome: string) {
    const res = await fetch(`/api/flows/${id}`);
    const fluxo = await res.json();
    const blob = new Blob(
      [
        JSON.stringify(
          { nome: fluxo.nome, gatilho_palavra: fluxo.gatilho_palavra, grafo: fluxo.grafo },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome.toLowerCase().replace(/\s+/g, "-")}.json`;
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
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Fluxos</h1>
            <p className="text-gray-500 text-sm mt-1">
              Conversas com caminhos diferentes, igual ao ManyChat. Quando um
              fluxo e uma automação usam a mesma palavra-chave, o fluxo tem
              prioridade.
            </p>
          </div>
          <div className="flex gap-2">
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
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
                  <p className="font-medium text-sm">{f.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {f.gatilho_palavra ? (
                      <>
                        Gatilho: <code>{f.gatilho_palavra}</code>
                      </>
                    ) : (
                      "Sem palavra-chave definida ainda"
                    )}
                  </p>
                </Link>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.ativo}
                      onChange={(e) => alternarAtivo(f.id, e.target.checked)}
                    />
                    {f.ativo ? "Ativo" : "Pausado"}
                  </label>
                  <button
                    onClick={() => exportar(f.id, f.nome)}
                    className="p-2 text-gray-400 hover:text-gray-700"
                    title="Exportar"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => excluir(f.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
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
