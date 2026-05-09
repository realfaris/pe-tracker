export type Ticker = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  peTTM: number | null;
  peAnnual: number | null;
  epsTTM: number | null;
};

export type ApiError =
  | { kind: 'not_found'; symbol: string }
  | { kind: 'rate_limited' }
  | { kind: 'unauthorized' }
  | { kind: 'network' }
  | { kind: 'missing_key' }
  | { kind: 'unknown'; status?: number; message: string };

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
