"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BatchMode, ExportProgress } from "@/types/zpl";

type ExportPanelProps = {
  batchMode: BatchMode;
  fileCount: number;
  selectedCount: number;
  isExporting: boolean;
  progress: ExportProgress;
  progressPercent: number;
  status: string;
  onBatchModeChange: (mode: BatchMode) => void;
  onExport: () => Promise<void>;
};

export function ExportPanel({ batchMode, fileCount, selectedCount, isExporting, progress, progressPercent, status, onBatchModeChange, onExport }: ExportPanelProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Exportar PDF</CardTitle><CardDescription>Gere um PDF multipagina com todos os arquivos ou apenas o arquivo ativo.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Select value={batchMode} onValueChange={(value: BatchMode) => onBatchModeChange(value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os arquivos</SelectItem><SelectItem value="selected">Somente arquivo ativo</SelectItem></SelectContent>
        </Select>
        <Button className="w-full" onClick={onExport} disabled={!fileCount || isExporting}>{isExporting ? <Loader2 className="animate-spin" /> : <Download />} Baixar PDF</Button>
        <div className="space-y-2 rounded-md border bg-muted/60 p-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>{isExporting ? "Convertendo fila" : "Progresso"}</span>
            <span>{progress.done}/{progress.total || (batchMode === "all" ? fileCount : selectedCount)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${isExporting ? progressPercent : 0}%` }} /></div>
          <p className="truncate text-xs text-muted-foreground">{isExporting && progress.current ? `Atual: ${progress.current}` : "As etiquetas internas serao enviadas uma por vez, com pausa e retry automatico em limite da API."}</p>
        </div>
        <div className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">{status}</div>
      </CardContent>
    </Card>
  );
}
