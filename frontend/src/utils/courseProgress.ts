const PREFIX = 'formacion-progress-';

function key(courseId: string): string {
  return `${PREFIX}${courseId}`;
}

export function getVisitedSections(courseId: string): number[] {
  try {
    const raw = localStorage.getItem(key(courseId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markSectionVisited(courseId: string, sectionIndex: number): void {
  const visited = getVisitedSections(courseId);
  if (!visited.includes(sectionIndex)) {
    visited.push(sectionIndex);
    localStorage.setItem(key(courseId), JSON.stringify(visited));
  }
}

export function getCourseProgress(
  courseId: string,
  totalSections: number,
): { visited: number; total: number; percent: number } {
  if (totalSections <= 0) return { visited: 0, total: 0, percent: 0 };
  const visited = getVisitedSections(courseId).length;
  const percent = Math.min(Math.round((visited / totalSections) * 100), 100);
  return { visited, total: totalSections, percent };
}

export function resetAllProgress(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
