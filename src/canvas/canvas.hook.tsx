import { useCanvasStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect, useState } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { handlers } from "./canvas.service";
import { debounce } from "./canvas.utils";
import { Doodler } from "./doodle.service";

export const useInitTwoCanvas = (
  containerRef: MutableRefObject<HTMLDivElement | null>
) => {
  const [instances, setInstances] = useState<any>([
    undefined,
    undefined,
    undefined,
  ]);

  useEffect(() => {
    const {
      setTwo,
      setCanvas,
      setZui,
      setContainer,
      setDoodler,
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
    setInstances([instance, canvasInstance, zuiInstance]);
    setDoodler(
      new Doodler({
        two: instance,
        canvas: canvasInstance as never,
        zui: zuiInstance,
        sketchId: "1",
      })
    );

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
  }, [containerRef, setInstances]);

  return { two: instances[0], canvas: instances[1], zui: instances[2] };
};

const createTwo = (container: HTMLDivElement): Two => {
  return new Two({
    autostart: false,
    fitted: true,
    width: container.clientWidth,
    height: container.clientHeight,
    type: Two.Types.svg,
  }).appendTo(container);
};

const createCanvas = (two: Two): Group => {
  const canvas = new Two.Group();

  two.add(canvas);
  return canvas as never;
};

const loadCanvas = () => {
  const { addShape } = useCanvasStore.getState();

  /*
  for (var i = 0; i < 5000; i++) {
    const x = Math.random() * 5000 * 6 - 5000;
    const y = Math.random() * 5000 * 6 - 5000;
    const size = 100; // Math.random() * 100;
    const shape = new Two.Rectangle(x, y, size, size);
    shape.rotation = Math.random() * Math.PI * 2;
    shape.noStroke().fill = "#ccc";
    addShape(shape);
  }*/

  const circle = new Two.Circle(0, 0, 3);
  circle.fill = "#CCC";
  addShape(circle);
};

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.05, 4);
  return zui;
};
