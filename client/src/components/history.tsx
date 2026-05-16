import { useCommandLogStore } from "@/canvas/history.store";
import {
  enterTimeTravelMode,
  scrubTo,
  branchFromTimeline,
} from "@/canvas/history.service";
import { IconGitBranch } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { Command } from "@/sync/sync.model";

const SHAPE_NAMES: Record<string, string> = {
  brush: "Brush",
  rect: "Rectangle",
  ellipse: "Ellipse",
  circle: "Circle",
  line: "Line",
  arrow: "Arrow",
  text: "Text",
  bezier: "Bezier",
};

function shapeName(cmd: Command): string {
  return SHAPE_NAMES[cmd.data?.type] ?? "Shape";
}

function updateAction(data: Record<string, any>): string {
  const fields = Object.keys(data);
  if (fields.some((f) => f.startsWith("translation"))) return "Move";
  if (fields.includes("rotation")) return "Rotate";
  if (fields.includes("scale")) return "Resize";
  if (fields.includes("stroke") || fields.includes("fill")) return "Recolor";
  if (fields.includes("linewidth")) return "Stroke";
  if (fields.includes("opacity")) return "Opacity";
  if (fields.includes("width") || fields.includes("height")) return "Resize";
  if (fields.includes("radius")) return "Radius";
  return "Update";
}

function commandLabel(cmd: Command): string {
  switch (cmd.type) {
    case "create":
      return `Create ${shapeName(cmd)}`;
    case "update":
      return `${updateAction(cmd.data ?? {})} Shape`;
    case "remove":
      return `Remove ${shapeName(cmd)}`;
    case "batch": {
      const subs = cmd.data as Command[] | undefined;
      if (!subs?.length) return "Batch";
      const subType = subs[0].type;
      if (subType === "remove") return `Remove ${subs.length} Shapes`;
      if (subType === "create") return `Create ${subs.length} Shapes`;
      return `Update ${subs.length} Shapes`;
    }
    default:
      return "Unknown";
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
              <div
                key={cmd.id}
                onClick={() => handleClick(index)}
                className={`px-2 py-1 text-xs text-left flex items-center gap-2 hover:bg-default-4 cursor-pointer ${isSelected
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
              </div>
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
      className={`px-2 py-0.5 text-xs ${variant === "current"
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
