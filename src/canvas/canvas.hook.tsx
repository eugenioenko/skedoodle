import { useCanvasStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect, useState } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { handlers } from "./canvas.service";
import { debounce } from "./canvas.utils";
import { Doodler, setDoodlerInstance } from "./doodle.service";

export const useInitTwoCanvas = (
  containerRef: MutableRefObject<HTMLDivElement | null>
) => {
  useEffect(() => {
    const { doodler, setContainer, setDoodler } = useCanvasStore.getState();

    if (!containerRef.current || doodler) {
      return;
    }

    console.info("Canvas initialized");

    const instance = createTwo(containerRef.current);
    const canvasInstance = createCanvas(instance);
    const zuiInstance = createZUI(canvasInstance);
    const doodlerInstance = new Doodler({
      two: instance,
      canvas: canvasInstance as never,
      zui: zuiInstance,
      sketchId: "1",
    });

    loadCanvas();
    setContainer(containerRef.current);
    setDoodler(doodlerInstance);
    setDoodlerInstance(doodlerInstance);

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
};

const createTwo = (container: HTMLDivElement): Two => {
  return new Two({
    autostart: false,
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
  const circle = new Two.Circle(0, 0, 11);
  circle.fill = "#333";
  addShape(circle);
};

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.05, 4);
  return zui;
};
