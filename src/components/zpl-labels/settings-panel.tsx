"use client";

import { Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { LabelDimensions, LabelSettings } from "@/types/zpl";

type SettingsPanelProps = {
  settings: LabelSettings;
  dimensions: LabelDimensions | null;
  onChange: (settings: LabelSettings) => void;
};

export function SettingsPanel({ settings, dimensions, onChange }: SettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="size-4" /> Configuracoes</CardTitle>
        <CardDescription>Parametros enviados para a API do Labelary. Dimensoes e orientacao sao detectadas automaticamente por etiqueta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Densidade</Label>
          <Select value={settings.density} onValueChange={(density) => onChange({ ...settings, density })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 dpmm (152 dpi)</SelectItem><SelectItem value="8">8 dpmm (203 dpi)</SelectItem>
              <SelectItem value="12">12 dpmm (300 dpi)</SelectItem><SelectItem value="24">24 dpmm (600 dpi)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_1fr_88px] gap-2">
          <div className="space-y-2"><Label>Largura</Label><Input type="number" min="1" step="0.25" value={settings.width} onChange={(event) => onChange({ ...settings, width: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Altura</Label><Input type="number" min="1" step="0.25" value={settings.height} onChange={(event) => onChange({ ...settings, height: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Unid.</Label><Input value="in" disabled /></div>
        </div>
        {dimensions?.detected && <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Formato detectado automaticamente: <span className="font-medium text-foreground">{dimensions.format}</span>.</div>}
        <Separator />
        <div className="space-y-2"><Label>API Host</Label><Input value={settings.apiHost} onChange={(event) => onChange({ ...settings, apiHost: event.target.value })} /></div>
        <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="Opcional" value={settings.apiKey} onChange={(event) => onChange({ ...settings, apiKey: event.target.value })} /></div>
      </CardContent>
    </Card>
  );
}
