import { doZoomReset, useZoomStore } from "@/canvas/tools/zoom.tool";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDeviceFloppy,
  IconFocus2,
  IconMenu2,
} from "@tabler/icons-react";
import { Properties } from "./properties";
import { Button } from "./ui/button";
import { useOptionsStore } from "@/canvas/canvas.store";
import { WithTooltip } from "./ui/tooltip";
import { getDoodler } from "@/canvas/doodler.client";
import { undo, redo } from "@/canvas/history.service";
import { useHistoryStore } from "@/canvas/history.store";

export const Panel = () => {
  const isPanelOpen = useOptionsStore((state) => state.isPanelOpen);
  const setIsPanelOpen = useOptionsStore.getState().setIsPanelOpen;

  return (
    <div
      className={`transition-all duration-150 w-72 absolute right-0 top-0 overflow-hidden ${!isPanelOpen ? "h-11" : "h-[calc(100%-56px)] md:h-full"
        }`}
    >
      <div
        className={`bg-default-2 border-l border-default-1 px-4 h-full ${!isPanelOpen ? "rounded-bl-lg" : ""
          }`}
      >
        <div className="flex items-center w-full gap-4 py-1">
          <Button onClick={() => setIsPanelOpen(!isPanelOpen)}>
            <IconMenu2 stroke={1} />
          </Button>
          <CanvasBar />
        </div>
        <Properties />
      </div>
    </div>
  );
};

const CanvasBar = () => {
  const zoom = useZoomStore((state) => state.zoom);
  const undoCount = useHistoryStore((state) => state.undoStack.length);
  const redoCount = useHistoryStore((state) => state.redoStack.length);

  const doSaveToStorage = () => {
    const doodler = getDoodler();
    doodler.saveDoodles();
  };

  return (
    <div className="text-sm flex justify-end items-center w-full">
      <WithTooltip tooltip="Undo (Ctrl+Z)">
        <Button onClick={undo} disabled={undoCount === 0}>
          <IconArrowBackUp stroke={1} />
        </Button>
      </WithTooltip>
      <WithTooltip tooltip="Redo (Ctrl+Shift+Z)">
        <Button onClick={redo} disabled={redoCount === 0}>
          <IconArrowForwardUp stroke={1} />
        </Button>
      </WithTooltip>
      <WithTooltip tooltip="Save to local storage">
        <Button onClick={() => doSaveToStorage()}>
          <IconDeviceFloppy stroke={1} />
        </Button>
      </WithTooltip>
      <WithTooltip tooltip="Reset zoom">
        <Button onClick={() => doZoomReset()}>
          <IconFocus2 stroke={1} />
        </Button>
      </WithTooltip>
      <div className="w-12 text-right">{zoom}%</div>
    </div>
  );
};
