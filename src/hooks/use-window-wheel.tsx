import { useEffect } from "react";

export const useWindowWheelPrevent = () => {
  useEffect(() => {
    window.addEventListener("wheel", doPreventDefault, { passive: false });
    return () => {
      window.removeEventListener("wheel", doPreventDefault);
    };
  }, []);
};

function doPreventDefault(e: Event): void {
  e?.preventDefault?.();
}
