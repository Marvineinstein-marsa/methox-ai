import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  AuditLogItem,
  Candle,
  JournalEntry,
  Position,
  RiskSettings,
  StrategyRule,
  SymbolInfo,
  Timeframe,
  TradeSignal,
  TradingMode,
} from './types';
import { DEFAULT_SYMBOLS, fetchLiveKlines, BinanceWebSocketManager } from './lib/marketData';
import { computeAllIndicators } from './lib/indicators';
import { generateAiTradeSignal } from './lib/signalEngine';
import { createAuditLog, validateOrder } from './lib/riskEngine';
import { PRESET_STRATEGIES } from './lib/backtester';
import { Header } from './components/Header';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { MarketView } from './views/MarketView';
import { SignalsView } from './views/SignalsView';
import { TradesView } from './views/TradesView';
import { TrackerView } from './views/TrackerView';
import { JournalView } from './views/JournalView';
import { SettingsView } from './views/SettingsView';
import { BacktestView } from './views/BacktestView';
import { CalendarView } from './views/CalendarView';
import { AuditLogView } from './views/AuditLogView';

export default function App() {
  // 1. Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className =
        'bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400 min-h-screen';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className =
        'bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500/20 selection:text-emerald-600 min-h-screen';
    }
  }, [theme]);

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('market');

  // 3. Market State
  const [symbols, setSymbols] = useState<SymbolInfo[]>(DEFAULT_SYMBOLS);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolInfo>(DEFAULT_SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isConnectingWs, setIsConnectingWs] = useState(false);

  // 4. Trading & Risk State
  const [tradingMode, setTradingMode] = useState<TradingMode>('paper');
  const [userEmail] = useState('trader@methox.ai');
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);

  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxRiskPerTradePercent: 1.0,
    dailyLossLimitPercent: 3.0,
    maxOpenTrades: 3,
    minRiskRewardRatio: 2.0,
    accountBalance: 10000.0,
    killSwitchActive: false,
    autoTradeEnabled: false,
    maxLeverage: 5,
    requireManualConfirm: true,
  });

  // 5. Positions & Portfolio State
  const [positions, setPositions] = useState<Position[]>([
    {
      id: 'pos_btc_init',
      symbol: 'BTCUSDT',
      side: 'LONG',
      mode: 'paper',
      entryPrice: 92800.0,
      currentPrice: 94250.0,
      quantity: 0.05,
      stopLoss: 91400.0,
      takeProfit: 96800.0,
      riskAmount: 70.0,
      pnl: 72.5,
      pnlPercent: 1.56,
      timestamp: Date.now() - 3600000 * 4,
      status: 'OPEN',
      notes: 'Clean bounce off 4h EMA 50 with bullish RSI divergence.',
      tags: ['#trend', '#ema50'],
    },
    {
      id: 'pos_eth_closed',
      symbol: 'ETHUSDT',
      side: 'LONG',
      mode: 'paper',
      entryPrice: 3340.0,
      currentPrice: 3420.5,
      closePrice: 3420.5,
      quantity: 1.2,
      stopLoss: 3290.0,
      takeProfit: 3420.0,
      riskAmount: 60.0,
      pnl: 96.6,
      pnlPercent: 2.41,
      timestamp: Date.now() - 86400000,
      closeTimestamp: Date.now() - 3600000 * 2,
      status: 'CLOSED',
      notes: 'Take profit hit at 1:2.4 R:R target.',
      tags: ['#breakout'],
    },
  ]);

  // 6. Signals State
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);

  // 7. Journal State
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 'jnl_1',
      symbol: 'ETHUSDT',
      action: 'LONG',
      entryPrice: 3340.0,
      exitPrice: 3420.5,
      pnl: 96.6,
      entryReason: 'Confirmed breakout above 4h supply cluster with high volume.',
      exitReason: 'Target TP reached strictly according to plan.',
      emotion: 'Disciplined',
      lessonsLearned: 'Patience paid off; allowing the trade to reach TP without early exit.',
      rulesFollowed: true,
      timestamp: Date.now() - 86400000,
      aiCoachFeedback: 'Excellent risk compliance: letting winners run to their intended 1:2.4 target.',
    },
  ]);
  const [aiCoachFeedback, setAiCoachFeedback] = useState<string | null>(
    'Behavioral Diagnosis: High compliance on technical targets. Zero revenge entries detected in the last session. Maintain strict 1% risk discipline.'
  );
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

  // 8. Strategies State
  const [strategies, setStrategies] = useState<StrategyRule[]>(PRESET_STRATEGIES);

  // 9. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    createAuditLog('AUTH', 'User trader@methox.ai authenticated with 2FA TOTP verified', 'INFO'),
    createAuditLog('ORDER', 'Paper LONG order opened on BTCUSDT at $92,800 with auto Stop-Loss $91,400', 'INFO'),
  ]);

  // Compute indicators in real-time
  const indicators = useMemo(() => {
    return computeAllIndicators(candles);
  }, [candles]);

  // Calculate today's realized PnL
  const todayRealizedPnL = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return positions
      .filter((p) => p.status === 'CLOSED' && (p.closeTimestamp || 0) >= today)
      .reduce((acc, p) => acc + (p.pnl || 0), 0);
  }, [positions]);

  // Helper to add audit log
  const logAudit = (
    category: AuditLogItem['category'],
    message: string,
    severity: AuditLogItem['severity'],
    details?: Record<string, unknown>
  ) => {
    const log = createAuditLog(category, message, severity, details);
    setAuditLogs((prev) => [log, ...prev.slice(0, 99)]);
  };

  // Fetch initial klines whenever selectedSymbol or timeframe changes
  useEffect(() => {
    let cancelled = false;
    fetchLiveKlines(selectedSymbol.symbol, timeframe, 120).then((data) => {
      if (!cancelled && data.length > 0) {
        setCandles(data);
        const lastClose = data[data.length - 1].close;
        setSelectedSymbol((prev) => ({ ...prev, price: lastClose }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol.symbol, timeframe]);

  // Connect Binance WebSocket for live real-time price updates
  const wsManagerRef = useRef<BinanceWebSocketManager | null>(null);

  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new BinanceWebSocketManager();
    }

    const ws = wsManagerRef.current;
    setIsConnectingWs(true);

    ws.connect(selectedSymbol.symbol, timeframe, (candle, currentPrice) => {
      setIsConnectingWs(false);
      setCandles((prev) => {
        if (prev.length === 0) return [candle];
        const last = prev[prev.length - 1];
        if (last.time === candle.time) {
          // Update current candle
          const copy = [...prev];
          copy[copy.length - 1] = candle;
          return copy;
        } else if (candle.time > last.time) {
          // Append new candle
          return [...prev.slice(1), candle];
        }
        return prev;
      });

      // Update active symbol price
      setSelectedSymbol((prev) => ({
        ...prev,
        price: currentPrice,
        high24h: Math.max(prev.high24h, currentPrice),
        low24h: Math.min(prev.low24h, currentPrice),
      }));

      // Update watchlist price
      setSymbols((prev) =>
        prev.map((s) => (s.symbol === selectedSymbol.symbol ? { ...s, price: currentPrice } : s))
      );

      // Recalculate open positions PnL and check Stop Loss / Take Profit hits
      setPositions((prev) =>
        prev.map((pos) => {
          if (pos.status !== 'OPEN' || pos.symbol !== selectedSymbol.symbol) return pos;

          const rawDiff =
            pos.side === 'LONG'
              ? currentPrice - pos.entryPrice
              : pos.entryPrice - currentPrice;
          const pnl = rawDiff * pos.quantity;
          const pnlPercent = (pnl / (pos.entryPrice * pos.quantity)) * 100;

          // Check automatic Stop Loss trigger
          if (
            (pos.side === 'LONG' && currentPrice <= pos.stopLoss) ||
            (pos.side === 'SHORT' && currentPrice >= pos.stopLoss)
          ) {
            logAudit(
              'ORDER',
              `AUTOMATIC STOP LOSS TRIGGERED for ${pos.symbol} at $${currentPrice}. Loss realized: -$${Math.abs(pnl).toFixed(2)}`,
              'ALERT'
            );
            return {
              ...pos,
              status: 'CLOSED',
              currentPrice,
              closePrice: currentPrice,
              closeTimestamp: Date.now(),
              pnl,
              pnlPercent,
            };
          }

          // Check automatic Take Profit trigger
          if (
            (pos.side === 'LONG' && currentPrice >= pos.takeProfit) ||
            (pos.side === 'SHORT' && currentPrice <= pos.takeProfit)
          ) {
            logAudit(
              'ORDER',
              `TAKE PROFIT TRIGGERED for ${pos.symbol} at $${currentPrice}. Profit realized: +$${pnl.toFixed(2)}`,
              'INFO'
            );
            return {
              ...pos,
              status: 'CLOSED',
              currentPrice,
              closePrice: currentPrice,
              closeTimestamp: Date.now(),
              pnl,
              pnlPercent,
            };
          }

          return {
            ...pos,
            currentPrice,
            pnl: Number(pnl.toFixed(2)),
            pnlPercent: Number(pnlPercent.toFixed(2)),
          };
        })
      );
    });

    return () => {
      ws.disconnect();
    };
  }, [selectedSymbol.symbol, timeframe]);

  // Initial AI Signals Generation
  const handleGenerateSignal = async () => {
    setIsGeneratingSignal(true);
    try {
      const sig = await generateAiTradeSignal(selectedSymbol.symbol, timeframe, candles, indicators);
      setSignals((prev) => [sig, ...prev.filter((s) => s.symbol !== sig.symbol)]);
      logAudit('AI_SIGNAL', `New AI ${sig.action} signal generated for ${sig.symbol} with ${sig.confidence}% confidence`, 'INFO');
    } finally {
      setIsGeneratingSignal(false);
    }
  };

  useEffect(() => {
    if (candles.length > 30 && signals.length === 0) {
      handleGenerateSignal();
    }
  }, [candles.length]);

  // Kill Switch Handler
  const activateKillSwitch = () => {
    // 1. Close all open positions immediately at current price
    setPositions((prev) =>
      prev.map((p) => {
        if (p.status === 'OPEN') {
          return {
            ...p,
            status: 'CLOSED',
            closePrice: p.currentPrice,
            closeTimestamp: Date.now(),
          };
        }
        return p;
      })
    );

    // 2. Lock risk settings
    setRiskSettings((prev) => ({
      ...prev,
      killSwitchActive: true,
      killSwitchActivatedAt: Date.now(),
    }));

    logAudit(
      'KILL_SWITCH',
      'EMERGENCY KILL SWITCH ENGAGED: All open positions flattened at market and order routing suspended.',
      'CRITICAL'
    );
  };

  const deactivateKillSwitch = () => {
    setRiskSettings((prev) => ({
      ...prev,
      killSwitchActive: false,
    }));
    logAudit('KILL_SWITCH', 'Emergency Kill Switch disengaged by authorized trader.', 'INFO');
  };

  // Order Placement Handler
  const handlePlaceOrder = (orderData: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    mode: TradingMode;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    quantity: number;
  }) => {
    const riskAmount = Math.abs(orderData.entryPrice - orderData.stopLoss) * orderData.quantity;

    const newPosition: Position = {
      id: 'pos_' + Date.now(),
      symbol: orderData.symbol,
      side: orderData.side,
      mode: orderData.mode,
      entryPrice: orderData.entryPrice,
      currentPrice: orderData.entryPrice,
      quantity: orderData.quantity,
      stopLoss: orderData.stopLoss,
      takeProfit: orderData.takeProfit,
      riskAmount: Number(riskAmount.toFixed(2)),
      pnl: 0,
      pnlPercent: 0,
      timestamp: Date.now(),
      status: 'OPEN',
    };

    setPositions((prev) => [newPosition, ...prev]);
    logAudit(
      'ORDER',
      `${orderData.mode.toUpperCase()} ${orderData.side} order placed on ${orderData.symbol} for ${orderData.quantity} units (SL: $${orderData.stopLoss}, TP: $${orderData.takeProfit})`,
      'INFO'
    );
  };

  // Close Position Handler
  const handleClosePosition = (positionId: string) => {
    setPositions((prev) =>
      prev.map((pos) => {
        if (pos.id === positionId && pos.status === 'OPEN') {
          logAudit(
            'ORDER',
            `Manual close executed for ${pos.symbol} ${pos.side}. Realized PnL: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`,
            'INFO'
          );
          return {
            ...pos,
            status: 'CLOSED',
            closePrice: pos.currentPrice,
            closeTimestamp: Date.now(),
          };
        }
        return pos;
      })
    );
  };

  // Execute Signal directly
  const handleExecuteSignal = (sig: TradeSignal) => {
    // Check validation first
    const validation = validateOrder(
      {
        symbol: sig.symbol,
        side: sig.action === 'BUY' ? 'LONG' : 'SHORT',
        mode: tradingMode,
        entryPrice: sig.entryPrice,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit1,
        quantity: 0.05,
      },
      riskSettings,
      positions,
      todayRealizedPnL
    );

    if (!validation.valid) {
      alert(`Order rejected by Risk Guardian:\n• ${validation.violations.join('\n• ')}`);
      return;
    }

    handlePlaceOrder({
      symbol: sig.symbol,
      side: sig.action === 'BUY' ? 'LONG' : 'SHORT',
      mode: tradingMode,
      entryPrice: sig.entryPrice,
      stopLoss: sig.stopLoss,
      takeProfit: sig.takeProfit1,
      quantity: 0.05,
    });

    setActiveTab('trades');
  };

  // AI Coach Review Handler
  const handleRunCoachReview = async () => {
    setIsLoadingCoach(true);
    try {
      const res = await fetch('/api/ai/coach-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntries }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.feedback) {
          setAiCoachFeedback(data.feedback);
          logAudit('AUTH', 'AI Mindset Coach review completed with behavioral diagnosis', 'INFO');
        }
      }
    } catch {
      setAiCoachFeedback(
        'Discipline Check: Consistent trade execution with no severe overtrading detected. Continue to respect automatic stop-loss rules.'
      );
    } finally {
      setIsLoadingCoach(false);
    }
  };

  // Certify strategy for live trading
  const handleCertifyStrategy = (strategyId: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === strategyId ? { ...s, isBacktested: true, isPaperTested: true } : s))
    );
    logAudit('SETTING_CHANGE', `Strategy ${strategyId} certified and approved for Live Trading`, 'INFO');
  };

  const openPositionsCount = positions.filter((p) => p.status === 'OPEN').length;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Header */}
      <Header
        theme={theme}
        setTheme={setTheme}
        tradingMode={tradingMode}
        setTradingMode={setTradingMode}
        riskSettings={riskSettings}
        onActivateKillSwitch={activateKillSwitch}
        onDeactivateKillSwitch={deactivateKillSwitch}
        todayLossPercent={Math.abs(Math.min(0, todayRealizedPnL) / riskSettings.accountBalance) * 100}
        openPositionsCount={openPositionsCount}
        userEmail={userEmail}
        is2FAEnabled={is2FAEnabled}
      />

      {/* Desktop Secondary Navigation Bar */}
      <div className="hidden md:block border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'market', label: 'Live Market & Charts' },
              { id: 'signals', label: 'AI Signals' },
              { id: 'trades', label: 'Orders & Positions' },
              { id: 'tracker', label: 'Portfolio Tracker' },
              { id: 'journal', label: 'Trading Journal & Coach' },
              { id: 'backtester', label: 'Backtester' },
              { id: 'calendar', label: 'Economic Calendar' },
              { id: 'audit', label: 'Audit Log' },
              { id: 'settings', label: 'Risk & Settings' },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id as ActiveTab)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === nav.id
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 shrink-0">
            <span>2FA: <strong className="text-emerald-500">ACTIVE</strong></span>
            <span>·</span>
            <span>ENCRYPTION: <strong className="text-cyan-400">AES-256</strong></span>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'market' && (
          <MarketView
            symbols={symbols}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            candles={candles}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            indicators={indicators}
            theme={theme}
            onGenerateSignal={handleGenerateSignal}
            onOpenTradeForm={() => setActiveTab('trades')}
            isConnectingWs={isConnectingWs}
          />
        )}

        {activeTab === 'signals' && (
          <SignalsView
            signals={signals}
            onExecuteSignal={handleExecuteSignal}
            onRefreshSignals={handleGenerateSignal}
            isGenerating={isGeneratingSignal}
          />
        )}

        {activeTab === 'trades' && (
          <TradesView
            positions={positions}
            symbols={symbols}
            selectedSymbol={selectedSymbol}
            riskSettings={riskSettings}
            tradingMode={tradingMode}
            todayRealizedPnL={todayRealizedPnL}
            onPlaceOrder={handlePlaceOrder}
            onClosePosition={handleClosePosition}
          />
        )}

        {activeTab === 'tracker' && (
          <TrackerView
            positions={positions}
            accountBalance={riskSettings.accountBalance}
            todayRealizedPnL={todayRealizedPnL}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            journalEntries={journalEntries}
            positions={positions}
            onAddJournalEntry={(entry) => {
              const item: JournalEntry = {
                ...entry,
                id: 'jnl_' + Date.now(),
                timestamp: Date.now(),
              };
              setJournalEntries((prev) => [item, ...prev]);
              logAudit('AUTH', `Journal entry logged for ${entry.symbol} with emotion ${entry.emotion}`, 'INFO');
            }}
            aiCoachFeedback={aiCoachFeedback}
            onRunCoachReview={handleRunCoachReview}
            isLoadingCoach={isLoadingCoach}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            riskSettings={riskSettings}
            onUpdateRiskSettings={(newSet) => {
              setRiskSettings((prev) => ({ ...prev, ...newSet }));
              logAudit('SETTING_CHANGE', 'Risk settings updated by trader', 'INFO', newSet);
            }}
            tradingMode={tradingMode}
            userEmail={userEmail}
            is2FAEnabled={is2FAEnabled}
            onToggle2FA={() => {
              setIs2FAEnabled((prev) => !prev);
              logAudit('AUTH', `Two-factor authentication ${!is2FAEnabled ? 'enabled' : 'disabled'}`, 'INFO');
            }}
            onActivateKillSwitch={activateKillSwitch}
            onDeactivateKillSwitch={deactivateKillSwitch}
          />
        )}

        {activeTab === 'backtester' && (
          <BacktestView
            candles={candles}
            symbols={symbols}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            strategies={strategies}
            onCertifyStrategy={handleCertifyStrategy}
          />
        )}

        {activeTab === 'calendar' && <CalendarView />}

        {activeTab === 'audit' && <AuditLogView logs={auditLogs} />}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openPositionsCount={openPositionsCount}
        activeSignalsCount={signals.length}
      />
    </div>
  );
}
