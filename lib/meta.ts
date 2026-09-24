// Helpers para a "Instagram API with Instagram Login" da Meta.
// Documentação oficial: https://developers.facebook.com/docs/instagram-platform
//
// Fluxo usado aqui:
// 1) authorizeUrl()      -> monta o link que o dono da conta clica pra autorizar
// 2) exchangeCodeForToken() -> troca o "code" do redirect por um token de curta duração
// 3) exchangeForLongLivedToken() -> troca por um token de 60 dias
// 4) sendMessage()        -> manda a DM pelo Graph API
// 5) refreshLongLivedToken() -> renovado pelo cron diário, antes de expirar

const GRAPH_VERSION = "v21.0";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export function authorizeUrl(params: {
  appId: string;
  redirectUri: string;
  state?: string;
}): string {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", IG_SCOPES);
  url.searchParams.set("response_type", "code");
  if (params.state) url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; user_id: string }> {
  const body = new URLSearchParams({
    client_id: params.appId,
    client_secret: params.appSecret,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });

  if (!res.ok) {
    throw new Error(`Falha ao trocar o code por token: ${await res.text()}`);
  }
  return res.json();
}

export async function exchangeForLongLivedToken(params: {
  appSecret: string;
  shortLivedToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("access_token", params.shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Falha ao gerar token de longa duração: ${await res.text()}`);
  }
  return res.json();
}

export async function refreshLongLivedToken(params: {
  accessToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Falha ao renovar token: ${await res.text()}`);
  }
  return res.json();
}

export async function getProfile(accessToken: string): Promise<{
  user_id: string;
  username: string;
}> {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Falha ao buscar perfil: ${await res.text()}`);
  }
  return res.json();
}

export async function sendMessage(params: {
  accessToken: string;
  igUserId: string;
  recipientId: string;
  text?: string;
  buttonText?: string;
  buttonUrl?: string;
}): Promise<void> {
  const message = params.buttonUrl
    ? {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: params.text || "",
            buttons: [
              {
                type: "web_url",
                url: params.buttonUrl,
                title: params.buttonText || "Abrir link",
              },
            ],
          },
        },
      }
    : { text: params.text || "" };

  const url = new URL(
    `https://graph.instagram.com/${GRAPH_VERSION}/${params.igUserId}/messages`
  );
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: params.recipientId }, message }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar mensagem: ${await res.text()}`);
  }
}

export async function replyToComment(params: {
  accessToken: string;
  commentId: string;
  text: string;
}): Promise<void> {
  const url = new URL(
    `https://graph.instagram.com/${GRAPH_VERSION}/${params.commentId}/replies`
  );
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: params.text }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao responder comentário: ${await res.text()}`);
  }
}
