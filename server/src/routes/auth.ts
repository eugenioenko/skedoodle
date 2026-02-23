import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { prisma } from "../prisma";

const router = Router();

// Get current user — validates OIDC token and returns internal user record
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: { id: true, username: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
