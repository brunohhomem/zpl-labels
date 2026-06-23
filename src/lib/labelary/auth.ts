export async function validateAccessPassword(password: string) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Senha invalida." }));
    throw new Error(payload.error || "Senha invalida.");
  }
}
