import { Canvas } from "../canvas.comp";

interface SketchSandboxProps {
  onReady?: () => void;
}

export const SketchSandbox = ({ onReady }: SketchSandboxProps) => {
  return <Canvas sketchId="sandbox" onReady={onReady} />;
};
