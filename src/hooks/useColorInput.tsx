import { useState, useEffect } from "react";
import { colord, RgbaColor } from "colord";

interface UseColorInputProps {
  value?: RgbaColor;
  onChange?: (value: RgbaColor) => void;
}

export const useColorInput = ({ value, onChange }: UseColorInputProps) => {
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const [rgbaValue, setRgbaValue] = useState(value || black);
  const [rgbStrValue, setRgbStrValue] = useState("");
  const [alphaValue, setAlphaValue] = useState("");
  const numAlphaValue = percentToAlpha(alphaValue);
  const rgbValue = rgbaToRgbStr(rgbaValue);

  useEffect(() => {
    if (value) {
      setAlphaValue(`${Math.round((value.a || 0) * 100)}`);
      setRgbStrValue(rgbaToRgbStr(value));
      setRgbaValue(value);
    }
  }, [value]);

  const doChange = (rgba: RgbaColor): void => {
    setRgbaValue(rgba);
    if (rgbaValue.a) {
      setAlphaValue(`${Math.floor(rgbaValue.a * 100)}`);
    }
    onChange?.(rgba);
  };

  const doChangePicker = (rgba: RgbaColor): void => {
    if (rgba.a > 0.95) {
      rgba.a = 1;
    }
    setRgbaValue(rgba);
    doChange(rgba);
    setRgbStrValue(rgbaToRgbStr(rgbaValue));
  };

  const doChangeRgbValue = (rgb: string): void => {
    setRgbStrValue(rgb);
    const color = colord(rgb);

    if (color.isValid() && color.toHex() === rgb) {
      const newColor = color.toRgb();
      if (!isNaN(numAlphaValue)) {
        newColor.a = numAlphaValue;
      }
      doChange(newColor);
    }
  };

  const doRgbBlur = (): void => {
    const current = colord(rgbaValue);
    if (!current.isEqual(rgbStrValue)) {
      doChange(current.toRgb());
    }
  };

  const doChangeAlpha = (alpha: string): void => {
    setAlphaValue(alpha);
    const newAlpha = percentToAlpha(alpha);
    if (alpha && !isNaN(newAlpha) && newAlpha >= 0 && newAlpha <= 1) {
      doChangeAlphaValue(newAlpha);
    }
  };

  const doChangeAlphaValue = (newAlpha: number): void => {
    const newColor = { ...rgbaValue };
    newColor.a = newAlpha;
    doChange(newColor);
  };

  const doAlphaBlur = (): void => {
    const currentAlpha = rgbaValue.a;
    const pendingAlpha = percentToAlpha(alphaValue);
    if (currentAlpha != pendingAlpha) {
      doChange({ ...rgbaValue });
    }
  };

  return {
    rgbaValue,
    rgbValue,
    alphaValue,
    rgbStrValue,
    doChangePicker,
    doChangeRgbValue,
    doChangeAlpha,
    doChangeAlphaValue,
    doRgbBlur,
    doAlphaBlur,
  };
};

function rgbaToRgbStr(color: RgbaColor): string {
  return colord({
    r: color.r,
    g: color.g,
    b: color.b,
  }).toHex();
}

function percentToAlpha(value: string): number {
  return Number(value || "1") / 100;
}
