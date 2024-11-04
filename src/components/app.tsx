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
    <main className="w-dvw h-dvh flex flex-col">
      <div className="bg-toolbar border-b border-border min-h-12 h-12 flex items-center px-4">
        <ToolOptions />
      </div>
      <div className="flex-grow flex relative bg-gray-50 overflow-hidden">
        <Toolbar />
        <Canvas />
        <Panel />
      </div>
      <div className="zzz bg-toolbar border-t border-border h-6 overflow-hidden">
        <StatusBar />
      </div>
    </main>
  );
};
