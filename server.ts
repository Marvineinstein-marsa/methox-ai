import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google GenAI client if key is available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({});
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// 1. Economic Calendar Events Feed
const UPCOMING_ECONOMIC_EVENTS = [
  {
    id: 'eco_cpi_us',
    title: 'US Consumer Price Index (CPI YoY)',
    country: 'United States',
    currency: 'USD',
    impact: 'HIGH',
    date: 'Today',
    time: '13:30 UTC',
    forecast: '2.4%',
    previous: '2.5%',
    actual: undefined,
    pauseTradingRecommended: true,
  },
  {
    id: 'eco_fomc',
    title: 'Federal Reserve Interest Rate Decision & FOMC Statement',
    country: 'United States',
    currency: 'USD',
    impact: 'HIGH',
    date: 'Tomorrow',
    time: '18:00 UTC',
    forecast: '4.75%',
    previous: '4.75%',
    actual: undefined,
    pauseTradingRecommended: true,
  },
  {
    id: 'eco_nfp',
    title: 'US Non-Farm Payrolls & Unemployment Rate',
    country: 'United States',
    currency: 'USD',
    impact: 'HIGH',
    date: 'Friday',
    time: '13:30 UTC',
    forecast: '145K',
    previous: '142K',
    actual: undefined,
    pauseTradingRecommended: true,
  },
  {
    id: 'eco_ecb',
    title: 'ECB Monetary Policy Statement',
    country: 'Eurozone',
    currency: 'EUR',
    impact: 'MEDIUM',
    date: 'Thursday',
    time: '12:15 UTC',
    forecast: '3.25%',
    previous: '3.50%',
    actual: undefined,
    pauseTradingRecommended: false,
  },
  {
    id: 'eco_btc_unlock',
    title: 'Major Layer 1 Ecosystem Token Unlock ($320M)',
    country: 'Crypto',
    currency: 'CRYPTO',
    impact: 'MEDIUM',
    date: 'In 2 days',
    time: '08:00 UTC',
    forecast: 'High Supply',
    previous: 'N/A',
    actual: undefined,
    pauseTradingRecommended: false,
  },
];

app.get('/api/economic-calendar', (_req: Request, res: Response) => {
  res.json({
    events: UPCOMING_ECONOMIC_EVENTS,
    highImpactActive: true,
    warning: 'CPI Release at 13:30 UTC. Institutional recommendation: Avoid placing market orders ±15 minutes around high-impact prints.',
  });
});

