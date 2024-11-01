import { useAppStore } from "@/stores/app.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";

export const useInitTwo = (
  containerRef: MutableRefObject<HTMLDivElement | null>
) => {
  const two = useAppStore((state) => state.two);
  const setTwo = useAppStore((state) => state.setTwo);

  useEffect(() => {
    if (containerRef.current && !two) {
      const instance = new Two({
        autostart: true,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        type: Two.Types.canvas,
      }).appendTo(containerRef.current);
      setTwo(instance);
    }

    return () => {
      if (two) {
        two.remove();
        setTwo(undefined);
      }
    };
  }, [containerRef]);
};
