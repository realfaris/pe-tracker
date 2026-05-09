import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeError, getTickerSnapshot } from '../api/finnhub';
import { getWatchlist, removeTicker, setWatchlist } from '../storage/watchlist';
import type { Ticker } from '../types';

type RowState =
  | { kind: 'loading' }
  | { kind: 'ok'; ticker: Ticker }
  | { kind: 'err'; message: string };

const SEED: string[] = ['AAPL', 'MSFT'];

export default function WatchlistScreen() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const fetchAll = useCallback(async (syms: string[]) => {
    if (syms.length === 0) {
      setRows({});
      return;
    }
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const s of syms) next[s] = prev[s] ?? { kind: 'loading' };
      return next;
    });
    const results = await Promise.allSettled(syms.map((s) => getTickerSnapshot(s)));
    const next: Record<string, RowState> = {};
    syms.forEach((s, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') {
        next[s] = r.value.ok
          ? { kind: 'ok', ticker: r.value.data }
          : { kind: 'err', message: describeError(r.value.error) };
      } else {
        next[s] = { kind: 'err', message: 'Fetch failed' };
      }
    });
    setRows(next);
  }, []);

  useEffect(() => {
    (async () => {
      let stored = await getWatchlist();
      if (stored.length === 0) {
        stored = SEED;
        await setWatchlist(stored);
      }
      setSymbols(stored);
      setBootstrapped(true);
      await fetchAll(stored);
    })();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll(symbols);
    setRefreshing(false);
  }, [symbols, fetchAll]);

  const onLongPress = useCallback(
    (symbol: string) => {
      Alert.alert(
        `Remove ${symbol}?`,
        `This will remove ${symbol} from your watchlist.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const updated = await removeTicker(symbol);
              setSymbols(updated);
              setRows((prev) => {
                const next = { ...prev };
                delete next[symbol];
                return next;
              });
            },
          },
        ]
      );
    },
    []
  );

  if (!bootstrapped) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Watchlist</Text>
        <Text style={styles.subtitle}>Long-press to remove</Text>
      </View>
      <FlatList
        data={symbols}
        keyExtractor={(s) => s}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: symbol }) => (
          <Row
            state={rows[symbol] ?? { kind: 'loading' }}
            symbol={symbol}
            onLongPress={() => onLongPress(symbol)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No tickers yet — search to add (Phase 3).</Text>}
      />
    </SafeAreaView>
  );
}

function Row({
  state,
  symbol,
  onLongPress,
}: {
  state: RowState;
  symbol: string;
  onLongPress: () => void;
}) {
  return (
    <Pressable onLongPress={onLongPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {state.kind === 'loading' && (
        <View style={styles.rowHeader}>
          <Text style={styles.symbol}>{symbol}</Text>
          <ActivityIndicator />
        </View>
      )}
      {state.kind === 'err' && (
        <View>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.error}>{state.message}</Text>
        </View>
      )}
      {state.kind === 'ok' && <TickerBody ticker={state.ticker} />}
    </Pressable>
  );
}

function TickerBody({ ticker: t }: { ticker: Ticker }) {
  return (
    <View>
      <View style={styles.rowHeader}>
        <Text style={styles.symbol}>{t.symbol}</Text>
        <Text style={styles.price}>${t.price.toFixed(2)}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
      <Text style={styles.sector} numberOfLines={1}>{t.sector}</Text>
      <View style={styles.metrics}>
        <Metric label="P/E TTM" value={fmt(t.peTTM)} />
        <Metric label="P/E Annual" value={fmt(t.peAnnual)} />
        <Metric label="EPS TTM" value={fmt(t.epsTTM)} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function fmt(n: number | null): string {
  return n == null ? '—' : n.toFixed(2);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  list: { padding: 16 },
  separator: { height: 12 },
  row: { padding: 14, backgroundColor: '#f7f7f8', borderRadius: 12 },
  rowPressed: { backgroundColor: '#ececef' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  symbol: { fontSize: 18, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '600' },
  name: { fontSize: 13, color: '#333', marginTop: 2 },
  sector: { fontSize: 12, color: '#888', marginTop: 1 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 12 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 11, color: '#888' },
  metricValue: { fontSize: 14, fontWeight: '600' },
  error: { color: '#cc3333', fontSize: 12, marginTop: 4 },
  empty: { color: '#888', textAlign: 'center', padding: 24 },
});
