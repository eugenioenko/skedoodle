import { Toolbar } from "./toolbar";
import { StatusBar } from "./status-bar";
import { Panel } from "./panel";
import { useWindowWheelPrevent } from "@/hooks/use-window-wheel";
import { ToolOptions } from "./tool-options";
import { Loader } from "./loader";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toasts } from "./ui/toasts";
import { useCommandLogStore } from "@/canvas/history.store";
import { exitTimeTravelMode } from "@/canvas/history.service";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { IconChevronDown, IconHome, IconLayoutSidebarRight, IconLogout, IconPhoto } from "@tabler/icons-react";
import { useOptionsStore, SketchMode } from "@/canvas/canvas.store";
import { Button } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";
import { Dropdown, DropdownItem } from "./ui/dropdown";
import { MainMenu } from "./main-menu";
import { SketchOnline } from "@/canvas/sketches/sketch-online";
import { SketchLocal } from "@/canvas/sketches/sketch-local";
import { SketchSandbox } from "@/canvas/sketches/sketch-sandbox";

const UserAvatar = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const initials = user.username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    authService.logout().catch(() => {
      useAuthStore.getState().logout();
      navigate("/login");
    });
  };

  return (
    <Dropdown
      hover={false}
      placement="bottom-end"
      trigger={
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-default-3 select-none"
        >
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <IconChevronDown size={12} stroke={2} />
        </button>
      }
    >
      <DropdownItem
        label="Home"
        icon={<IconPhoto size={16} stroke={1} />}
        onClick={() => navigate("/sketches")}
      />
      <DropdownItem
        label="Logout"
        icon={<IconLogout size={16} stroke={1} />}
        onClick={handleLogout}
      />
    </Dropdown>
  );
};

export const App = ({ mode = "online" }: { mode?: SketchMode }) => {
  useWindowWheelPrevent();
  const navigate = useNavigate();
  const { id } = useParams();
  const isTimeTraveling = useCommandLogStore((state) => state.isTimeTraveling);
  const uiSize = useOptionsStore((state) => state.uiSize);
  const loadDelay = 650;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.body.dataset.uiSize = uiSize;
    return () => { delete document.body.dataset.uiSize; };
  }, [uiSize]);

  const onReady = useCallback(() => {
    setTimeout(() => setIsLoading(false), loadDelay);
  }, [setIsLoading, loadDelay]);

  const sketchId = id || "local";

  return (
    <main className="w-dvw h-dvh flex flex-col text-text-primary relative">
      <div
        className="bg-default-2 border-b border-default-1 flex items-center"
        style={{ height: "var(--nav-h)", minHeight: "var(--nav-h)" }}
      >
        <MainMenu />
        <div className="flex-grow min-w-0 px-4">
          <ToolOptions />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 pr-4">
          <WithTooltip tooltip="Home">
            <Button onClick={() => navigate("/")}>
              <IconHome size={20} stroke={1} />
            </Button>
          </WithTooltip>
          <UserAvatar />
          <WithTooltip tooltip="Toggle panel">
            <Button onClick={() => useOptionsStore.getState().setIsPanelOpen(!useOptionsStore.getState().isPanelOpen)}>
              <IconLayoutSidebarRight size={20} stroke={1} />
            </Button>
          </WithTooltip>
        </div>
      </div>
      {isTimeTraveling && (
        <div className="bg-amber-600/90 text-text-primary text-xs text-center py-1 px-4">
          Timeline Mode (read-only) — Press Escape to exit
          <button
            onClick={exitTimeTravelMode}
            className="ml-2 underline hover:no-underline"
          >
            Exit
          </button>
        </div>
      )}
      <div className="flex-grow flex relative overflow-hidden">
        <Toolbar />
        <div className="relative flex-grow flex">
          {mode === "online" && <SketchOnline sketchId={sketchId} onReady={onReady} />}
          {mode === "local" && <SketchLocal sketchId={sketchId} onReady={onReady} />}
          {mode === "sandbox" && <SketchSandbox onReady={onReady} />}
        </div>
        <Panel />
      </div>
      <div className="bg-default-2 border-t border-default-1 flex-shrink-0">
        <StatusBar />
      </div>
      {isLoading && <Loader />}
      <Toasts />
    </main>
  );
};
