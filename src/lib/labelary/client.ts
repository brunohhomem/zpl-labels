import { PDFDocument } from "pdf-lib";
import { MAX_RATE_LIMIT_RETRIES, RATE_LIMIT_RETRY_MS } from "@/lib/zpl/constants";
import { getLabelDimensions } from "@/lib/zpl/parser";
import type { ExportQueueItem, LabelSettings } from "@/types/zpl";

export function formatLabelaryError(status: number, message: string) {
  if (message.includes("exceeds the maximum allowed") || message.includes("2 MB")) {
    return "O Labelary recusou a requisicao porque imagens/fontes embutidas passaram de 2 MB. Remova arquivos da lista ou exporte um arquivo por vez.";
  }
  if (status === 429) return "A API do Labelary limitou as requisições. Aguarde um pouco e tente novamente.";
  if (status === 413) return "O ZPL ficou grande demais para a renderização. Remova arquivos da lista ou exporte em partes.";
  return message || `Falha na renderização (${status}).`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function renderZplPreview(job: ExportQueueItem, settings: LabelSettings) {
  const dimensions = getLabelDimensions(job.zpl, settings);
  const response = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, ...dimensions, zpl: job.zpl, index: 0 }),
  });

  if (!response.ok) {
    throw new Error(`${job.name}: ${formatLabelaryError(response.status, await response.text())}`);
  }

  return { blob: await response.blob(), dimensions };
}

export async function convertZplToPdf(
  job: ExportQueueItem,
  settings: LabelSettings,
  queuePosition: number,
  total: number,
  onRateLimit: (message: string) => void
) {
  const dimensions = getLabelDimensions(job.zpl, settings);

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, ...dimensions, zpl: job.zpl }),
    });

    if (response.ok) return response.arrayBuffer();

    const message = await response.text();
    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const waitMs = RATE_LIMIT_RETRY_MS * (attempt + 1);
      onRateLimit(`Limite da API atingido em ${job.name}. Aguardando ${Math.round(waitMs / 1000)}s para tentar novamente (${queuePosition}/${total}).`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`${job.name}: ${formatLabelaryError(response.status, message)}`);
  }

  throw new Error(`${job.name}: limite de tentativas atingido.`);
}

export async function mergePdfDocuments(documents: ArrayBuffer[]) {
  const mergedPdf = await PDFDocument.create();

  for (const bytes of documents) {
    const sourcePdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
