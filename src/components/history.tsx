import { undo, redo } from "@/canvas/history.service";
import { HistoryCommand, useHistoryStore } from "@/canvas/history.store";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { Button } from "./ui/button";

export const History = () => {
  const undoStack = useHistoryStore((state) => state.undoStack);
  const redoStack = useHistoryStore((state) => state.redoStack);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <>
      <div className="pb-1 pt-4 flex items-center justify-between">
        <span>History</span>
        <div className="flex gap-1">
          <Button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <IconArrowBackUp size={16} stroke={1} />
          </Button>
          <Button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <IconArrowForwardUp size={16} stroke={1} />
          </Button>
        </div>
      </div>
      <div className="h-40 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col text-sm">
          {[...redoStack].reverse().map((cmd, i) => (
            <HistoryItem key={`redo-${i}`} command={cmd} variant="future" />
          ))}
          {undoStack.length > 0 && (
            <HistoryItem
              key="current"
              command={undoStack[undoStack.length - 1]}
              variant="current"
            />
          )}
          {[...undoStack]
            .slice(0, -1)
            .reverse()
            .map((cmd, i) => (
              <HistoryItem key={`undo-${i}`} command={cmd} variant="past" />
            ))}
        </div>
      </div>
    </>
  );
};

interface HistoryItemProps {
  command: HistoryCommand;
  variant: "past" | "current" | "future";
}

const HistoryItem = ({ command, variant }: HistoryItemProps) => {
  return (
    <div
      className={`px-2 py-0.5 text-xs ${
        variant === "current"
          ? "bg-secondary"
          : variant === "future"
            ? "opacity-40"
            : "opacity-70"
      }`}
    >
      {command.label}
    </div>
  );
};
