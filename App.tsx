import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { describeError, getTickerSnapshot } from './src/api/finnhub';
import type { Ticker } from './src/types';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; ticker: Ticker }
  | { kind: 'err'; message: string };

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function smokeTest() {
    setStatus({ kind: 'loading' });
    const r = await getTickerSnapshot('AAPL');
    if (r.ok) {
      console.log('AAPL snapshot:', r.data);
      setStatus({ kind: 'ok', ticker: r.data });
    } else {
      console.log('AAPL error:', r.error);
      setStatus({ kind: 'err', message: describeError(r.error) });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>P/E Tracker — smoke test</Text>

      <Pressable style={styles.button} onPress={smokeTest}>
        <Text style={styles.buttonText}>Fetch AAPL</Text>
      </Pressable>

      {status.kind === 'idle' && <Text style={styles.muted}>Tap the button to test the Finnhub client.</Text>}
      {status.kind === 'loading' && <Text style={styles.muted}>Loading…</Text>}
      {status.kind === 'err' && <Text style={styles.error}>{status.message}</Text>}
      {status.kind === 'ok' && <TickerCard ticker={status.ticker} />}

      <StatusBar style="auto" />
    </ScrollView>
  );
}

function TickerCard({ ticker }: { ticker: Ticker }) {
  return (
    <View style={styles.card}>
      <Text style={styles.symbol}>{ticker.symbol}</Text>
      <Text style={styles.name}>{ticker.name}</Text>
      <Text style={styles.sector}>{ticker.sector}</Text>
      <Row label="Price" value={`$${ticker.price.toFixed(2)}`} />
      <Row label="P/E (TTM)" value={fmt(ticker.peTTM)} />
      <Row label="P/E (Annual)" value={fmt(ticker.peAnnual)} />
      <Row label="EPS (TTM)" value={fmt(ticker.epsTTM)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function fmt(n: number | null): string {
  return n == null ? '—' : n.toFixed(2);
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 24, paddingTop: 80, gap: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600' },
  button: { backgroundColor: '#0a84ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  muted: { color: '#666', fontSize: 14 },
  error: { color: '#cc3333', fontSize: 14, textAlign: 'center' },
  card: { width: '100%', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12, padding: 16, gap: 8 },
  symbol: { fontSize: 24, fontWeight: '700' },
  name: { fontSize: 16, color: '#333' },
  sector: { fontSize: 13, color: '#666' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, fontWeight: '500' },
});
