type RenderBody = {
  zpl?: string;
  density?: string;
  width?: number;
  height?: number;
  index?: number;
  apiHost?: string;
  apiKey?: string;
};

function getLabelaryUrl(body: RenderBody) {
  const density = body.density || "8";
  const width = Number(body.width || 4);
  const height = Number(body.height || 6);
  const index = Number.isFinite(body.index) ? body.index : 0;
  const host = (body.apiHost || "https://api.labelary.com").replace(/\/$/, "");
  return `${host}/v1/printers/${density}dpmm/labels/${width}x${height}/${index}/`;
}

function getHeaders(body: RenderBody, accept: string) {
  const headers: HeadersInit = {
    Accept: accept,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (body.apiKey) headers.Authorization = `Bearer ${body.apiKey}`;
  return headers;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RenderBody;
  if (!body.zpl?.trim()) {
    return Response.json({ error: "ZPL vazio." }, { status: 400 });
  }

  const upstream = await fetch(getLabelaryUrl(body), {
    method: "POST",
    headers: getHeaders(body, "image/png"),
    body: body.zpl,
    cache: "no-store",
  });

  const bytes = await upstream.arrayBuffer();
  if (!upstream.ok) {
    return new Response(bytes, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8" },
    });
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
