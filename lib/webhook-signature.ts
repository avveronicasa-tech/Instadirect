export async function verifySignature(params: {
  appSecret: string;
  rawBody: string;
  signatureHeader: string | null;
}): Promise<boolean> {
  if (!params.signatureHeader) return false;
  const [algo, hexSignature] = params.signatureHeader.split("=");
  if (algo !== "sha256" || !hexSignature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(params.appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(params.rawBody)
  );
  const computedHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparação em tempo constante.
  if (computedHex.length !== hexSignature.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ hexSignature.charCodeAt(i);
  }
  return diff === 0;
}
