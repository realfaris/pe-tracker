import type { ApiError, Result, Ticker } from '../types';

const BASE = 'https://finnhub.io/api/v1';
const KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY;

async function fetchJson<T>(path: string): Promise<Result<T>> {
  if (!KEY) return { ok: false, error: { kind: 'missing_key' } };

  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}token=${KEY}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, error: { kind: 'network' } };
  }

  if (res.status === 429) return { ok: false, error: { kind: 'rate_limited' } };
  if (res.status === 401 || res.status === 403) return { ok: false, error: { kind: 'unauthorized' } };
  if (!res.ok) {
    return { ok: false, error: { kind: 'unknown', status: res.status, message: res.statusText } };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: { kind: 'unknown', message: 'invalid json' } };
  }
}

type QuoteResponse = {
  c: number;  // current price
  h: number;  // high of day
  l: number;  // low of day
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp (0 = no data)
};

type MetricsResponse = {
  metric?: {
    peTTM?: number;
    peAnnual?: number;
    peNormalizedAnnual?: number;
    peExclExtraTTM?: number;
    epsTTM?: number;
    epsAnnual?: number;
  };
};

type ProfileResponse = {
  name?: string;
  ticker?: string;
  finnhubIndustry?: string;
  country?: string;
  currency?: string;
};

export async function getQuote(symbol: string): Promise<Result<{ price: number }>> {
  const r = await fetchJson<QuoteResponse>(`/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) return r;
  if (!r.data || r.data.t === 0) return { ok: false, error: { kind: 'not_found', symbol } };
  return { ok: true, data: { price: r.data.c } };
}

export async function getMetrics(
  symbol: string
): Promise<Result<{ peTTM: number | null; peAnnual: number | null; epsTTM: number | null }>> {
  const r = await fetchJson<MetricsResponse>(
    `/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`
  );
  if (!r.ok) return r;
  const m = r.data?.metric;
  if (!m) return { ok: false, error: { kind: 'not_found', symbol } };
  return {
    ok: true,
    data: {
      peTTM: m.peTTM ?? null,
      peAnnual: m.peAnnual ?? m.peNormalizedAnnual ?? null,
      epsTTM: m.epsTTM ?? null,
    },
  };
}

export async function getProfile(
  symbol: string
): Promise<Result<{ name: string; sector: string }>> {
  const r = await fetchJson<ProfileResponse>(
    `/stock/profile2?symbol=${encodeURIComponent(symbol)}`
  );
  if (!r.ok) return r;
  if (!r.data?.name) return { ok: false, error: { kind: 'not_found', symbol } };
  return {
    ok: true,
    data: {
      name: r.data.name,
      sector: r.data.finnhubIndustry ?? '—',
    },
  };
}

export async function getTickerSnapshot(symbol: string): Promise<Result<Ticker>> {
  const sym = symbol.toUpperCase().trim();

  const [profileR, quoteR, metricsR] = await Promise.all([
    getProfile(sym),
    getQuote(sym),
    getMetrics(sym),
  ]);

  if (!profileR.ok) return profileR;
  if (!quoteR.ok) return quoteR;
  if (!metricsR.ok) return metricsR;

  return {
    ok: true,
    data: {
      symbol: sym,
      name: profileR.data.name,
      sector: profileR.data.sector,
      price: quoteR.data.price,
      peTTM: metricsR.data.peTTM,
      peAnnual: metricsR.data.peAnnual,
      epsTTM: metricsR.data.epsTTM,
    },
  };
}

export function describeError(e: ApiError): string {
  switch (e.kind) {
    case 'not_found': return `Ticker not found: ${e.symbol}`;
    case 'rate_limited': return 'Rate limit hit (60/min). Try again shortly.';
    case 'unauthorized': return 'API key rejected.';
    case 'missing_key': return 'No API key configured.';
    case 'network': return 'Network error.';
    case 'unknown': return e.message + (e.status ? ` (${e.status})` : '');
  }
}
