import { useCanvasStore, useOptionsStore } from "@/canvas/canvas.store";
import { Doodle, DoodleType } from "@/canvas/doodle.utils";
import { getDoodler } from "@/canvas/doodler.client";
import { usePointerStore } from "@/canvas/tools/pointer.tool";
import {
  IconArrowNarrowRight,
  IconCircle,
  IconFileUnknown,
  IconLetterT,
  IconLine,
  IconOval,
  IconRectangle,
  IconVectorBezier,
  IconWaveSine,
} from "@tabler/icons-react";
import { useCallback, useMemo } from "react";

const typeLabels: Record<DoodleType, string> = {
  brush: "Brush",
  rect: "Rectangle",
  ellipse: "Ellipse",
  circle: "Circle",
  line: "Line",
  arrow: "Arrow",
  text: "Text",
  bezier: "Pen Path",
};

export const Layers = () => {
  const doodles = useCanvasStore((state) => state.doodles);
  const selected = usePointerStore((state) => state.selected);
  const selectedIds = useMemo(
    () => selected.map((item) => item.id),
    [selected]
  );

  const handleSelect = useCallback((doodle: Doodle, shiftKey: boolean) => {
    const { selected, selectShapes } = usePointerStore.getState();
    const { setSelectedTool } = useOptionsStore.getState();

    setSelectedTool("pointer");

    if (shiftKey) {
      const alreadySelected = selected.some((s) => s.id === doodle.shape.id);
      if (alreadySelected) {
        selectShapes(selected.filter((s) => s.id !== doodle.shape.id));
      } else {
        selectShapes([...selected, doodle.shape]);
      }
    } else {
      selectShapes([doodle.shape]);
    }

    getDoodler().throttledTwoUpdate();
  }, []);

  return (
    <>
      <div className="pb-1 pt-4 flex items-center justify-between">
        <span>Layers</span>
        <span className="text-xs text-text-secondary">{doodles.length}</span>
      </div>
      <div className="flex-grow max-h-56 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col text-sm">
          {doodles.map((doodle, index) => (
            <DoodleItem
              doodle={doodle}
              index={index + 1}
              key={doodle.shape.id}
              isSelected={selectedIds.includes(doodle.shape.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </>
  );
};

interface ShapeProps {
  doodle: Doodle;
  index: number;
  isSelected?: boolean;
  onSelect: (doodle: Doodle, shiftKey: boolean) => void;
}

const DoodleItem = ({ doodle, index, isSelected, onSelect }: ShapeProps) => {
  const label = typeLabels[doodle.type] ?? doodle.type;

  return (
    <button
      type="button"
      className={`flex items-center hover:bg-default-4 text-left ${isSelected ? "bg-secondary" : ""
        }`}
      onClick={(e) => onSelect(doodle, e.shiftKey)}
    >
      <div className="w-8 h-8 flex flex-center text-text-secondary">
        <DoodleIcon type={doodle.type} />
      </div>
      <div className="flex-grow">{label}</div>
      <div className="pr-2 text-xs text-text-secondary">{index}</div>
    </button>
  );
};

interface DoodleIconProps {
  type: DoodleType;
}

const DoodleIcon = ({ type }: DoodleIconProps) => {
  switch (type) {
    case "brush":
      return <IconWaveSine stroke={1} size={16} />;
    case "circle":
      return <IconCircle stroke={1} size={16} />;
    case "ellipse":
      return <IconOval stroke={1} size={16} />;
    case "rect":
      return <IconRectangle stroke={1} size={16} />;
    case "line":
      return <IconLine stroke={1} size={16} />;
    case "arrow":
      return <IconArrowNarrowRight stroke={1} size={16} />;
    case "text":
      return <IconLetterT stroke={1} size={16} />;
    case "bezier":
      return <IconVectorBezier stroke={1} size={16} />;
    default:
      return <IconFileUnknown stroke={1} size={16} />;
  }
};
