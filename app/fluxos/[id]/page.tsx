"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Plus, Trash2, MessageSquare, Clock, Mail, Tag } from "lucide-react";
import {
  type FlowGraph,
  type FlowNode,
  type OpcaoResposta,
  grafoVazio,
  novoId,
  rotuloTipo,
} from "@/lib/flow-types";

const ICONES: Record<FlowNode["tipo"], typeof MessageSquare> = {
  mensagem: MessageSquare,
  esperar: Clock,
  pedir_email: Mail,
  etiquetar: Tag,
};

export default function EditorFluxoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [nome, setNome] = useState("");
  const [gatilho, setGatilho] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [grafo, setGrafo] = useState<FlowGraph>(grafoVazio);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/flows/${id}`)
      .then((r) => r.json())
      .then((f) => {
        setNome(f.nome);
        setGatilho(f.gatilho_palavra || "");
        setAtivo(f.ativo);
        setGrafo(f.grafo && f.grafo.nos ? f.grafo : grafoVazio);
      })
      .finally(() => setCarregando(false));
  }, [id]);

  function atualizarNo(noId: string, patch: Partial<FlowNode>) {
    setGrafo((g) => ({
      ...g,
      nos: { ...g.nos, [noId]: { ...g.nos[noId], ...patch } as FlowNode },
    }));
  }

  function adicionarNo(tipo: FlowNode["tipo"]) {
    const id2 = novoId();
    let no: FlowNode;
    switch (tipo) {
      case "mensagem":
        no = { id: id2, tipo, texto: "", opcoes: [], proximo: null };
        break;
      case "esperar":
        no = { id: id2, tipo, minutos: 60, proximo: null };
        break;
      case "pedir_email":
        no = { id: id2, tipo, texto: "Qual o seu e-mail?", proximo: null };
        break;
      case "etiquetar":
        no = { id: id2, tipo, etiqueta: "", proximo: null };
        break;
    }
    setGrafo((g) => ({
      inicio: g.inicio ?? id2,
      nos: { ...g.nos, [id2]: no },
    }));
  }

  function excluirNo(noId: string) {
    if (!confirm("Excluir esse bloco?")) return;
    setGrafo((g) => {
      const nos = { ...g.nos };
      delete nos[noId];
      // Remove ligações que apontavam pra esse nó.
      for (const key of Object.keys(nos)) {
        const n = nos[key];
        if ("proximo" in n && n.proximo === noId) n.proximo = null;
        if (n.tipo === "mensagem") {
          n.opcoes = n.opcoes.map((o) =>
            o.proximo === noId ? { ...o, proximo: null } : o
          );
        }
      }
      return {
        inicio: g.inicio === noId ? null : g.inicio,
        nos,
      };
    });
  }

  async function salvar() {
    setSalvando(true);
    setMensagemSalvo(null);
    const res = await fetch(`/api/flows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        gatilho_palavra: gatilho || null,
        grafo,
        ativo,
      }),
    });
    setSalvando(false);
    setMensagemSalvo(res.ok ? "Salvo!" : "Erro ao salvar.");
    setTimeout(() => setMensagemSalvo(null), 2000);
  }

  const listaNos = Object.values(grafo.nos);

  if (carregando) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-10 py-8">
          <p className="text-sm text-gray-400">Carregando...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[900px]">
        <Link
          href="/fluxos"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={15} /> Voltar pra Fluxos
        </Link>

        {/* Cabeçalho */}
        <div className="card p-5 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nome do fluxo
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Palavra-chave que dispara o fluxo
              </label>
              <input
                value={gatilho}
                onChange={(e) => setGatilho(e.target.value)}
                placeholder="Ex: aula"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Dica: se o fluxo começa por um comentário, a Meta só deixa mandar 1
            mensagem antes de a pessoa responder. Por isso o primeiro bloco
            deve ter opções de resposta (botões): quando a pessoa toca, o resto
            do fluxo continua.
          </p>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              Fluxo ativo
            </label>
            <div className="flex items-center gap-3">
              {mensagemSalvo && (
                <span className="text-xs text-emerald-600">{mensagemSalvo}</span>
              )}
              <button
                onClick={salvar}
                disabled={salvando}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>

        {/* Blocos */}
        {listaNos.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400 mb-5">
            Nenhum bloco ainda. Adicione o primeiro abaixo.
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {listaNos.map((no) => (
              <BlocoNo
                key={no.id}
                no={no}
                grafo={grafo}
                ehInicio={grafo.inicio === no.id}
                onMudar={(patch) => atualizarNo(no.id, patch)}
                onExcluir={() => excluirNo(no.id)}
                onDefinirInicio={() =>
                  setGrafo((g) => ({ ...g, inicio: no.id }))
                }
              />
            ))}
          </div>
        )}

        {/* Adicionar bloco */}
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Adicionar bloco
          </p>
          <div className="flex flex-wrap gap-2">
            <BotaoAdicionar tipo="mensagem" onClick={adicionarNo} />
            <BotaoAdicionar tipo="esperar" onClick={adicionarNo} />
            <BotaoAdicionar tipo="pedir_email" onClick={adicionarNo} />
            <BotaoAdicionar tipo="etiquetar" onClick={adicionarNo} />
          </div>
        </div>
      </main>
    </div>
  );
}

function BotaoAdicionar({
  tipo,
  onClick,
}: {
  tipo: FlowNode["tipo"];
  onClick: (tipo: FlowNode["tipo"]) => void;
}) {
  const Icon = ICONES[tipo];
  return (
    <button
      onClick={() => onClick(tipo)}
      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
    >
      <Plus size={14} className="text-gray-400" />
      <Icon size={15} />
      {rotuloTipo(tipo)}
    </button>
  );
}

