import { useCommandLogStore } from "@/canvas/history.store";
import {
  enterTimeTravelMode,
  exitTimeTravelMode,
  scrubTo,
  branchFromTimeline,
} from "@/canvas/history.service";
import { IconClock, IconGitBranch, IconX } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import Slider from "rc-slider";

export const Timeline = () => {
  const navigate = useNavigate();
  const isTimeTraveling = useCommandLogStore((state) => state.isTimeTraveling);
  const timelinePosition = useCommandLogStore(
    (state) => state.timelinePosition
  );
  const commandCount = useCommandLogStore(
    (state) => state.commandLog.length
  );

  if (!isTimeTraveling) {
    if (commandCount === 0) return null;
    return (
      <>
        <div className="pb-1 pt-4">
          <span>Timeline</span>
        </div>
        <button
          onClick={enterTimeTravelMode}
          className="w-full flex items-center gap-2 px-3 py-2 rounded bg-default-3 hover:bg-default-4 text-xs"
        >
          <IconClock size={16} stroke={1} />
          Enter timeline ({commandCount} steps)
        </button>
      </>
    );
  }

  function handleBranch() {
    const newId = branchFromTimeline();
    navigate(`/sketch/${newId}`);
  }

  return (
    <>
      <div className="pb-1 pt-4 flex items-center justify-between">
        <span>Timeline</span>
        <Button onClick={exitTimeTravelMode} title="Exit timeline (Escape)">
          <IconX size={16} stroke={1.5} />
        </Button>
      </div>
      <div className="rounded bg-default-3 p-3 flex flex-col gap-3">
        <div className="px-1">
          <Slider
            min={0}
            max={commandCount}
            value={timelinePosition}
            onChange={(val) => scrubTo(val as number)}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="tabular-nums opacity-70">
            Step {timelinePosition} / {commandCount}
          </span>
          <button
            onClick={handleBranch}
            disabled={timelinePosition === 0}
            className="flex items-center gap-1 px-2 py-1 rounded bg-default-4 hover:bg-default-5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <IconGitBranch size={14} stroke={1.5} />
            Branch
          </button>
        </div>
      </div>
    </>
  );
};
