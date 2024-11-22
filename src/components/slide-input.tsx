"use client";

import { useSliderInput } from "@/hooks/useSliderInput";
import { Icon, IconSelector } from "@tabler/icons-react";
import Slider from "rc-slider";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useState } from "react";

interface SlideInputProps {
  min?: number;
  max?: number;
  sensitivity?: number;
  label?: string;
  value: number;
  decimals?: number;
  icon?: Icon;
  className?: string;
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
  className = "",
}: SlideInputProps) => {
  const {
    strValue,
    numValue,
    onMouseDown,
    doChange,
    doBlur,
    updateInputValue,
    isHoverSliding,
  } = useSliderInput({
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
      <div className={`relative ${className}`}>
        <button
          className={`absolute left-px top-px w-6 h-6 cursor-ew-resize center rounded text-white/65 border ${
            isHoverSliding ? "border-highlight" : "border-transparent"
          }`}
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
        <SliderPopover
          min={min}
          max={max}
          value={numValue}
          setValue={updateInputValue}
        />
      </div>
    </div>
  );
};

interface SliderPopoverProps {
  min?: number;
  max?: number;
  value: number;
  setValue: (value: number) => void;
}

const SliderPopover = ({ min, max, value, setValue }: SliderPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom"
      initialOffset={10}
    >
      <PopoverTrigger
        onClick={() => setIsOpen((v) => !v)}
        className={`absolute border right-px top-px w-6 h-6 cursor-pointer center rounded text-white/65" ${
          isOpen ? "border-highlight" : "border-transparent"
        }`}
      >
        <IconSelector size={18} stroke={1} />
      </PopoverTrigger>
      <PopoverContent className="bg-default-2 px-4 py-2 rounded w-64 border border-white/10">
        <Slider
          min={min}
          max={max}
          value={value}
          onChange={(val) => setValue(val as never)}
        />
      </PopoverContent>
    </Popover>
  );
};
