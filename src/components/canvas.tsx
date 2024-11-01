"use client";

import { useInitCanvas } from "@/hooks/use-init-canvas";
import { useInitTwo } from "@/hooks/use-init-two";
import { useInitZui } from "@/hooks/use-init-zui";
import { useRef } from "react";

export const Canvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useInitTwo(containerRef);
  useInitCanvas();
  useInitZui();
  return (
    <div
      className="w-full h-full bg-white overflow-hidden"
      ref={containerRef}
    ></div>
  );
};
