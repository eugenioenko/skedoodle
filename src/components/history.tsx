import { undo, redo } from "@/canvas/history.service";
import { Command, useCommandLogStore } from "@/canvas/history.store";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { Button } from "./ui/button";

function commandLabel(cmd: Command): string {
  switch (cmd.type) {
    case "create":
      return `Create ${cmd.data?.t ?? "shape"}`;
    case "update":
      return `Update shape`;
    case "remove":
      return `Remove ${cmd.data?.t ?? "shape"}`;
  }
}

/** Session undo/redo panel — shows the dual-stack view */
export const UndoRedoHistory = () => {
  const commandLog = useCommandLogStore((state) => state.commandLog);
  const sessionUndoStack = useCommandLogStore(
    (state) => state.sessionUndoStack
  );
  const sessionRedoStack = useCommandLogStore(
    (state) => state.sessionRedoStack
  );

  const canUndo = sessionUndoStack.length > 0;
  const canRedo = sessionRedoStack.length > 0;

  // Resolve undo stack IDs to Command objects
  const commandMap = new Map(commandLog.map((c) => [c.id, c]));
  const undoCommands = sessionUndoStack
    .map((id) => commandMap.get(id))
    .filter((c): c is Command => !!c);

  return (
    <>
      <div className="pb-1 pt-4 flex items-center justify-between">
        <span>Undo / Redo</span>
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
          {[...sessionRedoStack].reverse().map((cmd, i) => (
            <HistoryEntry key={`redo-${i}`} command={cmd} variant="future" />
          ))}
          {undoCommands.length > 0 && (
            <HistoryEntry
              key="current"
              command={undoCommands[undoCommands.length - 1]}
              variant="current"
            />
          )}
          {[...undoCommands]
            .slice(0, -1)
            .reverse()
            .map((cmd, i) => (
              <HistoryEntry key={`undo-${i}`} command={cmd} variant="past" />
            ))}
        </div>
      </div>
    </>
  );
};

/** Full command log — shows every command appended to the log */
export const CommandLog = () => {
  const commandLog = useCommandLogStore((state) => state.commandLog);

  return (
    <>
      <div className="pb-1 pt-4">
        <span>Command Log</span>
      </div>
      <div className="h-40 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col text-sm">
          {[...commandLog].reverse().map((cmd, i) => (
            <HistoryEntry
              key={cmd.id}
              command={cmd}
              variant={i === 0 ? "current" : "past"}
            />
          ))}
        </div>
      </div>
    </>
  );
};

interface HistoryEntryProps {
  command: Command;
  variant: "past" | "current" | "future";
}

const HistoryEntry = ({ command, variant }: HistoryEntryProps) => {
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
      {commandLabel(command)}
    </div>
  );
};
