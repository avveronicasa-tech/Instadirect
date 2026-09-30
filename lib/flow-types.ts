// Este é o MESMO formato de arquivo .json usado no DirectPro original —
// por isso um fluxo exportado de um sistema abre certinho no outro.

export type Gatilho = "comment" | "story_reply" | "dm";
export type TipoCorrespondencia = "contains" | "exact";
export type ModoBotao = "reply" | "url";

export type BotaoMensagem = { label: string; url?: string };

export type NoInicio = { id: string; kind: "start"; x: number; y: number };

export type NoMensagem = {
  id: string;
  kind: "message";
  text: string;
  buttonMode: ModoBotao;
  buttons: BotaoMensagem[];
  x: number;
  y: number;
};

// "Só para quem segue": a API do Instagram não permite verificar de
// verdade se a pessoa segue a conta. Esse bloco é uma versão honesta disso —
// ele PEDE pra pessoa seguir e espera ela tocar no botão, mas não confere
// nada. Documentado assim também no fluxo original.
export type NoFollowGate = {
  id: string;
  kind: "follow_gate";
  text: string;
  buttonLabel: string;
  x: number;
  y: number;
};

export type NoEtiqueta = {
  id: string;
  kind: "tag";
  tag: string;
  x: number;
  y: number;
};

export type NoPedirEmail = {
  id: string;
  kind: "ask_email";
  text: string;
  x: number;
  y: number;
};

export type NoEsperar = {
  id: string;
  kind: "delay";
  minutes: number;
  x: number;
  y: number;
};

export type FlowNode =
  | NoInicio
  | NoMensagem
  | NoFollowGate
  | NoEtiqueta
  | NoPedirEmail
  | NoEsperar;

// Uma ligação entre dois blocos. "handle" diz qual saída do bloco de
// origem: "next" pra blocos de saída única, "btn:0"/"btn:1"/... pro botão
// de índice N de um bloco de mensagem (buttonMode "reply").
export type FlowEdge = { from: string; handle: string; to: string };

export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

// O que fica dentro de flows.grafo (o "corpo" do fluxo) mais os campos que
// também existem como colunas na tabela, pra facilitar consulta no webhook.
export type FlowExport = {
  name: string;
  descricao?: string;
  trigger: Gatilho;
  match_type: TipoCorrespondencia;
  keywords: string[];
  public_replies: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type FlowFile = { formato: 1; fluxos: FlowExport[] };

export function grafoVazio(): FlowGraph {
  return { nodes: [{ id: "start", kind: "start", x: 60, y: 145 }], edges: [] };
}

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function rotuloBloco(kind: FlowNode["kind"]): string {
  switch (kind) {
    case "start":
      return "Início";
    case "message":
      return "Enviar mensagem";
    case "follow_gate":
      return "Só para quem segue";
    case "tag":
      return "Etiquetar";
    case "ask_email":
      return "Pedir e-mail";
    case "delay":
      return "Esperar";
  }
}

export function novoBloco(
  kind: Exclude<FlowNode["kind"], "start">,
  x: number,
  y: number
): FlowNode {
  const id = novoId();
  switch (kind) {
    case "message":
      return { id, kind, text: "", buttonMode: "reply", buttons: [], x, y };
    case "follow_gate":
      return {
        id,
        kind,
        text: "Só uma coisa antes: me segue aqui 👇",
        buttonLabel: "Já sigo ✅",
        x,
        y,
      };
    case "tag":
      return { id, kind, tag: "", x, y };
    case "ask_email":
      return { id, kind, text: "Qual o seu e-mail?", x, y };
    case "delay":
      return { id, kind, minutes: 60, x, y };
  }
}

export function proximoPadrao(grafo: FlowGraph, deId: string): string | null {
  const aresta = grafo.edges.find((e) => e.from === deId && e.handle === "next");
  return aresta ? aresta.to : null;
}

export function proximoPorBotao(
  grafo: FlowGraph,
  deId: string,
  indice: number
): string | null {
  const aresta = grafo.edges.find(
    (e) => e.from === deId && e.handle === `btn:${indice}`
  );
  return aresta ? aresta.to : null;
}
