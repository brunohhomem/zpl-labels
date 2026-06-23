type AuthBody = {
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AuthBody;
  const expectedPassword = process.env.APP_ACCESS_PASSWORD;

  if (!expectedPassword) {
    return Response.json({ error: "APP_ACCESS_PASSWORD nao configurada no servidor." }, { status: 500 });
  }

  if (body.password === expectedPassword) {
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Senha invalida." }, { status: 401 });
}
