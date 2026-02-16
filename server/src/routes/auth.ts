import { Router } from 'express';
import { getRegistrationOptions, verifyRegistration, getLoginOptions, verifyLogin } from '../services/passkey';
import { signToken, requireAuth } from '../utils/auth';
import { prisma } from '../prisma';

const router = Router();

// Get registration options
router.post('/register/options', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      res.status(400).json({ error: 'Username must be at least 2 characters' });
      return;
    }
    const options = await getRegistrationOptions(username.trim());
    res.json(options);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verify registration
router.post('/register/verify', async (req, res) => {
  try {
    const { username, response } = req.body;
    if (!username || !response) {
      res.status(400).json({ error: 'Missing username or response' });
      return;
    }
    const user = await verifyRegistration(username.trim(), response);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get login options
router.post('/login/options', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }
    const { options } = await getLoginOptions(username.trim());
    res.json(options);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verify login
router.post('/login/verify', async (req, res) => {
  try {
    const { username, response } = req.body;
    if (!username || !response) {
      res.status(400).json({ error: 'Missing username or response' });
      return;
    }
    const user = await verifyLogin(username.trim(), response);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: { id: true, username: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;