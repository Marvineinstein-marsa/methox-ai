import { BacktestSummary, Candle, StrategyRule, Timeframe } from '../types';
import { calculateATR, calculateBollingerBands, calculateEMA, calculateMACD, calculateRSI } from './indicators';

export interface BacktestTrade {
  entryIndex: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG' | 'SHORT';
  pnl: number;
  pnlPercent: number;
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'SIGNAL_EXIT';
}

export function runBacktest(
  strategy: StrategyRule,
  symbol: string,
  timeframe: Timeframe,
  candles: Candle[],
  startingCapital: number = 10000,
  riskPercent: number = 1.0
): { summary: BacktestSummary; trades: BacktestTrade[] } {
  if (candles.length < 50) {
    return {
      summary: {
        strategyName: strategy.name,
        symbol,
        timeframe,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        netProfit: 0,
        netProfitPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        equityCurve: [{ time: 'Start', equity: startingCapital }],
      },
      trades: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(candles, 14);

  let currentCapital = startingCapital;
  let peakCapital = startingCapital;
  let maxDrawdown = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{ time: string; equity: number }> = [
    {
      time: new Date(candles[0].time * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      equity: startingCapital,
    },
  ];

  let inPosition: {
    entryIndex: number;
    entryTime: number;
    entryPrice: number;
    side: 'LONG' | 'SHORT';
    stopLoss: number;
    takeProfit: number;
    quantity: number;
  } | null = null;

  for (let i = 50; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    const currentPrice = candle.close;
    const currentAtr = atr[i] || currentPrice * 0.015;

    // 1. Manage active position if open
    if (inPosition) {
      let closed = false;
      let exitPrice = currentPrice;
      let exitReason: BacktestTrade['exitReason'] = 'SIGNAL_EXIT';

      if (inPosition.side === 'LONG') {
        if (candle.low <= inPosition.stopLoss) {
          exitPrice = inPosition.stopLoss;
          exitReason = 'STOP_LOSS';
          closed = true;
        } else if (candle.high >= inPosition.takeProfit) {
          exitPrice = inPosition.takeProfit;
          exitReason = 'TAKE_PROFIT';
          closed = true;
        }
      } else {
        if (candle.high >= inPosition.stopLoss) {
          exitPrice = inPosition.stopLoss;
          exitReason = 'STOP_LOSS';
          closed = true;
        } else if (candle.low <= inPosition.takeProfit) {
          exitPrice = inPosition.takeProfit;
          exitReason = 'TAKE_PROFIT';
          closed = true;
        }
      }

      if (closed) {
        const rawPnL =
          inPosition.side === 'LONG'
            ? (exitPrice - inPosition.entryPrice) * inPosition.quantity
            : (inPosition.entryPrice - exitPrice) * inPosition.quantity;

        // Apply 0.05% slippage and fee deduction
        const fees = inPosition.quantity * exitPrice * 0.0006;
        const pnl = rawPnL - fees;
        const pnlPercent = (pnl / (inPosition.entryPrice * inPosition.quantity)) * 100;

        currentCapital += pnl;
        if (currentCapital > peakCapital) {
          peakCapital = currentCapital;
        }
        const drawdown = ((peakCapital - currentCapital) / peakCapital) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        trades.push({
          entryIndex: inPosition.entryIndex,
          entryTime: inPosition.entryTime,
          exitTime: candle.time,
          entryPrice: inPosition.entryPrice,
          exitPrice,
          side: inPosition.side,
          pnl: Number(pnl.toFixed(2)),
          pnlPercent: Number(pnlPercent.toFixed(2)),
          exitReason,
        });

        equityCurve.push({
          time: new Date(candle.time * 1000).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          equity: Number(currentCapital.toFixed(2)),
        });

        inPosition = null;
      }
    }

    // 2. Check entry conditions if not in position
    if (!inPosition && i < candles.length - 1) {
      const currentRsi = rsi[i];
      const prevRsi = rsi[i - 1];
      const isPriceAboveEma200 = currentPrice > ema200[i];
      const isEmaBullish = ema21[i] > ema50[i];
      const isMacdBullishCross =
        macd.histogram[i] > 0 && macd.histogram[i - 1] <= 0;
      const isBbOversold = candle.low <= bb.lower[i];

      let shouldLong = false;
      let shouldShort = false;

      // Check conditions against strategy
      if (strategy.name.includes('RSI')) {
        if (currentRsi < 35 && isPriceAboveEma200) shouldLong = true;
        else if (currentRsi > 68 && !isPriceAboveEma200) shouldShort = true;
      } else if (strategy.name.includes('Trend') || strategy.name.includes('EMA')) {
        if (isEmaBullish && currentRsi > 45 && currentRsi < 65) shouldLong = true;
        else if (!isEmaBullish && currentRsi < 55 && currentRsi > 35) shouldShort = true;
      } else if (strategy.name.includes('MACD')) {
        if (isMacdBullishCross && currentPrice > ema50[i]) shouldLong = true;
        else if (macd.histogram[i] < 0 && macd.histogram[i - 1] >= 0) shouldShort = true;
      } else if (strategy.name.includes('Bollinger') || strategy.name.includes('Reversion')) {
        if (isBbOversold && currentRsi < 40) shouldLong = true;
        else if (candle.high >= bb.upper[i] && currentRsi > 60) shouldShort = true;
      } else {
        // Default hybrid rule: Trend filter + RSI pullback
        if (isPriceAboveEma200 && currentRsi < 42 && prevRsi <= currentRsi) {
          shouldLong = true;
        } else if (!isPriceAboveEma200 && currentRsi > 58 && prevRsi >= currentRsi) {
          shouldShort = true;
        }
      }

      if (shouldLong || shouldShort) {
        const side = shouldLong ? 'LONG' : 'SHORT';
        const slDistance = currentAtr * (strategy.stopLossAtrMultiple || 1.5);
        const tpDistance = currentAtr * (strategy.takeProfitAtrMultiple || 3.2); // > 1:2 RR

        const stopLoss =
          side === 'LONG'
            ? Math.max(0.01, currentPrice - slDistance)
            : currentPrice + slDistance;

        const takeProfit =
          side === 'LONG'
            ? currentPrice + tpDistance
            : Math.max(0.01, currentPrice - tpDistance);

        const riskCapital = (currentCapital * riskPercent) / 100;
        const perUnitRisk = Math.abs(currentPrice - stopLoss);
        const quantity = perUnitRisk > 0 ? riskCapital / perUnitRisk : 1;

        inPosition = {
          entryIndex: i,
          entryTime: candle.time,
          entryPrice: currentPrice,
          side,
          stopLoss,
          takeProfit,
          quantity,
        };
      }
    }
  }

  // Calculate backtest metrics
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);

  const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));

  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.9 : 0) : grossProfit / grossLoss;
  const netProfit = currentCapital - startingCapital;
  const netProfitPercent = (netProfit / startingCapital) * 100;
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  // Sharpe ratio approximation
  const returns = trades.map((t) => t.pnlPercent);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length - 1)
      : 1;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252);

  return {
    summary: {
      strategyName: strategy.name,
      symbol,
      timeframe,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Number(winRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      netProfitPercent: Number(netProfitPercent.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(1)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      equityCurve,
    },
    trades,
  };
}

export const PRESET_STRATEGIES: StrategyRule[] = [
  {
    id: 'strat_rsi_pullback',
    name: 'RSI Momentum Pullback (EMA 200 Filter)',
    description: 'Enters when RSI pulls back under 35 in an uptrend (price > EMA 200), targeting 1:2.2 R:R.',
    conditions: [
      { indicator: 'PRICE_VS_EMA200', operator: '>', value: 'EMA200' },
      { indicator: 'RSI', operator: '<', value: 35 },
    ],
    stopLossAtrMultiple: 1.5,
    takeProfitAtrMultiple: 3.3,
    isBacktested: true,
    isPaperTested: true,
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'strat_ema_trend',
    name: 'EMA 21/50 Trend Surge',
    description: 'Rides strong directional trends when EMA 21 stacks above EMA 50 with healthy consolidation.',
    conditions: [
      { indicator: 'EMA_CROSS', operator: '>', value: 'EMA50' },
      { indicator: 'RSI', operator: '>', value: 48 },
    ],
    stopLossAtrMultiple: 1.6,
    takeProfitAtrMultiple: 3.5,
    isBacktested: true,
    isPaperTested: true,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'strat_macd_breakout',
    name: 'MACD Zero-Line Expansion',
    description: 'Catches impulsive breakouts when MACD crosses above signal line with expanding histogram.',
    conditions: [
      { indicator: 'MACD_CROSS', operator: 'CROSSES_ABOVE', value: 'SIGNAL' },
      { indicator: 'ATR_EXPANSION', operator: '>', value: 1.2 },
    ],
    stopLossAtrMultiple: 1.4,
    takeProfitAtrMultiple: 3.0,
    isBacktested: true,
    isPaperTested: false, // Needs paper testing
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'strat_bb_reversion',
    name: 'Bollinger Band Mean Reversion',
    description: 'Counter-trend strategy looking for exhaustion wick at outer Bollinger band with RSI extreme.',
    conditions: [
      { indicator: 'BOLLINGER_TOUCH', operator: 'TOUCHES', value: 'LOWER' },
      { indicator: 'RSI', operator: '<', value: 30 },
    ],
    stopLossAtrMultiple: 1.8,
    takeProfitAtrMultiple: 3.6,
    isBacktested: false,
    isPaperTested: false,
    createdAt: Date.now(),
  },
];
