import { useNavigate } from "react-router-dom";
import { IconLogout } from "@tabler/icons-react";
import { useAuthStore } from "@/stores/auth.store";
import { ReactNode } from "react";

export const Navbar = ({ children }: { children?: ReactNode }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="bg-default-2 border-b border-default-1 min-h-14 h-14 flex items-center px-8 shadow-lg">
      <div className="max-w-7xl mx-auto w-full flex items-center">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Skedoodle" className="w-7 h-7" />
          <h1 className="text-xl font-semibold">Skedoodle</h1>
        </div>
        {children && <div className="flex items-center gap-1 ml-8">{children}</div>}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-text-secondary">
                @{user.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-default-3 hover:text-text-primary transition-colors"
              >
                <IconLogout size={18} stroke={1.5} />
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-text-primary hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const NavTab = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-default-3 text-text-primary"
        : "text-text-secondary hover:text-text-primary hover:bg-default-3/50"
    }`}
  >
    {children}
  </button>
);
