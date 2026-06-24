import type { ExportQueueItem, LabelDimensions, LabelSettings, ZplFile } from "@/types/zpl";

function roundDimension(value: number) {
  return Math.round(value * 100) / 100;
}

function dimensionsFromDots(widthDots: number, heightDots: number, density: string) {
  const dotsPerInch = Number(density) * 25.4;
  if (!Number.isFinite(dotsPerInch) || dotsPerInch <= 0 || widthDots <= 0 || heightDots <= 0) {
    return null;
  }

  return {
    width: roundDimension(widthDots / dotsPerInch),
    height: roundDimension(heightDots / dotsPerInch),
  };
}

function getFullPageGraphicDimensions(zpl: string, density: string) {
  const downloadedGraphic = zpl.match(/~DG[^,]*,(\d+),(\d+),/i);
  if (downloadedGraphic && /\^FO0\s*,\s*0\s*\^XG/i.test(zpl)) {
    const totalBytes = Number(downloadedGraphic[1]);
    const bytesPerRow = Number(downloadedGraphic[2]);
    return dimensionsFromDots(bytesPerRow * 8, totalBytes / bytesPerRow, density);
  }

  const inlineGraphic = zpl.match(/\^FO0\s*,\s*0\s*\^GFA,(\d+),(\d+),(\d+),/i);
  if (inlineGraphic) {
    const graphicFieldBytes = Number(inlineGraphic[2]);
    const bytesPerRow = Number(inlineGraphic[3]);
    return dimensionsFromDots(bytesPerRow * 8, graphicFieldBytes / bytesPerRow, density);
  }

  return null;
}

function isDoubleLandscapeLabel(zpl: string) {
  const coordinates = Array.from(zpl.matchAll(/\^FO(\d+),(\d+)/gi));
  if (coordinates.length < 4) return false;

  const hasLeftColumn = coordinates.some((match) => Number(match[1]) < 320);
  const hasRightColumn = coordinates.some((match) => Number(match[1]) >= 320);
  const maxX = Math.max(...coordinates.map((match) => Number(match[1])));
  const maxY = Math.max(...coordinates.map((match) => Number(match[2])));

  return hasLeftColumn && hasRightColumn && maxX <= 640 && maxY <= 250;
}

function getContentBounds(zpl: string) {
  const fields = Array.from(
    zpl.matchAll(/\^(?:FO|FT)(\d+),(\d+)([\s\S]*?)(?=\^(?:FO|FT)|\^XZ|$)/gi)
  );
  if (!fields.length) return null;

  let maxX = 0;
  let maxY = 0;

  for (const field of fields) {
    const x = Number(field[1]);
    const y = Number(field[2]);
    const commands = field[3];
    const fieldBlock = commands.match(/\^FB(\d+)(?:,(\d+))?(?:,(\d+))?/i);
    const font = commands.match(/\^A[^,]*,(\d+)(?:,(\d+))?/i);
    const barcode = commands.match(/\^BC[^,]*,(\d+)/i);
    const fontHeight = Number(font?.[1] || 0);
    const fieldLines = Math.max(1, Number(fieldBlock?.[2] || 1));
    const lineSpacing = Number(fieldBlock?.[3] || 0);
    const contentWidth = Number(fieldBlock?.[1] || 0);
    const contentHeight = Number(barcode?.[1] || 0)
      || (fontHeight * fieldLines + lineSpacing * (fieldLines - 1));

    maxX = Math.max(maxX, x + contentWidth);
    maxY = Math.max(maxY, y + contentHeight);
  }

  return { maxX, maxY };
}

function getContentBasedDimensions(zpl: string, density: string) {
  if (!/\^FB\d+/i.test(zpl)) return null;

  const bounds = getContentBounds(zpl);
  const dotsPerMillimeter = Number(density);
  if (!bounds || !Number.isFinite(dotsPerMillimeter) || dotsPerMillimeter <= 0) return null;

  const widthMillimeters = bounds.maxX / dotsPerMillimeter;
  const heightMillimeters = bounds.maxY / dotsPerMillimeter;
  if (widthMillimeters <= heightMillimeters * 1.35) return null;

  const roundedWidthMillimeters = Math.ceil(widthMillimeters / 5) * 5;
  const roundedHeightMillimeters = Math.ceil(heightMillimeters / 5) * 5;
  if (
    roundedWidthMillimeters > 50
    || roundedHeightMillimeters > 30
    || roundedWidthMillimeters < 20
    || roundedHeightMillimeters < 10
  ) {
    return null;
  }

  return {
    width: roundDimension(roundedWidthMillimeters / 25.4),
    height: roundDimension(roundedHeightMillimeters / 25.4),
    format: `${roundedWidthMillimeters} x ${roundedHeightMillimeters} mm - paisagem (conteudo ZPL)`,
  };
}

function getContentOrientation(zpl: string) {
  const bounds = getContentBounds(zpl);
  if (!bounds) return null;
  const { maxX, maxY } = bounds;

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
    const dimensions = dimensionsFromDots(Number(printWidth[1]), Number(labelLength[1]), fallback.density);
    if (!dimensions) {
      return getFallbackDimensions(zpl, fallback);
    }

    const { width, height } = dimensions;
    const orientation = width > height ? "paisagem" : "retrato";

    return { width, height, format: `${width} x ${height} in - ${orientation} (ZPL)`, orientation, detected: true };
  }

  if (isDoubleLandscapeLabel(zpl)) {
    return { width: 3.15, height: 0.98, format: "80 x 25 mm - paisagem", orientation: "paisagem", detected: true };
  }

  const graphicDimensions = getFullPageGraphicDimensions(zpl, fallback.density);
  if (graphicDimensions) {
    const { width, height } = graphicDimensions;
    const orientation = width > height ? "paisagem" : "retrato";

    return { width, height, format: `${width} x ${height} in - ${orientation} (grafico ZPL)`, orientation, detected: true };
  }

  const contentDimensions = getContentBasedDimensions(zpl, fallback.density);
  if (contentDimensions) {
    return {
      ...contentDimensions,
      orientation: "paisagem",
      detected: true,
    };
  }

  return getFallbackDimensions(zpl, fallback);
}

function getFallbackDimensions(
  zpl: string,
  fallback: Pick<LabelSettings, "width" | "height" | "density">
): LabelDimensions {
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
