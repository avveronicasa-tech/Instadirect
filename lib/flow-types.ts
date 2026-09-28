// Um fluxo é uma árvore de "nós". Cada nó sabe pra qual nó ir em seguida.
// Isso é serializado como JSON e guardado em flows.grafo.

export type OpcaoResposta = {
  id: string;
  texto: string;
  proximo: string | null; // id do próximo nó, ou null = fim do fluxo
};

export type NoMensagem = {
  id: string;
  tipo: "mensagem";
  texto: string;
  botaoTexto?: string;
  botaoUrl?: string;
  // Se tiver opções, a mensagem vira um "quick reply" — o fluxo para aqui
  // até a pessoa escolher uma opção. Sem opções, segue direto pro próximo.
  opcoes: OpcaoResposta[];
  proximo: string | null;
};

export type NoEsperar = {
  id: string;
  tipo: "esperar";
  minutos: number;
  proximo: string | null;
};

export type NoPedirEmail = {
  id: string;
  tipo: "pedir_email";
  texto: string;
  proximo: string | null;
};

export type NoEtiquetar = {
  id: string;
  tipo: "etiquetar";
  etiqueta: string;
  proximo: string | null;
};

export type FlowNode = NoMensagem | NoEsperar | NoPedirEmail | NoEtiquetar;

export type FlowGraph = {
  inicio: string | null;
  nos: Record<string, FlowNode>;
};

export const grafoVazio: FlowGraph = { inicio: null, nos: {} };

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function rotuloTipo(tipo: FlowNode["tipo"]): string {
  switch (tipo) {
    case "mensagem":
      return "Enviar mensagem";
    case "esperar":
      return "Esperar";
    case "pedir_email":
      return "Pedir e-mail";
    case "etiquetar":
      return "Etiquetar";
  }
}
