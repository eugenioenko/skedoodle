import { useAppStore } from "@/stores/app.store";
import { useEffect } from "react";
import Two from "two.js";

export const useInitCanvas = () => {
  const two = useAppStore((state) => state.two);
  const canvasInstance = useAppStore((state) => state.canvas);
  const setCanvas = useAppStore((state) => state.setCanvas);

  useEffect(() => {
    if (!two || canvasInstance) {
      return;
    }
    const canvas = new Two.Group();

    for (var i = 0; i < 100; i++) {
      const x = Math.random() * two.width * 4 - two.width;
      const y = Math.random() * two.height * 4 - two.height;
      const size = 50;
      const shape = new Two.Rectangle(x, y, size, size);
      shape.rotation = Math.random() * Math.PI * 2;
      shape.noStroke().fill = "#ccc";
      canvas.add(shape);
    }

    two.add(canvas);
    setCanvas(canvas as never);
  }, [two]);
};
