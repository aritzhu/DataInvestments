import { useEffect, useState } from 'react';

interface Exchange {
  city: string;
  exchange: string;
  tz: string;
  openMinutes: number;
  closeMinutes: number;
}

const EXCHANGES: Exchange[] = [
  { city: 'Nueva York', exchange: 'NYSE', tz: 'America/New_York', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
  { city: 'Londres', exchange: 'LSE', tz: 'Europe/London', openMinutes: 8 * 60, closeMinutes: 16 * 60 + 30 },
  { city: 'Fráncfort', exchange: 'XETRA', tz: 'Europe/Berlin', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  { city: 'Madrid', exchange: 'BME', tz: 'Europe/Madrid', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
  { city: 'Tokio', exchange: 'TSE', tz: 'Asia/Tokyo', openMinutes: 9 * 60, closeMinutes: 15 * 60 },
  { city: 'Hong Kong', exchange: 'HKEX', tz: 'Asia/Hong_Kong', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const WEEKDAY_SHORT_ES: Record<number, string> = {
  0: 'dom', 1: 'lun', 2: 'mar', 3: 'mié', 4: 'jue', 5: 'vie', 6: 'sáb',
};

interface LocalTime {
  hours: number;
  minutes: number;
  seconds: number;
  weekday: number;
}

function getLocalTime(tz: string, now: Date): LocalTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const weekday = WEEKDAY_INDEX[map.weekday] ?? 0;
  return {
    hours: Number(map.hour) % 24,
    minutes: Number(map.minute),
    seconds: Number(map.second),
    weekday,
  };
}

function isOpen(exchange: Exchange, t: LocalTime): boolean {
  if (t.weekday < 1 || t.weekday > 5) return false;
  const minutes = t.hours * 60 + t.minutes;
  return minutes >= exchange.openMinutes && minutes <= exchange.closeMinutes;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function MarketClocks() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="market-clocks">
      <div className="market-clocks-header">
        <div className="market-clocks-title">
          <span className="market-clocks-dot" />
          Mercados Globales
        </div>
        <span className="market-clocks-subtitle">Sesiones bursátiles en tiempo real</span>
      </div>
      <div className="market-clocks-grid">
        {EXCHANGES.map((ex) => {
          const local = getLocalTime(ex.tz, now);
          const open = isOpen(ex, local);
          return (
            <div key={ex.exchange} className={`market-clock-card ${open ? 'market-clock-card--open' : ''}`}>
              <div className="market-clock-meta">
                <span className="market-clock-city">{ex.city}</span>
                <span className={`market-clock-status ${open ? 'market-clock-status--open' : ''}`}>
                  <span className="market-clock-status-dot" />
                  {open ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
              <div className="market-clock-time num">
                {pad(local.hours)}:{pad(local.minutes)}<span className="market-clock-seconds">:{pad(local.seconds)}</span>
              </div>
              <div className="market-clock-bottom">
                <span className="market-clock-exchange">{ex.exchange}</span>
                <span className="market-clock-weekday">{WEEKDAY_SHORT_ES[local.weekday]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
