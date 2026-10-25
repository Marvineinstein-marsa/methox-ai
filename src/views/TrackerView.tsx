import React, { useState } from 'react';
import { Position } from '../types';
import { Download, Printer, Filter, PieChart, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TrackerViewProps {
  positions: Position[];
  accountBalance: number;
  todayRealizedPnL: number;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  positions,
  accountBalance,
  todayRealizedPnL,
}) => {
  const [filterTag, setFilterTag] = useState<string>('ALL');

  const closedTrades = positions.filter((p) => p.status === 'CLOSED');
  const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter((t) => (t.pnl || 0) <= 0);

  const totalClosedPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  const grossProfit = winningTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0));
  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.9 : 0) : grossProfit / grossLoss;

  // Best and worst trades
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl || 0)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl || 0)) : 0;

  // CSV Export handler
  const handleExportCSV = () => {
    if (closedTrades.length === 0) return;

    const headers = ['ID', 'Date', 'Symbol', 'Side', 'EntryPrice', 'ExitPrice', 'PnL_USD', 'PnL_Percent', 'Status', 'Notes'];
    const rows = closedTrades.map((t) => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.symbol,
      t.side,
      t.entryPrice,
      t.closePrice || t.currentPrice,
      t.pnl.toFixed(2),
      t.pnlPercent.toFixed(2),
      t.status,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `methox_ai_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate SVG Equity Curve Points
  const equityPoints: number[] = [accountBalance - totalClosedPnL];
  let running = accountBalance - totalClosedPnL;
  closedTrades.forEach((t) => {
    running += t.pnl || 0;
    equityPoints.push(running);
  });

  const minEquity = Math.min(...equityPoints, accountBalance * 0.95);
  const maxEquity = Math.max(...equityPoints, accountBalance * 1.05);
  const range = maxEquity - minEquity || 1;

  const svgWidth = 600;
  const svgHeight = 140;
  const pointsString = equityPoints
    .map((val, idx) => {
      const x = (idx / (Math.max(1, equityPoints.length - 1))) * (svgWidth - 20) + 10;
      const y = svgHeight - 20 - ((val - minEquity) / range) * (svgHeight - 40);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block">TOTAL BALANCE</span>
          <span className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block">TODAY'S P&L</span>
          <span
            className={`text-sm sm:text-base font-mono font-bold tabular-nums ${
              todayRealizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {todayRealizedPnL >= 0 ? '+' : ''}${todayRealizedPnL.toFixed(2)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block">WIN RATE</span>
          <span className="text-sm sm:text-base font-mono font-bold text-emerald-500 tabular-nums">
            {winRate.toFixed(1)}%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block">PROFIT FACTOR</span>
          <span className="text-sm sm:text-base font-mono font-bold text-cyan-400 tabular-nums">
            {profitFactor.toFixed(2)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block">BEST TRADE</span>
          <span className="text-sm sm:text-base font-mono font-bold text-emerald-500 tabular-nums">
            +${bestTrade.toFixed(2)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block">WORST TRADE</span>
          <span className="text-sm sm:text-base font-mono font-bold text-rose-500 tabular-nums">
            ${worstTrade.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Equity Curve SVG Graph */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Cumulative Equity Curve
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Net Performance: {totalClosedPnL >= 0 ? '+' : ''}${totalClosedPnL.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        <div className="w-full h-36 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800/80 overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
            {/* Gradient fill underneath curve */}
            <defs>
              <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Guide line */}
            <line
              x1="0"
              y1={svgHeight - 20 - ((accountBalance - minEquity) / range) * (svgHeight - 40)}
              x2={svgWidth}
              y2={svgHeight - 20 - ((accountBalance - minEquity) / range) * (svgHeight - 40)}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.4"
            />
            {/* Curve line */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
          </svg>
        </div>
      </div>

      {/* Closed Trades History List */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Completed Trade Ledger ({closedTrades.length})
        </h3>

        {closedTrades.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No closed trades recorded yet. Once positions are closed, they appear here with full execution metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase">
                <tr>
                  <th className="py-2 px-2">Symbol</th>
                  <th className="py-2 px-2">Side</th>
                  <th className="py-2 px-2">Entry</th>
                  <th className="py-2 px-2">Exit</th>
                  <th className="py-2 px-2">Quantity</th>
                  <th className="py-2 px-2 text-right">Realized PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {closedTrades.map((t) => {
                  const isProfit = (t.pnl || 0) >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                      <td className="py-2.5 px-2">
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
                      <td className="py-2.5 px-2 tabular-nums">${t.entryPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-2 tabular-nums">
                        ${(t.closePrice || t.currentPrice).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 tabular-nums">{t.quantity}</td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold tabular-nums ${
                          isProfit ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}${t.pnl.toFixed(2)} ({isProfit ? '+' : ''}
                        {t.pnlPercent.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
