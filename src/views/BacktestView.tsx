import React, { useState } from 'react';
import { Candle, StrategyRule, SymbolInfo, Timeframe } from '../types';
import { PRESET_STRATEGIES, runBacktest, BacktestTrade } from '../lib/backtester';
import { PlayCircle, Award, CheckCircle, ShieldAlert, BarChart3, TrendingUp, Sliders } from 'lucide-react';

interface BacktestViewProps {
  candles: Candle[];
  symbols: SymbolInfo[];
  selectedSymbol: SymbolInfo;
  onSelectSymbol: (s: SymbolInfo) => void;
  strategies: StrategyRule[];
  onCertifyStrategy: (strategyId: string) => void;
}

export const BacktestView: React.FC<BacktestViewProps> = ({
  candles,
  symbols,
  selectedSymbol,
  onSelectSymbol,
  strategies,
  onCertifyStrategy,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyRule>(
    strategies[0] || PRESET_STRATEGIES[0]
  );
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [startingCapital, setStartingCapital] = useState(10000);

  const [backtestResult, setBacktestResult] = useState(() =>
    runBacktest(selectedStrategy, selectedSymbol.symbol, timeframe, candles, startingCapital, riskPercent)
  );

  const handleRunBacktest = () => {
    const res = runBacktest(
      selectedStrategy,
      selectedSymbol.symbol,
      timeframe,
      candles,
      startingCapital,
      riskPercent
    );
    setBacktestResult(res);
  };

  const { summary, trades } = backtestResult;

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-emerald-500" />
            Strategy Backtesting & Live Certification
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional requirement: Strategies must be backtested & paper-tested before Live execution
          </p>
        </div>

        <button
          onClick={handleRunBacktest}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
        >
          <PlayCircle className="w-4 h-4 fill-current" />
          <span>Execute Backtest</span>
        </button>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs">
        <div>
          <label className="text-slate-500 dark:text-slate-400 block mb-1">Strategy Rule Set</label>
          <select
            value={selectedStrategy.id}
            onChange={(e) => {
              const strat = strategies.find((s) => s.id === e.target.value) || PRESET_STRATEGIES[0];
              setSelectedStrategy(strat);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
          >
            {strategies.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-500 dark:text-slate-400 block mb-1">Target Asset</label>
          <select
            value={selectedSymbol.symbol}
            onChange={(e) => {
              const sym = symbols.find((s) => s.symbol === e.target.value);
              if (sym) onSelectSymbol(sym);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
          >
            {symbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.displayName} ({s.symbol})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-500 dark:text-slate-400 block mb-1">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
          >
            <option value="15m">15m (Day Trading)</option>
            <option value="1h">1h (Swing Trading)</option>
            <option value="4h">4h (Macro Swing)</option>
            <option value="1D">1D (Position)</option>
          </select>
        </div>
      </div>

      {/* Certification Status & Summary KPIs */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Certification Status:
            </span>
            {selectedStrategy.isBacktested && selectedStrategy.isPaperTested ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Approved for Live Execution
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Restricted (Requires Paper Testing)
              </span>
            )}
          </div>

          {!selectedStrategy.isPaperTested && (
            <button
              onClick={() => onCertifyStrategy(selectedStrategy.id)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Certify for Live Mode
            </button>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">WIN RATE</span>
            <span className="text-base font-bold text-emerald-500 tabular-nums">
              {summary.winRate}% ({summary.winningTrades}W / {summary.losingTrades}L)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">PROFIT FACTOR</span>
            <span className="text-base font-bold text-cyan-400 tabular-nums">
              {summary.profitFactor}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">NET PROFIT</span>
            <span
              className={`text-base font-bold tabular-nums ${
                summary.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {summary.netProfit >= 0 ? '+' : ''}${summary.netProfit.toLocaleString()} ({summary.netProfitPercent}%)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block">MAX DRAWDOWN</span>
            <span className="text-base font-bold text-rose-500 tabular-nums">
              -{summary.maxDrawdown}%
            </span>
          </div>
        </div>
      </div>

      {/* Simulated Trades Log */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Historical Backtest Trade Executions ({trades.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase">
              <tr>
                <th className="py-2 px-2">Side</th>
                <th className="py-2 px-2">Entry Price</th>
                <th className="py-2 px-2">Exit Price</th>
                <th className="py-2 px-2">Exit Reason</th>
                <th className="py-2 px-2 text-right">PnL ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {trades.slice(0, 15).map((t, i) => {
                const isWin = t.pnl > 0;
                return (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.side === 'LONG'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 px-2">${t.entryPrice.toLocaleString()}</td>
                    <td className="py-2 px-2">${t.exitPrice.toLocaleString()}</td>
                    <td className="py-2 px-2 text-slate-400 text-[10px]">{t.exitReason}</td>
                    <td
                      className={`py-2 px-2 text-right font-bold ${
                        isWin ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isWin ? '+' : ''}${t.pnl} ({isWin ? '+' : ''}
                      {t.pnlPercent}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
