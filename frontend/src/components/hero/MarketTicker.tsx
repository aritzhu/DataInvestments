import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketTapeItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  type: 'index' | 'currency' | 'commodity';
  marketState: 'OPEN' | 'CLOSED';
  lastUpdated: number;
}

const REFRESH_MS = 30_000;

function formatPrice(item: MarketTapeItem): string {
  const digits = item.price >= 1000 ? 2 : item.type === 'currency' ? 4 : 2;
  return item.price.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function MarketTicker() {
  const [items, setItems] = useState<MarketTapeItem[]>([]);
  const [visible, setVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch('/api/market/tape', { signal: controller.signal });
        if (!res.ok) throw new Error('bad status');
        const data: MarketTapeItem[] = await res.json();
        if (active && data.length > 0) {
          setItems(data);
          setVisible(true);
        }
      } catch {
        if (active) setVisible(false);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, []);

  if (!visible || items.length === 0) return null;

  const trackItems = [...items, ...items];

  return (
    <div className="market-tape" role="region" aria-label="Cotizaciones de mercados en tiempo real">
      <div className="market-tape-label">
        <span className="market-tape-dot" />
        Mercados en vivo
      </div>
      <div className="market-tape-viewport">
        <div className="market-tape-track">
          {trackItems.map((item, i) => {
            const up = item.change >= 0;
            return (
              <span key={`${item.symbol}-${i}`} className="market-tape-item">
                <span className="market-tape-symbol">{item.symbol}</span>
                <span className="market-tape-price num">{formatPrice(item)}</span>
                <span className={`market-tape-change ${up ? 'market-tape-change--up' : 'market-tape-change--down'}`}>
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? '+' : ''}
                  {item.changePercent.toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
