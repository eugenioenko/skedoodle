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
    loadCanvas();
    setZui(zuiInstance);
    setContainer(containerRef.current);

    // adding a passive event listener for wheel to be able to prevent default
    const currentContainer = containerRef.current;
    currentContainer.addEventListener("wheel", handlers.doMouseWheel, {
      passive: false,
    });

    const debouncesWindowResize = debounce(handlers.doWindowResize, 250);
    window.addEventListener("resize", debouncesWindowResize);
    instance.addEventListener("update", handlers.doUpdate);

    return () => {
      if (instance) {
        instance.removeEventListener("update", handlers.doUpdate);
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

  two.add(canvas);
  return canvas as never;
};

const loadCanvas = () => {
  const { addShape } = useCanvasStore.getState();

  for (var i = 0; i < 10; i++) {
    const x = i * 100; // Math.random() * two.width * 6 - two.width;
    const y = i * 100; // Math.random() * two.height * 6 - two.height;
    const size = 100; // Math.random() * 100;
    const shape = new Two.Rectangle(x, y, size, size);
    shape.rotation = Math.random() * Math.PI * 2;
    shape.noStroke().fill = "#ccc";
    addShape(shape);
  }

  const circle = new Two.Circle(0, 0, 10);
  circle.fill = "#FF0000";
  addShape(circle);
};

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.05, 4);
  return zui;
};
