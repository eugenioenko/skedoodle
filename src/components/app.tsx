import { Toolbar } from "./toolbar";
import { Canvas } from "../canvas/canvas.comp";
import { StatusBar } from "./status-bar";
import { Panel } from "./panel";
import { useWindowWheelPrevent } from "@/hooks/use-window-wheel";
import { ToolOptions } from "./tool-options";
import { Loader } from "./loader";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { Toasts } from "./ui/toasts";

export const App = () => {
  useWindowWheelPrevent();
  const { id } = useParams();
  const sketchId = id || "local";
  const loadDelay = 450;
  const [isLoading, setIsLoading] = useState(true);

  const onReady = useCallback(() => {
    setTimeout(() => setIsLoading(false), loadDelay);
  }, [setIsLoading, loadDelay]);

  return (
    <main className="w-dvw h-dvh flex flex-col text-white relative">
      <div className="bg-default-2 border-b border-default-1 min-h-12 h-12 flex items-center px-4">
        <ToolOptions />
      </div>
      <div className="flex-grow flex relative overflow-hidden">
        <Toolbar />
        <Canvas sketchId={sketchId} onReady={onReady} />
        <Panel />
      </div>
      <div className="bg-default-2 border-t border-default-1 h-6 overflow-hidden">
        <StatusBar />
      </div>
      {isLoading && <Loader />}
      <Toasts />
    </main>
  );
};
