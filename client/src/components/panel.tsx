import { doZoomReset, doZoomStep, doZoomTo, useZoomStore } from "@/canvas/tools/zoom.tool";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconChevronDown,
  IconFocus2,
  IconMinus,
  IconPlus,
  IconZoomIn,
} from "@tabler/icons-react";
import { PropertiesTab, HistoryTab, SettingsTab } from "./properties";
import { Button } from "./ui/button";
import { useOptionsStore } from "@/canvas/canvas.store";
import { WithTooltip } from "./ui/tooltip";
import { undo, redo } from "@/canvas/history.service";
import { useCommandLogStore } from "@/canvas/history.store";
import { Dropdown, DropdownItem } from "./ui/dropdown";

const ZOOM_LEVELS = [25, 50, 75, 100, 150, 200, 400];

type PanelTab = "properties" | "history" | "settings";

const TAB_LABELS: Record<PanelTab, string> = {
  properties: "Properties",
  history: "History",
  settings: "Settings",
};

export const Panel = () => {
  const isPanelOpen = useOptionsStore((state) => state.isPanelOpen);
  const activePanel = useOptionsStore((state) => state.activePanel);
  const setActivePanel = useOptionsStore.getState().setActivePanel;
  const zoom = useZoomStore((state) => state.zoom);
  const undoCount = useCommandLogStore((state) => state.sessionUndoStack.length);
  const redoCount = useCommandLogStore((state) => state.sessionRedoStack.length);
  const isTimeTraveling = useCommandLogStore((state) => state.isTimeTraveling);

  return (
    <div
      className={`transition-transform duration-200 w-[320px] absolute right-0 top-0 h-[calc(100%-56px)] md:h-full ${
        !isPanelOpen ? "translate-x-full" : ""
      }`}
    >
      <div className="bg-default-2 border-l border-default-1 h-full flex flex-col">

        {/* Tab bar */}
        <div className="flex border-b border-default-1 flex-shrink-0">
          {(["properties", "history", "settings"] as PanelTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActivePanel(tab)}
              className={`flex-1 py-2 text-xs transition-colors ${
                activePanel === tab
                  ? "border-b-2 border-primary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-grow overflow-y-auto px-4 pb-2">
          {activePanel === "properties" && <PropertiesTab />}
          {activePanel === "history" && <HistoryTab />}
          {activePanel === "settings" && <SettingsTab />}
        </div>

        {/* Footer: undo/redo + zoom */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-default-1 flex-shrink-0">
          <div className="flex items-center border border-default-4 rounded">
            <WithTooltip tooltip="Undo (Ctrl+Z)">
              <Button onClick={undo} disabled={undoCount === 0 || isTimeTraveling}>
                <IconArrowBackUp size={20} stroke={1} />
              </Button>
            </WithTooltip>
            <WithTooltip tooltip="Redo (Ctrl+Shift+Z)">
              <Button onClick={redo} disabled={redoCount === 0 || isTimeTraveling}>
                <IconArrowForwardUp size={20} stroke={1} />
              </Button>
            </WithTooltip>
          </div>
          <div className="flex items-center border border-default-4 rounded">
              <WithTooltip tooltip="Reset zoom & position">
                <Button onClick={() => doZoomReset()}>
                  <IconFocus2 size={18} stroke={1} />
                </Button>
              </WithTooltip>
              <div className="w-px h-4 bg-default-4" />
              <WithTooltip tooltip="Zoom out">
                <Button onClick={() => doZoomStep(-1)}>
                  <IconMinus size={16} stroke={1.5} />
                </Button>
              </WithTooltip>
              <Dropdown
                placement="bottom"
                trigger={
                  <div className="flex items-center gap-0.5 text-xs px-1 py-0.5 rounded hover:bg-default-3 tabular-nums">
                    {zoom}%
                    <IconChevronDown size={12} stroke={2} />
                  </div>
                }
              >
                {ZOOM_LEVELS.map((level) => (
                  <DropdownItem
                    key={level}
                    label={`${level}%`}
                    icon={<IconZoomIn size={16} stroke={1} />}
                    onClick={() => doZoomTo(level)}
                  />
                ))}
              </Dropdown>
              <WithTooltip tooltip="Zoom in">
                <Button onClick={() => doZoomStep(1)}>
                  <IconPlus size={16} stroke={1.5} />
                </Button>
              </WithTooltip>
            </div>
        </div>

      </div>
    </div>
  );
};
