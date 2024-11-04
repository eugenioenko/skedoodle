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
    <main className="min-w-dvw min-h-dvh flex flex-col">
      <div className="bg-toolbar border-b border-border h-12 flex items-center">
        <ToolOptions />
      </div>
      <div className="flex-grow flex relative bg-gray-50">
        <Toolbar />
        <Canvas />
        <Panel />
      </div>
      <div className="bg-toolbar border-t border-border min-h-6">
        <StatusBar />
      </div>
    </main>
  );
};
