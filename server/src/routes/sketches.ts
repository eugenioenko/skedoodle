import { Router } from 'express';
import { requireAuth } from '../utils/auth';
import { prisma } from '../prisma';

const router = Router();

router.use(requireAuth); // All routes in this router require authentication

// GET all sketches for the authenticated user
router.get('/', async (req: any, res) => {
  try {
    const sketches = await prisma.sketch.findMany({
      where: { ownerId: req.userId },
      select: { id: true, name: true, color: true, positionX: true, positionY: true, zoom: true, createdAt: true, updatedAt: true, ownerId: true },
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
    const sketch = await prisma.sketch.findUnique({
      where: { id, ownerId: req.userId },
      select: { id: true, name: true, color: true, positionX: true, positionY: true, zoom: true, createdAt: true, updatedAt: true, ownerId: true },
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
    const updatedSketch = await prisma.sketch.update({
      where: { id, ownerId: req.userId },
      data: { ...(name !== undefined && { name }), ...(color !== undefined && { color }), updatedAt: new Date() },
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
    const commands = await prisma.command.findMany({
      where: { sid: id },
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
      sid: id,
      data: JSON.stringify(cmd.data),
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
