"use client";

import { AccessGate } from "@/components/zpl-labels/access-gate";
import { AppHeader } from "@/components/zpl-labels/app-header";
import { ExportPanel } from "@/components/zpl-labels/export-panel";
import { FilesPanel } from "@/components/zpl-labels/files-panel";
import { PreviewPanel } from "@/components/zpl-labels/preview-panel";
import { SettingsPanel } from "@/components/zpl-labels/settings-panel";
import { SummaryPanel } from "@/components/zpl-labels/summary-panel";
import { ZplEditor } from "@/components/zpl-labels/zpl-editor";
import { splitPrintableZpl } from "@/lib/zpl/parser";
import { useLabelWorkspace } from "@/hooks/use-label-workspace";

export function ZplLabelApp() {
  const workspace = useLabelWorkspace();

  if (!workspace.authChecked) return <main className="min-h-screen bg-background" />;
  if (!workspace.isUnlocked) return <AccessGate onLogin={workspace.login} />;

  return (
    <main className="min-h-screen bg-background">
      <AppHeader fileCount={workspace.jobs.length} totalKb={workspace.totalKb} />
      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[430px_minmax(420px,1fr)_360px] lg:px-6">
        <FilesPanel
          jobs={workspace.jobs}
          selected={workspace.selected}
          settings={workspace.settings}
          isRendering={workspace.isRendering}
          onLoadFiles={workspace.loadFiles}
          onSelect={workspace.setSelectedId}
          onPreview={workspace.renderPreview}
          onRemove={workspace.removeFile}
          onReset={workspace.resetDemo}
        />

        <section className="space-y-4">
          <PreviewPanel
            selected={workspace.selected}
            items={workspace.previewItems}
            active={workspace.activePreview}
            index={workspace.previewIndex}
            isRendering={workspace.isRendering}
            onIndexChange={workspace.setPreviewIndex}
            onRedraw={() => workspace.renderPreview()}
          />
          <ZplEditor value={workspace.selected?.zpl || ""} onChange={workspace.updateSelectedZpl} />
        </section>

        <aside className="space-y-4">
          <SettingsPanel settings={workspace.settings} dimensions={workspace.selectedDimensions} onChange={workspace.setSettings} />
          <ExportPanel
            batchMode={workspace.batchMode}
            fileCount={workspace.jobs.length}
            selectedCount={workspace.selected ? splitPrintableZpl(workspace.selected).length : 0}
            isExporting={workspace.isExporting}
            progress={workspace.exportProgress}
            progressPercent={workspace.progressPercent}
            status={workspace.status}
            onBatchModeChange={workspace.setBatchMode}
            onExport={workspace.exportPdf}
          />
          <SummaryPanel
            fileCount={workspace.jobs.length}
            labelCount={workspace.totalLabels}
            totalKb={workspace.totalKb}
            density={workspace.settings.density}
            dimensions={workspace.selectedDimensions}
            fallbackFormat={`${workspace.settings.width}x${workspace.settings.height}`}
          />
        </aside>
      </div>
    </main>
  );
}
