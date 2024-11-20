"use client";

import { Toolbar } from "./toolbar";
import { Canvas } from "../canvas/canvas.comp";
import { StatusBar } from "./status-bar";
import { Panel } from "./panel";
import { useWindowWheelPrevent } from "@/hooks/use-window-wheel";
import { ToolOptions } from "./tool-options";

export const App = () => {
  useWindowWheelPrevent();

  return (
    <main className="w-dvw h-dvh flex flex-col text-white">
      <div className="bg-default-2 border-b border-default-1 min-h-12 h-12 flex items-center px-4">
        <ToolOptions />
      </div>
      <div className="flex-grow flex relative bg-gray-50 overflow-hidden">
        <Toolbar />
        <Canvas />
        <Panel />
      </div>
      <div className="bg-default-2 border-t border-default-1 h-6 overflow-hidden">
        <StatusBar />
      </div>
    </main>
  );
};
