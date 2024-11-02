import { useCanvasStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";

export const useInitTwoCanvas = (
  containerRef: MutableRefObject<HTMLDivElement | null>
) => {
  const two = useCanvasStore((state) => state.two);
  const canvas = useCanvasStore((state) => state.canvas);
  const zui = useCanvasStore((state) => state.zui);

  useEffect(() => {
    if (!containerRef.current || two) {
      return;
    }
    console.info("Canvas initialized");
    const instance = createTwo(containerRef.current);
    const canvasInstance = createCanvas(instance);
    const zuiInstance = createZUI(canvasInstance);

    const setTwo = useCanvasStore.getState().setTwo;
    const setCanvas = useCanvasStore.getState().setCanvas;
    const setZui = useCanvasStore.getState().setZui;

    setTwo(instance);
    setCanvas(canvasInstance as never);
    setZui(zuiInstance);

    return () => {
      if (instance) {
        instance.remove();
      }
    };
  }, [containerRef.current]);

  return { two, canvas, zui };
};

const createTwo = (container: HTMLDivElement): Two => {
  console.log(container.clientWidth);
  return new Two({
    autostart: true,
    width: container.clientWidth,
    height: container.clientHeight,
    type: Two.Types.svg,
  }).appendTo(container);
};

const createCanvas = (two: Two): Group => {
  const canvas = new Two.Group();

  for (var i = 0; i < 100; i++) {
    const x = Math.random() * two.width * 4 - two.width;
    const y = Math.random() * two.height * 4 - two.height;
    const size = 50;
    const shape = new Two.Rectangle(x, y, size, size);
    shape.rotation = Math.random() * Math.PI * 2;
    shape.noStroke().fill = "#ccc";
    canvas.add(shape);
  }

  two.add(canvas);
  return canvas as never;
};

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.25, 4);
  return zui;
};
