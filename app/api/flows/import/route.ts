import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";
import { grafoVazio, type FlowGraph } from "@/lib/flow-types";

// Aceita tanto um fluxo único ({ nome, gatilho_palavra, grafo }) quanto uma
// lista de fluxos ([{ ... }, { ... }]) — igual ao "pacote inteiro" do
// DirectPro original. Tudo entra pausado (ativo = false).
export async function POST(req: NextRequest) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json(
      { erro: "Conecte uma conta do Instagram antes de importar fluxos." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ erro: "Arquivo inválido." }, { status: 400 });
  }

  const lista = Array.isArray(body) ? body : [body];
  const criados = [];

  for (const item of lista) {
    const grafo: FlowGraph =
      item.grafo && typeof item.grafo === "object" ? item.grafo : grafoVazio;

    const [fluxo] = await query(
      `insert into flows (nome, gatilho_palavra, grafo, ativo, account_id)
       values ($1, $2, $3, false, $4)
       returning *`,
      [
        item.nome || "Fluxo importado",
        null, // o gatilho é sempre de UMA conta específica; a pessoa define de novo
        JSON.stringify(grafo),
        conta.id,
      ]
    );
    criados.push(fluxo);
  }

  return NextResponse.json({ ok: true, criados });
}
