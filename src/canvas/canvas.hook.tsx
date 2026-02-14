import { useCanvasStore, useOptionsStore } from "@/canvas/canvas.store";
import { MutableRefObject, useEffect } from "react";
import Two from "two.js";
import Group from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { handlers } from "./canvas.service";
import { debounce } from "./canvas.utils";
import { Doodler, setDoodlerInstance } from "./doodler.client";
import { destroyGrid, initGrid } from "./grid";
import { useHistoryStore } from "./history.store";
// import { io } from "socket.io-client";

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
    //createWS(sketchId);
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

    // Initialize dot grid inside the Two.js SVG
    const { gridSize, gridType, gridColor, gridMinZoom } = useOptionsStore.getState();
    const svgEl = instance.renderer.domElement as SVGSVGElement;
    initGrid(svgEl, gridSize, gridType, gridColor, gridMinZoom);

    // TODO: update here to handle errors on loading local storage
    doodlerInstance.loadDoodles().finally(() => onReady?.());

    // adding a passive event listener for wheel to be able to prevent default
    const currentContainer = containerRef.current;
    currentContainer.addEventListener("wheel", handlers.doMouseWheel, {
      passive: false,
    });

    const debouncesWindowResize = debounce(handlers.doWindowResize, 250);
    window.addEventListener("resize", debouncesWindowResize);
    window.addEventListener("keydown", handlers.doKeyDown);

    return () => {
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
      useHistoryStore.getState().clear();
    };
  }, [containerRef, onReady, sketchId]);
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

const createZUI = (canvas: Two): ZUI => {
  const zui = new ZUI(canvas as never);
  zui.addLimits(0.05, 100);
  return zui;
};

/*
const createWS = (sketchId: string): void => {
  return;
  const socket = io("http://localhost:3003");

  socket.on("connect", () => {
    const engine = socket.io.engine;
    const roomId = `${sketchId}/${socket.id}`;

    socket.emit("sketch_host_request", { sketchId: sketchId });

    socket.on("sketch_host_response", (data) => {
      console.log("sketch_host_response");
      console.log(data);
    });

    engine.once("upgrade", () => {
      // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
      console.log(engine.transport.name); // in most cases, prints "websocket"
    });

    engine.on("packet", ({ type, data }) => {
      // called for each packet received
    });

    engine.on("packetCreate", ({ type, data }) => {
      // called for each packet sent
    });

    engine.on("drain", () => {
      // called when the write buffer is drained
    });

    engine.on("close", (reason) => {
      // called when the underlying connection is closed
    });
  });
};
*/
