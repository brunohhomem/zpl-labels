export type LabelaryRequestBody = {
  zpl?: string;
  density?: string;
  width?: number;
  height?: number;
  index?: number;
  apiHost?: string;
  apiKey?: string;
};

type LabelaryFormat = "image/png" | "application/pdf";

function getLabelaryUrl(body: LabelaryRequestBody) {
  const density = body.density || "8";
  const width = Number(body.width || 4);
  const height = Number(body.height || 6);
  const index = Number.isFinite(body.index) ? body.index : 0;
  const host = (body.apiHost || "https://api.labelary.com").replace(/\/$/, "");
  return `${host}/v1/printers/${density}dpmm/labels/${width}x${height}/${index}/`;
}

function getHeaders(body: LabelaryRequestBody, accept: LabelaryFormat) {
  const headers: HeadersInit = {
    Accept: accept,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (body.apiKey) headers.Authorization = `Bearer ${body.apiKey}`;
  return headers;
}

export async function proxyLabelaryRequest(request: Request, accept: LabelaryFormat) {
  const body = (await request.json()) as LabelaryRequestBody;
  if (!body.zpl?.trim()) return Response.json({ error: "ZPL vazio." }, { status: 400 });

  const upstream = await fetch(getLabelaryUrl(body), {
    method: "POST",
    headers: getHeaders(body, accept),
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

  const headers: HeadersInit = { "Content-Type": accept, "Cache-Control": "no-store" };
  if (accept === "application/pdf") headers["Content-Disposition"] = 'attachment; filename="etiquetas-zpl.pdf"';
  return new Response(bytes, { headers });
}
