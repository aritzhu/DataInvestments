import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
import * as portfolioService from '../services/portfolioService';
import type { Portfolio, PortfolioValuation, PortfolioHistory, PortfolioValuationHolding } from '../types/portfolio';
import { PortfolioSummary } from '../components/portfolio/PortfolioSummary';
import { PortfolioEmptyState } from '../components/portfolio/PortfolioEmptyState';
import { HoldingRow } from '../components/portfolio/HoldingRow';
import { PortfolioForm } from '../components/portfolio/PortfolioForm';
import { AddHoldingModal } from '../components/portfolio/AddHoldingModal';
import { PortfolioBreakdown } from '../components/portfolio/PortfolioBreakdown';
import { PortfolioTargetChart } from '../components/portfolio/PortfolioTargetChart';
import { PortfolioPriceChart } from '../components/portfolio/PortfolioPriceChart';
import { SectorValuationChart } from '../components/portfolio/SectorValuationChart';
import { InfoButton } from '../components/ui/InfoButton';
import { INFO } from '../utils/infoContent';
import '../styles/portfolio.css';

function computeSummary(holdings: PortfolioValuationHolding[]) {
  const totalInvested = holdings.reduce((s, h) => s + h.totalInvested, 0);
  const totalValue = holdings.reduce((s, h) => s + (h.totalValue ?? 0), 0);
  const totalPL = holdings.reduce((s, h) => s + (h.pl ?? 0), 0);
  const fairValueTotal = holdings.reduce(
    (s, h) => s + (h.recommendedFairValue != null ? h.recommendedFairValue * h.quantity : 0),
    0,
  );
  return {
    totalInvested,
    totalValue,
    totalPL,
    totalPLPercent: totalInvested > 0 ? totalPL / totalInvested : null,
    holdingCount: holdings.length,
    undervaluedCount: holdings.filter((h) => h.verdict === 'buy').length,
    fairValueTotal,
    valuationGapPct: totalValue > 0 && fairValueTotal > 0 ? (fairValueTotal - totalValue) / totalValue : null,
  };
}

