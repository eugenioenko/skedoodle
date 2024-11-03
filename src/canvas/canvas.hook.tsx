import { useCanvasStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { handlers } from "./canvas.service";

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

    // adding a passive event listener for wheel to be able to prevent default
    containerRef.current.addEventListener("wheel", handlers.doMouseWheel, {
      passive: false,
    });

    return () => {
      if (instance) {
        instance.remove();
      }
      if (instance && containerRef.current) {
        containerRef.current.removeEventListener(
          "wheel",
          handlers.doMouseWheel
        );
      }
    };
  }, [containerRef]);

  return { two, canvas, zui };
};

const createTwo = (container: HTMLDivElement): Two => {
  return new Two({
    autostart: true,
    fitted: true,
    width: container.clientWidth,
    height: container.clientHeight,
    type: Two.Types.canvas,
  }).appendTo(container);
};

const createCanvas = (two: Two): Group => {
  const canvas = new Two.Group();

  for (var i = 0; i < 100; i++) {
    const x = Math.random() * two.width * 6 - two.width;
    const y = Math.random() * two.height * 6 - two.height;
    const size = Math.random() * 50;
    const shape = new Two.Rectangle(x, y, size, size);
    shape.rotation = Math.random() * Math.PI * 2;
    shape.noStroke().fill = "#ccc";
    canvas.add(shape);
  }

  let circle = two.makeCircle(0, 0, 10);
  circle.fill = "#F00";
  canvas.add(circle);
  window.circle = circle;

  two.add(canvas);
  return canvas as never;
};

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.25, 4);
  return zui;
};
