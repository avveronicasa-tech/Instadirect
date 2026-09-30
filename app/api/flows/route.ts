import { NextRequest, NextResponse } from "next/server";
import { listarFluxos, query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";
import { grafoVazio } from "@/lib/flow-types";

export async function GET() {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json([]);
  const fluxos = await listarFluxos(conta.id);
  return NextResponse.json(fluxos);
}

export async function POST(req: NextRequest) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json(
      { erro: "Conecte uma conta do Instagram antes de criar fluxos." },
      { status: 400 }
    );
  }

  const { nome } = await req.json();
  const [fluxo] = await query(
    `insert into flows (nome, trigger, match_type, keywords, public_replies, grafo, ativo, account_id)
     values ($1, 'comment', 'contains', '{}', '{}', $2, false, $3)
     returning *`,
    [nome || "Novo fluxo", JSON.stringify(grafoVazio()), conta.id]
  );

  return NextResponse.json(fluxo, { status: 201 });
}
