import { NextResponse } from "next/server";
import { listarContas } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

export async function GET() {
  const [contas, ativa] = await Promise.all([listarContas(), getContaAtiva()]);

  return NextResponse.json(
    contas.map((c) => ({
      id: c.id,
      username: c.username,
      igUserId: c.ig_user_id,
      ativa: ativa?.id === c.id,
    }))
  );
}
