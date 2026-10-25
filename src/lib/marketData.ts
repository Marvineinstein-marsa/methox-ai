import { Candle, SymbolInfo, Timeframe } from '../types';

export const DEFAULT_SYMBOLS: SymbolInfo[] = [
  {
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    displayName: 'Bitcoin / Tether',
    category: 'crypto',
    price: 94250.0,
    change24h: 3.42,
    high24h: 95480.0,
    low24h: 91120.0,
    volume24h: 42180.5,
    pipSize: 0.01,
  },
  {
    symbol: 'ETHUSDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    displayName: 'Ethereum / Tether',
    category: 'crypto',
    price: 3420.5,
    change24h: 1.85,
    high24h: 3495.0,
    low24h: 3310.0,
    volume24h: 184500.2,
    pipSize: 0.01,
  },
  {
    symbol: 'SOLUSDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    displayName: 'Solana / Tether',
    category: 'crypto',
    price: 218.4,
    change24h: 5.62,
    high24h: 224.8,
    low24h: 204.1,
    volume24h: 984000.0,
    pipSize: 0.01,
  },
  {
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    displayName: 'BNB / Tether',
    category: 'crypto',
    price: 662.1,
    change24h: -0.45,
    high24h: 671.0,
    low24h: 654.2,
    volume24h: 12450.0,
    pipSize: 0.01,
  },
  {
    symbol: 'XRPUSDT',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    displayName: 'Ripple / Tether',
    category: 'crypto',
    price: 1.842,
    change24h: 4.12,
    high24h: 1.92,
    low24h: 1.76,
    volume24h: 2340000.0,
    pipSize: 0.0001,
  },
  {
    symbol: 'XAUUSD',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    displayName: 'Gold / US Dollar',
    category: 'commodity',
    price: 2734.2,
    change24h: 0.72,
    high24h: 2748.5,
    low24h: 2718.0,
    volume24h: 68400.0,
    pipSize: 0.1,
  },
  {
    symbol: 'EURUSD',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    displayName: 'Euro / US Dollar',
    category: 'forex',
    price: 1.0842,
    change24h: -0.15,
    high24h: 1.0875,
    low24h: 1.0821,
    volume24h: 1540000.0,
    pipSize: 0.0001,
  },
  {
    symbol: 'NVDA',
    baseAsset: 'NVDA',
    quoteAsset: 'USD',
    displayName: 'NVIDIA Corp',
    category: 'stock',
    price: 142.85,
    change24h: 2.14,
    high24h: 144.5,
    low24h: 139.8,
    volume24h: 4520000.0,
    pipSize: 0.01,
  },
];

/**
 * Generates synthetic historical candles with realistic brownian motion,
 * trend persistence, and volume spikes.
 */
export function generateCandles(
  basePrice: number,
  timeframe: Timeframe,
  count: number = 120
): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);

  const secondsMap: Record<Timeframe, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1D': 86400,
  };

  const intervalSeconds = secondsMap[timeframe] || 3600;
  let currentClose = basePrice * 0.94; // Start slightly below current to give upward trend

  for (let i = count; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    // Volatility based on timeframe
    const volFactor =
      timeframe === '1m'
        ? 0.0015
        : timeframe === '5m'
        ? 0.003
        : timeframe === '15m'
        ? 0.005
        : timeframe === '1h'
        ? 0.008
        : 0.018;

    const drift = (Math.random() - 0.485) * volFactor * currentClose;
    const open = currentClose;
    const close = Math.max(open * 0.5, open + drift);
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);

    const wickUpper = Math.random() * volFactor * currentClose * 0.8;
    const wickLower = Math.random() * volFactor * currentClose * 0.8;

    const high = maxOC + wickUpper;
    const low = Math.max(0.1, minOC - wickLower);
    const volume = Math.floor(100 + Math.random() * 900 + Math.abs(drift) * 5000);

    candles.push({
      time,
      open: Number(open.toFixed(basePrice < 10 ? 4 : 2)),
      high: Number(high.toFixed(basePrice < 10 ? 4 : 2)),
      low: Number(low.toFixed(basePrice < 10 ? 4 : 2)),
      close: Number(close.toFixed(basePrice < 10 ? 4 : 2)),
      volume,
    });

    currentClose = close;
  }

  // Ensure last candle matches basePrice accurately
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }

  return candles;
}

/**
 * Fetches real historical klines from Binance API or falls back gracefully
 */
export async function fetchLiveKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 120
): Promise<Candle[]> {
  const isCrypto = symbol.endsWith('USDT') || symbol.endsWith('BUSD');
  if (isCrypto) {
    const binanceIntervalMap: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1D': '1d',
    };

    const interval = binanceIntervalMap[timeframe] || '1h';
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (response.ok) {
        const raw = await response.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((k: (string | number)[]) => ({
            time: Math.floor(Number(k[0]) / 1000),
            open: parseFloat(String(k[1])),
            high: parseFloat(String(k[2])),
            low: parseFloat(String(k[3])),
            close: parseFloat(String(k[4])),
            volume: parseFloat(String(k[5])),
          }));
        }
      }
    } catch {
      // Fall through to fallback generator
    }
  }

  // Default synthetic fallback
  const symInfo = DEFAULT_SYMBOLS.find((s) => s.symbol === symbol);
  const basePrice = symInfo ? symInfo.price : 100;
  return generateCandles(basePrice, timeframe, limit);
}

/**
 * WebSocket manager for Binance crypto symbols
 */
export class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private currentSymbol: string = '';
  private currentTimeframe: Timeframe = '1h';
  private onTickCallback: ((candle: Candle, currentPrice: number) => void) | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(
    symbol: string,
    timeframe: Timeframe,
    onTick: (candle: Candle, currentPrice: number) => void
  ) {
    this.currentSymbol = symbol;
    this.currentTimeframe = timeframe;
    this.onTickCallback = onTick;

    if (!symbol.endsWith('USDT')) {
      // Non-crypto or synthetic symbol simulation
      return;
    }

    this.disconnect();

    const binanceIntervalMap: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1D': '1d',
    };

    const stream = `${symbol.toLowerCase()}@kline_${binanceIntervalMap[timeframe] || '1h'}`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.k) {
            const k = data.k;
            const updatedCandle: Candle = {
              time: Math.floor(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
            };
            const currentPrice = parseFloat(k.c);
            if (this.onTickCallback) {
              this.onTickCallback(updatedCandle, currentPrice);
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.reconnect();
      };

      this.ws.onclose = () => {
        this.reconnect();
      };
    } catch {
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentSymbol && this.onTickCallback) {
        this.connect(this.currentSymbol, this.currentTimeframe, this.onTickCallback);
      }
    }, 4000);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
