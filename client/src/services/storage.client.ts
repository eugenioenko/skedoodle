import { Command } from "@/canvas/history.store";
import { useAuthStore } from '../stores/auth.store';

const API_BASE_URL = 'http://localhost:3013/api'; // Assuming a REST API on the same port as WS

// --- Sketch-specific storage ---

export interface SketchMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
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

export async function getSketchCommands(id: string): Promise<Command[] | null> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}/commands`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch sketch commands: ${response.statusText}`);
    }
    const rawCommands = await response.json();
    return rawCommands.map((cmd: any) => ({
      ...cmd,
      ts: new Date(cmd.ts).getTime(), // Convert ISO string back to timestamp
      data: JSON.parse(cmd.data), // Parse stringified JSON data
    }));
  } catch (error) {
    console.error(`Error getting commands for sketch ${id}:`, error);
    return null;
  }
}

export async function setSketchCommands(id: string, commands: Command[]): Promise<void> {
  try {
    const payload = commands.map(cmd => ({
      ...cmd,
      ts: new Date(cmd.ts).toISOString(), // Convert timestamp to ISO string for DB
      data: JSON.stringify(cmd.data), // Stringify complex data for DB storage
    }));
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches/${id}/commands`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to save sketch commands: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error setting commands for sketch ${id}:`, error);
  }
}

export async function getSketchMeta(id: string): Promise<SketchMeta | null> {
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

export async function setSketchMeta(id: string, meta: SketchMeta): Promise<void> {
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

export async function createSketch(meta: SketchMeta): Promise<void> {
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

export async function deleteSketch(id: string): Promise<void> {
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

export async function getAllSketchIds(): Promise<string[]> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/sketches`);
    if (!response.ok) {
      throw new Error(`Failed to fetch all sketch IDs: ${response.statusText}`);
    }
    const sketches: SketchMeta[] = await response.json();
    return sketches.map(s => s.id);
  } catch (error) {
    console.error('Error getting all sketch IDs:', error);
    return [];
  }
}

