export const SESSION_COOKIE = "id_session";

// Gera um token determinístico a partir da própria ADMIN_PASSWORD.
// Não precisa de um segredo extra: se a senha bater, o token bate.
export async function tokenFromPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`instadirect:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(
  cookieValue: string | undefined
): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !cookieValue) return false;
  const expected = await tokenFromPassword(adminPassword);
  return cookieValue === expected;
}