function SeletorProximo({
  valor,
  grafo,
  noIdAtual,
  onMudar,
}: {
  valor: string | null;
  grafo: FlowGraph;
  noIdAtual: string;
  onMudar: (v: string | null) => void;
}) {
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => onMudar(e.target.value || null)}
      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
    >
      <option value="">Fim do fluxo</option>
      {Object.values(grafo.nos)
        .filter((n) => n.id !== noIdAtual)
        .map((n) => (
          <option key={n.id} value={n.id}>
            {rotuloTipo(n.tipo)}
            {"texto" in n && n.texto ? `: ${n.texto.slice(0, 20)}` : ""}
          </option>
        ))}
    </select>
  );
}

function BlocoNo({
  no,
  grafo,
  ehInicio,
  onMudar,
  onExcluir,
  onDefinirInicio,
}: {
  no: FlowNode;
  grafo: FlowGraph;
  ehInicio: boolean;
  onMudar: (patch: Partial<FlowNode>) => void;
  onExcluir: () => void;
  onDefinirInicio: () => void;
}) {
  const Icon = ICONES[no.tipo];

  return (
    <div className={`card p-4 ${ehInicio ? "ring-2 ring-brand-purple" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center">
            <Icon size={15} />
          </span>
          <span className="text-sm font-medium">{rotuloTipo(no.tipo)}</span>
          {ehInicio && (
            <span className="text-[10px] font-medium bg-brand-purple text-white px-2 py-0.5 rounded-full">
              início
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!ehInicio && (
            <button
              onClick={onDefinirInicio}
              className="text-xs text-gray-400 hover:text-brand-purple"
            >
              Definir como início
            </button>
          )}
          <button
            onClick={onExcluir}
            className="p-1.5 text-gray-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {no.tipo === "mensagem" && (
        <div className="space-y-2">
          <textarea
            value={no.texto}
            onChange={(e) => onMudar({ texto: e.target.value })}
            placeholder="Texto da mensagem"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={no.botaoTexto || ""}
              onChange={(e) => onMudar({ botaoTexto: e.target.value })}
              placeholder="Texto do botão (opcional)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs"
            />
            <input
              value={no.botaoUrl || ""}
              onChange={(e) => onMudar({ botaoUrl: e.target.value })}
              placeholder="Link do botão"
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div className="pt-1">
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Opções de resposta (botões clicáveis — a pessoa toca, não
              precisa digitar. Máx. 13 opções, 20 caracteres cada)
            </p>
            {no.opcoes.map((op: OpcaoResposta, i: number) => (
              <div key={op.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                <input
                  value={op.texto}
                  onChange={(e) => {
                    const novas = [...no.opcoes];
                    novas[i] = { ...op, texto: e.target.value };
                    onMudar({ opcoes: novas });
                  }}
                  placeholder="Texto da opção"
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                />
                <span className="text-xs text-gray-400">vai para</span>
                <SeletorProximo
                  valor={op.proximo}
                  grafo={grafo}
                  noIdAtual={no.id}
                  onMudar={(v) => {
                    const novas = [...no.opcoes];
                    novas[i] = { ...op, proximo: v };
                    onMudar({ opcoes: novas });
                  }}
                />
                <button
                  onClick={() => {
                    const novas = no.opcoes.filter((o) => o.id !== op.id);
                    onMudar({ opcoes: novas });
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                onMudar({
                  opcoes: [
                    ...no.opcoes,
                    { id: novoId(), texto: "", proximo: null },
                  ],
                })
              }
              className="text-xs text-brand-purple hover:underline"
            >
              + Adicionar opção
            </button>
          </div>

          {no.opcoes.length === 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-400">
                Sem opções, segue direto pra:
              </span>
              <SeletorProximo
                valor={no.proximo}
                grafo={grafo}
                noIdAtual={no.id}
                onMudar={(v) => onMudar({ proximo: v })}
              />
            </div>
          )}
        </div>
      )}

      {no.tipo === "esperar" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Esperar</span>
          <input
            type="number"
            min={1}
            value={no.minutos}
            onChange={(e) => onMudar({ minutos: Number(e.target.value) })}
            className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-gray-600">minutos, depois:</span>
          <SeletorProximo
            valor={no.proximo}
            grafo={grafo}
            noIdAtual={no.id}
            onMudar={(v) => onMudar({ proximo: v })}
          />
        </div>
      )}

      {no.tipo === "pedir_email" && (
        <div className="space-y-2">
          <input
            value={no.texto}
            onChange={(e) => onMudar({ texto: e.target.value })}
            placeholder="Pergunta pra pedir o e-mail"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Depois de receber, vai para:</span>
            <SeletorProximo
              valor={no.proximo}
              grafo={grafo}
              noIdAtual={no.id}
              onMudar={(v) => onMudar({ proximo: v })}
            />
          </div>
        </div>
      )}

      {no.tipo === "etiquetar" && (
        <div className="flex items-center gap-2">
          <input
            value={no.etiqueta}
            onChange={(e) => onMudar({ etiqueta: e.target.value })}
            placeholder="Nome da etiqueta"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-xs text-gray-400">depois:</span>
          <SeletorProximo
            valor={no.proximo}
            grafo={grafo}
            noIdAtual={no.id}
            onMudar={(v) => onMudar({ proximo: v })}
          />
        </div>
      )}
    </div>
  );
}