export function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [valuation, setValuation] = useState<PortfolioValuation | null>(null);
  const [history, setHistory] = useState<PortfolioHistory | null>(null);
  const [months, setMonths] = useState(12);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [editHolding, setEditHolding] = useState<any>(null);

  const fetchHistory = async (m: number) => {
    if (!id) return;
    try {
      setHistory(await portfolioService.getPortfolioHistory(id, m));
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      const [portfolioData, valuationData] = await Promise.all([
        portfolioService.getPortfolio(id),
        portfolioService.getPortfolioValuation(id),
      ]);
      setPortfolio(portfolioData);
      setValuation(valuationData);
    } catch { /* ignore */ }
    setLoading(false);
    void fetchHistory(months);
  };

  useEffect(() => { fetchData(); }, [id]);

  const realTotalValue = useMemo(
    () => (valuation?.holdings ?? []).reduce((s, h) => s + (h.totalValue ?? 0), 0),
    [valuation],
  );

  const visibleHoldings = useMemo(
    () => (valuation?.holdings ?? []).filter((h) => !excluded.has(h.ticker)),
    [valuation, excluded],
  );

  const visibleSummary = useMemo(() => computeSummary(visibleHoldings), [visibleHoldings]);

  const allocation = useMemo(
    () =>
      visibleHoldings
        .map((h) => ({ ticker: h.ticker, value: h.totalValue ?? 0 }))
        .filter((a) => a.value > 0),
    [visibleHoldings],
  );

  const handleUpdate = async (data: { name: string; description?: string }) => {
    if (!id) return;
    await portfolioService.updatePortfolio(id, data);
    setShowEditForm(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!id || !confirm('¿Eliminar este portfolio? Esta acción no se puede deshacer.')) return;
    await portfolioService.deletePortfolio(id);
    window.location.href = '/portfolios';
  };

  const handleAddHolding = async (data: { companyId: string; quantity: number; averageCost: number }) => {
    if (!id) return;
    await portfolioService.addHolding(id, data);
    setShowAddHolding(false);
    fetchData();
  };

  const handleEditHolding = async (data: { quantity: number; averageCost: number }) => {
    if (!id || !editHolding) return;
    await portfolioService.updateHolding(id, editHolding.holdingId, data);
    setEditHolding(null);
    fetchData();
  };

  const handleRemoveHolding = async (holdingId: string) => {
    if (!id || !confirm('¿Eliminar esta posición?')) return;
    await portfolioService.removeHolding(id, holdingId);
    fetchData();
  };

  if (loading) {
    return (
      <div className="pf-detail-page">
        <div className="pf-loading">Cargando...</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="pf-detail-page">
        <div className="pf-loading">Portfolio no encontrado</div>
      </div>
    );
  }

  const empty = !valuation || valuation.holdings.length === 0;

  const toggleExcluded = (ticker: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  return (
    <div className="pf-detail-page">
      <Link to="/portfolios" className="pf-back-link">
        <ArrowLeft size={14} />
        Volver a Portfolios
      </Link>

      <div className="pf-detail-header">
        <div className="pf-detail-left">
          <div className="pf-detail-icon">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="pf-detail-title"><span className="info-label-row">{portfolio.name} <InfoButton content={INFO['portfolio.intro']} /></span></h1>
            {portfolio.description && (
              <p className="pf-detail-desc">{portfolio.description}</p>
            )}
          </div>
        </div>
        <div className="pf-detail-actions">
          <button
            onClick={() => setShowEditForm(true)}
            className="pf-btn-icon pf-btn-icon--edit"
            title="Editar"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={handleDelete}
            className="pf-btn-icon pf-btn-icon--danger"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {valuation && !empty && (
        <>
          <PortfolioSummary valuation={{ ...valuation, summary: visibleSummary, holdings: visibleHoldings }} />
          <div className="pf-section">
            <PortfolioTargetChart
              history={history ?? { portfolioId: valuation.portfolioId, months, points: [] }}
              months={months}
              onRangeChange={(m) => {
                setMonths(m);
                void fetchHistory(m);
              }}
              allocation={allocation}
              excluded={excluded}
            />
          </div>
          <div className="pf-section">
            <PortfolioPriceChart
              history={history ?? { portfolioId: valuation.portfolioId, months, points: [] }}
              holdings={valuation.holdings}
              excluded={excluded}
              months={months}
              onRangeChange={(m) => {
                setMonths(m);
                void fetchHistory(m);
              }}
            />
          </div>
          <div className="pf-section">
            <SectorValuationChart
              history={history ?? { portfolioId: valuation.portfolioId, months, points: [] }}
              holdings={valuation.holdings}
              excluded={excluded}
              months={months}
              onRangeChange={(m) => {
                setMonths(m);
                void fetchHistory(m);
              }}
            />
          </div>
          <div className="pf-section">
            <PortfolioBreakdown valuation={valuation} />
          </div>
        </>
      )}

      <div className="pf-holdings-header" style={{ marginTop: '1.5rem' }}>
        <h2 className="pf-holdings-title">
          <span className="info-label-row">Posiciones {valuation && `(${valuation.holdings.length})`} <InfoButton content={INFO['portfolio.positions']} /></span>
        </h2>
        <button onClick={() => setShowAddHolding(true)} className="pf-btn-primary">
          <Plus size={14} />
          Añadir
        </button>
      </div>

      {empty ? (
        <PortfolioEmptyState type="holding" onAction={() => setShowAddHolding(true)} />
      ) : (
        <div className="pf-holdings-list">
          {valuation!.holdings.map((h) => (
            <HoldingRow
              key={h.holdingId}
              holding={h}
              portfolioTotalValue={realTotalValue}
              excluded={excluded.has(h.ticker)}
              onToggleExcluded={() => toggleExcluded(h.ticker)}
              onEdit={() => setEditHolding(h)}
              onRemove={() => handleRemoveHolding(h.holdingId)}
            />
          ))}
        </div>
      )}

      {showEditForm && (
        <PortfolioForm
          title="Editar Portfolio"
          initial={{ name: portfolio.name, description: portfolio.description ?? undefined }}
          onSave={handleUpdate}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {showAddHolding && (
        <AddHoldingModal
          onSave={handleAddHolding}
          onClose={() => setShowAddHolding(false)}
        />
      )}

      {editHolding && (
        <AddHoldingModal
          initial={{
            holdingId: editHolding.holdingId,
            ticker: editHolding.ticker,
            quantity: editHolding.quantity,
            averageCost: editHolding.averageCost,
          }}
          onSave={(data) => handleEditHolding(data)}
          onClose={() => setEditHolding(null)}
        />
      )}
    </div>
  );
}
