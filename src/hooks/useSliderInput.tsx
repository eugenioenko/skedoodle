import { useState, useRef, useEffect } from "react";
import { clamp, truncateToDecimals } from "@/canvas/canvas.utils";

interface UseSliderProps {
  min?: number;
  max?: number;
  sensitivity?: number;
  value: number;
  decimals?: number;
  onChange: (value: number) => void;
  convertTo?: (value: number) => number;
  convertFrom?: (value: number) => number;
}

export const useSliderInput = ({
  min = 0,
  max = 100,
  sensitivity = 1,
  decimals = 4,
  value,
  onChange,
  convertFrom,
  convertTo,
}: UseSliderProps) => {
  const [strValue, setStrValue] = useState("");
  const [numValue, setNumValue] = useState(0);
  const [isHoverSliding, setIsHoverSliding] = useState(false);
  const screenXRef = useRef(0);
  const lastValidValue = useRef(0);

  useEffect(() => {
    if (isNaN(value)) {
      return;
    }
    let initialValue = value;
    if (convertFrom) {
      initialValue = convertFrom(initialValue);
    }
    setStrValue(initialValue.toString());
    setNumValue(value);
  }, [value, convertFrom]);

  const onMouseDown = (x: number) => {
    screenXRef.current = x;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    setIsHoverSliding(true);
  };

  const onMouseMove = (e: MouseEvent) => {
    requestAnimationFrame(() => {
      let newValue =
        Number(strValue) + (e.screenX - screenXRef.current) * sensitivity;
      updateInputValue(newValue);
    });
  };

  const onMouseUp = () => {
    setIsHoverSliding(false);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const updateInputValue = (numValue: number) => {
    numValue = clamp(numValue, min, max);
    numValue = truncateToDecimals(numValue, decimals);
    setStrValue(numValue.toString());
    lastValidValue.current = numValue;
    setNumValue(numValue);
    if (convertTo) {
      numValue = convertTo(numValue);
    }
    onChange(numValue);
  };

  const doChange = (newValue: string) => {
    let numValue = Number(newValue);
    if (newValue === "" || newValue.endsWith(".") || isNaN(numValue)) {
      setStrValue(newValue);
      return;
    }
    updateInputValue(numValue);
  };

  const doBlur = () => {
    updateInputValue(lastValidValue.current);
  };

  return {
    strValue,
    numValue,
    onMouseDown,
    updateInputValue,
    doChange,
    doBlur,
    isHoverSliding,
  };
};
