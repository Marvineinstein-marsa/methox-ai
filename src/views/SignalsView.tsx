import React, { useState } from 'react';
import { TradeSignal } from '../types';
import { Zap, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface SignalsViewProps {
  signals: TradeSignal[];
  onExecuteSignal: (signal: TradeSignal) => void;
  onRefreshSignals: () => void;
  isGenerating: boolean;
}

export const SignalsView: React.FC<SignalsViewProps> = ({
  signals,
  onExecuteSignal,
  onRefreshSignals,
  isGenerating,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filteredSignals = signals.filter((s) => {
    if (filter === 'ALL') return true;
    return s.action === filter;
  });

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500 fill-current" />
              AI Trade Signals
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold font-mono">
              {signals.length} ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional algorithmic confluence model with Gemini reasoning
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {(['ALL', 'BUY', 'SELL'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === mode
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={onRefreshSignals}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-sm transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Scanning...' : 'Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Compliance Disclaimer Card */}
      <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-200">NOT FINANCIAL ADVICE:</strong> All trade signals, technical indicators, confidence scores, and AI rationale are generated strictly for computational simulation and research. Always execute your own risk assessment before placing capital.
        </p>
      </div>

      {/* Signal Cards Feed */}
      <div className="space-y-3">
        {filteredSignals.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
            <Zap className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No signals match current filter</p>
            <p className="text-xs text-slate-400 mt-1">Tap 'Scan Now' to run fresh technical analysis across all symbols</p>
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isBuy = signal.action === 'BUY';
            const isSell = signal.action === 'SELL';
            const actionBg = isBuy
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : isSell
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20';

            return (
              <div
                key={signal.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      {signal.symbol}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {signal.timeframe}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${actionBg}`}>
                      {signal.action}
                    </span>
                  </div>

                  {/* Confidence score badge */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-mono">CONFIDENCE</div>
                      <div className="text-sm font-mono font-bold text-emerald-500 tabular-nums">
                        {signal.confidence}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">ENTRY PRICE</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      ${signal.entryPrice < 10 ? signal.entryPrice.toFixed(4) : signal.entryPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] text-rose-500 block">STOP LOSS (AUTO)</span>
                    <span className="text-sm font-bold text-rose-500 tabular-nums">
                      ${signal.stopLoss < 10 ? signal.stopLoss.toFixed(4) : signal.stopLoss.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] text-emerald-500 block">TAKE PROFIT 1</span>
                    <span className="text-sm font-bold text-emerald-500 tabular-nums">
                      ${signal.takeProfit1 < 10 ? signal.takeProfit1.toFixed(4) : signal.takeProfit1.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] text-cyan-400 block">RISK / REWARD</span>
                    <span className="text-sm font-bold text-cyan-400 tabular-nums">
                      1 : {signal.riskRewardRatio}
                    </span>
                  </div>
                </div>

                {/* AI Rationale Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 mb-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    AI Thesis & Technical Confluence
                  </div>
                  <p>{signal.reasoning}</p>

                  {/* Confluences list */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {signal.keyConfluences.map((c, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    Invalidation: <span className="font-mono text-rose-400">${signal.invalidationLevel}</span>
                  </div>

                  <button
                    onClick={() => onExecuteSignal(signal)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-sm transition-all"
                  >
                    <span>Execute Trade</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
