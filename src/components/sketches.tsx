import { useEffect, useState } from "react";

import { keys } from "@/services/storage.client";
import { Link } from "react-router-dom";

export const Sketches = () => {
  const [names, setNames] = useState<string[]>([]);

  async function loadSketchList() {
    const ids = await keys();
    setNames(ids as string[]);
  }

  useEffect(() => {
    loadSketchList();
  }, []);

  return (
    <>
      <div className="pb-1 pt-4">Sketches</div>
      <div className="h-64 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col text-sm gap-1">
          {names.map((name) => (
            <Link
              className="px-2 py-0.5 hover:bg-default-4"
              key={name}
              to={`/sketch/${name}`}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};
