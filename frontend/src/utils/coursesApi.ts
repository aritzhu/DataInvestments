import { apiFetch } from './api';

export interface Course {
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
  totalSecciones?: number;
  createdAt: string;
  updatedAt: string;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

async function handleRes<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const coursesApi = {
  findAll: () => apiFetch('/api/courses').then((r) => handleRes<Course[]>(r)),
  findAllAdmin: () => apiFetch('/api/courses/admin/all').then((r) => handleRes<Course[]>(r)),
  findById: (id: string) =>
    apiFetch(`/api/courses/${encodeURIComponent(id)}`).then((r) => handleRes<Course>(r)),
  create: (data: Record<string, unknown>) =>
    apiFetch('/api/courses', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }).then((r) => handleRes<Course>(r)),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }).then((r) => handleRes<Course>(r)),
  remove: (id: string) =>
    apiFetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) =>
      handleRes<{ success: boolean }>(r),
    ),
};
