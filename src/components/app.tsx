import { Toolbar } from "./toolbar";
import { Canvas } from "../canvas/canvas.comp";
import { StatusBar } from "./status-bar";
import { Panel } from "./panel";
import { useWindowWheelPrevent } from "@/hooks/use-window-wheel";
import { ToolOptions } from "./tool-options";
import { Loader } from "./loader";
import { useCallback, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Toasts } from "./ui/toasts";
import { useCommandLogStore } from "@/canvas/history.store";
import { exitTimeTravelMode } from "@/canvas/history.service";

export const App = () => {
  useWindowWheelPrevent();
  const { id } = useParams();
  const isTimeTraveling = useCommandLogStore((state) => state.isTimeTraveling);
  const loadDelay = 450;
  const [isLoading, setIsLoading] = useState(true);

  const onReady = useCallback(() => {
    setTimeout(() => setIsLoading(false), loadDelay);
  }, [setIsLoading, loadDelay]);

  if (!id) {
    return <Navigate to="/sketches" replace />;
  }

  return (
    <main className="w-dvw h-dvh flex flex-col text-white relative">
      <div className="bg-default-2 border-b border-default-1 min-h-12 h-12 flex items-center px-4">
        <ToolOptions />
      </div>
      {isTimeTraveling && (
        <div className="bg-amber-600/90 text-white text-xs text-center py-1 px-4">
          Timeline Mode (read-only) — Press Escape to exit
          <button
            onClick={exitTimeTravelMode}
            className="ml-2 underline hover:no-underline"
          >
            Exit
          </button>
        </div>
      )}
      <div className="flex-grow flex relative overflow-hidden">
        <Toolbar />
        <Canvas sketchId={id} onReady={onReady} />
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
