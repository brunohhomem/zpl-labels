type ExportBody = {
  zpl?: string;
  density?: string;
  width?: number;
  height?: number;
  apiHost?: string;
  apiKey?: string;
};

function getLabelaryUrl(body: ExportBody) {
  const density = body.density || "8";
  const width = Number(body.width || 4);
  const height = Number(body.height || 6);
  const host = (body.apiHost || "https://api.labelary.com").replace(/\/$/, "");
  return `${host}/v1/printers/${density}dpmm/labels/${width}x${height}/0/`;
}

function getHeaders(body: ExportBody) {
  const headers: HeadersInit = {
    Accept: "application/pdf",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (body.apiKey) headers.Authorization = `Bearer ${body.apiKey}`;
  return headers;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ExportBody;
  if (!body.zpl?.trim()) {
    return Response.json({ error: "ZPL vazio." }, { status: 400 });
  }

  const upstream = await fetch(getLabelaryUrl(body), {
    method: "POST",
    headers: getHeaders(body),
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
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="etiquetas-zpl.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
