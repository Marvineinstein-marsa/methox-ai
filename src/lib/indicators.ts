import { Candle, TechnicalIndicators } from '../types';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  if (data.length === 0) return result;

  // Start with SMA for initial value
  let ema = data[0];
  result.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI - 14 period Wilder smoothed)
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (closes.length <= period) {
    return closes.map(() => 50);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI value
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  // Pad beginning with initial RSI
  const padding = Array(period).fill(50);
  return [...padding, ...rsi];
}

/**
 * Calculates Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
}

/**
 * Calculates Bollinger Bands (20, 2)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
) {
  const upper: number[] = [];
  const middle = calculateSMA(closes, period);
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i]);
      lower.push(closes[i]);
      bandwidth.push(0);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance =
      slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const up = mean + stdDevMultiplier * stdDev;
    const down = mean - stdDevMultiplier * stdDev;
    upper.push(up);
    lower.push(down);
    bandwidth.push(mean === 0 ? 0 : ((up - down) / mean) * 100);
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Calculates Average True Range (ATR - 14)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length < 2) return candles.map(() => 0);

  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    tr.push(Math.max(tr1, tr2, tr3));
  }

  // Wilder smoothing for ATR
  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < period && i < tr.length; i++) {
    sum += tr[i];
  }
  let currentAtr = sum / period;
  atr.push(currentAtr);

  for (let i = period; i < tr.length; i++) {
    currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
    atr.push(currentAtr);
  }

  const pad = Array(Math.min(period - 1, candles.length)).fill(currentAtr);
  return [...pad, ...atr];
}

/**
 * Support and Resistance detection using swing pivot highs and lows
 */
export function findSupportResistance(
  candles: Candle[],
  pivotWindow: number = 5
): { support: number[]; resistance: number[] } {
  if (candles.length < pivotWindow * 2 + 1) {
    const currentPrice = candles[candles.length - 1]?.close || 100;
    return {
      support: [currentPrice * 0.98, currentPrice * 0.95],
      resistance: [currentPrice * 1.02, currentPrice * 1.05],
    };
  }

  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = pivotWindow; i < candles.length - pivotWindow; i++) {
    let isHigh = true;
    let isLow = true;
    const candidateHigh = candles[i].high;
    const candidateLow = candles[i].low;

    for (let j = i - pivotWindow; j <= i + pivotWindow; j++) {
      if (j === i) continue;
      if (candles[j].high >= candidateHigh) isHigh = false;
      if (candles[j].low <= candidateLow) isLow = false;
    }

    if (isHigh) swingHighs.push(candidateHigh);
    if (isLow) swingLows.push(candidateLow);
  }

  // Cluster nearby levels within 0.8% threshold
  const cluster = (levels: number[]) => {
    levels.sort((a, b) => a - b);
    const clustered: number[] = [];
    for (const lvl of levels) {
      if (clustered.length === 0) {
        clustered.push(lvl);
      } else {
        const last = clustered[clustered.length - 1];
        if (Math.abs(lvl - last) / last < 0.008) {
          clustered[clustered.length - 1] = (last + lvl) / 2; // Average
        } else {
          clustered.push(lvl);
        }
      }
    }
    return clustered;
  };

  const currentPrice = candles[candles.length - 1].close;
  const clusteredHighs = cluster(swingHighs).filter((r) => r > currentPrice);
  const clusteredLows = cluster(swingLows).filter((s) => s < currentPrice);

  return {
    support: clusteredLows.slice(-3).reverse(), // 3 closest supports below price
    resistance: clusteredHighs.slice(0, 3), // 3 closest resistances above price
  };
}

/**
 * Computes comprehensive technical analysis indicators package for a candle series
 */
