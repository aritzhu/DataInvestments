import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, RefreshCw, Upload, FileText, Download, Loader2, RotateCcw, CheckCircle2, XCircle, Globe } from 'lucide-react';
import { AddCompanyForm } from './AddCompanyForm';
import { CompanyRow } from './CompanyRow';
import { BulkImportProgress } from './BulkImportProgress';
import { DataStatsSection } from './DataStatsSection';
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
    fmpSync: boolean;
    secSync: boolean;
    finnhubSync: boolean;
    errorMessage: string | null;
  } | null;
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
  const [companySearch, setCompanySearch] = useState('');
  const [heroSettings, setHeroSettings] = useState<Record<string, string>>({});
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/companies');
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setHeroSettings(data))
      .catch(() => {});
  }, [fetchCompanies]);

  const handleCompanyAdded = () => fetchCompanies();

  const handleSaveHero = async () => {
    setHeroSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(heroSettings),
      });
    } finally {
      setHeroSaving(false);
    }
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
        credentials: 'include',
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

  const handleCompanyDeleted = () => fetchCompanies();
  const handleSyncComplete = () => fetchCompanies();

  const EUROPEAN_INDICES = [
    { id: 'stoxx600', name: 'STOXX Europe 600', flag: '🇪🇺', country: 'Europa', count: 600, tickers: ['SAP.DE','SIE.DE','ALV.DE','BMW.DE','MBG.DE','BAS.DE','BAYN.DE','DTE.DE','DBK.DE','DB1.DE','MUV2.DE','ADS.DE','HEN3.DE','MRK.DE','IFX.DE','RWE.DE','FRE.DE','CON.DE','HEI.DE','SHL.DE','ENR.DE','NDA.DE','TKA.DE','TEG.DE','SHEL.L','AZN.L','HSBA.L','ULVR.L','BP.L','BATS.L','GSK.L','DGE.L','RIO.L','LSEG.L','REL.L','LLOY.L','NWG.L','PRU.L','AV.L','BA.L','HL.L','EXPN.L','STAN.L','NG.L','BT-A.L','SGRO.L','IMB.L','SSE.L','MC.PA','OR.PA','TTE.PA','SAN.PA','AIR.PA','BNP.PA','SU.PA','ACA.PA','ENGI.PA','VIE.PA','KER.PA','LR.PA','RMS.PA','SAF.PA','DG.PA','ATO.PA','STM.PA','CAP.PA','EL.PA','DSY.PA','SQ.PA','BOL.PA','SGO.PA','WLN.PA','RNO.PA','VIV.PA','PUB.PA','EN.PA','SAN.MC','BBVA.MC','IBE.MC','TEF.MC','ITX.MC','REP.MC','CLNX.MC','ANA.MC','MAP.MC','ACS.MC','ENG.MC','FER.MC','GRF.MC','IAG.MC','MTS.MC','RED.MC','REE.MC','AENA.MC','ASML.AS','RAND.AS','AD.AS','INGA.AS','PRX.AS','UNA.AS','PHIA.AS','AKZA.AS','ABN.AS','KPN.AS','ENEL.MI','ENI.MI','ISP.MI','UNI.MI','STM.MI','PRY.MI','TIT.MI','A32.MI','CNHI.MI','SAF.MI','UCG.MI','PIRC.MI','LUX.DE','ROG.SW','NOVN.SW','UBSG.SW','ZUR.SW','NESN.SW','SREN.SW','ABBN.SW','CFR.SW','SGSN.SW'] },
    { id: 'dax', name: 'DAX 40', flag: '🇩🇪', country: 'Alemania', count: 40, tickers: ['SAP.DE','SIE.DE','ALV.DE','BMW.DE','MBG.DE','VOW3.DE','BAS.DE','BAYN.DE','DTE.DE','DBK.DE','DB1.DE','MUV2.DE','ADS.DE','HEN3.DE','MRK.DE','SY1.DE','IFX.DE','RWE.DE','FRE.DE','CON.DE','HEI.DE','BEI.DE','PZI.DE','CBK.DE','QIA.DE','ZAL.DE','COV.DE','MPS.DE','HFG.DE','SCE.DE','GYC.DE','SHL.DE','ENR.DE','DWNI.DE','NDA.DE','HDD.DE','SRT3.DE','TKA.DE','TEG.DE','NEM.DE'] },
    { id: 'cac40', name: 'CAC 40', flag: '🇫🇷', country: 'Francia', count: 40, tickers: ['MC.PA','OR.PA','TTE.PA','SAN.PA','AIR.PA','BNP.PA','SU.PA','ACA.PA','ENGI.PA','VIE.PA','KER.PA','LR.PA','RMS.PA','SAF.PA','DG.PA','ATO.PA','STM.PA','CAP.PA','EL.PA','DSY.PA','SQ.PA','BOL.PA','SGO.PA','WLN.PA','HEX.PA','TEP.PA','RNO.PA','VIV.PA','PUB.PA','EN.PA','BN.PA','ACP.PA','SPIE.PA','FDJ.PA','NXI.PA','AM.PA','IPH.PA','CO.PA','ALO.PA','SW.PA'] },
    { id: 'ibex35', name: 'IBEX 35', flag: '🇪🇸', country: 'España', count: 35, tickers: ['SAN.MC','BBVA.MC','IBE.MC','TEF.MC','CABK.MC','ITX.MC','NG.MC','REP.MC','CLNX.MC','ANA.MC','MAP.MC','ACS.MC','ENG.MC','FER.MC','GRF.MC','IAG.MC','MTS.MC','MRL.MC','RED.MC','REE.MC','SAB.MC','SOL.MC','TRE.MC','UNI.MC','AENA.MC','BKT.MC','ELE.MC','FDR.MC','GBF.MC','IDR.MC','MEL.MC'] },
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
      const res = await fetch('/api/admin/companies/bulk-import', {
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
      .filter((t) => t.length > 0 && t.length <= 6 && /^[A-Z.]+$/.test(t));
  };

  const startBatchResync = async () => {
    setIsResyncing(true);
    setResyncProgress(null);
    setResyncComplete(null);

    try {
      const res = await fetch('/api/admin/companies/batch-resync', {
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

  const filteredCompanies = companies.filter((c) =>
    c.ticker.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.sector?.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.industry?.toLowerCase().includes(companySearch.toLowerCase())
  );

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
            <div style={{ width: '3.5rem', height: '3.5rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        <div className="admin-form-section" style={{ border: '2px solid #fce7f3', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🎨</span>
              <h2 className="admin-form-title" style={{ marginBottom: 0, color: '#9d174d' }}>Contenido de la Web</h2>
            </div>
            <button onClick={handleSaveHero} disabled={heroSaving} style={{ padding: '0.5rem 1.25rem', background: '#ec4899', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: heroSaving ? 0.6 : 1 }}>
              {heroSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {/* Hero Image Upload */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>Imagen de fondo del hero</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="admin-hero-upload-btn" style={{ padding: '0.5rem 1rem', background: '#ec4899', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: heroUploading ? 0.6 : 1 }}>
                {heroUploading ? 'Subiendo...' : 'Subir imagen'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroImageUpload} style={{ display: 'none' }} disabled={heroUploading} />
              </label>
              {heroSettings.hero_bg_url && (
                <button onClick={() => setHeroSettings((prev) => ({ ...prev, hero_bg_url: '' }))} style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Eliminar
                </button>
              )}
            </div>
            {heroSettings.hero_bg_url && (
              <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb', maxHeight: '160px', position: 'relative' }}>
                <img src={heroSettings.hero_bg_url} alt="Preview" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.7rem' }}>
                  Imagen de fondo del hero
                </div>
              </div>
            )}
            {heroUploadError && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fee2e2', color: '#dc2626', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                {heroUploadError}
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
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>{field.label}</label>
                <input
                  type="text"
                  value={heroSettings[field.key] || ''}
                  onChange={(e) => setHeroSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            ))}
          </div>

          {/* Valuation Sections Config */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(236, 72, 153, 0.2)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9d174d', marginBottom: '1rem' }}>Secciones de Valoración</h3>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>{field.label}</label>
                  <input
                    type={field.key.includes('limit') ? 'number' : 'text'}
                    min={field.key.includes('limit') ? 1 : undefined}
                    max={field.key.includes('limit') ? 20 : undefined}
                    value={heroSettings[field.key] || ''}
                    onChange={(e) => setHeroSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Statistics */}
        {companies.length > 0 && <DataStatsSection />}

        {/* Data Sources */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 className="admin-sources-title">Fuentes de Datos</h2>
          <div className="admin-sources-grid">
            <div className="admin-source-card admin-source-card--emerald">
              <h3 className="admin-source-card-title admin-source-card-title--emerald">
                SEC EDGAR
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500, marginBottom: '0.75rem' }}>Empresas US — Datos XBRL oficiales</p>
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
              <p style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 500, marginBottom: '0.75rem' }}>Empresas Europeas — Datos XBRL oficiales</p>
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
              <p style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 500, marginBottom: '0.75rem' }}>Cotizaciones — Precio y métricas de mercado</p>
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
        <div className="admin-form-section" style={{ border: '2px solid #e0e7ff', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Upload size={18} />
            </div>
            <div>
              <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Importacion Masiva</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Importa multiples empresas de una vez</p>
            </div>
          </div>



          {/* European Indices Quick Import */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Globe size={16} style={{ color: '#059669' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Indices Europeos (ESEF/XBRL)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={selectedEuropeanIndex}
                onChange={(e) => setSelectedEuropeanIndex(e.target.value)}
                style={{
                  flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                  border: '1px solid #d1d5db', fontSize: '0.85rem', background: 'white',
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
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white', fontWeight: 500, fontSize: '0.8rem', whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                }}
              >
                <Download size={14} />
                Añadir
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
              Selecciona un indice y haz clic en "Añadir" para incluir sus tickers en la importación
            </p>
          </div>

          {/* Ticker Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
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
              <p style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '0.25rem', fontWeight: 600 }}>
                {bulkTickerCount} empresa{bulkTickerCount !== 1 ? 's' : ''} detectada{bulkTickerCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Years + Import Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Anos:</label>
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
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : '#e2e8f0',
                color: bulkTickerCount > 0 && !isImporting ? 'white' : '#94a3b8',
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
        <div className="admin-form-section" style={{ border: '2px solid #fef3c7', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, #fffbeb 0%, #fef9c3 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Re-sincronizar Todo</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Vuelve a sincronizar todas las empresas con datos mejorados (SEC + Yahoo Finance)
              </p>
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              <strong>Que hace:</strong> Vuelve a sincronizar cada empresa usando SEC EDGAR (US) o ESEF/XBRL (Europa) + Yahoo Finance para cotizaciones.
              Anade datos faltantes: EBITDA, cash flows, balance sheet, y ratios de mercado.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
              ~200ms entre empresas para evitar rate limits. Para 200+ empresas puede tardar 5-10 minutos.
            </p>
          </div>

          <button
            onClick={startBatchResync}
            disabled={isResyncing || companies.length === 0}
            className="admin-form-btn"
            style={{
              background: companies.length > 0 && !isResyncing
                ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                : '#e2e8f0',
              color: companies.length > 0 && !isResyncing ? 'white' : '#94a3b8',
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
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  <strong>{resyncProgress.ticker}</strong> ({resyncProgress.current}/{resyncProgress.total})
                  {resyncProgress.message && <span style={{ color: '#94a3b8', marginLeft: '0.375rem' }}>- {resyncProgress.message}</span>}
                </span>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #f97316)', borderRadius: '3px', transition: 'width 0.3s', width: `${Math.round((resyncProgress.current / resyncProgress.total) * 100)}%` }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
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
                  <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.25rem' }}>Errores:</p>
                  <div style={{ maxHeight: '6rem', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    {resyncComplete.errors.slice(0, 20).map((e) => (
                      <span key={e.ticker} style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        <strong>{e.ticker}</strong>: {e.error}
                      </span>
                    ))}
                    {resyncComplete.errors.length > 20 && (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>+{resyncComplete.errors.length - 20} mas...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Companies Table */}
        <div className="admin-table-section">
          <div className="admin-table-header">
            <h2 className="admin-table-title">Empresas</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="admin-table-count">
                {companySearch ? `${filteredCompanies.length} de ` : ''}{companies.length} empresas
              </span>
              <button onClick={fetchCompanies} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem', borderRadius: '0.375rem', transition: 'color 0.2s' }} title="Actualizar lista">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {companies.length > 0 && (
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
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
          ) : companies.length === 0 ? (
            <div className="admin-empty">
              <p>No hay empresas añadidas. Empieza añadiendo una arriba.</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="admin-empty">
              <p>No se encontraron empresas para "{companySearch}"</p>
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
                  {filteredCompanies.map((company) => (
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
        </div>
      </div>
    </div>
  );
}
