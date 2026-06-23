import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AppHeaderProps = {
  fileCount: number;
  totalKb: number;
};

export function AppHeader({ fileCount, totalKb }: AppHeaderProps) {
  return (
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
          <Badge variant="secondary">{fileCount} arquivo(s)</Badge>
          <Badge variant="outline">{totalKb} KB</Badge>
        </div>
      </div>
    </header>
  );
}
