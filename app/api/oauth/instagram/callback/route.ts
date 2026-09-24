import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
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

    await setSetting("ig_access_token", longo.access_token);
    await setSetting("ig_user_id", perfil.user_id);
    await setSetting("ig_username", perfil.username);
    await setSetting(
      "ig_token_expira_em",
      String(Date.now() + longo.expires_in * 1000)
    );

    return NextResponse.redirect(new URL("/?conectado=1", req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.redirect(
      new URL(`/setup?erro=${encodeURIComponent(msg)}`, req.url)
    );
  }
}
