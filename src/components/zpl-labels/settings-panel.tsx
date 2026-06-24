"use client";

import { Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label htmlFor="auto-detect-switch">Leitura automática</Label>
            <p className="text-xs text-muted-foreground">
              Detecta dimensões e orientação diretamente de cada etiqueta.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {settings.autoDetect ? "Ativa" : "Manual"}
            </span>
            <Switch
              id="auto-detect-switch"
              checked={settings.autoDetect}
              onCheckedChange={(autoDetect) => onChange({ ...settings, autoDetect })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="label-density">Densidade</Label>
          <Select disabled={settings.autoDetect} value={settings.density} onValueChange={(density) => onChange({ ...settings, density })}>
            <SelectTrigger id="label-density"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 dpmm (152 dpi)</SelectItem><SelectItem value="8">8 dpmm (203 dpi)</SelectItem>
              <SelectItem value="12">12 dpmm (300 dpi)</SelectItem><SelectItem value="24">24 dpmm (600 dpi)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_1fr_88px] gap-2">
          <div className="space-y-2"><Label htmlFor="label-width">Largura</Label><Input id="label-width" disabled={settings.autoDetect} type="number" min="1" step="0.25" value={settings.width} onChange={(event) => onChange({ ...settings, width: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label htmlFor="label-height">Altura</Label><Input id="label-height" disabled={settings.autoDetect} type="number" min="1" step="0.25" value={settings.height} onChange={(event) => onChange({ ...settings, height: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label htmlFor="label-unit">Unid.</Label><Input id="label-unit" value="in" disabled={settings.autoDetect} readOnly /></div>
        </div>
        {settings.autoDetect && dimensions?.detected && <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Formato detectado automaticamente: <span className="font-medium text-foreground">{dimensions.format}</span>.</div>}
        <Separator />
        <div className="space-y-2"><Label htmlFor="label-api-host">API Host</Label><Input id="label-api-host" disabled={settings.autoDetect} value={settings.apiHost} onChange={(event) => onChange({ ...settings, apiHost: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="label-api-key">API Key</Label><Input id="label-api-key" disabled={settings.autoDetect} type="password" placeholder="Opcional" value={settings.apiKey} onChange={(event) => onChange({ ...settings, apiKey: event.target.value })} /></div>
      </CardContent>
    </Card>
  );
}
