import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { refreshLongLivedToken } from "@/lib/meta";

export async function GET() {
  const accessToken = await getSetting("ig_access_token");
  if (!accessToken) {
    return NextResponse.json({ ok: true, motivo: "nenhuma conta conectada" });
  }

  try {
    const renovado = await refreshLongLivedToken({ accessToken });
    await setSetting("ig_access_token", renovado.access_token);
    await setSetting(
      "ig_token_expira_em",
      String(Date.now() + renovado.expires_in * 1000)
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
