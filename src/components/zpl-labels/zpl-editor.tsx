"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ZplEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ZplEditor({ value, onChange }: ZplEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor ZPL</CardTitle>
        <CardDescription>O conteudo inclui definicoes graficas antes do bloco ^XA quando existirem.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} className="h-[300px] resize-y font-mono text-xs leading-5" />
      </CardContent>
    </Card>
  );
}
