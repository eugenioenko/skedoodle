"use client";

import { Toolbar } from "./toolbar";
import { Canvas } from "./canvas";
import { StatusBar } from "./status-bar";

export const App = () => {
  return (
    <main className="min-w-dvw min-h-dvh flex flex-col">
      <div className="bg-toolbar border-b border-border h-12">topbar</div>
      <div className="flex-grow flex">
        <div className="bg-toolbar w-12 border-r border-border">
          <Toolbar />
        </div>
        <div className="flex-grow bg-[#222222]">
          <Canvas />
        </div>
        <div className="bg-toolbar border-l border-border w-96">Panel 2</div>
      </div>
      <div className="bg-toolbar border-t border-border min-h-6">
        <StatusBar />
      </div>
    </main>
  );
};
