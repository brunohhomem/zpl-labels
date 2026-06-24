import { describe, expect, it } from "vitest";
import { getLabelDimensions, splitPrintableZpl } from "@/lib/zpl/parser";
import type { LabelSettings, ZplFile } from "@/types/zpl";

const settings: LabelSettings = {
  density: "8",
  width: 4,
  height: 6,
  unit: "in",
  apiHost: "https://api.labelary.com",
  apiKey: "",
};

describe("getLabelDimensions", () => {
  it("prioriza dimensoes explicitas de uma etiqueta paisagem", () => {
    const dimensions = getLabelDimensions("^XA^PW640^LL200^XZ", settings);

    expect(dimensions).toMatchObject({
      width: 3.15,
      height: 0.98,
      orientation: "paisagem",
      detected: true,
    });
  });

  it("detecta uma imagem ^GFA de pagina inteira em paisagem", () => {
    const dimensions = getLabelDimensions(
      "^XA^FO0,0^GFA,16000,16000,80,ABCDEF^FS^XZ",
      settings
    );

    expect(dimensions).toMatchObject({
      width: 3.15,
      height: 0.98,
      orientation: "paisagem",
      detected: true,
    });
    expect(dimensions.format).toContain("grafico ZPL");
  });

  it("reconhece o modelo validado de duas colunas como 80 x 25 mm", () => {
    const dimensions = getLabelDimensions(
      [
        "^XA",
        "^FO20,20^FDEsquerda 1^FS",
        "^FO20,100^FDEsquerda 2^FS",
        "^FO360,20^FDDireita 1^FS",
        "^FO360,100^FDDireita 2^FS",
        "^XZ",
      ].join("\n"),
      settings
    );

    expect(dimensions).toMatchObject({
      width: 3.15,
      height: 0.98,
      orientation: "paisagem",
      detected: true,
    });
    expect(dimensions.format).toBe("80 x 25 mm - paisagem");
  });

  it("mantem uma imagem ^GFA 4 x 6 em retrato", () => {
    const dimensions = getLabelDimensions(
      "^XA^FO0,0^GFA,124848,124848,102,ABCDEF^FS^XZ",
      settings
    );

    expect(dimensions).toMatchObject({
      width: 4.02,
      height: 6.02,
      orientation: "retrato",
      detected: true,
    });
  });

  it("nao usa as dimensoes de um ^GFA que nao ocupa a pagina inteira", () => {
    const dimensions = getLabelDimensions(
      "^XA^FO100,100^GFA,16000,16000,80,ABCDEF^FS^XZ",
      settings
    );

    expect(dimensions).toMatchObject({
      width: 4,
      height: 6,
      orientation: "retrato",
      detected: false,
    });
  });

  it("troca os lados configurados quando as coordenadas indicam paisagem", () => {
    const dimensions = getLabelDimensions(
      "^XA^FO20,20^FDInicio^FS^FO700,120^FDFim^FS^XZ",
      settings
    );

    expect(dimensions).toMatchObject({
      width: 6,
      height: 4,
      orientation: "paisagem",
      detected: true,
    });
  });
});

describe("splitPrintableZpl", () => {
  it("separa etiquetas, ignora limpeza e preserva o prefixo grafico", () => {
    const file: ZplFile = {
      id: "lote",
      name: "lote",
      fileName: "lote.zpl",
      zpl: [
        "~DGR:LOGO.GRF,8,1,FF",
        "^XA^IDR:ANTIGO.GRF^FS^XZ",
        "^XA^FO0,0^XGR:LOGO.GRF,1,1^FS^XZ",
        "^XA^PW640^LL200^FO20,20^FDSegunda^FS^XZ",
      ].join("\n"),
      sizeKb: 1,
      hasGraphic: true,
    };

    const labels = splitPrintableZpl(file);

    expect(labels).toHaveLength(2);
    expect(labels[0].zpl).toContain("~DGR:LOGO.GRF");
    expect(labels[0].zpl).toContain("^XGR:LOGO.GRF");
    expect(labels[1].zpl).toContain("^PW640^LL200");
    expect(labels.map((label) => label.name)).toEqual([
      "lote - etiqueta 1",
      "lote - etiqueta 2",
    ]);
  });
});
