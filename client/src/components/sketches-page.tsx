import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  storageClient,
  SketchMeta,
} from "@/services/storage.client";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { ulid } from "ulid";
import { useAuthStore } from "@/stores/auth.store";

export const SketchesPage = () => {
  const navigate = useNavigate();
  const [sketches, setSketches] = useState<SketchMeta[]>([]);
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadSketches();
  }, [token, navigate]);

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
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="w-dvw h-dvh bg-default-0 text-white flex flex-col">
      <div className="bg-default-2 border-b border-default-1 min-h-12 h-12 flex items-center px-6">
        <h1 className="text-lg font-medium">Skedoodle</h1>
      </div>
      <div className="flex-grow overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm text-default-5">My Sketches</h2>
            <button
              onClick={handleNewSketch}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary text-white text-sm hover:opacity-90"
            >
              <IconPlus size={16} stroke={2} />
              New Sketch
            </button>
          </div>
          {sketches.length === 0 && (
            <div className="text-center py-16 text-default-5 text-sm">
              No sketches yet. Create one to get started.
            </div>
          )}
          <div className="flex flex-col gap-2">
            {sketches.map((meta) => (
              <div
                key={meta.id}
                className="flex items-center justify-between bg-default-2 rounded px-4 py-3 hover:bg-default-3 group"
              >
                <button
                  className="flex-grow text-left"
                  onClick={() => navigate(`/sketch/${meta.id}`)}
                >
                  <div className="text-sm">{meta.name}</div>
                  <div className="text-xs text-default-5">
                    {formatDate(meta.updatedAt)}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(meta.id);
                  }}
                  className="p-1.5 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-default-4"
                  title="Delete sketch"
                >
                  <IconTrash size={16} stroke={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
