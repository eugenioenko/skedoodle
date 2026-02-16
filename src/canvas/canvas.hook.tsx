import { useCanvasStore, useOptionsStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { handlers } from "./canvas.service";
import { debounce } from "./canvas.utils";
import { Doodler, setDoodlerInstance } from "./doodler.client";
import { destroyGrid, initGrid } from "./grid";
import { useCommandLogStore } from "./history.store";
import { syncService } from "@/services/sync.client";

export const useInitTwoCanvas = (
  containerRef: MutableRefObject<HTMLDivElement | null>,
  sketchId: string,
  onReady?: () => void
) => {
  useEffect(() => {
    const { setContainer, setDoodler } = useCanvasStore.getState();

    if (!containerRef.current) {
      return;
    }

    const instance = createTwo(containerRef.current);
    const canvasInstance = createCanvas(instance);
    const zuiInstance = createZUI(canvasInstance);
    const doodlerInstance = new Doodler({
      two: instance,
      canvas: canvasInstance as never,
      zui: zuiInstance,
      sketchId,
      container: containerRef.current,
    });

    setDoodler(doodlerInstance);
    setContainer(containerRef.current);
    setDoodlerInstance(doodlerInstance);

    // Initialize grid based on renderer type
    const { gridSize, gridType, gridColor, gridMinZoom, rendererType } = useOptionsStore.getState();
    if (rendererType === "svg") {
      const svgEl = instance.renderer.domElement as SVGSVGElement;
      initGrid(svgEl, gridSize, gridType, gridColor, gridMinZoom);
    } else {
      initGrid(containerRef.current, instance, gridSize, gridType, gridColor, gridMinZoom);
    }

    // TODO: update here to handle errors on loading local storage
    doodlerInstance.loadDoodles().finally(() => {
        onReady?.();
        syncService.connect(sketchId);
    });

    // adding a passive event listener for wheel to be able to prevent default
    const currentContainer = containerRef.current;
    currentContainer.addEventListener("wheel", handlers.doMouseWheel, {
      passive: false,
    });

    const debouncesWindowResize = debounce(handlers.doWindowResize, 250);
    window.addEventListener("resize", debouncesWindowResize);
    window.addEventListener("keydown", handlers.doKeyDown);

    return () => {
      syncService.disconnect();
      window.removeEventListener("resize", debouncesWindowResize);
      window.removeEventListener("keydown", handlers.doKeyDown);
      currentContainer.removeEventListener("wheel", handlers.doMouseWheel);
      destroyGrid();
      if (currentContainer.firstChild) {
        currentContainer.removeChild(currentContainer.firstChild);
      }

      // clear references
      // TODO: move this somewhere else
      instance.remove();
      const { setDoodles } = useCanvasStore.getState();
      setDoodles([]);
      useCommandLogStore.getState().clearSession();
    };
  }, [containerRef, onReady, sketchId]);
};

const createTwo = (container: HTMLDivElement): Two => {
  const { rendererType } = useOptionsStore.getState();
  const twoType = rendererType === "svg" ? Two.Types.svg :
    rendererType === "webgl" ? Two.Types.webgl :
      Two.Types.canvas;

  return new Two({
    autostart: false,
    fitted: true,
    width: container.clientWidth,
    height: container.clientHeight,
    type: twoType,
  }).appendTo(container);
};

const createCanvas = (two: Two): Group => {
  const canvas = new Two.Group();

  two.add(canvas);
  return canvas as never;
};

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.05, 100);
  return zui;
};


