import dagre from "dagre";
import { Position, type Node, type Edge } from "reactflow";

const LARGURA_PADRAO = 260;
const ALTURA_PADRAO = 140;

export function organizarLayout(
  nos: Node[],
  arestas: Edge[]
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });

  for (const no of nos) {
    g.setNode(no.id, {
      width: no.width ?? LARGURA_PADRAO,
      height: no.height ?? ALTURA_PADRAO,
    });
  }
  for (const aresta of arestas) {
    g.setEdge(aresta.source, aresta.target);
  }

  dagre.layout(g);

  return nos.map((no) => {
    const pos = g.node(no.id);
    const largura = no.width ?? LARGURA_PADRAO;
    const altura = no.height ?? ALTURA_PADRAO;
    return {
      ...no,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: { x: pos.x - largura / 2, y: pos.y - altura / 2 },
    };
  });
}
