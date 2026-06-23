import type { ExportQueueItem, LabelDimensions, LabelSettings, ZplFile } from "@/types/zpl";

function roundDimension(value: number) {
  return Math.round(value * 100) / 100;
}

function isDoubleLandscapeLabel(zpl: string) {
  const coordinates = Array.from(zpl.matchAll(/\^FO(\d+),(\d+)/gi));
  if (!coordinates.length) return false;

  const hasLeftColumn = coordinates.some((match) => Number(match[1]) < 320);
  const hasRightColumn = coordinates.some((match) => Number(match[1]) >= 320);
  const maxY = Math.max(...coordinates.map((match) => Number(match[2])));

  return hasLeftColumn && hasRightColumn && maxY <= 250;
}

function getContentOrientation(zpl: string) {
  const coordinates = Array.from(zpl.matchAll(/\^(?:FO|FT)(\d+),(\d+)/gi));
  if (!coordinates.length) return null;

  const maxX = Math.max(...coordinates.map((match) => Number(match[1])));
  const maxY = Math.max(...coordinates.map((match) => Number(match[2])));

  if (maxX > maxY * 1.35) return "paisagem" as const;
  if (maxY > maxX * 1.35) return "retrato" as const;
  return null;
}

export function parseZplFile(raw: string, fileName: string): ZplFile[] {
  const zpl = raw.replace(/\r\n/g, "\n").trim();
  if (!zpl) return [];

  return [{
    id: `${fileName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: fileName.replace(/\.(txt|zpl)$/i, ""),
    fileName,
    zpl,
    sizeKb: Math.max(1, Math.round(new Blob([zpl]).size / 1024)),
    hasGraphic: /~DG|\^XG/i.test(zpl),
  }];
}

export function getLabelDimensions(
  zpl: string,
  fallback: Pick<LabelSettings, "width" | "height" | "density">
): LabelDimensions {
  const printWidth = zpl.match(/\^PW(\d+)/i);
  const labelLength = zpl.match(/\^LL(\d+)/i);

  if (printWidth && labelLength) {
    const dotsPerInch = Number(fallback.density) * 25.4;
    const width = roundDimension(Number(printWidth[1]) / dotsPerInch);
    const height = roundDimension(Number(labelLength[1]) / dotsPerInch);
    const orientation = width > height ? "paisagem" : "retrato";

    return { width, height, format: `${width} x ${height} in - ${orientation} (ZPL)`, orientation, detected: true };
  }

  if (isDoubleLandscapeLabel(zpl)) {
    return { width: 3.15, height: 0.98, format: "80 x 25 mm - paisagem", orientation: "paisagem", detected: true };
  }

  const graphicDefinition = zpl.match(/~DG[^,]*,(\d+),(\d+),/i);
  if (graphicDefinition && /\^FO0,0\^XG/i.test(zpl)) {
    const totalBytes = Number(graphicDefinition[1]);
    const bytesPerRow = Number(graphicDefinition[2]);
    const dotsPerInch = Number(fallback.density) * 25.4;
    const width = roundDimension((bytesPerRow * 8) / dotsPerInch);
    const height = roundDimension((totalBytes / bytesPerRow) / dotsPerInch);
    const orientation = width > height ? "paisagem" : "retrato";

    return { width, height, format: `${width} x ${height} in - ${orientation} (grafico ZPL)`, orientation, detected: true };
  }

  const inferredOrientation = getContentOrientation(zpl);
  const shortSide = Math.min(fallback.width, fallback.height);
  const longSide = Math.max(fallback.width, fallback.height);
  const orientation = inferredOrientation || (fallback.width > fallback.height ? "paisagem" : "retrato");
  const width = orientation === "paisagem" ? longSide : shortSide;
  const height = orientation === "paisagem" ? shortSide : longSide;

  return {
    width,
    height,
    format: `${width} x ${height} in - ${orientation}${inferredOrientation ? " (automatico)" : ""}`,
    orientation,
    detected: Boolean(inferredOrientation),
  };
}

export function splitPrintableZpl(file: ZplFile): ExportQueueItem[] {
  const content = file.zpl.trim();
  const matches = Array.from(content.matchAll(/\^XA[\s\S]*?\^XZ/g));
  if (!matches.length) return [{ name: file.name, zpl: content }];

  const globalPrefix = content.slice(0, matches[0].index ?? 0).trim();
  let previousEnd = 0;
  let printableIndex = 0;
  const items: ExportQueueItem[] = [];

  for (const match of matches) {
    const block = match[0].trim();
    const start = match.index ?? 0;
    const prefix = content.slice(previousEnd, start).trim() || globalPrefix;
    previousEnd = start + match[0].length;

    if (/^\^XA\s*\^ID/i.test(block) || block.includes("^IDR:")) continue;

    printableIndex += 1;
    items.push({
      name: matches.length > 1 ? `${file.name} - etiqueta ${printableIndex}` : file.name,
      zpl: [prefix, block].filter(Boolean).join("\n"),
    });
  }

  return items.length ? items : [{ name: file.name, zpl: content }];
}

export function updateZplFile(file: ZplFile, zpl: string): ZplFile {
  return {
    ...file,
    zpl,
    sizeKb: Math.max(1, Math.round(new Blob([zpl]).size / 1024)),
    hasGraphic: /~DG|\^XG/i.test(zpl),
  };
}
