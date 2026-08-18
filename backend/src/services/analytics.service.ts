import prisma from '../infrastructure/prisma/client';

interface TrackData {
  event: string;
  page?: string | null;
  params?: string | null;
}

interface Overview {
  today: { events: number; pageViews: number; companyViews: number };
  week: { events: number; pageViews: number; companyViews: number };
  month: { events: number; pageViews: number; companyViews: number };
}

export async function trackEvent(data: TrackData) {
  return prisma.analyticsEvent.create({
    data: {
      event: data.event,
      page: data.page || null,
      params: data.params || null,
    },
  });
}

export async function getOverview(): Promise<Overview> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = async (since: Date, eventFilter?: string) => {
    const where: any = { createdAt: { gte: since } };
    if (eventFilter) where.event = eventFilter;
    return prisma.analyticsEvent.count({ where });
  };

  const [todayEvents, todayPageViews, todayCompanyViews, weekEvents, weekPageViews, weekCompanyViews, monthEvents, monthPageViews, monthCompanyViews] = await Promise.all([
    count(startOfDay),
    count(startOfDay, 'page_view'),
    count(startOfDay, 'company_view'),
    count(startOfWeek),
    count(startOfWeek, 'page_view'),
    count(startOfWeek, 'company_view'),
    count(startOfMonth),
    count(startOfMonth, 'page_view'),
    count(startOfMonth, 'company_view'),
  ]);

  return {
    today: { events: todayEvents, pageViews: todayPageViews, companyViews: todayCompanyViews },
    week: { events: weekEvents, pageViews: weekPageViews, companyViews: weekCompanyViews },
    month: { events: monthEvents, pageViews: monthPageViews, companyViews: monthCompanyViews },
  };
}

export async function getTopEvents(days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.analyticsEvent.groupBy({
    by: ['event'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  return rows.map((r) => ({ event: r.event, count: r._count.id }));
}

export async function getDailyCounts(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    const date = row.createdAt.toISOString().slice(0, 10);
    map.set(date, (map.get(date) || 0) + 1);
  }

  const result: { date: string; count: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(since.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) || 0 });
  }

  return result;
}
