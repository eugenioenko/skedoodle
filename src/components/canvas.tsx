"use client";

import { useAppState, useToolRef } from "@/stores/app.store";
import { useEffect, useRef } from "react";

export const Canvas = () => {
  const date = useAppState((state) => state.date);

  return (
    <div>
      <button onClick={() => console.log(useAppState.getState().tool)}>
        Button
      </button>
      {date.toDateString()}
    </div>
  );
};
