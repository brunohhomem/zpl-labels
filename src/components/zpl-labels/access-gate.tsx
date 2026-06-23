"use client";

import { FormEvent, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccessGateProps = {
  onLogin: (password: string) => Promise<void>;
};

export function AccessGate({ onLogin }: AccessGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(password);
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Nao foi possivel validar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole className="size-5" />
          </div>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>Informe a senha configurada no servidor para usar o gerador de etiquetas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="access-password">Senha</Label>
              <Input id="access-password" type="password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite a senha de acesso" />
            </div>
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <Button className="w-full" type="submit" disabled={!password || isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
