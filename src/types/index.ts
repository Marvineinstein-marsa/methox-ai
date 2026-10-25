/**
 * Methox Ai - Core Type Definitions
 * Enterprise-grade trading assistant & risk management platform
 */

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
  category: 'crypto' | 'forex' | 'commodity' | 'stock';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  pipSize: number;
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  sma200: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  atr: number;
  supportLevels: number[];
  resistanceLevels: number[];
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  trendScore: number; // -100 to +100
  multiTimeframeAlignment: {
    '15m': 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    '1h': 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    '4h': 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    '1D': 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
}

export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

export interface TradeSignal {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  action: SignalAction;
  confidence: number; // 0 - 100%
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  reasoning: string;
  keyConfluences: string[];
  invalidationLevel: number;
  marketSentiment: 'EXTREME_GREED' | 'GREED' | 'NEUTRAL' | 'FEAR' | 'EXTREME_FEAR';
  timestamp: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'CANCELLED';
}

export type TradingMode = 'paper' | 'live';

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  mode: TradingMode;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  pnl: number;
  pnlPercent: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED';
  closePrice?: number;
  closeTimestamp?: number;
  notes?: string;
  tags?: string[];
  strategyId?: string;
}

export interface RiskSettings {
  maxRiskPerTradePercent: number; // Default 1%
  dailyLossLimitPercent: number; // Default 3%
  maxOpenTrades: number; // Default 3
  minRiskRewardRatio: number; // Default 2.0 (1:2)
  accountBalance: number; // Initial/Current balance
  killSwitchActive: boolean;
  killSwitchActivatedAt?: number;
  autoTradeEnabled: boolean;
  maxLeverage: number;
  requireManualConfirm: boolean;
}

export interface JournalEntry {
  id: string;
  positionId?: string;
  symbol: string;
  action: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  entryReason: string;
  exitReason?: string;
  emotion: 'Disciplined' | 'FOMO' | 'Revenge' | 'Hesitant' | 'Greedy' | 'Fearful';
  lessonsLearned: string;
  rulesFollowed: boolean;
  timestamp: number;
  aiCoachFeedback?: string;
}

export interface StrategyRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    indicator: 'RSI' | 'EMA_CROSS' | 'MACD_CROSS' | 'PRICE_VS_EMA200' | 'BOLLINGER_TOUCH' | 'ATR_EXPANSION';
    operator: '>' | '<' | 'CROSSES_ABOVE' | 'CROSSES_BELOW' | 'TOUCHES';
    value: number | string;
  }>;
  stopLossAtrMultiple: number;
  takeProfitAtrMultiple: number;
  isBacktested: boolean;
  isPaperTested: boolean;
  backtestResults?: BacktestSummary;
  createdAt: number;
}

export interface BacktestSummary {
  strategyName: string;
  symbol: string;
  timeframe: Timeframe;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  profitFactor: number;
  netProfit: number;
  netProfitPercent: number;
  maxDrawdown: number; // %
  sharpeRatio: number;
  equityCurve: Array<{ time: string; equity: number }>;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  date: string;
  time: string;
  forecast: string;
  previous: string;
  actual?: string;
  pauseTradingRecommended: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  category: 'ORDER' | 'RISK_VIOLATION' | 'KILL_SWITCH' | 'SETTING_CHANGE' | 'AI_SIGNAL' | 'AUTH';
  message: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  details?: Record<string, unknown>;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'ABOVE' | 'BELOW';
  triggered: boolean;
  createdAt: number;
}
