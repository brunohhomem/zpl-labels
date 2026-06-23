"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Eye, FileText, Image as ImageIcon, Loader2, RotateCcw, Settings2, Trash2, Upload, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type ZplFile = {
  id: string;
  name: string;
  fileName: string;
  zpl: string;
  sizeKb: number;
  hasGraphic: boolean;
};

type Settings = {
  density: string;
  width: number;
  height: number;
  unit: "in";
  apiHost: string;
  apiKey: string;
};

const demoZpl = `^XA
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

const defaultSettings: Settings = {
  density: "8",
  width: 4,
  height: 6,
  unit: "in",
  apiHost: "https://api.labelary.com",
  apiKey: "",
};

function parseZplFile(raw: string, fileName: string): ZplFile[] {
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

function formatError(status: number, message: string) {
  if (message.includes("exceeds the maximum allowed") || message.includes("2 MB")) {
    return "O Labelary recusou a requisicao porque imagens/fontes embutidas passaram de 2 MB. Remova arquivos da lista ou exporte um arquivo por vez.";
  }
  if (status === 429) return "A API do Labelary limitou as requisições. Aguarde um pouco e tente novamente.";
  if (status === 413) return "O ZPL ficou grande demais para a renderização. Remova arquivos da lista ou exporte em partes.";
  return message || `Falha na renderização (${status}).`;
}

const REQUEST_DELAY_MS = 450;
const RATE_LIMIT_RETRY_MS = 1500;
const MAX_RATE_LIMIT_RETRIES = 4;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function Home() {
  const [jobs, setJobs] = useState<ZplFile[]>(() => parseZplFile(demoZpl, "demo.zpl"));
  const [selectedId, setSelectedId] = useState<string>("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ total: 0, done: 0, current: "" });
  const [status, setStatus] = useState("Pronto para renderizar.");
  const [batchMode, setBatchMode] = useState<"all" | "selected">("all");

  const selected = useMemo(() => jobs.find((job) => job.id === selectedId) || jobs[0], [jobs, selectedId]);
  const totalKb = useMemo(() => jobs.reduce((sum, job) => sum + job.sizeKb, 0), [jobs]);
  const progressPercent = exportProgress.total ? Math.round((exportProgress.done / exportProgress.total) * 100) : 0;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const parsed = (await Promise.all(
      files.map(async (file) => parseZplFile(await file.text(), file.name))
    )).flat();

    if (!parsed.length) {
      setStatus("Nenhum conteudo ZPL valido foi encontrado nos arquivos.");
      return;
    }

    setJobs(parsed);
    setSelectedId(parsed[0].id);
    setStatus(`${parsed.length} arquivo(s) carregado(s).`);
    event.target.value = "";
  }

  function updateSelectedZpl(zpl: string) {
    if (!selected) return;
    setJobs((current) => current.map((job) => job.id === selected.id ? { ...job, zpl, sizeKb: Math.max(1, Math.round(new Blob([zpl]).size / 1024)), hasGraphic: /~DG|\^XG/i.test(zpl) } : job));
  }

  async function renderPreview(targetFile = selected) {
    if (!targetFile) return;
    setSelectedId(targetFile.id);
    setIsRendering(true);
    setStatus("Renderizando PNG no Labelary...");
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, zpl: targetFile.zpl, index: 0 }),
      });
      if (!response.ok) throw new Error(formatError(response.status, await response.text()));
      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(nextUrl);
      setStatus(`Preview atualizado: ${targetFile.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel renderizar o arquivo.");
    } finally {
      setIsRendering(false);
    }
  }

  function removeFile(fileId: string) {
    const next = jobs.filter((job) => job.id !== fileId);
    setJobs(next);
    if (selectedId === fileId) {
      setSelectedId(next[0]?.id || "");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setStatus(next.length ? `${next.length} arquivo(s) na lista.` : "Lista de arquivos vazia.");
  }

  async function convertFileToPdf(job: ZplFile, queuePosition: number, total: number) {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, zpl: job.zpl }),
      });

      if (response.ok) return response.arrayBuffer();

      const message = await response.text();
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const waitMs = RATE_LIMIT_RETRY_MS * (attempt + 1);
        setStatus(`Limite da API atingido em ${job.name}. Aguardando ${Math.round(waitMs / 1000)}s para tentar novamente (${queuePosition}/${total}).`);
        await sleep(waitMs);
        continue;
      }

      throw new Error(`${job.name}: ${formatError(response.status, message)}`);
    }

    throw new Error(`${job.name}: limite de tentativas atingido.`);
  }

  async function exportPdf() {
    const exportJobs = batchMode === "all" ? jobs : selected ? [selected] : [];
    if (!exportJobs.length) return;

    setIsExporting(true);
    setExportProgress({ total: exportJobs.length, done: 0, current: exportJobs[0]?.name || "" });
    setStatus(`Fila iniciada: 0 de ${exportJobs.length} arquivo(s) convertidos.`);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const [index, job] of exportJobs.entries()) {
        const queuePosition = index + 1;
        setExportProgress({ total: exportJobs.length, done: index, current: job.name });
        setStatus(`Convertendo ${queuePosition} de ${exportJobs.length}: ${job.name}`);

        const pdfBytes = await convertFileToPdf(job, queuePosition, exportJobs.length);
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        setExportProgress({ total: exportJobs.length, done: queuePosition, current: job.name });

        if (queuePosition < exportJobs.length) {
          setStatus(`Convertido ${queuePosition} de ${exportJobs.length}. Aguardando ${REQUEST_DELAY_MS}ms antes do proximo envio.`);
          await sleep(REQUEST_DELAY_MS);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const pdfBuffer = new ArrayBuffer(mergedBytes.byteLength);
      new Uint8Array(pdfBuffer).set(mergedBytes);
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = batchMode === "all" ? "arquivos-zpl-lote.pdf" : `${selected?.name || "arquivo-zpl"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus(`PDF final gerado: ${exportJobs.length} arquivo(s) convertidos e unidos.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel exportar o PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  function resetDemo() {
    const parsed = parseZplFile(demoZpl, "demo.zpl");
    setJobs(parsed);
    setSelectedId(parsed[0]?.id || "");
    setPreviewUrl("");
    setStatus("Exemplo restaurado.");
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><FileText className="size-5" /></div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">ZPL Etiqueta</h1>
              <p className="text-xs text-muted-foreground">Renderizacao e exportacao PDF em lote para arquivos TXT/ZPL</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="secondary">{jobs.length} arquivo(s)</Badge>
            <Badge variant="outline">{totalKb} KB</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[430px_minmax(420px,1fr)_360px] lg:px-6">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="size-4" /> Arquivos ZPL</CardTitle>
              <CardDescription>Carregue um ou mais arquivos .txt ou .zpl. Cada arquivo aparece uma unica vez na lista; o conteudo ZPL interno fica preservado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="zpl-files" className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 p-4 text-center hover:bg-muted">
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium">Selecionar arquivos</span>
                <span className="text-xs text-muted-foreground">TXT, ZPL ou conteudo bruto com ^XA...^XZ</span>
              </Label>
              <Input id="zpl-files" type="file" multiple accept=".txt,.zpl,text/plain" className="hidden" onChange={handleFiles} />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => renderPreview()} disabled={!selected || isRendering}>{isRendering ? <Loader2 className="animate-spin" /> : <ImageIcon />} Preview</Button>
                <Button variant="outline" onClick={resetDemo}><RotateCcw /> Exemplo</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Arquivos carregados</CardTitle>
              <CardDescription>Selecione um arquivo para editar, revisar ou exportar separadamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[330px] pr-3">
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.id} className={`grid grid-cols-[1fr_auto] gap-2 rounded-md border p-2 transition-colors ${selected?.id === job.id ? "border-primary bg-accent" : "bg-card hover:bg-muted"}`}>
                      <button onClick={() => setSelectedId(job.id)} className="min-w-0 rounded-sm p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{job.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{job.fileName}</p>
                          </div>
                          {job.hasGraphic && <Badge variant="outline">GRF</Badge>}
                        </div>
                        <div className="mt-2 flex gap-2 text-xs text-muted-foreground"><span>arquivo unico</span><span>{job.sizeKb} KB</span></div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Gerar preview" aria-label={`Gerar preview de ${job.name}`} onClick={() => renderPreview(job)} disabled={isRendering}>
                          {isRendering && selected?.id === job.id ? <Loader2 className="animate-spin" /> : <Eye />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Remover arquivo" aria-label={`Remover ${job.name}`} onClick={() => removeFile(job.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>{selected?.name || "Nenhum arquivo selecionado"}</CardDescription>
              </div>
              <Button onClick={() => renderPreview()} disabled={!selected || isRendering}>{isRendering ? <Loader2 className="animate-spin" /> : <Wand2 />} Redraw</Button>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[560px] items-center justify-center rounded-md border bg-white p-4">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview do arquivo ZPL" className="max-h-[720px] w-auto max-w-full object-contain shadow-sm" />
                ) : (
                  <div className="max-w-sm text-center text-sm text-muted-foreground">
                    <ImageIcon className="mx-auto mb-3 size-10" />
                    Gere um preview para ver o ZPL renderizado como no Labelary.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editor ZPL</CardTitle>
              <CardDescription>O conteudo inclui definicoes graficas antes do bloco ^XA quando existirem.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={selected?.zpl || ""} onChange={(event) => updateSelectedZpl(event.target.value)} spellCheck={false} className="h-[300px] resize-y font-mono text-xs leading-5" />
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="size-4" /> Configuracoes</CardTitle>
              <CardDescription>Parametros enviados para a API do Labelary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Densidade</Label>
                <Select value={settings.density} onValueChange={(density) => setSettings((current) => ({ ...current, density }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 dpmm (152 dpi)</SelectItem>
                    <SelectItem value="8">8 dpmm (203 dpi)</SelectItem>
                    <SelectItem value="12">12 dpmm (300 dpi)</SelectItem>
                    <SelectItem value="24">24 dpmm (600 dpi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_1fr_88px] gap-2">
                <div className="space-y-2"><Label>Largura</Label><Input type="number" min="1" step="0.25" value={settings.width} onChange={(e) => setSettings((c) => ({ ...c, width: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Altura</Label><Input type="number" min="1" step="0.25" value={settings.height} onChange={(e) => setSettings((c) => ({ ...c, height: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Unid.</Label><Input value="in" disabled /></div>
              </div>
              <Separator />
              <div className="space-y-2"><Label>API Host</Label><Input value={settings.apiHost} onChange={(e) => setSettings((c) => ({ ...c, apiHost: e.target.value }))} /></div>
              <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="Opcional" value={settings.apiKey} onChange={(e) => setSettings((c) => ({ ...c, apiKey: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exportar PDF</CardTitle>
              <CardDescription>Gere um PDF multipagina com todos os arquivos ou apenas o arquivo ativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={batchMode} onValueChange={(value: "all" | "selected") => setBatchMode(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os arquivos</SelectItem>
                  <SelectItem value="selected">Somente arquivo ativo</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={exportPdf} disabled={!jobs.length || isExporting}>{isExporting ? <Loader2 className="animate-spin" /> : <Download />} Baixar PDF</Button>
              <div className="space-y-2 rounded-md border bg-muted/60 p-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>{isExporting ? "Convertendo fila" : "Progresso"}</span>
                  <span>{exportProgress.done}/{exportProgress.total || (batchMode === "all" ? jobs.length : selected ? 1 : 0)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${isExporting ? progressPercent : 0}%` }} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{isExporting && exportProgress.current ? `Atual: ${exportProgress.current}` : "Os arquivos serao enviados um por vez, com pausa e retry automatico em limite da API."}</p>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">{status}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Arquivos</p><p className="text-xl font-semibold">{jobs.length}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Tamanho</p><p className="text-xl font-semibold">{totalKb} KB</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Densidade</p><p className="text-xl font-semibold">{settings.density}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Etiqueta</p><p className="text-xl font-semibold">{settings.width}x{settings.height}</p></div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}




















