import { Toolbar } from "./toolbar";
import { Canvas } from "../canvas/canvas.comp";
import { StatusBar } from "./status-bar";
import { Panel } from "./panel";
import { useWindowWheelPrevent } from "@/hooks/use-window-wheel";
import { ToolOptions } from "./tool-options";
import { Loader } from "./loader";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toasts } from "./ui/toasts";
import { useCommandLogStore } from "@/canvas/history.store";
import { exitTimeTravelMode } from "@/canvas/history.service";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { IconChevronDown, IconLayoutSidebarRight, IconLogout, IconPhoto } from "@tabler/icons-react";
import { useOptionsStore } from "@/canvas/canvas.store";
import { Button } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";
import { Dropdown, DropdownItem } from "./ui/dropdown";

const UserAvatar = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-default-3"
      >
        <div className="w-7 h-7 rounded-full bg-default-3 border border-default-4 flex-shrink-0" />
        <IconChevronDown size={12} stroke={2} />
      </button>
    );
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
        <div className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-default-3 select-none">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <IconChevronDown size={12} stroke={2} />
        </div>
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

export const App = ({ isLocal = false }) => {
  useWindowWheelPrevent();
  const { id } = useParams();
  const isTimeTraveling = useCommandLogStore((state) => state.isTimeTraveling);
  const loadDelay = 650;
  const [isLoading, setIsLoading] = useState(true);

  const onReady = useCallback(() => {
    setTimeout(() => setIsLoading(false), loadDelay);
  }, [setIsLoading, loadDelay]);

  return (
    <main className="w-dvw h-dvh flex flex-col text-text-primary relative">
      <div className="bg-default-2 border-b border-default-1 min-h-12 h-12 flex items-center px-4 gap-2">
        <div className="flex-grow min-w-0">
          <ToolOptions />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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
          <Canvas sketchId={id || "local"} onReady={onReady} isLocal={isLocal} />
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
