import { useAppStore } from "@/stores/app.store";
import { useEffect } from "react";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";

export const useInitZui = () => {
  const canvas = useAppStore((state) => state.canvas);

  useEffect(() => {
    if (!canvas) {
      return;
    }

    const zui = new ZUI(canvas);

    var mouse = new Two.Vector();

    zui.addLimits(0.25, 4);

    window.addEventListener("mousedown", mousedown, false);
    window.addEventListener("mousewheel", mousewheel, false);
    window.addEventListener("wheel", mousewheel, false);

    function mousedown(e: MouseEvent) {
      if (e.metaKey === false && e.ctrlKey === false) {
        return;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      window.addEventListener("mousemove", mousemove, false);
      window.addEventListener("mouseup", mouseup, false);
    }

    function mousemove(e: MouseEvent) {
      var dx = e.clientX - mouse.x;
      var dy = e.clientY - mouse.y;
      zui.translateSurface(dx, dy);
      mouse.set(e.clientX, e.clientY);
    }

    function mouseup() {
      window.removeEventListener("mousemove", mousemove, false);
      window.removeEventListener("mouseup", mouseup, false);
    }

    function mousewheel(e: MouseEvent) {
      var dy = (e.wheelDeltaY || -e.deltaY) / 1000;
      zui.zoomBy(dy, e.clientX, e.clientY);
    }
  }, [canvas]);
};
