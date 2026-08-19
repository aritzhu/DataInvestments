import { Router, type Router as ExpressRouter } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../infrastructure/prisma/client';
import { generateToken, verifyToken, requireAuth, type AuthRequest } from '../middleware/jwt';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    const token = generateToken({ id: user.id, role: user.role });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, theme: user.theme },
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
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, theme: user.theme },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'ID token is required' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    const { email, name, picture, sub: googleId } = payload;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatar: picture || user.avatar },
        });
      } else {
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'admin' : 'user';
        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            googleId,
            avatar: picture,
            role,
          },
        });
      }
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, theme: user.theme },
    });
  } catch (error) {
    console.error('[Auth] Google login error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const decoded = verifyToken(header.slice(7));

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, theme: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email } = req.body;
    if (typeof name !== 'string' && typeof email !== 'string') {
      res.status(400).json({ error: 'Provide name or email to update' });
      return;
    }

    const data: { name?: string; email?: string } = {};
    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Name cannot be empty' });
        return;
      }
      data.name = trimmed;
    }

    if (typeof email === 'string') {
      const trimmed = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }
      const existing = await prisma.user.findUnique({ where: { email: trimmed } });
      if (existing && existing.id !== req.user!.id) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      data.email = trimmed;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, email: true, name: true, role: true, theme: true },
    });

    res.json(user);
  } catch (error) {
    console.error('[Auth] Profile update error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

router.put('/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!user.passwordHash) {
      res.status(400).json({ error: 'This account uses Google login. Password change is not available.' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Password change error:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});

router.put('/theme', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { theme } = req.body;
    if (theme !== 'dark' && theme !== 'light') {
      res.status(400).json({ error: 'Theme must be "dark" or "light"' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { theme },
      select: { id: true, email: true, name: true, role: true, theme: true },
    });

    res.json(user);
  } catch (error) {
    console.error('[Auth] Theme update error:', error);
    res.status(500).json({ error: 'Error updating theme' });
  }
});

router.delete('/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot delete the only admin account' });
        return;
      }
    }

    await prisma.user.delete({ where: { id: user.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Account delete error:', error);
    res.status(500).json({ error: 'Error deleting account' });
  }
});

router.post('/invite', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const decoded = verifyToken(header.slice(7));

    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

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
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
