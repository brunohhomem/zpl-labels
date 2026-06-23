"use client";

import { ChangeEvent } from "react";
import { Eye, Image as ImageIcon, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLabelDimensions } from "@/lib/zpl/parser";
import type { LabelSettings, ZplFile } from "@/types/zpl";

type FilesPanelProps = {
  jobs: ZplFile[];
  selected?: ZplFile;
  settings: LabelSettings;
  isRendering: boolean;
  onLoadFiles: (files: File[]) => Promise<void>;
  onSelect: (id: string) => void;
  onPreview: (file?: ZplFile) => Promise<void>;
  onRemove: (id: string) => void;
  onReset: () => void;
};

export function FilesPanel({ jobs, selected, settings, isRendering, onLoadFiles, onSelect, onPreview, onRemove, onReset }: FilesPanelProps) {
  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    await onLoadFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  return (
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
            <Button variant="outline" onClick={() => onPreview()} disabled={!selected || isRendering}>{isRendering ? <Loader2 className="animate-spin" /> : <ImageIcon />} Preview</Button>
            <Button variant="outline" onClick={onReset}><RotateCcw /> Exemplo</Button>
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
              {jobs.map((job) => {
                const dimensions = getLabelDimensions(job.zpl, settings);
                return (
                  <div key={job.id} className={`grid grid-cols-[1fr_auto] gap-2 rounded-md border p-2 transition-colors ${selected?.id === job.id ? "border-primary bg-accent" : "bg-card hover:bg-muted"}`}>
                    <button onClick={() => onSelect(job.id)} className="min-w-0 rounded-sm p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{job.name}</p><p className="truncate text-xs text-muted-foreground">{job.fileName}</p></div>
                        <div className="flex shrink-0 items-center gap-1">
                          {dimensions.detected && <Badge variant="secondary">{dimensions.orientation}</Badge>}
                          {job.hasGraphic && <Badge variant="outline">GRF</Badge>}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 text-xs text-muted-foreground"><span>arquivo unico</span><span>{job.sizeKb} KB</span></div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Gerar preview" aria-label={`Gerar preview de ${job.name}`} onClick={() => onPreview(job)} disabled={isRendering}>
                        {isRendering && selected?.id === job.id ? <Loader2 className="animate-spin" /> : <Eye />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Remover arquivo" aria-label={`Remover ${job.name}`} onClick={() => onRemove(job.id)}><Trash2 /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}
