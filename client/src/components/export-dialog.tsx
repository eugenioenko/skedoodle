import { useEffect, useMemo, useState } from "react";
import { useCanvasStore, useOptionsStore } from "@/canvas/canvas.store";
import { useSketchMetaStore } from "@/canvas/sketch-meta.store";
import { usePointerStore } from "@/canvas/tools/pointer.tool";
import {
  buildExportFilename,
  exportPNG,
  exportSVG,
} from "@/canvas/export.service";
import { getDoodler } from "@/canvas/doodler.client";
import { Dialog } from "./ui/dialog";
import { ColorInput } from "./ui/color-input";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const SCALE_OPTIONS = [1, 2, 3] as const;

export const ExportDialog = ({ open, onClose }: ExportDialogProps) => {
  const exportFormat = useOptionsStore((s) => s.exportFormat);
  const exportTransparent = useOptionsStore((s) => s.exportTransparent);
  const exportPadding = useOptionsStore((s) => s.exportPadding);
  const exportPngScale = useOptionsStore((s) => s.exportPngScale);
  const canvasColor = useOptionsStore((s) => s.canvasColor);
  const sketchName = useSketchMetaStore((s) => s.name);

  const defaultFilename = useMemo(
    () => buildExportFilename(sketchName, exportFormat),
    [sketchName, exportFormat]
  );

  const [filename, setFilename] = useState(defaultFilename);
  const [background, setBackground] = useState(canvasColor);
  const [filenameTouched, setFilenameTouched] = useState(false);

  // On open: reset background to current canvas color, deselect, refresh filename
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBackground(canvasColor);
    setFilename(buildExportFilename(sketchName, exportFormat));
    setFilenameTouched(false);
    const { selected, clearSelected } = usePointerStore.getState();
    if (selected.length > 0) {
      clearSelected();
      getDoodler().throttledTwoUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If user hasn't touched the filename, keep it in sync with format changes
  useEffect(() => {
    if (filenameTouched) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilename(buildExportFilename(sketchName, exportFormat));
  }, [exportFormat, sketchName, filenameTouched]);

  const handleExport = () => {
    const { doodles } = useCanvasStore.getState();
    const opts = {
      doodles,
      padding: exportPadding,
      background,
      transparent: exportTransparent,
      filename,
    };
    if (exportFormat === "svg") {
      exportSVG(opts);
    } else {
      exportPNG({ ...opts, scale: exportPngScale });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Export sketch"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-default-3 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:opacity-90 text-text-primary transition-colors"
          >
            Export
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <Field label="Format">
          <div className="flex gap-2">
            <RadioPill
              isSelected={exportFormat === "png"}
              onClick={() => useOptionsStore.getState().setExportFormat("png")}
            >
              PNG
            </RadioPill>
            <RadioPill
              isSelected={exportFormat === "svg"}
              onClick={() => useOptionsStore.getState().setExportFormat("svg")}
            >
              SVG
            </RadioPill>
          </div>
        </Field>

        <Field label="Filename">
          <input
            type="text"
            value={filename}
            onChange={(e) => {
              setFilename(e.target.value);
              setFilenameTouched(true);
            }}
            className="w-full px-3 py-2 bg-default-3 border border-default-1 rounded text-sm text-text-primary focus:outline-none focus:border-highlight"
          />
        </Field>

        <Field label="Padding (px)">
          <input
            type="number"
            min={0}
            value={exportPadding}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value) || 0);
              useOptionsStore.getState().setExportPadding(v);
            }}
            className="w-24 px-3 py-2 bg-default-3 border border-default-1 rounded text-sm text-text-primary focus:outline-none focus:border-highlight"
          />
        </Field>

        <Field label="Background">
          <div className="flex items-center gap-3">
            <ColorInput
              value={background}
              onChange={setBackground}
              disabled={exportTransparent}
            />
            <label className="flex items-center gap-2 text-text-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exportTransparent}
                onChange={(e) =>
                  useOptionsStore.getState().setExportTransparent(e.target.checked)
                }
              />
              Transparent
            </label>
          </div>
        </Field>

        {exportFormat === "png" && (
          <Field label="Resolution">
            <div className="flex gap-2">
              {SCALE_OPTIONS.map((scale) => (
                <RadioPill
                  key={scale}
                  isSelected={exportPngScale === scale}
                  onClick={() =>
                    useOptionsStore.getState().setExportPngScale(scale)
                  }
                >
                  {scale}×
                </RadioPill>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Dialog>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-text-secondary">{label}</label>
    {children}
  </div>
);

const RadioPill = ({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded text-sm transition-colors ${
      isSelected
        ? "bg-primary text-text-primary"
        : "bg-default-3 text-text-secondary hover:text-text-primary"
    }`}
  >
    {children}
  </button>
);
