import { Tool, useOptionsStore } from "@/canvas/canvas.store";
import {
  IconArrowNarrowRight,
  IconBrush,
  IconCircle,
  IconEaseInOutControlPoints,
  IconEraser,
  IconHandStop,
  IconLetterT,
  IconLine,
  IconPointer,
  IconSquare,
  IconVector,
  IconZoom,
} from "@tabler/icons-react";
import { WithTooltip } from "./ui/tooltip";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import React from "react";

interface ToolDef {
  value: Tool;
  icon: React.ReactElement;
  tooltip: string;
}

export const Toolbar = () => {
  return (
    <div className="absolute bottom-0 left-0 h-14 min-h-14 right-0 md:right-auto md:top-0  md:h-auto md:w-14 z-10">
      <div className="h-full bg-default-2 border-t md:border-r md:border-t-0 border-default-1 flex md:flex-col justify-center md:justify-start items-center gap-4 py-2 md:pt-4 text-text-primary">
        <WithTooltip tooltip="Hand tool [H]">
          <ToggleButton value="hand">
            <IconHandStop stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <ToolGroup
          tools={[
            { value: "pointer", icon: <IconPointer stroke={1} />, tooltip: "Pointer tool [P]" },
            { value: "node", icon: <IconVector stroke={1} />, tooltip: "Node tool [N]" },
          ]}
        />
        <ToolGroup
          tools={[
            { value: "brush", icon: <IconBrush stroke={1} />, tooltip: "Brush tool [B]" },
            { value: "bezier", icon: <IconEaseInOutControlPoints stroke={1} />, tooltip: "Pen tool [C]" },
          ]}
        />
        <ToolGroup
          tools={[
            { value: "square", icon: <IconSquare stroke={1} />, tooltip: "Rectangle tool [R]" },
            { value: "ellipse", icon: <IconCircle stroke={1} />, tooltip: "Ellipse tool [O]" },
          ]}
        />
        <ToolGroup
          tools={[
            { value: "line", icon: <IconLine stroke={1} />, tooltip: "Line tool [L]" },
            { value: "arrow", icon: <IconArrowNarrowRight stroke={1} />, tooltip: "Arrow tool [A]" },
          ]}
        />
        <WithTooltip tooltip="Text tool [T]">
          <ToggleButton value="text">
            <IconLetterT stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Eraser tool [E]">
          <ToggleButton value="eraser">
            <IconEraser stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Zoom tool [Z]">
          <ToggleButton value="zoom">
            <IconZoom stroke={1} />
          </ToggleButton>
        </WithTooltip>
      </div>
    </div>
  );
};

interface ToggleButtonProps {
  value?: string;
  children?: React.ReactNode;
}

const ToggleButton = ({ value, children }: ToggleButtonProps) => {
  let current = useOptionsStore((state) => state.selectedTool);
  const restoreTool = useOptionsStore((state) => state.restoreTool);
  if (restoreTool) {
    current = restoreTool;
  }
  const setTool = useOptionsStore((state) => state.setSelectedTool);
  const isActive = current === value;

  return (
    <button
      type="button"
      className={`p-1 rounded  ${isActive ? "bg-primary" : "hover:bg-default-3"
        }`}
      onClick={() => setTool(value as Tool)}
    >
      {children}
    </button>
  );
};

const ToolGroup = ({ tools }: { tools: ToolDef[] }) => {
  let current = useOptionsStore((state) => state.selectedTool);
  const restoreTool = useOptionsStore((state) => state.restoreTool);
  if (restoreTool) {
    current = restoreTool;
  }
  const setTool = useOptionsStore((state) => state.setSelectedTool);
  const [isOpen, setIsOpen] = React.useState(false);

  const activePick = tools.find((t) => t.value === current) ?? tools[0];
  const isGroupActive = tools.some((t) => t.value === current);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "right-start",
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    delay: { open: 75 },
    handleClose: safePolygon({ blockPointerEvents: true }),
  });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss]);

  return (
    <div ref={refs.setReference} {...getReferenceProps()}>
      <button
        type="button"
        className={`p-1 rounded relative ${isGroupActive ? "bg-primary" : "hover:bg-default-3"}`}
        onClick={() => setTool(activePick.value)}
      >
        {activePick.icon}
        <span
          className="absolute bottom-0.5 right-0.5 opacity-50"
          style={{
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "0 0 5px 5px",
            borderColor: "transparent transparent currentColor transparent",
          }}
        />
      </button>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="flex flex-col gap-0.5 bg-default-2 border border-default-1 rounded p-1 z-50 text-text-primary [&_svg]:w-[18px] [&_svg]:h-[18px]"
          >
            {tools.map((tool) => (
              <button
                key={tool.value}
                type="button"
                className={`flex items-center gap-2 px-2 py-1 rounded text-left ${
                  current === tool.value ? "bg-primary" : "hover:bg-default-3"
                }`}
                onClick={() => {
                  setTool(tool.value);
                  setIsOpen(false);
                }}
              >
                {tool.icon}
                <span className="text-xs text-text-primary whitespace-nowrap">{tool.tooltip}</span>
              </button>
            ))}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};
