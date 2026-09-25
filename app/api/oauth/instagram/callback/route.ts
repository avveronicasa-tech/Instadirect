import { NextRequest, NextResponse } from "next/server";
import { getSetting, salvarOuAtualizarConta } from "@/lib/db";
import { CONTA_ATIVA_COOKIE } from "@/lib/active-account";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getProfile,
} from "@/lib/meta";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const erro = req.nextUrl.searchParams.get("error_description");

  if (erro) {
    return NextResponse.redirect(
      new URL(`/setup?erro=${encodeURIComponent(erro)}`, req.url)
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/setup?erro=sem-code", req.url));
  }

  const appId = await getSetting("ig_app_id");
  const appSecret = await getSetting("ig_app_secret");
  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL("/setup?erro=credenciais-faltando", req.url)
    );
  }

  try {
    const redirectUri = new URL(
      "/api/oauth/instagram/callback",
      req.url
    ).toString();

    const curto = await exchangeCodeForToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    const longo = await exchangeForLongLivedToken({
      appSecret,
      shortLivedToken: curto.access_token,
    });

    const perfil = await getProfile(longo.access_token);

    // Salva (ou atualiza, se já existir) essa conta na lista de contas
    // conectadas — nunca sobrescreve as outras.
    const contaId = await salvarOuAtualizarConta({
      igUserId: perfil.user_id,
      username: perfil.username,
      accessToken: longo.access_token,
      expiraEm: Date.now() + longo.expires_in * 1000,
    });

    const res = NextResponse.redirect(new URL("/?conectado=1", req.url));
    // A conta que acabou de ser conectada já vira a conta ativa.
    res.cookies.set(CONTA_ATIVA_COOKIE, String(contaId), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.redirect(
      new URL(`/setup?erro=${encodeURIComponent(msg)}`, req.url)
    );
  }
}
