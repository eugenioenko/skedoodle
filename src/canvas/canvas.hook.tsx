import { useCanvasStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { handlers } from "./canvas.service";
import { debounce } from "./canvas.utils";

export const useInitTwoCanvas = (
  containerRef: MutableRefObject<HTMLDivElement | null>
) => {
  const two = useCanvasStore((state) => state.two);
  const canvas = useCanvasStore((state) => state.canvas);
  const zui = useCanvasStore((state) => state.zui);

  useEffect(() => {
    const {
      setTwo,
      setCanvas,
      setZui,
      setContainer,
      two: twoInstance,
    } = useCanvasStore.getState();

    if (!containerRef.current || twoInstance) {
      return;
    }

    console.info("Canvas initialized");

    const instance = createTwo(containerRef.current);
    const canvasInstance = createCanvas(instance);
    const zuiInstance = createZUI(canvasInstance);

    setTwo(instance);
    setCanvas(canvasInstance as never);
    setZui(zuiInstance);
    setContainer(containerRef.current);

    // adding a passive event listener for wheel to be able to prevent default
    const currentContainer = containerRef.current;
    currentContainer.addEventListener("wheel", handlers.doMouseWheel, {
      passive: false,
    });

    const debouncesWindowResize = debounce(handlers.doWindowResize, 250);
    window.addEventListener("resize", debouncesWindowResize);
    return () => {
      if (instance) {
        instance.remove();
      }
      if (instance && currentContainer) {
        window.removeEventListener("resize", debouncesWindowResize);
        currentContainer.removeEventListener("wheel", handlers.doMouseWheel);
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

  for (var i = 0; i < 5000; i++) {
    const x = Math.random() * two.width * 6 - two.width;
    const y = Math.random() * two.height * 6 - two.height;
    const size = Math.random() * 100;
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
  zui.addLimits(0.05, 4);
  return zui;
};
