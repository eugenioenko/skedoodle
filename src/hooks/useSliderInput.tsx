import { useState, useRef, useEffect } from "react";
import { clamp, truncateToDecimals } from "@/canvas/canvas.utils";

interface UseSliderProps {
  min?: number;
  max?: number;
  sensitivity?: number;
  value: number;
  decimals?: number;
  onChange: (value: number) => void;
}

export const useSliderInput = ({
  min = 0,
  max = 100,
  sensitivity = 1,
  decimals = 3,
  value,
  onChange,
}: UseSliderProps) => {
  const [strValue, setStrValue] = useState("");
  const screenXRef = useRef(0);
  const lastValidValue = useRef(0);

  useEffect(() => {
    if (!isNaN(value)) {
      doChange(value.toString());
    }
  }, [value]);

  const onMouseDown = (x: number) => {
    screenXRef.current = x;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    requestAnimationFrame(() => {
      let newValue =
        Number(strValue) + (e.screenX - screenXRef.current) * sensitivity;
      updateInputValue(newValue);
    });
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const updateInputValue = (numValue: number) => {
    numValue = isNaN(numValue) ? 0 : truncateToDecimals(numValue, decimals);
    numValue = clamp(numValue, min, max);
    setStrValue(numValue.toString());
    onChange(numValue);
  };

  const doChange = (newValue: string) => {
    const numValue = Number(newValue);
    if (newValue === "" || newValue.endsWith(".") || isNaN(numValue)) {
      setStrValue(newValue);
      return;
    }
    updateInputValue(numValue);
    lastValidValue.current = numValue;
  };

  const doBlur = () => {
    console.log(lastValidValue.current);
    updateInputValue(lastValidValue.current);
  };

  return {
    strValue,
    onMouseDown,
    updateInputValue,
    doChange,
    doBlur,
  };
};
