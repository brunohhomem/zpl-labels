"use client";

import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewItem, ZplFile } from "@/types/zpl";

type PreviewPanelProps = {
  selected?: ZplFile;
  items: PreviewItem[];
  active?: PreviewItem;
  index: number;
  isRendering: boolean;
  onIndexChange: (index: number) => void;
  onRedraw: () => Promise<void>;
};

export function PreviewPanel({ selected, items, active, index, isRendering, onIndexChange, onRedraw }: PreviewPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle>Preview</CardTitle>
          <CardDescription className="truncate">{active ? `Etiqueta ${index + 1} de ${items.length} - ${active.name}` : selected?.name || "Nenhum arquivo selecionado"}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
              <Button variant="ghost" size="icon" onClick={() => onIndexChange(Math.max(0, index - 1))} disabled={index === 0 || isRendering} aria-label="Preview anterior"><ChevronLeft /></Button>
              <span className="min-w-16 px-2 text-center text-sm font-medium">{index + 1}/{items.length}</span>
              <Button variant="ghost" size="icon" onClick={() => onIndexChange(Math.min(items.length - 1, index + 1))} disabled={index >= items.length - 1 || isRendering} aria-label="Proximo preview"><ChevronRight /></Button>
            </div>
          )}
          <Button onClick={onRedraw} disabled={!selected || isRendering}>{isRendering ? <Loader2 className="animate-spin" /> : <Wand2 />} Redraw</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[560px] rounded-md border bg-white p-4">
          {active ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-2 text-center">
                <p className="truncate text-sm font-medium">{active.name}</p>
                <p className="text-xs text-muted-foreground">Etiqueta {index + 1} de {items.length} - {active.format}</p>
              </div>
              <figure className="rounded-md border bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.url} alt={`Preview ${index + 1} de ${active.name}`} className="mx-auto max-h-[720px] w-auto max-w-full object-contain" />
              </figure>
            </div>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center">
              <div className="max-w-sm text-center text-sm text-muted-foreground"><ImageIcon className="mx-auto mb-3 size-10" />Gere um preview para ver todas as etiquetas internas do ZPL renderizadas como no Labelary.</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
