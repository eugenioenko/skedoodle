import { useCanvasStore } from "@/canvas/canvas.store";
import { Doodle, DoodleType } from "@/canvas/doodle.client";
import { usePointerStore } from "@/canvas/tools/pointer.tool";
import {
  IconCircle,
  IconFileUnknown,
  IconRectangle,
  IconWaveSine,
} from "@tabler/icons-react";
import { useMemo } from "react";

export const Layers = () => {
  const doodles = useCanvasStore((state) => state.doodles);
  const selected = usePointerStore((state) => state.selected);
  const selectedIds = useMemo(
    () => selected.map((item) => item.id),
    [selected]
  );

  return (
    <>
      <div className="pb-1 pt-4">Layers</div>
      <div className="h-64 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col  text-sm">
          {doodles.map((doodle) => (
            <DoodleItem
              doodle={doodle}
              key={doodle.shape.id}
              isSelected={selectedIds.includes(doodle.shape.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

interface ShapeProps {
  doodle: Doodle;
  isSelected?: boolean;
}

const DoodleItem = ({ doodle, isSelected }: ShapeProps) => {
  return (
    <button
      type="button"
      className={`flex items-center hover:bg-default-4 text-left ${
        isSelected ? "bg-secondary" : ""
      }`}
    >
      <div className="w-8 h-8 flex flex-center text-default-6">
        <DoodleIcon type={doodle.type} />
      </div>
      <div className="flex-grow">{doodle.shape.id}</div>
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
    case "ellipse":
      return <IconCircle stroke={1} size={16} />;
    case "rect":
      return <IconRectangle stroke={1} size={16} />;
    default:
      return <IconFileUnknown stroke={1} size={16} />;
  }
};
