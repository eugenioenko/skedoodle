"use client";

import { useSliderInput } from "@/hooks/useSliderInput";
import { Icon, IconSelector } from "@tabler/icons-react";

interface SlideInputProps {
  min?: number;
  max?: number;
  sensitivity?: number;
  label?: string;
  value: number;
  decimals?: number;
  icon?: Icon;
  convertTo?: (value: number) => number;
  convertFrom?: (value: number) => number;
  onChange: (value: number) => void;
}

export const SlideInput = ({
  min = 0,
  max = 100,
  sensitivity = 1,
  decimals = 3,
  label,
  value,
  icon: Icon,
  onChange,
  convertTo,
  convertFrom,
}: SlideInputProps) => {
  const { strValue, onMouseDown, doChange, doBlur } = useSliderInput({
    min,
    max,
    sensitivity,
    decimals,
    value,
    onChange,
    convertTo,
    convertFrom,
  });

  return (
    <div>
      {label && (
        <label className="text-xs font-light opacity-65">{label}</label>
      )}
      <div className="relative">
        <button
          className="absolute left-px top-px w-6 h-6 cursor-ew-resize center rounded text-white/65"
          onMouseDown={(e) => onMouseDown(e.screenX)}
        >
          {Icon && <Icon size={18} stroke={1} />}
        </button>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="slider-input"
          value={strValue}
          onChange={(e) => doChange(e.target.value)}
          onBlur={() => doBlur()}
        />
      </div>
    </div>
  );
};
