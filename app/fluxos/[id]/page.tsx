"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import Sidebar from "@/components/Sidebar";
import { tiposDeNo, type FlowNodeData } from "@/components/flow/nodes";
import { organizarLayout } from "@/lib/flow-layout";
import {
  novoBloco,
  novoId,
  rotuloBloco,
  type FlowNode,
  type FlowGraph,
  type Gatilho,
  type TipoCorrespondencia,
} from "@/lib/flow-types";
import {
  ArrowLeft,
  MessageSquare,
  UserPlus,
  Tag,
  Mail,
  Clock,
  LayoutGrid,
} from "lucide-react";

const nodeTypes = tiposDeNo;

export default function EditorFluxoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [trigger, setTrigger] = useState<Gatilho>("comment");
  const [matchType, setMatchType] = useState<TipoCorrespondencia>("contains");
  const [keywordsTexto, setKeywordsTexto] = useState("");
  const [repliesTexto, setRepliesTexto] = useState("");
  const [ativo, setAtivo] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);

  const criarCallbacksNo = useCallback(
    (nodeId: string) => ({
      onMudar: (patch: Partial<FlowNode>) =>
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, no: { ...n.data.no, ...patch } as FlowNode } }
              : n
          )
        ),
      onExcluir: () => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      },
    }),
    [setNodes, setEdges]
  );

  useEffect(() => {
    fetch(`/api/flows/${id}`)
      .then((r) => r.json())
      .then((f) => {
        setNome(f.nome);
        setDescricao(f.descricao || "");
        setTrigger(f.trigger || "comment");
        setMatchType(f.match_type || "contains");
        setKeywordsTexto((f.keywords || []).join(", "));
        setRepliesTexto((f.public_replies || []).join("\n"));
        setAtivo(f.ativo);

        const grafo: FlowGraph =
          f.grafo?.nodes?.length > 0
            ? f.grafo
            : { nodes: [{ id: "start", kind: "start", x: 60, y: 145 }], edges: [] };

        const rfNodes: Node<FlowNodeData>[] = grafo.nodes.map((no) => ({
          id: no.id,
          type: no.kind,
          position: { x: no.x, y: no.y },
          data: { no, ...criarCallbacksNo(no.id) },
          deletable: no.kind !== "start",
        }));

        const rfEdges: Edge[] = grafo.edges.map((a) => ({
          id: `${a.from}::${a.handle}::${a.to}`,
          source: a.from,
          sourceHandle: a.handle,
          target: a.to,
          style: { stroke: "#7C4DFF", strokeWidth: 1.5 },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...conn, style: { stroke: "#7C4DFF", strokeWidth: 1.5 } },
          // Cada saída (handle) só pode ir pra 1 lugar — remove a ligação
          // antiga dessa mesma saída antes de adicionar a nova.
          eds.filter(
            (e) => !(e.source === conn.source && e.sourceHandle === conn.sourceHandle)
          )
        )
      );
    },
    [setEdges]
  );

  function adicionarBloco(kind: Exclude<FlowNode["kind"], "start">) {
    const x = Math.max(0, ...nodes.map((n) => n.position.x)) + 320;
    const y = 140;
    const no = novoBloco(kind, x, y);
    setNodes((nds) => [
      ...nds,
      { id: no.id, type: no.kind, position: { x, y }, data: { no, ...criarCallbacksNo(no.id) } },
    ]);
  }

  function organizar() {
    setNodes((nds) => organizarLayout(nds, edges));
    setTimeout(() => rf?.fitView({ padding: 0.2 }), 50);
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);

    const grafo: FlowGraph = {
      nodes: nodes.map((n) => ({
        ...(n.data.no as FlowNode),
        x: n.position.x,
        y: n.position.y,
      })),
      edges: edges.map((e) => ({
        from: e.source,
        handle: e.sourceHandle || "next",
        to: e.target,
      })),
    };

    const res = await fetch(`/api/flows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        descricao,
        trigger,
        match_type: matchType,
        keywords: keywordsTexto.split(",").map((k) => k.trim()).filter(Boolean),
        public_replies: repliesTexto.split("\n").map((r) => r.trim()).filter(Boolean),
        grafo,
        ativo,
      }),
    });

    setSalvando(false);
    setMensagem(res.ok ? "Salvo!" : "Erro ao salvar.");
    setTimeout(() => setMensagem(null), 2000);
  }

  const gatilhos: { valor: Gatilho; label: string }[] = useMemo(
    () => [
      { valor: "comment", label: "Comentário em post/reels" },
      { valor: "story_reply", label: "Resposta a story" },
      { valor: "dm", label: "DM recebida" },
    ],
    []
  );

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Cabeçalho */}
        <div className="border-b border-gray-100 px-6 py-3 flex items-center gap-4">
          <Link href="/fluxos" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={18} />
          </Link>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="font-semibold text-sm border-none focus:outline-none focus:ring-0 px-0"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Ativo
          </label>
          <div className="flex-1" />
          {mensagem && <span className="text-xs text-emerald-600">{mensagem}</span>}
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar fluxo"}
          </button>
        </div>

        {/* Gatilho */}
        <div className="border-b border-gray-100 px-6 py-3 grid grid-cols-3 gap-4 bg-gray-50/50">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Gatilho
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as Gatilho)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            >
              {gatilhos.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Palavras-chave (separadas por vírgula)
            </label>
            <input
              value={keywordsTexto}
              onChange={(e) => setKeywordsTexto(e.target.value)}
              placeholder="quero, eu quero, link"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Tipo de correspondência
            </label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as TipoCorrespondencia)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            >
              <option value="contains">Se contiver a palavra</option>
              <option value="exact">Só se for igual</option>
            </select>
          </div>
          {trigger === "comment" && (
            <div className="col-span-3">
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Respostas públicas no comentário (uma por linha — sorteia uma a cada vez)
              </label>
              <textarea
                value={repliesTexto}
                onChange={(e) => setRepliesTexto(e.target.value)}
                rows={2}
                placeholder={"Te mandei no direto! 📩\nJá está no seu direct 👀"}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
              />
            </div>
          )}
        </div>

        {/* Toolbar de blocos */}
        <div className="border-b border-gray-100 px-6 py-2 flex items-center gap-2">
          <BotaoBloco icon={MessageSquare} label="Enviar mensagem" onClick={() => adicionarBloco("message")} />
          <BotaoBloco icon={Clock} label="Esperar" onClick={() => adicionarBloco("delay")} />
          <BotaoBloco icon={Mail} label="Pedir e-mail" onClick={() => adicionarBloco("ask_email")} />
          <BotaoBloco icon={UserPlus} label="Só para quem segue" onClick={() => adicionarBloco("follow_gate")} />
          <BotaoBloco icon={Tag} label="Etiquetar" onClick={() => adicionarBloco("tag")} />
          <div className="flex-1" />
          <button
            onClick={organizar}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <LayoutGrid size={13} /> Organizar
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRf}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background gap={20} color="#eee" />
            <Controls />
            <MiniMap pannable zoomable className="!bg-white" />
          </ReactFlow>
        </div>

        <p className="px-6 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
          Arraste da bolinha até outro bloco para ligar · Ctrl/Cmd + rolar amplia · clique e
          arraste o fundo pra navegar
        </p>
      </div>
    </div>
  );
}

function BotaoBloco({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof MessageSquare;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
    >
      <Icon size={13} /> {label}
    </button>
  );
}
