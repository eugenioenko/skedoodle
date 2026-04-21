import { RgbaColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useState } from "react";
import { useColorInput } from "@/hooks/useColorInput";
import { RgbaColor } from "colord";
import { IconPercentage } from "@tabler/icons-react";
import Slider from "rc-slider";

interface ColorInputProps {
  value: RgbaColor;
  onChange?: (value: RgbaColor) => void;
  disabled?: boolean;
}

export const ColorInput = ({ value, onChange, disabled }: ColorInputProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    rgbValue,
    rgbaValue,
    alphaValue,
    rgbStrValue,
    doChangePicker,
    doChangeAlpha,
    doChangeRgbValue,
    doRgbBlur,
    doAlphaBlur,
    doChangeAlphaValue,
  } = useColorInput({
    value,
    onChange,
  });
  return (
    <div className={`relative inline-block ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-start"
        initialOffset={10}
      >
        <PopoverTrigger
          onClick={() => setIsOpen((v) => !v)}
          className={`rounded absolute ${isOpen ? "border-2 border-highlight" : ""}`}
          style={{
            background: rgbValue,
            width: "var(--ctrl-swatch)",
            height: "var(--ctrl-swatch)",
            left: "calc((var(--ctrl-h) - var(--ctrl-swatch)) / 2)",
            top: "calc((var(--ctrl-h) - var(--ctrl-swatch)) / 2)",
          }}
        >
          &nbsp;
        </PopoverTrigger>
        <PopoverContent className="bg-default-2 border border-default-1 p-4 rounded-lg color-picker">
          <RgbaColorPicker
            color={rgbaValue}
            onChange={(value) => doChangePicker(value)}
          />
        </PopoverContent>
      </Popover>
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        className="color-input"
        value={rgbStrValue}
        onChange={(e) => doChangeRgbValue(e.currentTarget.value)}
        onBlur={() => doRgbBlur()}
      />
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        className="alpha-input"
        value={alphaValue}
        onChange={(e) => doChangeAlpha(e.currentTarget.value)}
        onBlur={() => doAlphaBlur()}
      />

      <AlphaSliderPopover
        value={rgbaValue.a}
        setValue={(value) => doChangeAlphaValue(value)}
      />
    </div>
  );
};

interface AlphaSliderPopoverProps {
  value: number;
  setValue: (value: number) => void;
}

const AlphaSliderPopover = ({ value, setValue }: AlphaSliderPopoverProps) => {
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
        className={`absolute border right-px top-px cursor-pointer center rounded text-text-primary/65" ${isOpen ? "border-highlight" : "border-transparent"
          }`}
        style={{ width: "var(--ctrl-icon-btn)", height: "var(--ctrl-icon-btn)" }}
      >
        <IconPercentage stroke={1} className="w-[var(--ctrl-icon)] h-[var(--ctrl-icon)]" />
      </PopoverTrigger>
      <PopoverContent className="bg-default-2 px-4 py-2 rounded w-60 border border-white/10">
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(val) => setValue(val as never)}
        />
      </PopoverContent>
    </Popover>
  );
};
