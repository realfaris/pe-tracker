import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pe-tracker:watchlist:v1';

export async function getWatchlist(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

export async function setWatchlist(symbols: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(symbols));
}

export async function addTicker(symbol: string): Promise<string[]> {
  const sym = symbol.toUpperCase().trim();
  if (!sym) return getWatchlist();
  const current = await getWatchlist();
  if (current.includes(sym)) return current;
  const updated = [...current, sym];
  await setWatchlist(updated);
  return updated;
}

export async function removeTicker(symbol: string): Promise<string[]> {
  const sym = symbol.toUpperCase().trim();
  const current = await getWatchlist();
  const updated = current.filter((s) => s !== sym);
  await setWatchlist(updated);
  return updated;
}

export async function hasTicker(symbol: string): Promise<boolean> {
  const list = await getWatchlist();
  return list.includes(symbol.toUpperCase().trim());
}
