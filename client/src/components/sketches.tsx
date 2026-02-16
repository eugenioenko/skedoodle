import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllSketchIds,
  getSketchMeta,
  SketchMeta,
} from "@/services/storage.client";

export const Sketches = () => {
  const [sketches, setSketches] = useState<SketchMeta[]>([]);

  useEffect(() => {
    const ids = getAllSketchIds();
    const metas = ids
      .map((id) => getSketchMeta(id))
      .filter((m): m is SketchMeta => !!m)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setSketches(metas);
  }, []);

  return (
    <>
      <div className="pb-1 pt-4 flex items-center justify-between">
        <span>Sketches</span>
      </div>
      <div className="h-40 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col text-sm">
          {sketches.map((meta) => (
            <Link
              className="px-2 py-0.5 text-xs opacity-70 hover:bg-default-4"
              key={meta.id}
              to={`/sketch/${meta.id}`}
            >
              {meta.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};