export function computeAllIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const len = candles.length;
  const lastIndex = len - 1;
  const currentPrice = closes[lastIndex] || 0;

  const sma20Series = calculateSMA(closes, 20);
  const sma50Series = calculateSMA(closes, 50);
  const sma200Series = calculateSMA(closes, 200);

  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, 50);
  const ema200Series = calculateEMA(closes, 200);

  const rsiSeries = calculateRSI(closes, 14);
  const macdData = calculateMACD(closes, 12, 26, 9);
  const bbData = calculateBollingerBands(closes, 20, 2);
  const atrSeries = calculateATR(candles, 14);

  const sr = findSupportResistance(candles, 5);

  const ema9 = ema9Series[lastIndex] || currentPrice;
  const ema21 = ema21Series[lastIndex] || currentPrice;
  const ema50 = ema50Series[lastIndex] || currentPrice;
  const ema200 = ema200Series[lastIndex] || currentPrice;
  const rsi = rsiSeries[rsiSeries.length - 1] || 50;
  const macdHist = macdData.histogram[lastIndex] || 0;

  // Trend scoring calculation (-100 to +100)
  let score = 0;
  if (ema9 > ema21) score += 20;
  else score -= 20;

  if (ema21 > ema50) score += 25;
  else score -= 25;

  if (currentPrice > ema200) score += 30;
  else score -= 30;

  if (rsi > 50 && rsi < 70) score += 15;
  else if (rsi >= 70) score += 5; // Overbought caveat
  else if (rsi < 50 && rsi > 30) score -= 15;
  else if (rsi <= 30) score -= 5; // Oversold caveat

  if (macdHist > 0) score += 10;
  else score -= 10;

  let trend: TechnicalIndicators['trend'] = 'NEUTRAL';
  if (score >= 50) trend = 'STRONG_BULLISH';
  else if (score >= 15) trend = 'BULLISH';
  else if (score <= -50) trend = 'STRONG_BEARISH';
  else if (score <= -15) trend = 'BEARISH';

  // Multi-timeframe synthesis
  const alignment: TechnicalIndicators['multiTimeframeAlignment'] = {
    '15m': score > 10 ? 'BULLISH' : score < -10 ? 'BEARISH' : 'NEUTRAL',
    '1h': ema21 > ema50 ? 'BULLISH' : 'BEARISH',
    '4h': currentPrice > ema200 ? 'BULLISH' : 'BEARISH',
    '1D': ema50 > ema200 ? 'BULLISH' : 'BEARISH',
  };

  return {
    sma20: sma20Series[lastIndex] || currentPrice,
    sma50: sma50Series[lastIndex] || currentPrice,
    sma200: sma200Series[lastIndex] || currentPrice,
    ema9,
    ema21,
    ema50,
    ema200,
    rsi,
    macd: {
      macd: macdData.macd[lastIndex] || 0,
      signal: macdData.signal[lastIndex] || 0,
      histogram: macdHist,
    },
    bollingerBands: {
      upper: bbData.upper[lastIndex] || currentPrice * 1.02,
      middle: bbData.middle[lastIndex] || currentPrice,
      lower: bbData.lower[lastIndex] || currentPrice * 0.98,
      bandwidth: bbData.bandwidth[lastIndex] || 4,
    },
    atr: atrSeries[atrSeries.length - 1] || currentPrice * 0.015,
    supportLevels: sr.support,
    resistanceLevels: sr.resistance,
    trend,
    trendScore: Math.max(-100, Math.min(100, score)),
    multiTimeframeAlignment: alignment,
  };
}

/**
 * Institutional Position Size Formula:
 * Capital at risk = Account Balance * (Risk % / 100)
 * Position Size = Capital at risk / abs(Entry Price - Stop Loss)
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number
): { quantity: number; riskAmount: number; positionValue: number } {
  const riskAmount = (accountBalance * riskPercent) / 100;
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice);

  if (riskPerUnit <= 0 || entryPrice <= 0) {
    return { quantity: 0, riskAmount: 0, positionValue: 0 };
  }

  const quantity = riskAmount / riskPerUnit;
  const positionValue = quantity * entryPrice;

  return {
    quantity: Number(quantity.toFixed(4)),
    riskAmount: Number(riskAmount.toFixed(2)),
    positionValue: Number(positionValue.toFixed(2)),
  };
}

/**
 * Calculates Risk to Reward ratio
 * RR = abs(Take Profit - Entry) / abs(Entry - Stop Loss)
 */
export function calculateRiskReward(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  if (risk === 0) return 0;
  return Number((reward / risk).toFixed(2));
}
