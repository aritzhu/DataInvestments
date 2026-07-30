import { Router, type Router as ExpressRouter } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../infrastructure/prisma/client';

const router: ExpressRouter = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: 'Email, name and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, name, passwordHash, role },
    });

    req.session.userId = user.id;
    (req.session as any).role = user.role;

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    req.session.userId = user.id;
    (req.session as any).role = user.role;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Error logging out' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user' });
  }
});

router.post('/invite', async (req, res) => {
  if (!req.session.userId || (req.session as any).role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  try {
    const { email, name } = req.body;
    if (!email || !name) {
      res.status(400).json({ error: 'Email and name are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: 'user' },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      tempPassword,
    });
  } catch (error) {
    console.error('[Auth] Invite error:', error);
    res.status(500).json({ error: 'Error inviting user' });
  }
});

export default router;
