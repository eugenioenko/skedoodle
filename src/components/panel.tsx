import { doZoomReset, doZoomStep, doZoomTo, useZoomStore } from "@/canvas/tools/zoom.tool";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconChevronDown,
  IconFocus2,
  IconHome,
  IconMenu2,
  IconMinus,
  IconPlus,
  IconZoomIn,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { Properties } from "./properties";
import { Button } from "./ui/button";
import { useOptionsStore } from "@/canvas/canvas.store";
import { WithTooltip } from "./ui/tooltip";
import { undo, redo } from "@/canvas/history.service";
import { useCommandLogStore } from "@/canvas/history.store";
import { Dropdown, DropdownItem } from "./ui/dropdown";

const ZOOM_LEVELS = [25, 50, 75, 100, 150, 200, 400];

export const Panel = () => {
  const isPanelOpen = useOptionsStore((state) => state.isPanelOpen);
  const setIsPanelOpen = useOptionsStore.getState().setIsPanelOpen;
  const zoom = useZoomStore((state) => state.zoom);
  const undoCount = useCommandLogStore((state) => state.sessionUndoStack.length);
  const redoCount = useCommandLogStore((state) => state.sessionRedoStack.length);
  const isTimeTraveling = useCommandLogStore((state) => state.isTimeTraveling);

  return (
    <div
      className={`transition-all duration-150 w-[320px] absolute right-0 top-0 overflow-hidden ${!isPanelOpen ? "h-11" : "h-[calc(100%-56px)] md:h-full"
        }`}
    >
      <div
        className={`bg-default-2 border-l border-default-1 px-2 h-full ${!isPanelOpen ? "rounded-bl-lg" : ""
          }`}
      >
        <div className="flex items-center w-full py-2 gap-1">
          <div className="flex items-center border border-default-4 rounded gap-0">
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
          <div className="flex justify-center flex-grow">
            <div className="flex items-center border border-default-4 rounded gap-0 justify-center">
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
          <WithTooltip tooltip="All sketches">
            <Link to="/sketches">
              <Button>
                <IconHome size={20} stroke={1} />
              </Button>
            </Link>
          </WithTooltip>
          <WithTooltip tooltip="Toggle panel">
            <Button onClick={() => setIsPanelOpen(!isPanelOpen)}>
              <IconMenu2 size={20} stroke={1} />
            </Button>
          </WithTooltip>
        </div>
        <div className="px-2">
          <Properties />
        </div>
      </div>
    </div>
  );
};
