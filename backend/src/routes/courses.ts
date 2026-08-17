import { Router, type Router as ExpressRouter } from 'express';
import { courseService } from '../services/courseService';
import { requireAdmin, type AuthRequest } from '../middleware/jwt';

const router: ExpressRouter = Router();

router.get('/', async (_req, res) => {
  try {
    const courses = await courseService.findAllActive();
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los cursos' });
  }
});

router.get('/admin/all', requireAdmin, async (_req, res) => {
  try {
    const courses = await courseService.findAll();
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los cursos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const course = await courseService.findById(req.params.id as string);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el curso' });
  }
});

router.post('/', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { titulo } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });
    const course = await courseService.create({ ...req.body, userId: req.user!.id });
    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el curso' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const course = await courseService.update(req.params.id as string, req.body);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el curso' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await courseService.delete(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Curso no encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el curso' });
  }
});

export default router;
