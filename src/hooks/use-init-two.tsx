import { useCanvasStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";

export const useInitTwo = (
  containerRef: MutableRefObject<HTMLDivElement | null>
) => {
  const two = useCanvasStore((state) => state.two);
  const setTwo = useCanvasStore((state) => state.setTwo);
  const setContainer = useCanvasStore((state) => state.setContainer);

  useEffect(() => {
    if (containerRef.current && !two) {
      const instance = new Two({
        autostart: true,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        type: Two.Types.canvas,
      }).appendTo(containerRef.current);
      setTwo(instance);
      setContainer(containerRef.current);
    }

    return () => {
      if (two) {
        two.remove();
        setTwo(undefined);
      }
    };
  }, [containerRef]);
};
