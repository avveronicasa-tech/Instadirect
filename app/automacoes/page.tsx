"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, X, Pencil } from "lucide-react";

type Automacao = {
  id: number;
  nome: string;
  palavra_chave: string;
  tipo_correspondencia: string;
  dm_texto: string;
  botao_texto: string | null;
  botao_url: string | null;
  responder_comentario: boolean;
  comentario_texto: string | null;
  ativa: boolean;
};

export default function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  // null = modal fechado | "nova" = criando | Automacao = editando
  const [modal, setModal] = useState<null | "nova" | Automacao>(null);

  async function carregar() {
    setCarregando(true);
    const res = await fetch("/api/automations");
    setAutomacoes(await res.json());
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarAtiva(id: number, ativa: boolean) {
    setAutomacoes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativa } : a))
    );
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa }),
    });
  }

  async function excluir(id: number) {
    if (!confirm("Excluir essa automação?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Automações</h1>
            <p className="text-gray-500 text-sm mt-1">
              Palavra-chave no comentário ou na DM → resposta automática.
            </p>
          </div>
          <button
            onClick={() => setModal("nova")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <Plus size={16} /> Nova automação
          </button>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : automacoes.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">
            Nenhuma automação ainda. Crie a primeira acima.
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {automacoes.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <button
                  onClick={() => setModal(a)}
                  className="flex-1 text-left"
                  title="Clique para editar"
                >
                  <p className="font-medium text-sm">{a.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Gatilho: <code>{a.palavra_chave}</code> (
                    {a.tipo_correspondencia === "exata" ? "exata" : "contém"})
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={a.ativa}
                      onChange={(e) => alternarAtiva(a.id, e.target.checked)}
                    />
                    {a.ativa ? "Ativa" : "Pausada"}
                  </label>
                  <button
                    onClick={() => setModal(a)}
                    className="p-2 text-gray-400 hover:text-gray-700"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => excluir(a.id)}
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

        {modal && (
          <ModalAutomacao
            automacao={modal === "nova" ? null : modal}
            onClose={() => setModal(null)}
            onSalva={() => {
              setModal(null);
              carregar();
            }}
          />
        )}
      </main>
    </div>
  );
}

function ModalAutomacao({
  automacao,
  onClose,
  onSalva,
}: {
  automacao: Automacao | null;
  onClose: () => void;
  onSalva: () => void;
}) {
  const editando = automacao !== null;

  const [nome, setNome] = useState(automacao?.nome ?? "");
  const [palavraChave, setPalavraChave] = useState(automacao?.palavra_chave ?? "");
  const [tipo, setTipo] = useState(automacao?.tipo_correspondencia ?? "contem");
  const [dmTexto, setDmTexto] = useState(automacao?.dm_texto ?? "");
  const [botaoTexto, setBotaoTexto] = useState(
    editando ? automacao?.botao_texto ?? "" : "Quero saber mais"
  );
  const [botaoUrl, setBotaoUrl] = useState(automacao?.botao_url ?? "");
  const [comentarioTexto, setComentarioTexto] = useState(
    editando ? automacao?.comentario_texto ?? "" : "Te mandei no privado! 📩"
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const corpo = {
      nome,
      palavra_chave: palavraChave,
      tipo_correspondencia: tipo,
      dm_texto: dmTexto,
      botao_texto: botaoTexto,
      botao_url: botaoUrl,
      responder_comentario: comentarioTexto.trim() !== "",
      comentario_texto: comentarioTexto,
    };

    const res = await fetch(
      editando ? `/api/automations/${automacao!.id}` : "/api/automations",
      {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      }
    );
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Não foi possível salvar.");
      return;
    }
    onSalva();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">
            {editando ? "Editar automação" : "Nova automação"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={salvar} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nome interno
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Ex: Isca digital do reels"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Palavra-chave
              </label>
              <input
                value={palavraChave}
                onChange={(e) => setPalavraChave(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: quero"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Quando dispara
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="contem">Se contiver a palavra</option>
                <option value="exata">Só se for igual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Resposta pública no comentário (deixe vazio para não responder)
            </label>
            <input
              value={comentarioTexto}
              onChange={(e) => setComentarioTexto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Mensagem da DM
            </label>
            <textarea
              value={dmTexto}
              onChange={(e) => setDmTexto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Oi! Aqui está o link que você pediu 👇"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Texto do botão
              </label>
              <input
                value={botaoTexto}
                onChange={(e) => setBotaoTexto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Link do botão
              </label>
              <input
                value={botaoUrl}
                onChange={(e) => setBotaoUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://"
              />
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {salvando
              ? "Salvando..."
              : editando
              ? "Salvar alterações"
              : "Criar automação"}
          </button>
        </form>
      </div>
    </div>
  );
}
