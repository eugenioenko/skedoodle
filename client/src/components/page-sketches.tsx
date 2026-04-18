import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  storageClient,
  SketchMeta,
} from "@/services/storage.client";
import { localStorageClient, LocalSketchMeta } from "@/services/local-storage.client";
import { IconPlus, IconEdit, IconClock, IconTrash, IconPencil, IconDeviceFloppy, IconCloud } from "@tabler/icons-react";
import { ulid } from "ulid";
import { useAuthStore } from "@/stores/auth.store";
import { Navbar, NavTab } from "./navbar";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { formatDate, formatTime, getRelativeTime } from "@/utils/date";

type Tab = "local" | "cloud";

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

export const SketchesPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("local");
  const [cloudSketches, setCloudSketches] = useState<SketchMeta[]>([]);
  const [localSketches, setLocalSketches] = useState<LocalSketchMeta[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const { user } = useAuthStore();

  async function loadCloudSketches() {
    if (!user) return;
    try {
      const metas = await storageClient.getAllSketches();
      setCloudSketches(metas);
    } catch (error) {
      console.error("Failed to load cloud sketches:", error);
      if (error instanceof Error && error.message.includes('Not authenticated')) {
        useAuthStore.getState().logout();
        navigate('/login');
      }
    }
  }

  async function loadLocalSketches() {
    const metas = await localStorageClient.getAllMeta();
    metas.sort((a, b) => b.updatedAt - a.updatedAt);
    setLocalSketches(metas);
  }

  useEffect(() => {
    loadLocalSketches(); // eslint-disable-line react-hooks/set-state-in-effect
    if (user) loadCloudSketches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNewCloudSketch() {
    if (!user) return;
    const id = ulid();
    const newSketchMeta: SketchMeta = {
      id,
      name: `Untitled Sketch ${cloudSketches.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: user.id,
    };
    await storageClient.createSketch(newSketchMeta);
    navigate(`/sketch/${id}`);
  }

  function handleNewLocalSketch() {
    const id = ulid();
    const meta: LocalSketchMeta = {
      id,
      name: `Local Sketch ${localSketches.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorageClient.setMeta(meta).then(() => {
      navigate(`/local/${id}`);
    });
  }

  async function handleRenameCloud(id: string, newName: string) {
    setEditingId(null);
    setCloudSketches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
    await storageClient.setSketchMeta(id, { name: newName });
  }

  async function handleRenameLocal(id: string, newName: string) {
    setEditingId(null);
    const meta = await localStorageClient.getMeta(id);
    if (meta) {
      await localStorageClient.setMeta({ ...meta, name: newName });
      setLocalSketches((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (activeTab === "cloud") {
        if (!user) return;
        await storageClient.deleteSketch(deleteTarget.id);
        loadCloudSketches();
      } else {
        await localStorageClient.deleteSketch(deleteTarget.id);
        loadLocalSketches();
      }
    } catch (error) {
      console.error("Failed to delete sketch:", error);
    }
    setDeleteTarget(null);
  }

  return (
    <main className="w-dvw h-dvh bg-default-0 text-text-primary flex flex-col">
      <Navbar>
        <NavTab active={activeTab === "local"} onClick={() => setActiveTab("local")}>
          Local Sketches
        </NavTab>
        {user && (
          <NavTab active={activeTab === "cloud"} onClick={() => setActiveTab("cloud")}>
            Cloud Sketches
          </NavTab>
        )}
      </Navbar>
      <div className="flex-grow overflow-y-auto p-8 bg-gradient-to-br from-default-0 to-default-1">
        <div className="max-w-7xl mx-auto">
          {activeTab === "local" ? (
            <LocalTab
              sketches={localSketches}
              editingId={editingId}
              onNew={handleNewLocalSketch}
              onRename={handleRenameLocal}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onStartEdit={setEditingId}
              onCancelEdit={() => setEditingId(null)}
              navigate={navigate}
            />
          ) : (
            <CloudTab
              sketches={cloudSketches}
              editingId={editingId}
              onNew={handleNewCloudSketch}
              onRename={handleRenameCloud}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onStartEdit={setEditingId}
              onCancelEdit={() => setEditingId(null)}
              navigate={navigate}
            />
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete sketch?"
        description={`"${deleteTarget?.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
};

interface LocalTabProps {
  sketches: LocalSketchMeta[];
  editingId: string | null;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  navigate: (path: string) => void;
}

const LocalTab = ({ sketches, editingId, onNew, onRename, onDelete, onStartEdit, onCancelEdit, navigate }: LocalTabProps) => (
  <>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Local Sketches</h2>
        <p className="text-sm text-text-secondary">
          <IconDeviceFloppy size={14} stroke={1.5} className="inline mr-1" />
          Stored in your browser &middot; {sketches.length} {sketches.length === 1 ? "sketch" : "sketches"}
        </p>
      </div>
      <button
        onClick={onNew}
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
        <h3 className="text-lg font-medium mb-2">No local sketches yet</h3>
        <p className="text-sm text-text-secondary mb-6">
          Local sketches are stored in your browser — no account needed
        </p>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={18} stroke={2} />
          Create Sketch
        </button>
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sketches.map((meta) => (
        <SketchCard
          key={meta.id}
          meta={meta}
          editingId={editingId}
          onOpen={() => navigate(`/local/${meta.id}`)}
          onRename={(name) => onRename(meta.id, name)}
          onDelete={() => onDelete(meta.id, meta.name)}
          onStartEdit={() => onStartEdit(meta.id)}
          onCancelEdit={onCancelEdit}
        />
      ))}
    </div>
  </>
);

interface CloudTabProps {
  sketches: SketchMeta[];
  editingId: string | null;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  navigate: (path: string) => void;
}

const CloudTab = ({ sketches, editingId, onNew, onRename, onDelete, onStartEdit, onCancelEdit, navigate }: CloudTabProps) => (
  <>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Cloud Sketches</h2>
        <p className="text-sm text-text-secondary">
          <IconCloud size={14} stroke={1.5} className="inline mr-1" />
          Synced to your account &middot; {sketches.length} {sketches.length === 1 ? "sketch" : "sketches"}
        </p>
      </div>
      <button
        onClick={onNew}
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
        <h3 className="text-lg font-medium mb-2">No cloud sketches yet</h3>
        <p className="text-sm text-text-secondary mb-6">Create your first sketch to get started</p>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-text-primary text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={18} stroke={2} />
          Create Sketch
        </button>
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sketches.map((meta) => (
        <SketchCard
          key={meta.id}
          meta={meta}
          editingId={editingId}
          onOpen={() => navigate(`/sketch/${meta.id}`)}
          onRename={(name) => onRename(meta.id, name)}
          onDelete={() => onDelete(meta.id, meta.name)}
          onStartEdit={() => onStartEdit(meta.id)}
          onCancelEdit={onCancelEdit}
        />
      ))}
    </div>
  </>
);

interface SketchCardProps {
  meta: { id: string; name: string; createdAt: number; updatedAt: number };
  editingId: string | null;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

const SketchCard = ({ meta, editingId, onOpen, onRename, onDelete, onStartEdit, onCancelEdit }: SketchCardProps) => (
  <div className="bg-default-2 rounded-xl border border-default-3 hover:border-default-4 transition-all duration-200 overflow-hidden group shadow-md hover:shadow-xl">
    <button className="w-full text-left" onClick={onOpen}>
      <div className="aspect-video bg-gradient-to-br from-default-3 to-default-4 flex items-center justify-center">
        <IconEdit size={48} stroke={1.5} className="text-text-secondary opacity-50" />
      </div>
    </button>
    <div className="p-4">
      <EditableTitle
        name={meta.name}
        editing={editingId === meta.id}
        onStartEdit={onStartEdit}
        onSave={onRename}
        onCancel={onCancelEdit}
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
        onClick={onStartEdit}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-text-secondary hover:bg-default-3 hover:text-text-primary transition-colors text-xs opacity-0 group-hover:opacity-100"
        title="Rename sketch"
      >
        <IconPencil size={12} stroke={1.5} />
        <span>Rename</span>
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
        title="Delete sketch"
      >
        <IconTrash size={12} stroke={1.5} />
        <span>Delete</span>
      </button>
    </div>
  </div>
);
