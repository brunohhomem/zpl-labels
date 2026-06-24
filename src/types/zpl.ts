export type ZplFile = {
  id: string;
  name: string;
  fileName: string;
  zpl: string;
  sizeKb: number;
  hasGraphic: boolean;
};

export type LabelSettings = {
  autoDetect: boolean;
  density: string;
  width: number;
  height: number;
  unit: "in";
  apiHost: string;
  apiKey: string;
};

export type LabelDimensions = {
  width: number;
  height: number;
  format: string;
  orientation: "retrato" | "paisagem";
  detected: boolean;
};

export type PreviewItem = {
  name: string;
  url: string;
  format: string;
};

export type ExportQueueItem = {
  name: string;
  zpl: string;
};

export type ExportProgress = {
  total: number;
  done: number;
  current: string;
};

export type BatchMode = "all" | "selected";
