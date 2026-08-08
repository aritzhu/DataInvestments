import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, RefreshCw, Upload, FileText, Download, Loader2, RotateCcw, CheckCircle2, XCircle, Globe, Tag, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { AddCompanyForm } from './AddCompanyForm';
import { CompanyRow } from './CompanyRow';
import { apiFetch } from '../../utils/api';
import { BulkImportProgress } from './BulkImportProgress';
import { DataStatsSection } from './DataStatsSection';
import { DEFAULT_BOOKS, type Book } from '../BookCarousel';
import '../../styles/admin.css';

interface ProgressUpdate {
  current: number;
  total: number;
  ticker: string;
  status: 'adding' | 'syncing' | 'done' | 'skipped' | 'error';
  message?: string;
}

interface ImportComplete {
  success: string[];
  skipped: string[];
  failed: Array<{ ticker: string; error: string }>;
}

export interface CompanyData {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  cik: string | null;
  createdAt: string;
  financialRecords: number;
  stockRecords: number;
  sync: {
    lastSyncAt: string;
    yearsFetched: number;
    secSync: boolean;
    finnhubSync: boolean;
    errorMessage: string | null;
  } | null;
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

export function AdminPanel() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);

  const [bulkTickers, setBulkTickers] = useState('');
  const [bulkYears, setBulkYears] = useState(5);
  const [isImporting, setIsImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<ProgressUpdate | null>(null);
  const [bulkComplete, setBulkComplete] = useState<ImportComplete | null>(null);

  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncProgress, setResyncProgress] = useState<ProgressUpdate | null>(null);
  const [resyncComplete, setResyncComplete] = useState<{ succeeded: number; failed: number; errors: Array<{ ticker: string; error: string }> } | null>(null);
  const [isFixingSectors, setIsFixingSectors] = useState(false);
  const [fixSectorsResult, setFixSectorsResult] = useState<{ total: number; updated: number } | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [grandTotal, setGrandTotal] = useState(0);
  const [heroSettings, setHeroSettings] = useState<Record<string, string>>({});
  const [heroSaving, setHeroSaving] = useState(false);
  const [books, setBooks] = useState<Book[]>(() => DEFAULT_BOOKS.map((b) => ({ ...b })));
  const [booksSaving, setBooksSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconUploadError, setFaviconUploadError] = useState('');
  const [sp500Loading, setSp500Loading] = useState(false);
  const [sp500Count, setSp500Count] = useState(0);

  const getAuth = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  };
  const getAuthFD = () => {
    const t = localStorage.getItem('token');
    return t ? { headers: { Authorization: `Bearer ${t}` } } : undefined;
  };
  const auth = getAuth();

  const fetchCompanies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/companies?${params.toString()}`, { headers: auth });
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setCompanies(data.data);
        setTotal(typeof data.total === 'number' ? data.total : 0);
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
        setGrandTotal(typeof data.grandTotal === 'number' ? data.grandTotal : data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setHeroSettings(data);
        try {
          const parsed = JSON.parse(data.books || '');
          if (Array.isArray(parsed)) setBooks(parsed as Book[]);
        } catch {
          setBooks(DEFAULT_BOOKS.map((b) => ({ ...b })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(companySearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [companySearch]);

  useEffect(() => {
    if (page > 1 && total > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages, total]);

  const handleCompanyAdded = () => fetchCompanies();

  const handleSaveHero = async () => {
    setHeroSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(heroSettings),
      });
    } finally {
      setHeroSaving(false);
    }
  };

  const handleSaveBooks = async () => {
    setBooksSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ books: JSON.stringify(books) }),
      });
      setHeroSettings((prev) => ({ ...prev, books: JSON.stringify(books) }));
    } finally {
      setBooksSaving(false);
    }
  };

  const updateBook = (index: number, patch: Partial<Book>) => {
    setBooks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const moveBook = (index: number, dir: -1 | 1) => {
    setBooks((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeBook = (index: number) => {
    setBooks((prev) => prev.filter((_, i) => i !== index));
  };

  const addBook = () => {
    setBooks((prev) => [...prev, { title: '', author: '', desc: '', active: true }]);
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroUploading(true);
    setHeroUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        ...getAuthFD(),
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setHeroSettings((prev) => ({ ...prev, hero_bg_url: data.url }));
      } else {
        setHeroUploadError(data.error || 'Error al subir la imagen');
      }
    } catch {
      setHeroUploadError('Error de conexión al subir la imagen');
    } finally {
      setHeroUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        ...getAuthFD(),
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setHeroSettings((prev) => ({ ...prev, site_logo_url: data.url }));
      } else {
        setLogoUploadError(data.error || 'Error al subir el logo');
      }
    } catch {
      setLogoUploadError('Error de conexión al subir el logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    setFaviconUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        ...getAuthFD(),
        body: formData,
      });      const data = await res.json();
      if (data.url) {
        setHeroSettings((prev) => ({ ...prev, site_favicon_url: data.url }));
      } else {
        setFaviconUploadError(data.error || 'Error al subir el favicon');
      }
    } catch {
      setFaviconUploadError('Error de conexión al subir el favicon');
    } finally {
      setFaviconUploading(false);
    }
  };

  const handleCompanyDeleted = () => fetchCompanies();
  const handleSyncComplete = () => fetchCompanies();

  const EUROPEAN_INDICES = [
    { id: 'stoxx600', name: 'STOXX Europe 600', flag: '🇪🇺', country: 'Europa', count: 600, tickers: ['SAP.DE','SIE.DE','ALV.DE','BMW.DE','MBG.DE','BAS.DE','BAYN.DE','DTE.DE','DBK.DE','DB1.DE','MUV2.DE','ADS.DE','HEN3.DE','MRK.DE','IFX.DE','RWE.DE','FRE.DE','CON.DE','HEI.DE','SHL.DE','ENR.DE','NDA.DE','TKA.DE','TEG.DE','SHEL.L','AZN.L','HSBA.L','ULVR.L','BP.L','BATS.L','GSK.L','DGE.L','RIO.L','LSEG.L','REL.L','LLOY.L','NWG.L','PRU.L','AV.L','BA.L','HL.L','EXPN.L','STAN.L','NG.L','BT-A.L','SGRO.L','IMB.L','SSE.L','MC.PA','OR.PA','TTE.PA','SAN.PA','AIR.PA','BNP.PA','SU.PA','ACA.PA','ENGI.PA','VIE.PA','KER.PA','LR.PA','RMS.PA','SAF.PA','DG.PA','ATO.PA','STM.PA','CAP.PA','EL.PA','DSY.PA','SQ.PA','BOL.PA','SGO.PA','WLN.PA','RNO.PA','VIV.PA','PUB.PA','EN.PA','SAN.MC','BBVA.MC','IBE.MC','TEF.MC','ITX.MC','REP.MC','CLNX.MC','ANA.MC','MAP.MC','ACS.MC','ENG.MC','FER.MC','GRF.MC','IAG.MC','MTS.MC','RED.MC','AENA.MC','ASML.AS','RAND.AS','AD.AS','INGA.AS','PRX.AS','UNA.AS','PHIA.AS','AKZA.AS','ABN.AS','KPN.AS','ENEL.MI','ENI.MI','ISP.MI','UNI.MI','STM.MI','PRY.MI','TIT.MI','A32.MI','CNHI.MI','SAF.MI','UCG.MI','PIRC.MI','LUX.DE','ROG.SW','NOVN.SW','UBSG.SW','ZUR.SW','NESN.SW','SREN.SW','ABBN.SW','CFR.SW','SGSN.SW'] },
    { id: 'dax', name: 'DAX 40', flag: '🇩🇪', country: 'Alemania', count: 40, tickers: ['SAP.DE','SIE.DE','ALV.DE','BMW.DE','MBG.DE','VOW3.DE','BAS.DE','BAYN.DE','DTE.DE','DBK.DE','DB1.DE','MUV2.DE','ADS.DE','HEN3.DE','MRK.DE','SY1.DE','IFX.DE','RWE.DE','FRE.DE','CON.DE','HEI.DE','BEI.DE','PZI.DE','CBK.DE','QIA.DE','ZAL.DE','COV.DE','MPS.DE','HFG.DE','SCE.DE','GYC.DE','SHL.DE','ENR.DE','DWNI.DE','NDA.DE','HDD.DE','SRT3.DE','TKA.DE','TEG.DE','NEM.DE'] },
    { id: 'cac40', name: 'CAC 40', flag: '🇫🇷', country: 'Francia', count: 40, tickers: ['MC.PA','OR.PA','TTE.PA','SAN.PA','AIR.PA','BNP.PA','SU.PA','ACA.PA','ENGI.PA','VIE.PA','KER.PA','LR.PA','RMS.PA','SAF.PA','DG.PA','ATO.PA','STM.PA','CAP.PA','EL.PA','DSY.PA','SQ.PA','BOL.PA','SGO.PA','WLN.PA','HEX.PA','TEP.PA','RNO.PA','VIV.PA','PUB.PA','EN.PA','BN.PA','ACP.PA','SPIE.PA','FDJ.PA','NXI.PA','AM.PA','IPH.PA','CO.PA','ALO.PA','SW.PA'] },
    { id: 'ibex35', name: 'IBEX 35', flag: '🇪🇸', country: 'España', count: 35, tickers: ['ACX.MC','ACS.MC','AENA.MC','AMS.MC','ANA.MC','ANE.MC','BBVA.MC','BKT.MC','CABK.MC','CLNX.MC','COL.MC','ELE.MC','ENG.MC','FDR.MC','FER.MC','GRF.MC','IAG.MC','IBE.MC','IDR.MC','ITX.MC','LOG.MC','MAP.MC','MRL.MC','MTS.MC','NTGY.MC','PUIG.MC','RED.MC','REP.MC','ROVI.MC','SAB.MC','SAN.MC','SCYR.MC','SLR.MC','TEF.MC','UNI.MC'] },
    { id: 'ftse100', name: 'FTSE 100', flag: '🇬🇧', country: 'Reino Unido', count: 100, tickers: ['SHEL.L','AZN.L','HSBA.L','ULVR.L','BP.L','BATS.L','GSK.L','DGE.L','RIO.L','LSEG.L','REL.L','LLOY.L','NWG.L','BRCB.L','PRU.L','AV.L','BA.L','HL.L','EXPN.L','STAN.L','NG.L','BT-A.L','SGRO.L','IMB.L','SSE.L','CCH.L','ENR.L','MNG.L','WPP.L','SMIN.L','SMT.L','BNZL.L','III.L','ADM.L','ABF.L','RMV.L','AHT.L','PSON.L','LAND.L','KAZ.L'] },
    { id: 'aex', name: 'AEX', flag: '🇳🇱', country: 'Países Bajos', count: 25, tickers: ['ASML.AS','RAND.AS','AD.AS','INGA.AS','PRX.AS','UNA.AS','PHIA.AS','AKZA.AS','ABN.AS','KPN.AS','ASM.AS','HEIA.AS','WKL.AS','ADYEN.AS','DSM.AS','NN.AS','AGN.AS','AML.AS','SBMO.AS','IMCD.AS','TKWY.AS','VPK.AS','EXO.AS','JUST.AS','ARCELOR.AS'] },
    { id: 'ftsemib', name: 'FTSE MIB', flag: '🇮🇹', country: 'Italia', count: 40, tickers: ['ENEL.MI','ENI.MI','ISP.MI','UNI.MI','STM.MI','PRY.MI','TIT.MI','A32.MI','CNHI.MI','SAF.MI','UCG.MI','PIRC.MI','BPE.MI','CRE.MI','BZU.MI','SRG.MI','MONC.MI','LUX.MI','ATL.MI','IG.MI','SFER.MI','PRIO.MI','DIA.MI','AQM.MI','RAT.MI'] },
    { id: 'smi', name: 'SMI', flag: '🇨🇭', country: 'Suiza', count: 20, tickers: ['ROG.SW','NOVN.SW','UBSG.SW','ZUR.SW','NESN.SW','SREN.SW','ABBN.SW','CFR.SW','SGSN.SW','SIKA.SW','GIVN.SW','LONN.SW','ALC.SW','ADEN.SW','BAER.SW','SCMN.SW','CLN.SW','FLU.SW','SDBK.SW','FREN.SW'] },
  ];

  const [selectedEuropeanIndex, setSelectedEuropeanIndex] = useState(EUROPEAN_INDICES[0].id);

  const handleAddEuropeanIndex = () => {
    const index = EUROPEAN_INDICES.find(i => i.id === selectedEuropeanIndex);
    if (!index) return;
    const existing = bulkTickers.split(/[\n,;]+/).map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
    const newTickers = [...new Set([...existing, ...index.tickers])];
    setBulkTickers(newTickers.join('\n'));
  };

  const loadSP500 = async () => {
    setSp500Loading(true);
    try {
      const res = await apiFetch('/api/admin/sp500-list');
      const data = await res.json();
      const tickers = data.stocks.map((s: { ticker: string }) => s.ticker);
      const existing = bulkTickers.split(/[\n,;]+/).map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
      const newTickers = [...new Set([...existing, ...tickers])];
      setBulkTickers(newTickers.join('\n'));
      setSp500Count(tickers.length);
    } catch {
      setSp500Count(0);
    } finally {
      setSp500Loading(false);
    }
  };

  const startBulkImport = async () => {
    const tickers = bulkTickers
      .split(/[\n,;]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    if (tickers.length === 0) return;

    setIsImporting(true);
    setBulkProgress(null);
    setBulkComplete(null);

    try {
      const res = await apiFetch('/api/admin/companies/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, years: bulkYears }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'progress') {
              setBulkProgress(msg);
            } else if (msg.type === 'complete') {
              setBulkComplete(msg);
            } else if (msg.type === 'error') {
              setBulkComplete({ success: [], skipped: [], failed: [{ ticker: 'GLOBAL', error: msg.error }] });
            }
          } catch { /* ignore parse errors */ }
        }
      }

      fetchCompanies();
    } catch {
      setBulkComplete({ success: [], skipped: [], failed: [{ ticker: 'GLOBAL', error: 'Error de conexion' }] });
    } finally {
      setIsImporting(false);
    }
  };

  const parseTickersFromText = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0 && t.length <= 12 && /^[A-Z.]+$/.test(t));
  };

  const startBatchResync = async () => {
    setIsResyncing(true);
    setResyncProgress(null);
    setResyncComplete(null);

    try {
      const res = await apiFetch('/api/admin/companies/batch-resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years: 5 }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'progress') {
              setResyncProgress(msg);
            } else if (msg.type === 'complete') {
              setResyncComplete(msg);
            } else if (msg.type === 'error') {
              setResyncComplete({ succeeded: 0, failed: 1, errors: [{ ticker: 'GLOBAL', error: msg.error }] });
            }
          } catch { /* ignore parse errors */ }
        }
      }

      fetchCompanies();
    } catch {
      setResyncComplete({ succeeded: 0, failed: 1, errors: [{ ticker: 'GLOBAL', error: 'Error de conexion' }] });
    } finally {
      setIsResyncing(false);
    }
  };

  const bulkTickerCount = parseTickersFromText(bulkTickers).length;

  const fixSectors = async () => {
    setIsFixingSectors(true);
    setFixSectorsResult(null);
    try {
      const res = await apiFetch('/api/admin/companies/fix-sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setFixSectorsResult({ total: data.total ?? 0, updated: data.updated ?? 0 });
      fetchCompanies();
    } catch {
      setFixSectorsResult(null);
    } finally {
      setIsFixingSectors(false);
    }
  };

  return (
    <div className="admin-content">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-inner">
          <Link to="/" className="admin-back-link">
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', background: 'var(--white-soft)', backdropFilter: 'blur(8px)', border: '1px solid var(--white-mid)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={24} />
            </div>
            <div>
              <h1 className="admin-header-title">Panel de Admin</h1>
              <p className="admin-header-subtitle">Gestiona empresas y sincroniza datos financieros</p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-content-inner">
        {/* API Status */}
        <div className="admin-status-grid">
          <div className="admin-status-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="admin-status-dot admin-status-dot--green" />
              <span className="admin-status-name">SEC EDGAR</span>
            </div>
            <p className="admin-status-desc">Datos XBRL oficiales (10-K, 10-Q) para empresas US</p>
            <span className="admin-status-badge admin-status-badge--green">
              <span className="admin-status-dot admin-status-dot--green" />
              Gratuito — Sin API key
            </span>
          </div>
          <div className="admin-status-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="admin-status-dot admin-status-dot--green" />
              <span className="admin-status-name">ESEF/XBRL (Europeo)</span>
            </div>
            <p className="admin-status-desc">Datos XBRL oficiales para empresas europeas</p>
            <span className="admin-status-badge admin-status-badge--green">
              <span className="admin-status-dot admin-status-dot--green" />
              Gratuito — filings.xbrl.org
            </span>
          </div>
          <div className="admin-status-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="admin-status-dot admin-status-dot--green" />
              <span className="admin-status-name">Yahoo Finance</span>
            </div>
            <p className="admin-status-desc">Precio actual, cotización, market cap, shares outstanding</p>
            <span className="admin-status-badge admin-status-badge--green">
              <span className="admin-status-dot admin-status-dot--green" />
              Gratuito — Scraping
            </span>
          </div>
        </div>

        {/* Hero Settings */}
        <div className="admin-form-section" style={{ border: '2px solid var(--pink-pale)', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--pink-pale) 0%, var(--pink-pale) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🎨</span>
              <h2 className="admin-form-title" style={{ marginBottom: 0, color: 'var(--pink-deep)' }}>Contenido de la Web</h2>
            </div>
            <button onClick={handleSaveHero} disabled={heroSaving} style={{ padding: '0.5rem 1.25rem', background: 'var(--pink)', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: heroSaving ? 0.6 : 1 }}>
              {heroSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {/* Hero Image Upload */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.5rem' }}>Imagen de fondo del hero</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="admin-hero-upload-btn" style={{ padding: '0.5rem 1rem', background: 'var(--pink)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: heroUploading ? 0.6 : 1 }}>
                {heroUploading ? 'Subiendo...' : 'Subir imagen'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroImageUpload} style={{ display: 'none' }} disabled={heroUploading} />
              </label>
              {heroSettings.hero_bg_url && (
                <button onClick={() => setHeroSettings((prev) => ({ ...prev, hero_bg_url: '' }))} style={{ padding: '0.4rem 0.8rem', background: 'var(--red-pale)', color: 'var(--red)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Eliminar
                </button>
              )}
            </div>
            {heroSettings.hero_bg_url && (
              <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-default)', maxHeight: '160px', position: 'relative' }}>
                <img src={heroSettings.hero_bg_url} alt="Preview" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.7rem' }}>
                  Imagen de fondo del hero
                </div>
              </div>
            )}
            {heroUploadError && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--red-pale)', color: 'var(--red)', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                {heroUploadError}
              </div>
            )}
          </div>

          {/* Site Logo Upload */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.5rem' }}>Logo del sitio</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="admin-hero-upload-btn" style={{ padding: '0.5rem 1rem', background: 'var(--pink)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: logoUploading ? 0.6 : 1 }}>
                {logoUploading ? 'Subiendo...' : 'Subir logo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={logoUploading} />
              </label>
              {heroSettings.site_logo_url && (
                <button onClick={() => setHeroSettings((prev) => ({ ...prev, site_logo_url: '' }))} style={{ padding: '0.4rem 0.8rem', background: 'var(--red-pale)', color: 'var(--red)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Eliminar
                </button>
              )}
            </div>
            {heroSettings.site_logo_url && (
              <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-default)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
                <img src={heroSettings.site_logo_url} alt="Logo preview" style={{ maxHeight: '80px', width: 'auto', objectFit: 'contain' }} />
              </div>
            )}
            {logoUploadError && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--red-pale)', color: 'var(--red)', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                {logoUploadError}
              </div>
            )}
          </div>

          {/* Favicon Upload */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.5rem' }}>Favicon</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="admin-hero-upload-btn" style={{ padding: '0.5rem 1rem', background: 'var(--pink)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: faviconUploading ? 0.6 : 1 }}>
                {faviconUploading ? 'Subiendo...' : 'Subir favicon'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleFaviconUpload} style={{ display: 'none' }} disabled={faviconUploading} />
              </label>
              {heroSettings.site_favicon_url && (
                <button onClick={() => setHeroSettings((prev) => ({ ...prev, site_favicon_url: '' }))} style={{ padding: '0.4rem 0.8rem', background: 'var(--red-pale)', color: 'var(--red)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Eliminar
                </button>
              )}
            </div>
            {heroSettings.site_favicon_url && (
              <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-default)', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', maxWidth: '120px' }}>
                <img src={heroSettings.site_favicon_url} alt="Favicon preview" style={{ maxHeight: '32px', width: 'auto', objectFit: 'contain' }} />
              </div>
            )}
            {faviconUploadError && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--red-pale)', color: 'var(--red)', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                {faviconUploadError}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {[
              { key: 'hero_badge', label: 'Badge del hero', placeholder: 'Análisis de Valor Intrínseco' },
              { key: 'hero_title', label: 'Título principal', placeholder: 'Entiende el valor real de las empresas' },
              { key: 'hero_subtitle', label: 'Subtítulo', placeholder: 'Visualiza flujos de caja...' },
              { key: 'hero_cta_primary', label: 'Texto botón primario', placeholder: 'Explorar Empresas' },
              { key: 'hero_cta_primary_link', label: 'Enlace botón primario', placeholder: '#companies' },
              { key: 'hero_cta_secondary', label: 'Texto botón secundario', placeholder: 'Saber más' },
              { key: 'hero_cta_secondary_link', label: 'Enlace botón secundario', placeholder: '#features' },
            ].map((field) => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{field.label}</label>
                <input
                  type="text"
                  value={heroSettings[field.key] || ''}
                  onChange={(e) => setHeroSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-default)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            ))}
          </div>

          {/* Valuation Sections Config */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--pink-pale)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pink-deep)', marginBottom: '1rem' }}>Secciones de Valoración</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {[
                { key: 'undervalued_title', label: 'Título subvaloradas', placeholder: 'Oportunidades de Inversión' },
                { key: 'undervalued_subtitle', label: 'Subtítulo subvaloradas', placeholder: 'Empresas con margen de seguridad positivo...' },
                { key: 'undervalued_limit', label: 'Límite subvaloradas (1-20)', placeholder: '5' },
                { key: 'overvalued_title', label: 'Título sobrevaloradas', placeholder: 'Empresas Sobrevaloradas' },
                { key: 'overvalued_subtitle', label: 'Subtítulo sobrevaloradas', placeholder: 'Empresas que el mercado sobreestima...' },
                { key: 'overvalued_limit', label: 'Límite sobrevaloradas (1-20)', placeholder: '5' },
              ].map((field) => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{field.label}</label>
                  <input
                    type={field.key.includes('limit') ? 'number' : 'text'}
                    min={field.key.includes('limit') ? 1 : undefined}
                    max={field.key.includes('limit') ? 20 : undefined}
                    value={heroSettings[field.key] || ''}
                    onChange={(e) => setHeroSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-default)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Legal Data Config */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--pink-pale)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pink-deep)', margin: 0 }}>Datos Legales</h3>
              <a href="/legal/aviso-legal" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--pink)', fontWeight: 600 }}>
                Ver Aviso Legal ↗
              </a>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 0, marginBottom: '1rem' }}>
              Se muestran en el Aviso Legal y la Política de Privacidad. Los campos vacíos aparecen como pendientes de configurar.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {[
                { key: 'legal_titular', label: 'Titular (nombre o razón social)', placeholder: 'DataInvestments S.L.' },
                { key: 'legal_nif', label: 'NIF/CIF', placeholder: 'B00000000' },
                { key: 'legal_domicilio', label: 'Domicilio', placeholder: 'Calle Falsa 123, 28000 Madrid' },
                { key: 'legal_email', label: 'Email de contacto', placeholder: 'contacto@datainvestments.com' },
                { key: 'legal_registral', label: 'Datos registrales (opcional)', placeholder: 'Inscrita en el Registro Mercantil de Madrid, Tomo X' },
                { key: 'legal_updated_at', label: 'Fecha de actualización de los documentos', placeholder: 'Agosto 2026' },
              ].map((field) => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{field.label}</label>
                  <input
                    type="text"
                    value={heroSettings[field.key] || ''}
                    onChange={(e) => setHeroSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-default)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Statistics */}
        {companies.length > 0 && <DataStatsSection />}

        {/* Data Sources */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 className="admin-sources-title">Fuentes de Datos</h2>
          <div className="admin-sources-grid">
            <div className="admin-source-card admin-source-card--emerald">
              <h3 className="admin-source-card-title admin-source-card-title--emerald">
                SEC EDGAR
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--blue-light)', fontWeight: 500, marginBottom: '0.75rem' }}>Empresas US — Datos XBRL oficiales</p>
              <ul className="admin-source-list">
                <li><strong>Company Facts:</strong> revenue, netIncome (10-K)</li>
                <li><strong>CIK Mapping:</strong> identificador único SEC</li>
                <li><strong>Forms:</strong> 10-K anual, 10-Q trimestral</li>
                <li><strong>Cobertura:</strong> todas las empresas US</li>
              </ul>
            </div>
            <div className="admin-source-card admin-source-card--blue">
              <h3 className="admin-source-card-title admin-source-card-title--blue">
                ESEF/XBRL (Europeo)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 500, marginBottom: '0.75rem' }}>Empresas Europeas — Datos XBRL oficiales</p>
              <ul className="admin-source-list">
                <li><strong>Ingresos:</strong> revenue, netIncome, EBITDA</li>
                <li><strong>Balance:</strong> assets, liabilities, equity</li>
                <li><strong>Cash Flow:</strong> operating, investing, financing</li>
                <li><strong>Fuente:</strong> filings.xbrl.org (ESEF)</li>
              </ul>
            </div>
            <div className="admin-source-card admin-source-card--purple">
              <h3 className="admin-source-card-title admin-source-card-title--purple">
                Yahoo Finance
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--purple)', fontWeight: 500, marginBottom: '0.75rem' }}>Cotizaciones — Precio y métricas de mercado</p>
              <ul className="admin-source-list">
                <li><strong>Chart API:</strong> regularMarketPrice, marketCap</li>
                <li><strong>Scraping:</strong> Sin autenticación requerida</li>
                <li><strong>Datos:</strong> precio, sharesOutstanding, exchange</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Add Company */}
        <div className="admin-form-section">
          <h2 className="admin-form-title">Anadir Empresa</h2>
          <AddCompanyForm onCompanyAdded={handleCompanyAdded} />
        </div>

        {/* Bulk Import */}
        <div className="admin-form-section" style={{ border: '2px solid var(--blue-pale)', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--blue-pale) 0%, var(--blue-pale) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, var(--indigo) 0%, var(--purple) 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Upload size={18} />
            </div>
            <div>
              <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Importacion Masiva</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>Importa multiples empresas de una vez</p>
            </div>
          </div>



          {/* European Indices Quick Import */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Globe size={16} style={{ color: 'var(--blue-light)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Indices Europeos (ESEF/XBRL)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={selectedEuropeanIndex}
                onChange={(e) => setSelectedEuropeanIndex(e.target.value)}
                style={{
                  flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                  border: '1px solid var(--border-default)', fontSize: '0.85rem', background: 'var(--surface-1)',
                  cursor: 'pointer',
                }}
              >
                {EUROPEAN_INDICES.map((idx) => (
                  <option key={idx.id} value={idx.id}>
                    {idx.flag} {idx.name} — {idx.count} empresas
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddEuropeanIndex}
                disabled={isImporting}
                className="admin-form-btn"
                style={{
                  background: 'linear-gradient(135deg, var(--blue) 0%, var(--blue-light) 100%)',
                  color: 'white', fontWeight: 500, fontSize: '0.8rem', whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                }}
              >
                <Download size={14} />
                Añadir
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
              Selecciona un indice y haz clic en "Añadir" para incluir sus tickers en la importación
            </p>
          </div>

          {/* US Companies Quick Import */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Globe size={16} style={{ color: 'var(--info-light)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Empresas de EEUU</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={loadSP500}
                disabled={isImporting || sp500Loading}
                className="admin-form-btn"
                style={{
                  background: 'linear-gradient(135deg, var(--info-light) 0%, var(--info) 100%)',
                  color: 'white', fontWeight: 500, fontSize: '0.8rem', whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                }}
              >
                {sp500Loading ? (
                  <><Loader2 size={14} className="admin-spinner" /> Cargando...</>
                ) : (
                  <><Download size={14} /> Cargar Lista S&P 500</>
                )}
              </button>
              {sp500Count > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--info-light)', fontWeight: 600 }}>
                  {sp500Count} empresas disponibles
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
              Carga la lista completa del S&P 500 (~500 empresas) y anadelas al campo de tickers
            </p>
          </div>

          {/* Ticker Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
              Tickers (uno por linea, o separados por comas)
            </label>
            <textarea
              value={bulkTickers}
              onChange={(e) => setBulkTickers(e.target.value)}
              placeholder={"AAPL\nMSFT\nGOOGL\nAMZN\nNVDA"}
              className="admin-form-input"
              rows={6}
              disabled={isImporting}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
            />
            {bulkTickerCount > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--indigo)', marginTop: '0.25rem', fontWeight: 600 }}>
                {bulkTickerCount} empresa{bulkTickerCount !== 1 ? 's' : ''} detectada{bulkTickerCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Years + Import Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Anos:</label>
              <select
                value={bulkYears}
                onChange={(e) => setBulkYears(Number(e.target.value))}
                className="admin-year-select"
                disabled={isImporting}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={startBulkImport}
              disabled={isImporting || bulkTickerCount === 0}
              className="admin-form-btn"
              style={{
                background: bulkTickerCount > 0 && !isImporting
                  ? 'linear-gradient(135deg, var(--blue) 0%, var(--blue-light) 100%)'
                  : 'var(--border-default)',
                color: bulkTickerCount > 0 && !isImporting ? 'white' : 'var(--text-tertiary)',
                fontWeight: 600,
                padding: '0.6rem 1.5rem',
              }}
            >
              {isImporting ? (
                <><Loader2 size={16} className="admin-spinner" /> Importando...</>
              ) : (
                <><Upload size={16} /> Importar {bulkTickerCount > 0 ? `(${bulkTickerCount})` : ''}</>
              )}
            </button>
          </div>

          <BulkImportProgress progress={bulkProgress} complete={bulkComplete} isImporting={isImporting} />
        </div>

        {/* Batch Re-sync */}
        <div className="admin-form-section" style={{ border: '2px solid var(--amber-pale)', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--amber-pale) 0%, var(--amber-line) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, var(--amber) 0%, var(--orange) 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Re-sincronizar Todo</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Vuelve a sincronizar todas las empresas con datos mejorados (SEC + Yahoo Finance)
              </p>
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              <strong>Que hace:</strong> Vuelve a sincronizar cada empresa usando SEC EDGAR (US) o ESEF/XBRL (Europa) + Yahoo Finance para cotizaciones.
              Anade datos faltantes: EBITDA, cash flows, balance sheet, y ratios de mercado.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
              ~200ms entre empresas para evitar rate limits. Para 200+ empresas puede tardar 5-10 minutos.
            </p>
          </div>

          <button
            onClick={startBatchResync}
            disabled={isResyncing || companies.length === 0}
            className="admin-form-btn"
            style={{
              background: companies.length > 0 && !isResyncing
                ? 'linear-gradient(135deg, var(--amber) 0%, var(--orange) 100%)'
                : 'var(--border-default)',
              color: companies.length > 0 && !isResyncing ? 'white' : 'var(--text-tertiary)',
              fontWeight: 600,
              padding: '0.6rem 1.5rem',
            }}
          >
            {isResyncing ? (
              <><Loader2 size={16} className="admin-spinner" /> Re-sincronizando...</>
            ) : (
              <><RotateCcw size={16} /> Re-sincronizar {companies.length > 0 ? `(${companies.length})` : ''}</>
            )}
          </button>

          {/* Resync Progress */}
          {isResyncing && resyncProgress && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Loader2 size={14} className="admin-spinner" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>{resyncProgress.ticker}</strong> ({resyncProgress.current}/{resyncProgress.total})
                  {resyncProgress.message && <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.375rem' }}>- {resyncProgress.message}</span>}
                </span>
              </div>
              <div style={{ height: '6px', background: 'var(--border-default)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--amber), var(--orange))', borderRadius: '3px', transition: 'width 0.3s', width: `${Math.round((resyncProgress.current / resyncProgress.total) * 100)}%` }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                {Math.round((resyncProgress.current / resyncProgress.total) * 100)}%
              </p>
            </div>
          )}

          {resyncComplete && (
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {resyncComplete.succeeded > 0 && (
                <span className="bulk-badge bulk-badge--success">
                  <CheckCircle2 size={14} />
                  {resyncComplete.succeeded} sincronizadas
                </span>
              )}
              {resyncComplete.failed > 0 && (
                <span className="bulk-badge bulk-badge--error">
                  <XCircle size={14} />
                  {resyncComplete.failed} fallidas
                </span>
              )}
              {resyncComplete.errors.length > 0 && (
                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600, marginBottom: '0.25rem' }}>Errores:</p>
                  <div style={{ maxHeight: '6rem', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    {resyncComplete.errors.slice(0, 20).map((e) => (
                      <span key={e.ticker} style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        <strong>{e.ticker}</strong>: {e.error}
                      </span>
                    ))}
                    {resyncComplete.errors.length > 20 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>+{resyncComplete.errors.length - 20} mas...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fix Missing Sectors */}
        <div className="admin-form-section" style={{ border: '2px solid var(--blue-line)', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--blue-pale) 0%, var(--blue-line) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, var(--info-light) 0%, var(--info) 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Tag size={18} />
            </div>
            <div>
              <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Corregir Sectores</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Rellena el sector e industria faltantes usando mapas estaticos + Yahoo Finance
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={fixSectors}
              disabled={isFixingSectors}
              className="admin-form-btn"
              style={{
                background: !isFixingSectors ? 'linear-gradient(135deg, var(--info-light) 0%, var(--info) 100%)' : 'var(--border-default)',
                color: !isFixingSectors ? 'white' : 'var(--text-tertiary)',
                fontWeight: 600,
                padding: '0.6rem 1.5rem',
              }}
            >
              {isFixingSectors ? (
                <><Loader2 size={16} className="admin-spinner" /> Corrigiendo...</>
              ) : (
                <><Tag size={16} /> Corregir sectores</>
              )}
            </button>

            {fixSectorsResult && (
              <span className="bulk-badge bulk-badge--success">
                <CheckCircle2 size={14} />
                {fixSectorsResult.updated} de {fixSectorsResult.total} sectores actualizados
              </span>
            )}
          </div>
        </div>

        {/* Books Management */}
        <div className="admin-form-section" style={{ border: '2px solid var(--amber-pale)', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--amber-pale) 0%, var(--amber-line) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📚</span>
              <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Libros Recomendados</h2>
            </div>
            <button onClick={handleSaveBooks} disabled={booksSaving} style={{ padding: '0.5rem 1.25rem', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: booksSaving ? 0.6 : 1 }}>
              {booksSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 0, marginBottom: '1.25rem' }}>
            Los libros se muestran en el carrusel de la portada, en el orden de esta lista. El <strong>Enlace de afiliado Amazon</strong> se usa tal cual; si se deja vacío, el libro enlaza a la búsqueda de Amazon.es. Si no hay ISBN ni URL de portada, se muestra un placeholder.
          </p>

          <div className="admin-books-list">
            {books.map((book, i) => (
              <div key={i} className="admin-book-card">
                <div className="admin-book-card-header">
                  <span className="admin-book-card-index">#{i + 1}</span>
                  <div className="admin-book-actions">
                    <button type="button" className="admin-book-action-btn" onClick={() => moveBook(i, -1)} disabled={i === 0} aria-label="Mover arriba">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" className="admin-book-action-btn" onClick={() => moveBook(i, 1)} disabled={i === books.length - 1} aria-label="Mover abajo">
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" className="admin-book-action-btn admin-book-action-btn--danger" onClick={() => removeBook(i)} aria-label="Eliminar libro">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="admin-book-fields">
                  <label className="admin-label">
                    Título *
                    <input className="admin-input" value={book.title} onChange={(e) => updateBook(i, { title: e.target.value })} placeholder="The Intelligent Investor" />
                  </label>
                  <label className="admin-label">
                    Autor
                    <input className="admin-input" value={book.author} onChange={(e) => updateBook(i, { author: e.target.value })} placeholder="Benjamin Graham" />
                  </label>
                  <label className="admin-label">
                    ISBN
                    <input className="admin-input" value={book.isbn || ''} onChange={(e) => updateBook(i, { isbn: e.target.value })} placeholder="9780060555665" />
                  </label>
                  <label className="admin-label">
                    URL de portada (opcional)
                    <input className="admin-input" value={book.coverUrl || ''} onChange={(e) => updateBook(i, { coverUrl: e.target.value })} placeholder="https://..." />
                  </label>
                  <label className="admin-label admin-label--wide">
                    Enlace de afiliado Amazon (opcional)
                    <input className="admin-input" value={book.link || ''} onChange={(e) => updateBook(i, { link: e.target.value })} placeholder="https://www.amazon.es/dp/XXXXX?tag=tu-tag-21" />
                  </label>
                  <label className="admin-label admin-label--wide">
                    Descripción
                    <textarea className="admin-input admin-textarea" value={book.desc} onChange={(e) => updateBook(i, { desc: e.target.value })} placeholder="Resumen breve del libro..." rows={2} />
                  </label>
                  <label className="admin-book-active">
                    <input type="checkbox" checked={book.active !== false} onChange={(e) => updateBook(i, { active: e.target.checked })} />
                    Activo
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addBook} style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            + Añadir libro
          </button>
        </div>

        {/* Companies Table */}
        <div className="admin-table-section">
          <div className="admin-table-header">
            <h2 className="admin-table-title">Empresas</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="admin-table-count">
                {search ? `${total} de ` : ''}{grandTotal} empresas
              </span>
              <button onClick={fetchCompanies} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0.25rem', borderRadius: '0.375rem', transition: 'color 0.2s' }} title="Actualizar lista">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {grandTotal > 0 && (
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-default)' }}>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Buscar por ticker, nombre, sector..."
                className="admin-form-input"
                style={{ paddingLeft: '1rem', margin: 0 }}
              />
            </div>
          )}

          {loading ? (
            <div className="admin-empty">
              <div className="admin-spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Cargando empresas...</p>
            </div>
          ) : grandTotal === 0 ? (
            <div className="admin-empty">
              <p>No hay empresas añadidas. Empieza añadiendo una arriba.</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="admin-empty">
              <p>No se encontraron empresas para "{search}"</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Sector</th>
                    <th style={{ textAlign: 'center' }}>Registros</th>
                    <th style={{ textAlign: 'center' }}>Sync</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <CompanyRow
                      key={company.id}
                      company={company}
                      onDeleted={handleCompanyDeleted}
                      onSyncComplete={handleSyncComplete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {companies.length > 0 && totalPages > 1 && (
            <div className="admin-pagination">
              <div className="admin-pagination-pages">
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="admin-pagination-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`admin-pagination-btn ${p === page ? 'admin-pagination-btn--active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <div className="admin-pagination-nav">
                <button className="admin-pagination-btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                  Anterior
                </button>
                <button className="admin-pagination-btn" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
