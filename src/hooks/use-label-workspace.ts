"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadPdf, convertZplToPdf, mergePdfDocuments, renderZplPreview, sleep } from "@/lib/labelary/client";
import { validateAccessPassword } from "@/lib/labelary/auth";
import { defaultSettings, demoZpl, REQUEST_DELAY_MS } from "@/lib/zpl/constants";
import { getLabelDimensions, parseZplFile, splitPrintableZpl, updateZplFile } from "@/lib/zpl/parser";
import type { BatchMode, ExportProgress, LabelSettings, PreviewItem, ZplFile } from "@/types/zpl";

export function useLabelWorkspace() {
  const [jobs, setJobs] = useState<ZplFile[]>(() => parseZplFile(demoZpl, "demo.zpl"));
  const [selectedId, setSelectedId] = useState("");
  const [settings, setSettings] = useState<LabelSettings>(defaultSettings);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({ total: 0, done: 0, current: "" });
  const [status, setStatus] = useState("Pronto para renderizar.");
  const [batchMode, setBatchMode] = useState<BatchMode>("all");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const previewItemsRef = useRef<PreviewItem[]>([]);

  const selected = useMemo(() => jobs.find((job) => job.id === selectedId) || jobs[0], [jobs, selectedId]);
  const totalKb = useMemo(() => jobs.reduce((sum, job) => sum + job.sizeKb, 0), [jobs]);
  const totalLabels = useMemo(() => jobs.reduce((sum, job) => sum + splitPrintableZpl(job).length, 0), [jobs]);
  const progressPercent = exportProgress.total ? Math.round((exportProgress.done / exportProgress.total) * 100) : 0;
  const activePreview = previewItems[previewIndex];
  const selectedDimensions = useMemo(
    () => selected ? getLabelDimensions(selected.zpl, settings) : null,
    [selected, settings]
  );

  useEffect(() => {
    window.setTimeout(() => {
      setIsUnlocked(sessionStorage.getItem("zpl-etiqueta-auth") === "ok");
      setAuthChecked(true);
    }, 0);
  }, []);

  useEffect(() => () => {
    previewItemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  function replacePreviewItems(items: PreviewItem[]) {
    previewItemsRef.current = items;
    setPreviewItems(items);
  }

  function clearPreviewItems() {
    previewItemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    previewItemsRef.current = [];
    setPreviewItems([]);
    setPreviewIndex(0);
  }

  async function login(password: string) {
    await validateAccessPassword(password);
    sessionStorage.setItem("zpl-etiqueta-auth", "ok");
    setIsUnlocked(true);
  }

  async function loadFiles(files: File[]) {
    if (!files.length) return;
    const parsed = (await Promise.all(files.map(async (file) => parseZplFile(await file.text(), file.name)))).flat();

    if (!parsed.length) {
      setStatus("Nenhum conteudo ZPL valido foi encontrado nos arquivos.");
      return;
    }

    clearPreviewItems();
    setJobs(parsed);
    setSelectedId(parsed[0].id);
    setStatus(`${parsed.length} arquivo(s) carregado(s).`);
  }

  function updateSelectedZpl(zpl: string) {
    if (!selected) return;
    setJobs((current) => current.map((job) => job.id === selected.id ? updateZplFile(job, zpl) : job));
  }

  async function renderPreview(targetFile = selected) {
    if (!targetFile) return;
    const previewJobs = splitPrintableZpl(targetFile);
    const renderedItems: PreviewItem[] = [];

    setSelectedId(targetFile.id);
    setIsRendering(true);
    clearPreviewItems();
    setStatus(`Renderizando 0 de ${previewJobs.length} preview(s)...`);

    try {
      for (const [index, previewJob] of previewJobs.entries()) {
        const dimensions = getLabelDimensions(previewJob.zpl, settings);
        setStatus(`Renderizando preview ${index + 1} de ${previewJobs.length}: ${previewJob.name} (${dimensions.format})`);
        const result = await renderZplPreview(previewJob, settings);
        renderedItems.push({ name: previewJob.name, url: URL.createObjectURL(result.blob), format: result.dimensions.format });
        replacePreviewItems([...renderedItems]);
        setPreviewIndex(0);

        if (index + 1 < previewJobs.length) await sleep(REQUEST_DELAY_MS);
      }

      setStatus(`Preview atualizado: ${previewJobs.length} etiqueta(s) de ${targetFile.name}.`);
    } catch (error) {
      clearPreviewItems();
      setStatus(error instanceof Error ? error.message : "Nao foi possivel renderizar o arquivo.");
    } finally {
      setIsRendering(false);
    }
  }

  function removeFile(fileId: string) {
    const next = jobs.filter((job) => job.id !== fileId);
    setJobs(next);
    if (selectedId === fileId || selected?.id === fileId) {
      setSelectedId(next[0]?.id || "");
      clearPreviewItems();
    }
    setStatus(next.length ? `${next.length} arquivo(s) na lista.` : "Lista de arquivos vazia.");
  }

  async function exportPdf() {
    const exportFiles = batchMode === "all" ? jobs : selected ? [selected] : [];
    const exportJobs = exportFiles.flatMap(splitPrintableZpl);
    if (!exportJobs.length) return;

    setIsExporting(true);
    setExportProgress({ total: exportJobs.length, done: 0, current: exportJobs[0]?.name || "" });
    setStatus(`Fila iniciada: 0 de ${exportJobs.length} etiqueta(s) convertida(s) a partir de ${exportFiles.length} arquivo(s).`);

    try {
      const documents: ArrayBuffer[] = [];
      for (const [index, job] of exportJobs.entries()) {
        const queuePosition = index + 1;
        setExportProgress({ total: exportJobs.length, done: index, current: job.name });
        setStatus(`Convertendo etiqueta ${queuePosition} de ${exportJobs.length}: ${job.name}`);
        documents.push(await convertZplToPdf(job, settings, queuePosition, exportJobs.length, setStatus));
        setExportProgress({ total: exportJobs.length, done: queuePosition, current: job.name });

        if (queuePosition < exportJobs.length) {
          setStatus(`Convertida ${queuePosition} de ${exportJobs.length}. Aguardando ${REQUEST_DELAY_MS}ms antes do proximo envio.`);
          await sleep(REQUEST_DELAY_MS);
        }
      }

      const mergedBytes = await mergePdfDocuments(documents);
      downloadPdf(mergedBytes, batchMode === "all" ? "arquivos-zpl-lote.pdf" : `${selected?.name || "arquivo-zpl"}.pdf`);
      setStatus(`PDF final gerado: ${exportJobs.length} etiqueta(s) convertida(s) e unida(s).`);
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
    clearPreviewItems();
    setStatus("Exemplo restaurado.");
  }

  return {
    jobs, selected, selectedId, setSelectedId, settings, setSettings,
    previewItems, previewIndex, setPreviewIndex, activePreview, isRendering,
    isExporting, exportProgress, progressPercent, status, batchMode, setBatchMode,
    isUnlocked, authChecked, totalKb, totalLabels, selectedDimensions,
    login, loadFiles, updateSelectedZpl, renderPreview, removeFile, exportPdf, resetDemo,
  };
}
