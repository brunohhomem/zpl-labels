import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LabelDimensions } from "@/types/zpl";

type SummaryPanelProps = {
  fileCount: number;
  labelCount: number;
  totalKb: number;
  density: string;
  dimensions: LabelDimensions | null;
  fallbackFormat: string;
};

export function SummaryPanel({ fileCount, labelCount, totalKb, density, dimensions, fallbackFormat }: SummaryPanelProps) {
  const items = [
    ["Arquivos", fileCount], ["Etiquetas", labelCount], ["Tamanho", `${totalKb} KB`],
    ["Densidade", density], ["Etiqueta", dimensions?.format || fallbackFormat],
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        {items.map(([label, value]) => <div key={label} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}
      </CardContent>
    </Card>
  );
}