// 2. Market Klines Proxy (Binance REST)
app.get('/api/market/klines', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const interval = String(req.query.interval || '1h');
  const limit = Math.min(500, parseInt(String(req.query.limit || '120')));

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      throw new Error(`Binance returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err: unknown) {
    res.status(502).json({
      error: 'Failed to fetch live klines from exchange',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// 3. AI Trade Signal Analysis & Rationale
app.post('/api/ai/signal-analysis', async (req: Request, res: Response) => {
  const { symbol, timeframe, currentPrice, action, confidence, stopLoss, takeProfit1, confluences, rsi, trend } = req.body;

  if (!ai || !process.env.GEMINI_API_KEY) {
    // Return high-quality technical synthesis fallback
    return res.json({
      reasoning: `${action} signal for ${symbol} (${timeframe}) at $${currentPrice}. Technical setup shows ${trend} momentum with RSI at ${rsi}. Confluence points: ${confluences.join('; ')}. Stop-loss protected at $${stopLoss} with primary objective at $${takeProfit1}. Not financial advice.`,
      model: 'rule-engine-fallback',
    });
  }

  try {
    const prompt = `You are Methox Ai, an elite institutional quantitative trading strategist.
Analyze this live trade setup and provide a crisp 2-3 sentence plain-English rationale for a professional trader.
- Symbol: ${symbol}
- Action: ${action}
- Timeframe: ${timeframe}
- Current Price: $${currentPrice}
- Stop Loss: $${stopLoss}
- Take Profit: $${takeProfit1}
- Technical Trend: ${trend}
- RSI (14): ${rsi}
- Confluences: ${JSON.stringify(confluences)}

Requirements:
1. Explain specifically why this trade offers positive expected value based on the technical factors.
2. Mention the invalidation price ($${stopLoss}) and why risk is strictly controlled.
3. Keep it objective, professional, and concise (under 75 words).
4. Do NOT promise profit or guarantee outcomes.`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const reasoning = aiRes.text?.trim() || `${action} signal validated by technical structure and strict 1:2+ risk/reward parameters.`;
    res.json({ reasoning, model: 'gemini-2.5-flash' });
  } catch (err: unknown) {
    console.error('Gemini signal analysis error:', err);
    res.json({
      reasoning: `${action} signal confirmed by ${confluences.slice(0, 2).join(' and ')}. Controlled risk profile with invalidation below $${stopLoss}.`,
      model: 'rule-engine-fallback',
    });
  }
});

// 4. AI Trading Journal Coach
app.post('/api/ai/coach-review', async (req: Request, res: Response) => {
  const { journalEntries } = req.body;

  if (!Array.isArray(journalEntries) || journalEntries.length === 0) {
    return res.json({
      feedback: 'Please log at least 1 trade with your entry reason and emotions so the AI Coach can analyze your behavioral patterns.',
    });
  }

  if (!ai || !process.env.GEMINI_API_KEY) {
    // Behavioral heuristic check
    const revengeTrades = journalEntries.filter((e) => e.emotion === 'Revenge' || e.emotion === 'FOMO');
    const fomoRate = ((revengeTrades.length / journalEntries.length) * 100).toFixed(0);

    return res.json({
      feedback: `Behavioral Review: You have logged ${journalEntries.length} trades. Emotional tags show ${fomoRate}% impulsive/FOMO/Revenge decisions. Recommendation: Implement a mandatory 15-minute cool-down period after any losing trade to prevent emotional compounding.`,
      identifiedBiases: ['Revenge Trading Risk', 'Overtrading Impulse'],
    });
  }

  try {
    const summary = journalEntries
      .slice(0, 10)
      .map(
        (e) =>
          `- ${e.action} on ${e.symbol}: PnL $${e.pnl || 0}, Emotion: ${e.emotion}, Reason: "${e.entryReason}", Lessons: "${e.lessonsLearned || 'None'}"`
      )
      .join('\n');

    const prompt = `You are Methox AI Trading Coach, a ruthless yet empathetic quantitative trading psychologist.
Review these recent trade journal entries logged by the trader:
${summary}

Identify repeated psychological or strategic flaws, such as:
1. Revenge trading (entering immediately after a loss)
2. FOMO entries chasing candles without confirmation
3. Moving stop losses or failing to adhere to pre-planned invalidation
4. Overtrading or sizing up when frustrated

Give a direct, actionable 3-bullet coaching diagnosis (under 120 words total). Be constructively candid.`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      feedback: aiRes.text?.trim() || 'Focus on consistent execution and strict trade sizing.',
      model: 'gemini-2.5-flash',
    });
  } catch (err: unknown) {
    console.error('AI Coach error:', err);
    res.json({
      feedback: 'Maintain discipline: honor your stop losses without hesitation, and never double down after an adverse move.',
      model: 'rule-engine-fallback',
    });
  }
});

// 5. Server-side Pre-Flight Risk Check Endpoint
app.post('/api/risk/validate', (req: Request, res: Response) => {
  const { entryPrice, stopLoss, takeProfit, quantity, accountBalance, maxRiskPercent, killSwitchActive } = req.body;

  if (killSwitchActive) {
    return res.status(403).json({
      valid: false,
      error: 'CRITICAL: Kill switch is currently active. Order rejected.',
    });
  }

  if (!stopLoss || stopLoss <= 0) {
    return res.status(400).json({
      valid: false,
      error: 'Mandatory stop-loss rule violated: Order missing stop-loss.',
    });
  }

  const riskAmount = Math.abs(entryPrice - stopLoss) * quantity;
  const riskPercent = (riskAmount / accountBalance) * 100;

  const reward = Math.abs(takeProfit - entryPrice);
  const risk = Math.abs(entryPrice - stopLoss);
  const rr = risk > 0 ? reward / risk : 0;

  if (rr < 2.0) {
    return res.status(400).json({
      valid: false,
      error: `Risk-to-Reward ratio 1:${rr.toFixed(2)} is lower than the mandatory 1:2 threshold.`,
    });
  }

  if (riskPercent > (maxRiskPercent || 1.0) * 1.05) {
    return res.status(400).json({
      valid: false,
      error: `Trade risk (${riskPercent.toFixed(2)}%) exceeds maximum risk setting (${maxRiskPercent}%).`,
    });
  }

  res.json({
    valid: true,
    riskAmount: Number(riskAmount.toFixed(2)),
    riskPercent: Number(riskPercent.toFixed(2)),
    riskRewardRatio: Number(rr.toFixed(2)),
  });
});

// 6. Mount Vite in Development or serve static bundle in Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Methox Ai Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
