import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/db";
import { authorizeUrl } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const appId = await getSetting("ig_app_id");
  if (!appId) {
    return NextResponse.redirect(
      new URL("/setup?erro=credenciais-faltando", req.url)
    );
  }

  const redirectUri = new URL("/api/oauth/instagram/callback", req.url).toString();
  const url = authorizeUrl({ appId, redirectUri });
  return NextResponse.redirect(url);
}
