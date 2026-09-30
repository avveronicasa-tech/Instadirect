import { NextRequest, NextResponse } from "next/server";
import { getFluxo, query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });

  const { id } = await params;
  const fluxo = await getFluxo(Number(id), conta.id);
  if (!fluxo) return NextResponse.json({ erro: "Fluxo não encontrado." }, { status: 404 });

  return NextResponse.json(fluxo);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  const campos: string[] = [];
  const valores: unknown[] = [];
  let i = 1;

  if (typeof body.nome === "string") {
    campos.push(`nome = $${i++}`);
    valores.push(body.nome);
  }
  if (typeof body.descricao === "string") {
    campos.push(`descricao = $${i++}`);
    valores.push(body.descricao || null);
  }
  if (["comment", "story_reply", "dm"].includes(body.trigger)) {
    campos.push(`trigger = $${i++}`);
    valores.push(body.trigger);
  }
  if (["contains", "exact"].includes(body.match_type)) {
    campos.push(`match_type = $${i++}`);
    valores.push(body.match_type);
  }
  if (Array.isArray(body.keywords)) {
    campos.push(`keywords = $${i++}`);
    valores.push(body.keywords.filter((k: unknown) => typeof k === "string" && k.trim()));
  }
  if (Array.isArray(body.public_replies)) {
    campos.push(`public_replies = $${i++}`);
    valores.push(
      body.public_replies.filter((k: unknown) => typeof k === "string" && k.trim())
    );
  }
  if (body.grafo !== undefined) {
    campos.push(`grafo = $${i++}`);
    valores.push(JSON.stringify(body.grafo));
  }
  if (typeof body.ativo === "boolean") {
    campos.push(`ativo = $${i++}`);
    valores.push(body.ativo);
  }

  if (campos.length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  valores.push(Number(id), conta.id);
  const [fluxo] = await query(
    `update flows set ${campos.join(", ")} where id = $${i++} and account_id = $${i} returning *`,
    valores
  );

  return NextResponse.json(fluxo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });

  const { id } = await params;
  await query("delete from flows where id = $1 and account_id = $2", [
    Number(id),
    conta.id,
  ]);
  return NextResponse.json({ ok: true });
}
