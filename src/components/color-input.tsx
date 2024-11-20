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
}

export const ColorInput = ({ value, onChange }: ColorInputProps) => {
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
    <div className="relative max-w-40 ">
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-start"
        initialOffset={10}
      >
        <PopoverTrigger
          onClick={() => setIsOpen((v) => !v)}
          className={`w-[18px] h-[18px] rounded absolute left-1 top-1 ${
            isOpen ? "border-2 border-highlight" : ""
          }`}
          style={{ background: rgbValue }}
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
        className={`absolute border right-px top-px w-6 h-6 cursor-pointer center rounded text-white/65" ${
          isOpen ? "border-highlight" : "border-transparent"
        }`}
      >
        <IconPercentage size={18} stroke={1} />
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
