import type { LabelSettings } from "@/types/zpl";

export const demoZpl = `^XA
^CF0,48
^FO42,44^FDZPL Etiqueta^FS
^CF0,28
^FO42,105^FDPreview local via Labelary^FS
^FO42,160^GB690,3,3^FS
^BY3,2,110
^FO70,205^BCN,110,Y,N,N^FD1234567890^FS
^CF0,34
^FO42,380^FDArquivo de exemplo^FS
^FO42,428^FDUse TXT/ZPL em lote para exportar PDF.^FS
^XZ`;

export const defaultSettings: LabelSettings = {
  autoDetect: true,
  density: "8",
  width: 4,
  height: 6,
  unit: "in",
  apiHost: "https://api.labelary.com",
  apiKey: "",
};

export const REQUEST_DELAY_MS = 450;
export const RATE_LIMIT_RETRY_MS = 1500;
export const MAX_RATE_LIMIT_RETRIES = 4;
