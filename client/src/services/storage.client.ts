import { Command } from "@/canvas/history.store";
import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface SketchMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  color?: string;
  positionX?: number;
  positionY?: number;
  zoom?: number;
  public?: boolean;
  ownerName?: string;
}

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  return fetch(url, { ...options, headers });
}

async function getSketchCommands(id: string): Promise<Command[] | null> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}/commands`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch sketch commands: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting commands for sketch ${id}:`, error);
    return null;
  }
}

async function setSketchCommands(id: string, commands: Command[]): Promise<void> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}/commands`, {
      method: 'POST',
      body: JSON.stringify(commands),
    });
    if (!response.ok) {
      throw new Error(`Failed to save sketch commands: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error setting commands for sketch ${id}:`, error);
  }
}

async function getSketchMeta(id: string): Promise<SketchMeta | null> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch sketch meta: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error getting meta for sketch ${id}:`, error);
    return null;
  }
}

async function setSketchMeta(id: string, meta: Partial<SketchMeta>): Promise<void> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meta),
    });
    if (!response.ok) {
      throw new Error(`Failed to save sketch meta: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error setting meta for sketch ${id}:`, error);
  }
}

async function createSketch(meta: SketchMeta): Promise<void> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches`, {
      method: 'POST',
      body: JSON.stringify(meta),
    });
    if (!response.ok) {
      throw new Error(`Failed to create sketch: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error creating sketch ${meta.id}:`, error);
  }
}

async function deleteSketch(id: string): Promise<void> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete sketch: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error deleting sketch ${id}:`, error);
  }
}

async function getAllSketches(): Promise<SketchMeta[]> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sketches: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting sketches:', error);
    return [];
  }
}

async function getCommunitySketches(): Promise<SketchMeta[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/sketches/community`);
    if (!response.ok) {
      throw new Error(`Failed to fetch community sketches: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting community sketches:', error);
    return [];
  }
}

export const storageClient = {
  getSketchCommands,
  setSketchCommands,
  getSketchMeta,
  setSketchMeta,
  createSketch,
  deleteSketch,
  getAllSketches,
  getCommunitySketches,
};

