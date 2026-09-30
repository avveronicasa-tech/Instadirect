"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import {
  Play,
  MessageSquare,
  UserPlus,
  Tag,
  Mail,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";
import type { FlowNode } from "@/lib/flow-types";

// Cada nó do React Flow carrega o bloco inteiro em `data.no`, mais os
// callbacks pra editar e excluir — assim o componente não precisa saber
// nada sobre onde o estado "de verdade" mora (fica no editor, por fora).
export type FlowNodeData = {
  no: FlowNode;
  onMudar: (patch: Partial<FlowNode>) => void;
  onExcluir: () => void;
};

const corBorda = "border-gray-200";

function Cabecalho({
  icon: Icon,
  titulo,
  onExcluir,
  removivel = true,
}: {
  icon: typeof Play;
  titulo: string;
  onExcluir: () => void;
  removivel?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-2 px-3 pt-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-purple-50 text-brand-purple flex items-center justify-center">
          <Icon size={13} />
        </span>
        <span className="text-xs font-semibold text-gray-700">{titulo}</span>
      </div>
      {removivel && (
        <button
          onClick={onExcluir}
          className="text-gray-300 hover:text-red-600"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export function NoInicioCard(_props: NodeProps<FlowNodeData>) {
  return (
    <div className={`w-[160px] bg-white border ${corBorda} rounded-xl shadow-sm`}>
      <Cabecalho icon={Play} titulo="Início" onExcluir={() => {}} removivel={false} />
      <p className="px-3 pb-3 text-[11px] text-gray-400">
        Disparado pelo gatilho do fluxo
      </p>
      <Handle type="source" position={Position.Right} id="next" className="!bg-brand-purple" />
    </div>
  );
}

export function NoMensagemCard({ data }: NodeProps<FlowNodeData>) {
  const no = data.no;
  if (no.kind !== "message") return null;
  const modoReply = no.buttonMode === "reply";

  return (
    <div className={`w-[280px] bg-white border ${corBorda} rounded-xl shadow-sm`}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Cabecalho icon={MessageSquare} titulo="Enviar mensagem" onExcluir={data.onExcluir} />

      <div className="px-3 pb-3 space-y-2">
        <textarea
          value={no.text}
          onChange={(e) => data.onMudar({ text: e.target.value })}
          placeholder="Texto da mensagem"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs nodrag"
        />

        <div className="flex gap-1">
          <button
            onClick={() => data.onMudar({ buttonMode: "reply" })}
            className={`flex-1 text-[10px] py-1 rounded-md border ${
              modoReply ? "bg-brand-purple text-white border-brand-purple" : "border-gray-200 text-gray-500"
            }`}
          >
            Botões (opções)
          </button>
          <button
            onClick={() => data.onMudar({ buttonMode: "url" })}
            className={`flex-1 text-[10px] py-1 rounded-md border ${
              !modoReply ? "bg-brand-purple text-white border-brand-purple" : "border-gray-200 text-gray-500"
            }`}
          >
            Botão de link
          </button>
        </div>

        {modoReply ? (
          <div className="space-y-1.5">
            {no.buttons.map((b, i) => (
              <div key={i} className="relative flex items-center gap-1">
                <input
                  value={b.label}
                  onChange={(e) => {
                    const novos = [...no.buttons];
                    novos[i] = { ...b, label: e.target.value };
                    data.onMudar({ buttons: novos });
                  }}
                  placeholder={`Opção ${i + 1}`}
                  maxLength={20}
                  className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-[11px] nodrag"
                />
                <button
                  onClick={() => data.onMudar({ buttons: no.buttons.filter((_, idx) => idx !== i) })}
                  className="text-gray-300 hover:text-red-600 shrink-0"
                >
                  <Trash2 size={11} />
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`btn:${i}`}
                  style={{ right: -20, background: "#7C4DFF" }}
                />
              </div>
            ))}
            {no.buttons.length < 13 && (
              <button
                onClick={() =>
                  data.onMudar({ buttons: [...no.buttons, { label: "" }] })
                }
                className="flex items-center gap-1 text-[11px] text-brand-purple"
              >
                <Plus size={11} /> Opção
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <input
              value={no.buttons[0]?.label ?? ""}
              onChange={(e) =>
                data.onMudar({
                  buttons: [{ label: e.target.value, url: no.buttons[0]?.url }],
                })
              }
              placeholder="Texto do botão"
              className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] nodrag"
            />
            <input
              value={no.buttons[0]?.url ?? ""}
              onChange={(e) =>
                data.onMudar({
                  buttons: [{ label: no.buttons[0]?.label ?? "", url: e.target.value }],
                })
              }
              placeholder="https://"
              className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] nodrag"
            />
            <Handle type="source" position={Position.Right} id="next" className="!bg-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}

export function NoFollowGateCard({ data }: NodeProps<FlowNodeData>) {
  const no = data.no;
  if (no.kind !== "follow_gate") return null;
  return (
    <div className={`w-[260px] bg-white border ${corBorda} rounded-xl shadow-sm`}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Cabecalho icon={UserPlus} titulo="Só para quem segue" onExcluir={data.onExcluir} />
      <div className="px-3 pb-3 space-y-2">
        <textarea
          value={no.text}
          onChange={(e) => data.onMudar({ text: e.target.value })}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs nodrag"
        />
        <input
          value={no.buttonLabel}
          onChange={(e) => data.onMudar({ buttonLabel: e.target.value })}
          maxLength={20}
          className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] nodrag"
        />
        <p className="text-[10px] text-amber-600">
          A API não confirma o follow de verdade — só espera o toque.
        </p>
      </div>
      <Handle type="source" position={Position.Right} id="next" className="!bg-gray-400" />
    </div>
  );
}

export function NoEtiquetaCard({ data }: NodeProps<FlowNodeData>) {
  const no = data.no;
  if (no.kind !== "tag") return null;
  return (
    <div className={`w-[220px] bg-white border ${corBorda} rounded-xl shadow-sm`}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Cabecalho icon={Tag} titulo="Etiquetar" onExcluir={data.onExcluir} />
      <div className="px-3 pb-3">
        <input
          value={no.tag}
          onChange={(e) => data.onMudar({ tag: e.target.value })}
          placeholder="Nome da etiqueta"
          className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] nodrag"
        />
      </div>
      <Handle type="source" position={Position.Right} id="next" className="!bg-gray-400" />
    </div>
  );
}

export function NoPedirEmailCard({ data }: NodeProps<FlowNodeData>) {
  const no = data.no;
  if (no.kind !== "ask_email") return null;
  return (
    <div className={`w-[240px] bg-white border ${corBorda} rounded-xl shadow-sm`}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Cabecalho icon={Mail} titulo="Pedir e-mail" onExcluir={data.onExcluir} />
      <div className="px-3 pb-3">
        <textarea
          value={no.text}
          onChange={(e) => data.onMudar({ text: e.target.value })}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs nodrag"
        />
      </div>
      <Handle type="source" position={Position.Right} id="next" className="!bg-gray-400" />
    </div>
  );
}

export function NoEsperarCard({ data }: NodeProps<FlowNodeData>) {
  const no = data.no;
  if (no.kind !== "delay") return null;
  return (
    <div className={`w-[200px] bg-white border ${corBorda} rounded-xl shadow-sm`}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Cabecalho icon={Clock} titulo="Esperar" onExcluir={data.onExcluir} />
      <div className="px-3 pb-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={no.minutes}
          onChange={(e) => data.onMudar({ minutes: Number(e.target.value) })}
          className="w-16 border border-gray-200 rounded-md px-2 py-1 text-xs nodrag"
        />
        <span className="text-[11px] text-gray-500">minutos</span>
      </div>
      <Handle type="source" position={Position.Right} id="next" className="!bg-gray-400" />
    </div>
  );
}

export const tiposDeNo = {
  start: NoInicioCard,
  message: NoMensagemCard,
  follow_gate: NoFollowGateCard,
  tag: NoEtiquetaCard,
  ask_email: NoPedirEmailCard,
  delay: NoEsperarCard,
};
