import { Router } from 'express';
import { requireAuth } from '../utils/auth';
import { prisma } from '../prisma';

const router = Router();

const sketchSelect = {
  id: true, name: true, color: true, positionX: true, positionY: true,
  zoom: true, public: true, createdAt: true, updatedAt: true, ownerId: true,
} as const;

router.use(requireAuth);

// GET all sketches for the authenticated user
router.get('/', async (req: any, res) => {
  try {
    const sketches = await prisma.sketch.findMany({
      where: { ownerId: req.userId },
      select: sketchSelect,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(sketches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new sketch
router.post('/', async (req: any, res) => {
  try {
    const { id, name } = req.body;
    const newSketch = await prisma.sketch.create({
      data: {
        id: id || undefined,
        name: name || 'Untitled Sketch',
        owner: { connect: { id: req.userId } },
      },
    });
    res.status(201).json(newSketch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET a specific sketch's metadata
router.get('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const sketch = await prisma.sketch.findFirst({
      where: { id, OR: [{ ownerId: req.userId }, { public: true }] },
      select: sketchSelect,
    });
    if (!sketch) {
      res.status(404).json({ error: 'Sketch not found' });
      return;
    }
    res.json(sketch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) a sketch's metadata
router.put('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const isPublic = req.body.public;
    const updatedSketch = await prisma.sketch.update({
      where: { id, ownerId: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(isPublic !== undefined && { public: isPublic }),
        updatedAt: new Date(),
      },
    });
    res.json(updatedSketch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a sketch
router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    await prisma.sketch.delete({
      where: { id, ownerId: req.userId },
    });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all commands for a specific sketch
router.get('/:id/commands', async (req: any, res) => {
  try {
    const { id } = req.params;
    // Verify access: owner or public sketch
    const sketch = await prisma.sketch.findFirst({
      where: { id, OR: [{ ownerId: req.userId }, { public: true }] },
      select: { id: true },
    });
    if (!sketch) {
      res.status(404).json({ error: 'Sketch not found' });
      return;
    }
    const commands = await prisma.command.findMany({
      where: { sketchId: id },
      orderBy: { ts: 'asc' },
    });
    res.json(commands.map(cmd => ({
      ...cmd,
      ts: cmd.ts.getTime(),
      data: JSON.parse(cmd.data),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST (save) commands for a specific sketch
router.post('/:id/commands', async (req: any, res) => {
  try {
    const { id } = req.params;
    const newCommands = req.body; // Array of commands
    // Ensure all commands belong to the authenticated user and sketch
    const commandsToCreate = newCommands.map((cmd: any) => ({
      id: cmd.id,
      ts: new Date(cmd.ts),
      uid: req.userId,
      type: cmd.type,
      sid: cmd.sid,
      data: JSON.stringify(cmd.data),
      sketchId: id,
    }));
    await prisma.command.createMany({
      data: commandsToCreate,
    });
    res.status(201).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
