import { useOptionsStore } from "@/canvas/canvas.store";
import { RgbaColor } from "colord";

export function useSyncedColor(
  localValue: RgbaColor,
  localSetter: (color: RgbaColor) => void,
  type: "stroke" | "fill"
): [RgbaColor, (color: RgbaColor) => void] {
  const syncColors = useOptionsStore((state) => state.syncColors);
  const globalStrokeColor = useOptionsStore((state) => state.globalStrokeColor);
  const globalFillColor = useOptionsStore((state) => state.globalFillColor);
  const setGlobalStrokeColor = useOptionsStore((state) => state.setGlobalStrokeColor);
  const setGlobalFillColor = useOptionsStore((state) => state.setGlobalFillColor);

  if (!syncColors) {
    return [localValue, localSetter];
  }

  return type === "stroke"
    ? [globalStrokeColor, setGlobalStrokeColor]
    : [globalFillColor, setGlobalFillColor];
}
