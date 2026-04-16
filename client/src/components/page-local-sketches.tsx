import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { localStorageClient, LocalSketchMeta } from "@/services/local-storage.client";
import { IconPlus, IconEdit, IconClock, IconTrash, IconPencil, IconDeviceFloppy } from "@tabler/icons-react";
import { ulid } from "ulid";
import { Navbar, NavTab } from "./navbar";

const EditableTitle = ({
  name,
  editing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  name: string;
  editing: boolean;
  onStartEdit: () => void;
  onSave: (newName: string) => void;
  onCancel: () => void;
}) => {
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(name);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, name]);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }, [value, name, onSave, onCancel]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="text-base font-medium mb-2 w-full bg-default-3 border border-default-4 rounded px-2 py-1 outline-none focus:border-primary"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
      />
    );
  }

  return (
    <h3
      className="text-base font-medium mb-2 truncate group-hover:text-primary transition-colors cursor-pointer"
      onDoubleClick={onStartEdit}
    >
      {name}
    </h3>
  );
};

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

export const LocalSketchesPage = () => {
  const navigate = useNavigate();
  const [sketches, setSketches] = useState<LocalSketchMeta[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadSketches() {
    const metas = await localStorageClient.getAllMeta();
    metas.sort((a, b) => b.updatedAt - a.updatedAt);
    setSketches(metas);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadSketches();
  }, []);

  function handleNewSketch() {
    const id = ulid();
    const meta: LocalSketchMeta = {
      id,
      name: `Local Sketch ${sketches.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorageClient.setMeta(meta).then(() => {
      navigate(`/local/${id}`);
    });
  }

  async function handleRename(id: string, newName: string) {
    setEditingId(null);
    const meta = await localStorageClient.getMeta(id);
    if (meta) {
      await localStorageClient.setMeta({ ...meta, name: newName });
      setSketches((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
      );
    }
  }

  async function handleDelete(id: string) {
    await localStorageClient.deleteSketch(id);
    loadSketches();
  }

  return (
    <main className="w-dvw h-dvh bg-default-0 text-text-primary flex flex-col">
      <Navbar>
        <NavTab active={false} onClick={() => navigate("/sketches")}>
          Community
        </NavTab>
        <NavTab active={true} onClick={() => {}}>
          Local Sketches
        </NavTab>
      </Navbar>
      <div className="flex-grow overflow-y-auto p-8 bg-gradient-to-br from-default-0 to-default-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Local Sketches</h2>
              <p className="text-sm text-text-secondary">
                <IconDeviceFloppy size={14} stroke={1.5} className="inline mr-1" />
                Stored in your browser &middot; {sketches.length} {sketches.length === 1 ? "sketch" : "sketches"}
              </p>
            </div>
            <button
              onClick={handleNewSketch}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <IconPlus size={18} stroke={2} />
              New Local Sketch
            </button>
          </div>
          {sketches.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-default-2 mb-4">
                <IconEdit size={32} stroke={1.5} className="text-text-secondary" />
              </div>
              <h3 className="text-lg font-medium mb-2">No local sketches yet</h3>
              <p className="text-sm text-text-secondary mb-6">
                Local sketches are stored in your browser — no account needed
              </p>
              <button
                onClick={handleNewSketch}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <IconPlus size={18} stroke={2} />
                Create Local Sketch
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
                  onClick={() => navigate(`/local/${meta.id}`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-default-3 to-default-4 flex items-center justify-center">
                    <IconEdit size={48} stroke={1.5} className="text-text-secondary opacity-50" />
                  </div>
                </button>
                <div className="p-4">
                  <EditableTitle
                    name={meta.name}
                    editing={editingId === meta.id}
                    onStartEdit={() => setEditingId(meta.id)}
                    onSave={(newName) => handleRename(meta.id, newName)}
                    onCancel={() => setEditingId(null)}
                  />
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <IconClock size={14} stroke={1.5} />
                      <span>{getRelativeTime(meta.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-default-3 flex items-center justify-between text-xs text-text-secondary">
                    <span>Created {formatDate(meta.createdAt)}</span>
                    <span>{formatTime(meta.updatedAt)}</span>
                  </div>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(meta.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-text-secondary hover:bg-default-3 hover:text-text-primary transition-colors text-xs opacity-0 group-hover:opacity-100"
                    title="Rename sketch"
                  >
                    <IconPencil size={12} stroke={1.5} />
                    <span>Rename</span>
                  </button>
                  <button
                    onClick={() => handleDelete(meta.id)}
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
