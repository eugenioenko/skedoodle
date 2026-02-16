import { useEffect } from "react";

export const useWindowWheelPrevent = () => {
  useEffect(() => {
    window.addEventListener("wheel", doPreventDefault, { passive: false });
    return () => {
      window.removeEventListener("wheel", doPreventDefault);
    };
  }, []);
};

function doPreventDefault(e: WheelEvent): void {
  if (e.deltaX !== 0) {
    e?.preventDefault?.();
  }
}
