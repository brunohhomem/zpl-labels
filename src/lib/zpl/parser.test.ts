import { describe, expect, it } from "vitest";
import { getLabelDimensions, splitPrintableZpl } from "@/lib/zpl/parser";
import type { LabelSettings, ZplFile } from "@/types/zpl";

const settings: LabelSettings = {
  autoDetect: true,
  density: "8",
  width: 4,
  height: 6,
  unit: "in",
  apiHost: "https://api.labelary.com",
  apiKey: "",
};

describe("getLabelDimensions", () => {
  it("usa as dimensoes manuais quando a leitura automatica esta desligada", () => {
    const dimensions = getLabelDimensions("^XA^PW640^LL200^XZ", {
      ...settings,
      autoDetect: false,
      width: 2,
      height: 3,
    });

    expect(dimensions).toEqual({
      width: 2,
      height: 3,
      format: "2 x 3 in - retrato (manual)",
      orientation: "retrato",
      detected: false,
    });
  });

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

  it("considera a largura de ^FB ao detectar a etiqueta QEIT76488", () => {
    const zpl = `^XA^CI28
^LH0,0
^FO30,15^BY2,,0^BCN,54,N,N^FDQEIT76488^FS
^FO105,75^A0N,20,25^FH^FDQEIT76488^FS
^FO105,76^A0N,20,25^FH^FDQEIT76488^FS
^FO16,115^A0N,18,18^FB300,2,2,L^FH^FDChave De Seta Uno 2003 2004 2005 At_C3_A9 2008 _2D 91458^FS
^FO16,153^A0N,18,18^FB300,1,0,L^FH^FD^FS
^FO15,153^A0N,18,18^FB300,1,0,L^FH^FD^FS
^FO16,172^A0N,18,18^FH^FDSKU: F0803/FI91458
^FS
^XZ`;

    expect(getLabelDimensions(zpl, settings)).toMatchObject({
      width: 1.57,
      height: 0.98,
      orientation: "paisagem",
      detected: true,
    });
    expect(getLabelDimensions(zpl, settings).format).toBe(
      "40 x 25 mm - paisagem (conteudo ZPL)"
    );
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
