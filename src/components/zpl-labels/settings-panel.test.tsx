import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SettingsPanel } from "@/components/zpl-labels/settings-panel";
import { defaultSettings } from "@/lib/zpl/constants";
import type { LabelSettings } from "@/types/zpl";

function SettingsPanelHarness() {
  const [settings, setSettings] = useState<LabelSettings>(defaultSettings);
  return <SettingsPanel settings={settings} dimensions={null} onChange={setSettings} />;
}

describe("SettingsPanel", () => {
  it("inicia no modo automatico e libera os campos ao desligar", () => {
    render(<SettingsPanelHarness />);

    const toggle = screen.getByRole("switch", { name: "Leitura automática" });
    const width = screen.getByLabelText("Largura") as HTMLInputElement;
    const apiHost = screen.getByLabelText("API Host") as HTMLInputElement;

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(width.disabled).toBe(true);
    expect(apiHost.disabled).toBe(true);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(width.disabled).toBe(false);
    expect(apiHost.disabled).toBe(false);
  });
});
