import prisma from '../infrastructure/prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function generateUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'curso';
  let exists = await prisma.course.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } });
  let i = 1;
  while (exists) {
    slug = `${base}-${i}`;
    exists = await prisma.course.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    i += 1;
  }
  return slug;
}

export interface CreateCourseDto {
  titulo: string;
  descripcion?: string | null;
  contenido?: string | null;
  imagen?: string | null;
  categoria?: string | null;
  orden?: number;
  activo?: boolean;
  slug?: string | null;
}

interface CourseRow {
  id: string;
  userId: string;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  imagen: string | null;
  categoria: string | null;
  orden: number;
  activo: boolean;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { name: string | null } | null;
}

export interface CourseDTO {
  id: string;
  userId: string;
  autor: string | null;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  imagen: string | null;
  categoria: string | null;
  orden: number;
  activo: boolean;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDomain(row: CourseRow): CourseDTO {
  return {
    id: row.id,
    userId: row.userId,
    autor: row.user?.name ?? null,
    titulo: row.titulo,
    descripcion: row.descripcion,
    contenido: row.contenido,
    imagen: row.imagen,
    categoria: row.categoria,
    orden: row.orden,
    activo: row.activo,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function ensureSlug(row: CourseRow): Promise<CourseRow> {
  if (row.slug) return row;
  const slug = await generateUniqueSlug(slugify(row.titulo), row.id);
  const updated = await prisma.course.update({
    where: { id: row.id },
    data: { slug },
    include: { user: { select: { name: true } } },
  });
  return updated as unknown as CourseRow;
}

export const courseService = {
  async create(dto: CreateCourseDto & { userId: string }): Promise<CourseDTO> {
    const slug = dto.slug ? slugify(dto.slug) : await generateUniqueSlug(slugify(dto.titulo));
    const row = await prisma.course.create({
      data: {
        userId: dto.userId,
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        contenido: dto.contenido ?? null,
        imagen: dto.imagen ?? null,
        categoria: dto.categoria ?? null,
        orden: dto.orden ?? 0,
        activo: dto.activo ?? true,
        slug,
      },
      include: { user: { select: { name: true } } },
    });
    return toDomain(row);
  },

  async findAll(): Promise<CourseDTO[]> {
    const rows = await prisma.course.findMany({
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
      include: { user: { select: { name: true } } },
    });
    return Promise.all(rows.map(ensureSlug)).then((r) => r.map(toDomain));
  },

  async findAllActive(): Promise<CourseDTO[]> {
    const rows = await prisma.course.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
      include: { user: { select: { name: true } } },
    });
    return Promise.all(rows.map(ensureSlug)).then((r) => r.map(toDomain));
  },

  async findById(id: string): Promise<CourseDTO | null> {
    let row: CourseRow | null = await prisma.course.findFirst({
      where: UUID_REGEX.test(id) ? { id } : { slug: id },
      include: { user: { select: { name: true } } },
    });
    if (!row) return null;
    row = await ensureSlug(row);
    return toDomain(row);
  },

  async update(id: string, dto: Partial<CreateCourseDto>): Promise<CourseDTO | null> {
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.contenido !== undefined) data.contenido = dto.contenido;
    if (dto.imagen !== undefined) data.imagen = dto.imagen;
    if (dto.categoria !== undefined) data.categoria = dto.categoria;
    if (dto.orden !== undefined) data.orden = dto.orden;
    if (dto.activo !== undefined) data.activo = dto.activo;

    if (dto.slug !== undefined && dto.slug !== null && dto.slug !== '') {
      data.slug = await generateUniqueSlug(slugify(dto.slug), id);
    } else if (dto.titulo !== undefined && !existing.slug) {
      data.slug = await generateUniqueSlug(slugify(dto.titulo), id);
    }

    const row = await prisma.course.update({
      where: { id },
      data,
      include: { user: { select: { name: true } } },
    });
    return toDomain(row);
  },

  async delete(id: string): Promise<boolean> {
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.course.delete({ where: { id } });
    return true;
  },
};
