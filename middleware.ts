import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Rotas que continuam públicas mesmo sem login: a própria tela de login,
// o webhook do Instagram (é a Meta quem chama, não uma pessoa logada) e o
// callback do OAuth (a Meta redireciona o navegador da pessoa pra cá).
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/webhook",
  "/api/oauth",
  "/api/cron",
  "/privacidade",
  "/termos",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await isValidSession(cookie);

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
