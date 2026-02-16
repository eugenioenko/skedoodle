import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/services/sync.store';
import { getDoodler } from '@/canvas/doodler.client';
import { useZoomStore } from '@/canvas/tools/zoom.tool';
import Two from 'two.js';
import { Group } from 'two.js/src/group';
import { Path } from 'two.js/src/path';
import { Text } from 'two.js/src/text';

type CursorEntry = {
  group: Group;
  arrow: Path;
  label: Text;
};

export function useRemoteCursors() {
  const remoteCursors = useSyncStore(s => s.remoteCursors);
  const isConnected = useSyncStore(s => s.isConnected);
  const localUser = useSyncStore(s => s.localUser);
  const zoom = useZoomStore(s => s.zoom);
  const shapesRef = useRef(new Map<string, CursorEntry>());

  useEffect(() => {
    if (!isConnected || !localUser) return;

    let doodler;
    try {
      doodler = getDoodler();
    } catch {
      return;
    }

    const shapes = shapesRef.current;
    const counterScale = 1 / (doodler.zui.scale || 1);
    const activeUids = new Set<string>();

    remoteCursors.forEach((cursor, uid) => {
      if (uid === localUser.uid || !cursor) return;
      activeUids.add(uid);

      let entry = shapes.get(uid);
      if (!entry) {
        try {
          entry = createCursorEntry(doodler.two, cursor.color, cursor.name);
          doodler.canvas.add(entry.group);
          shapes.set(uid, entry);
          console.log('[Cursors] Created cursor shape for', uid, 'at', cursor.x, cursor.y);
        } catch (err) {
          console.error('[Cursors] Failed to create cursor shape:', err);
          return;
        }
      }

      entry.group.position.set(cursor.x, cursor.y);
      entry.group.scale = counterScale;
      entry.arrow.fill = cursor.color;
      entry.label.value = cursor.name;
    });

    // Remove cursors that are no longer present
    shapes.forEach((entry, uid) => {
      if (!activeUids.has(uid)) {
        doodler.canvas.remove(entry.group);
        shapes.delete(uid);
      }
    });

    doodler.throttledTwoUpdate();
  }, [remoteCursors, isConnected, localUser, zoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        const doodler = getDoodler();
        shapesRef.current.forEach(entry => {
          doodler.canvas.remove(entry.group);
        });
      } catch { /* doodler may already be destroyed */ }
      shapesRef.current.clear();
    };
  }, []);

  return null;
}

function createCursorEntry(two: Two, color: string, name: string): CursorEntry {
  // Use two.makePath to create the cursor arrow via the Two instance
  // This avoids potential issues with new Two.Path() constructor
  const arrow = two.makePath(
    0, 0,
    0, 18,
    5, 14,
    10, 20,
    13, 17,
    8, 11,
    13, 9,
  ) as unknown as Path;
  arrow.closed = true;
  arrow.curved = false;
  arrow.fill = color;
  arrow.stroke = '#ffffff';
  arrow.linewidth = 1;

  // Normalize origin so the tip (first vertex) is at (0,0) in group space
  const offsetX = arrow.position.x;
  const offsetY = arrow.position.y;
  arrow.position.set(0, 0);
  for (const v of arrow.vertices) {
    v.x += offsetX;
    v.y += offsetY;
  }

  // Name label
  const label = new Text(name, 16, 22);
  label.fill = color;
  label.noStroke();
  label.size = 12;
  label.alignment = 'left';
  label.family = 'system-ui, sans-serif';
  label.weight = 600;

  const group = two.makeGroup(arrow, label) as unknown as Group;

  return { group, arrow, label };
}
