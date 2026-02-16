import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  storageClient,
  SketchMeta,
} from "@/services/storage.client";
import { IconPlus, IconEdit, IconClock, IconUser, IconTrash } from "@tabler/icons-react";
import { ulid } from "ulid";
import { useAuthStore } from "@/stores/auth.store";

export const SketchesPage = () => {
  const navigate = useNavigate();
  const [sketches, setSketches] = useState<SketchMeta[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    loadSketches();
  }, []);

  async function loadSketches() {
    if (!user) return;
    try {
      const metas = await storageClient.getAllSketches();
      setSketches(metas);
    } catch (error) {
      console.error("Failed to load sketches:", error);
      if (error instanceof Error && error.message.includes('Not authenticated')) {
        useAuthStore.getState().logout();
        navigate('/login');
      }
    }
  }

  async function handleNewSketch() {
    if (!user) return;
    const id = ulid();
    const newSketchMeta: SketchMeta = {
      id,
      name: `Untitled Sketch ${sketches.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: user.id,
    };
    await storageClient.createSketch(newSketchMeta);
    navigate(`/sketch/${id}`);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await storageClient.deleteSketch(id);
      loadSketches();
    } catch (error) {
      console.error("Failed to delete sketch:", error);
    }
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRelativeTime(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(ts);
  }

  return (
    <main className="w-dvw h-dvh bg-default-0 text-text-primary flex flex-col">
      <div className="bg-default-2 border-b border-default-1 min-h-14 h-14 flex items-center px-8 shadow-lg">
        <h1 className="text-xl font-semibold">Skedoodle</h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            {user?.username && `@${user.username}`}
          </span>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-8 bg-gradient-to-br from-default-0 to-default-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold mb-1">My Sketches</h2>
              <p className="text-sm text-text-secondary">
                {sketches.length} {sketches.length === 1 ? "sketch" : "sketches"}
              </p>
            </div>
            <button
              onClick={handleNewSketch}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <IconPlus size={18} stroke={2} />
              New Sketch
            </button>
          </div>
          {sketches.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-default-2 mb-4">
                <IconEdit size={32} stroke={1.5} className="text-text-secondary" />
              </div>
              <h3 className="text-lg font-medium mb-2">No sketches yet</h3>
              <p className="text-sm text-text-secondary mb-6">Create your first sketch to get started</p>
              <button
                onClick={handleNewSketch}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <IconPlus size={18} stroke={2} />
                Create Sketch
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sketches.map((meta) => (
              <div
                key={meta.id}
                className="bg-default-2 rounded-xl border border-default-3 hover:border-default-4 transition-all duration-200 overflow-hidden group shadow-md hover:shadow-xl"
              >
                <button
                  className="w-full text-left"
                  onClick={() => navigate(`/sketch/${meta.id}`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-default-3 to-default-4 flex items-center justify-center">
                    <IconEdit size={48} stroke={1.5} className="text-text-secondary opacity-50" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-medium mb-2 truncate group-hover:text-primary transition-colors">
                      {meta.name}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <IconClock size={14} stroke={1.5} />
                        <span>{getRelativeTime(meta.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <IconUser size={14} stroke={1.5} />
                        <span>You</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-default-3 flex items-center justify-between text-xs text-text-secondary">
                      <span>Created {formatDate(meta.createdAt)}</span>
                      <span>{formatTime(meta.updatedAt)}</span>
                    </div>
                  </div>
                </button>
                <div className="px-4 pb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(meta.id);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                    title="Delete sketch"
                  >
                    <IconTrash size={12} stroke={1.5} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
