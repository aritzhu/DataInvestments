import type { Portfolio, Holding, PortfolioValuation } from '../types/portfolio';

const BASE_URL = '/api/portfolios';

export async function listPortfolios(): Promise<Portfolio[]> {
  const res = await fetch(BASE_URL, { credentials: 'include' });
  if (!res.ok) throw new Error('Error fetching portfolios');
  return res.json();
}

export async function getPortfolio(id: string): Promise<Portfolio> {
  const res = await fetch(`${BASE_URL}/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Error fetching portfolio');
  return res.json();
}

export async function createPortfolio(data: { name: string; description?: string; currency?: string }): Promise<Portfolio> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error creating portfolio');
  return res.json();
}

export async function updatePortfolio(id: string, data: { name?: string; description?: string }): Promise<Portfolio> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error updating portfolio');
  return res.json();
}

export async function deletePortfolio(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error deleting portfolio');
}

export async function addHolding(portfolioId: string, data: { companyId: string; quantity: number; averageCost: number }): Promise<Holding> {
  const res = await fetch(`${BASE_URL}/${portfolioId}/holdings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error adding holding');
  return res.json();
}

export async function updateHolding(portfolioId: string, holdingId: string, data: { quantity?: number; averageCost?: number }): Promise<Holding> {
  const res = await fetch(`${BASE_URL}/${portfolioId}/holdings/${holdingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error updating holding');
  return res.json();
}

export async function removeHolding(portfolioId: string, holdingId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${portfolioId}/holdings/${holdingId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error removing holding');
}

export async function getPortfolioValuation(id: string): Promise<PortfolioValuation> {
  const res = await fetch(`${BASE_URL}/${id}/valuation`, { credentials: 'include' });
  if (!res.ok) throw new Error('Error fetching portfolio valuation');
  return res.json();
}
