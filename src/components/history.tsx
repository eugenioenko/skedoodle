import { Command, useCommandLogStore } from "@/canvas/history.store";
import {
  enterTimeTravelMode,
  scrubTo,
  branchFromTimeline,
} from "@/canvas/history.service";
import { IconGitBranch } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

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

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

  // Resolve undo stack IDs to Command objects
  const commandMap = new Map(commandLog.map((c) => [c.id, c]));
  const undoCommands = sessionUndoStack
    .map((id) => commandMap.get(id))
    .filter((c): c is Command => !!c);

  return (
    <>
      <div className="pb-1 pt-4">
        <span>Undo / Redo</span>
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

/** Full command history — clickable entries to enter timeline mode */
export const History = () => {
  const navigate = useNavigate();
  const commandLog = useCommandLogStore((state) => state.commandLog);
  const isTimeTraveling = useCommandLogStore(
    (state) => state.isTimeTraveling
  );
  const timelinePosition = useCommandLogStore(
    (state) => state.timelinePosition
  );

  function handleClick(index: number) {
    if (!isTimeTraveling) {
      enterTimeTravelMode();
    }
    scrubTo(index + 1);
  }

  function handleBranch(e: React.MouseEvent) {
    e.stopPropagation();
    const newId = branchFromTimeline();
    navigate(`/sketch/${newId}`);
  }

  return (
    <>
      <div className="pb-1 pt-4">
        <span>History</span>
      </div>
      <div className="h-40 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col text-sm">
          {[...commandLog].map((cmd, i) => {
            const index = i;
            const isSelected =
              isTimeTraveling && timelinePosition === index + 1;
            const isBeyond =
              isTimeTraveling && index + 1 > timelinePosition;

            return (
              <button
                key={cmd.id}
                onClick={() => handleClick(index)}
                className={`px-2 py-1 text-xs text-left flex items-center gap-2 hover:bg-default-4 ${
                  isSelected
                    ? "bg-secondary"
                    : isBeyond
                      ? "opacity-30"
                      : "opacity-70"
                }`}
              >
                <div className="flex-grow min-w-0">
                  <div className="truncate">{commandLabel(cmd)}</div>
                  <div className="opacity-50 tabular-nums">
                    {formatTime(cmd.ts)}
                  </div>
                </div>
                {isSelected && (
                  <button
                    onClick={handleBranch}
                    className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-default-4 hover:bg-default-5 text-[10px]"
                    title="Branch from here"
                  >
                    <IconGitBranch size={12} stroke={1.5} />
                  </button>
                )}
              </button>
            );
          })}
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
