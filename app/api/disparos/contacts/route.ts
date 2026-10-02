import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

const JANELA_HORAS = 24;

export async function GET() {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json([]);

  const contatos = await query<{
    ig_user_id: string;
    username: string | null;
    ultima_interacao_em: string;
  }>(
    `select ig_user_id, username, ultima_interacao_em
     from contacts
     where account_id = $1
     order by ultima_interacao_em desc`,
    [conta.id]
  );

  const agora = Date.now();
  const resultado = contatos.map((c) => {
    const interacao = new Date(c.ultima_interacao_em).getTime();
    const limiteMs = interacao + JANELA_HORAS * 60 * 60 * 1000;
    const horasRestantes = (limiteMs - agora) / (1000 * 60 * 60);
    return {
      igUserId: c.ig_user_id,
      username: c.username,
      horasRestantes: Math.max(0, horasRestantes),
      expirado: horasRestantes <= 0,
    };
  });

  // Quem está mais perto de expirar aparece primeiro — é quem precisa de
  // resposta mais urgente, igual ao comportamento original.
  resultado.sort((a, b) => a.horasRestantes - b.horasRestantes);

  return NextResponse.json(resultado);
}
