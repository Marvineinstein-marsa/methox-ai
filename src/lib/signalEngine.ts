import { Candle, TechnicalIndicators, Timeframe, TradeSignal } from '../types';
import { calculateRiskReward, computeAllIndicators } from './indicators';

export async function generateAiTradeSignal(
  symbol: string,
  timeframe: Timeframe,
  candles: Candle[],
  indicators?: TechnicalIndicators
): Promise<TradeSignal> {
  const ind = indicators || computeAllIndicators(candles);
  const currentPrice = candles[candles.length - 1]?.close || 100;
  const atr = ind.atr;

  // Signal Evaluation Algorithm
  let buyScore = 0;
  let sellScore = 0;
  const confluences: string[] = [];

  // Trend Confluence
  if (ind.trend === 'STRONG_BULLISH') {
    buyScore += 30;
    confluences.push('Strong bullish EMA structure (9 > 21 > 50 > 200)');
  } else if (ind.trend === 'BULLISH') {
    buyScore += 18;
    confluences.push('Bullish moving average alignment above EMA 50');
  } else if (ind.trend === 'STRONG_BEARISH') {
    sellScore += 30;
    confluences.push('Strong bearish EMA stack (9 < 21 < 50 < 200)');
  } else if (ind.trend === 'BEARISH') {
    sellScore += 18;
    confluences.push('Bearish price action below EMA 50');
  }

  // RSI Confluence
  if (ind.rsi < 35) {
    buyScore += 25;
    confluences.push(`Oversold RSI momentum reading (${ind.rsi.toFixed(1)})`);
  } else if (ind.rsi > 45 && ind.rsi < 60 && ind.trend === 'BULLISH') {
    buyScore += 15;
    confluences.push(`Healthy bullish RSI expansion (${ind.rsi.toFixed(1)}) without exhaustion`);
  } else if (ind.rsi > 68) {
    sellScore += 25;
    confluences.push(`Overbought RSI momentum reading (${ind.rsi.toFixed(1)})`);
  } else if (ind.rsi < 55 && ind.rsi > 40 && ind.trend === 'BEARISH') {
    sellScore += 15;
    confluences.push(`Bearish continuation RSI regime (${ind.rsi.toFixed(1)})`);
  }

  // MACD Confluence
  if (ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal) {
    buyScore += 20;
    confluences.push('MACD positive histogram with bullish signal line separation');
  } else if (ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal) {
    sellScore += 20;
    confluences.push('MACD negative divergence with bearish signal crossover');
  }

  // Support / Resistance Proximity
  const closestSupport = ind.supportLevels[0];
  const closestResistance = ind.resistanceLevels[0];

  if (closestSupport && Math.abs(currentPrice - closestSupport) / currentPrice < 0.015) {
    buyScore += 15;
    confluences.push(`Price holding firmly at key structural support $${closestSupport.toFixed(2)}`);
  }
  if (closestResistance && Math.abs(closestResistance - currentPrice) / currentPrice < 0.015) {
    sellScore += 15;
    confluences.push(`Price encountering heavy supply at resistance $${closestResistance.toFixed(2)}`);
  }

  // Multi-Timeframe Alignment
  const alignments = Object.values(ind.multiTimeframeAlignment);
  const bullishCount = alignments.filter((a) => a === 'BULLISH').length;
  const bearishCount = alignments.filter((a) => a === 'BEARISH').length;

  if (bullishCount >= 3) {
    buyScore += 20;
    confluences.push(`${bullishCount}/4 timeframes confirm bullish directional bias`);
  } else if (bearishCount >= 3) {
    sellScore += 20;
    confluences.push(`${bearishCount}/4 timeframes confirm bearish directional bias`);
  }

  let action: TradeSignal['action'] = 'HOLD';
  let confidence = 50;
  let entryPrice = currentPrice;
  let stopLoss = currentPrice * 0.98;
  let takeProfit1 = currentPrice * 1.04;
  let takeProfit2 = currentPrice * 1.07;
  let invalidation = stopLoss;

  if (buyScore >= 55 && buyScore > sellScore + 15) {
    action = 'BUY';
    confidence = Math.min(96, Math.max(65, Math.round(50 + buyScore * 0.45)));
    const slDist = Math.max(atr * 1.5, currentPrice * 0.012);
    stopLoss = Number((currentPrice - slDist).toFixed(currentPrice < 10 ? 4 : 2));
    takeProfit1 = Number((currentPrice + slDist * 2.3).toFixed(currentPrice < 10 ? 4 : 2)); // > 1:2.3 RR
    takeProfit2 = Number((currentPrice + slDist * 3.6).toFixed(currentPrice < 10 ? 4 : 2));
    invalidation = stopLoss;
  } else if (sellScore >= 55 && sellScore > buyScore + 15) {
    action = 'SELL';
    confidence = Math.min(96, Math.max(65, Math.round(50 + sellScore * 0.45)));
    const slDist = Math.max(atr * 1.5, currentPrice * 0.012);
    stopLoss = Number((currentPrice + slDist).toFixed(currentPrice < 10 ? 4 : 2));
    takeProfit1 = Number((currentPrice - slDist * 2.3).toFixed(currentPrice < 10 ? 4 : 2)); // > 1:2.3 RR
    takeProfit2 = Number((currentPrice - slDist * 3.6).toFixed(currentPrice < 10 ? 4 : 2));
    invalidation = stopLoss;
  } else {
    action = 'HOLD';
    confidence = Math.round(45 + Math.abs(buyScore - sellScore) * 0.5);
    confluences.push('Conflicting indicator signals; awaiting decisive breakout or volume confirmation');
  }

  const rr = calculateRiskReward(entryPrice, stopLoss, takeProfit1);

  // Default synthetic institutional reason
  let reasoning = `${action} signal generated for ${symbol} on the ${timeframe} timeframe with ${confidence}% technical confidence. `;
  if (action === 'BUY') {
    reasoning += `Momentum indicators reflect clean bullish confluence above support with favorable asymmetric upside. Multi-timeframe trend filter validates continuation towards $${takeProfit1.toLocaleString()}. Strict stop-loss set at $${stopLoss.toLocaleString()} protects downside.`;
  } else if (action === 'SELL') {
    reasoning += `Distribution structure detected as price tests overhead resistance with decelerating momentum. Expected retracement target $${takeProfit1.toLocaleString()} offers a 1:${rr} risk-to-reward ratio. Invalidation strictly set at $${stopLoss.toLocaleString()}.`;
  } else {
    reasoning += `Price is currently compressing in a consolidation zone without high-probability edge. Capital preservation rule active; wait for clear break of local extremes.`;
  }

  // Attempt backend AI enhancement via /api/ai/signal-analysis
  try {
    const res = await fetch('/api/ai/signal-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        timeframe,
        currentPrice,
        action,
        confidence,
        stopLoss,
        takeProfit1,
        confluences,
        rsi: ind.rsi,
        trend: ind.trend,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reasoning) {
        reasoning = data.reasoning;
      }
    }
  } catch {
    // Graceful offline/local reasoning
  }

  return {
    id: 'sig_' + symbol + '_' + Date.now(),
    symbol,
    timeframe,
    action,
    confidence,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio: rr,
    reasoning,
    keyConfluences: confluences.slice(0, 4),
    invalidationLevel: invalidation,
    marketSentiment: action === 'BUY' ? 'GREED' : action === 'SELL' ? 'FEAR' : 'NEUTRAL',
    timestamp: Date.now(),
    status: 'ACTIVE',
  };
}
