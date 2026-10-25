import React, { useState } from 'react';
import { Position, RiskSettings, SymbolInfo, TradingMode } from '../types';
import { calculatePositionSize, calculateRiskReward } from '../lib/indicators';
import { validateOrder } from '../lib/riskEngine';
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface TradesViewProps {
  positions: Position[];
  symbols: SymbolInfo[];
  selectedSymbol: SymbolInfo;
  riskSettings: RiskSettings;
  tradingMode: TradingMode;
  todayRealizedPnL: number;
  onPlaceOrder: (order: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    mode: TradingMode;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    quantity: number;
  }) => void;
  onClosePosition: (positionId: string) => void;
}

export const TradesView: React.FC<TradesViewProps> = ({
  positions,
  symbols,
  selectedSymbol,
  riskSettings,
  tradingMode,
  todayRealizedPnL,
  onPlaceOrder,
  onClosePosition,
}) => {
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [riskPercent, setRiskPercent] = useState<number>(riskSettings.maxRiskPerTradePercent);
  const [entryPrice, setEntryPrice] = useState<number>(selectedSymbol.price);
  const [stopLoss, setStopLoss] = useState<number>(
    Number((selectedSymbol.price * 0.985).toFixed(selectedSymbol.price < 10 ? 4 : 2))
  );
  const [takeProfit, setTakeProfit] = useState<number>(
    Number((selectedSymbol.price * 1.035).toFixed(selectedSymbol.price < 10 ? 4 : 2))
  );

  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'NEW_ORDER' | 'CALCULATOR'>('POSITIONS');
  const [preflightError, setPreflightError] = useState<string | null>(null);

  // Sync entry when selected symbol changes
  React.useEffect(() => {
    setEntryPrice(selectedSymbol.price);
    if (side === 'LONG') {
      setStopLoss(Number((selectedSymbol.price * 0.985).toFixed(selectedSymbol.price < 10 ? 4 : 2)));
      setTakeProfit(Number((selectedSymbol.price * 1.035).toFixed(selectedSymbol.price < 10 ? 4 : 2)));
    } else {
      setStopLoss(Number((selectedSymbol.price * 1.015).toFixed(selectedSymbol.price < 10 ? 4 : 2)));
      setTakeProfit(Number((selectedSymbol.price * 0.965).toFixed(selectedSymbol.price < 10 ? 4 : 2)));
    }
  }, [selectedSymbol, side]);

  // Sizing calculation
  const sizing = calculatePositionSize(riskSettings.accountBalance, riskPercent, entryPrice, stopLoss);
  const currentRR = calculateRiskReward(entryPrice, stopLoss, takeProfit);

  const handleSideChange = (newSide: 'LONG' | 'SHORT') => {
    setSide(newSide);
    if (newSide === 'LONG') {
      setStopLoss(Number((entryPrice * 0.985).toFixed(entryPrice < 10 ? 4 : 2)));
      setTakeProfit(Number((entryPrice * 1.035).toFixed(entryPrice < 10 ? 4 : 2)));
    } else {
      setStopLoss(Number((entryPrice * 1.015).toFixed(entryPrice < 10 ? 4 : 2)));
      setTakeProfit(Number((entryPrice * 0.965).toFixed(entryPrice < 10 ? 4 : 2)));
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setPreflightError(null);

    const validation = validateOrder(
      {
        symbol: selectedSymbol.symbol,
        side,
        mode: tradingMode,
        entryPrice,
        stopLoss,
        takeProfit,
        quantity: sizing.quantity,
      },
      riskSettings,
      positions,
      todayRealizedPnL
    );

    if (!validation.valid) {
      setPreflightError(validation.violations[0]);
      return;
    }

    onPlaceOrder({
      symbol: selectedSymbol.symbol,
      side,
      mode: tradingMode,
      entryPrice,
      stopLoss,
      takeProfit,
      quantity: sizing.quantity,
    });

    setActiveTab('POSITIONS');
  };

  const openPositions = positions.filter((p) => p.status === 'OPEN');

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Tab bar */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'POSITIONS'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Open Positions ({openPositions.length})
          </button>
          <button
            onClick={() => setActiveTab('NEW_ORDER')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'NEW_ORDER'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Order Form
          </button>
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'CALCULATOR'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sizing Calculator
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mr-2">
          Mode: <span className="font-bold uppercase text-emerald-500">{tradingMode}</span>
        </div>
      </div>

      {/* VIEW 1: ACTIVE POSITIONS */}
      {activeTab === 'POSITIONS' && (
        <div className="space-y-3">
          {openPositions.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-slate-500">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No active open positions</p>
              <p className="text-xs text-slate-400 mt-1">Ready for execution or automated signal entries</p>
              <button
                onClick={() => setActiveTab('NEW_ORDER')}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
              >
                Create New Order
              </button>
            </div>
          ) : (
            openPositions.map((pos) => {
              const isProfit = pos.pnl >= 0;
              return (
                <div
                  key={pos.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-base text-slate-900 dark:text-white">
                        {pos.symbol}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          pos.side === 'LONG'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {pos.side}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Qty: {pos.quantity}</span>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-base font-mono font-bold tabular-nums ${
                          isProfit ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}${pos.pnl.toFixed(2)} ({isProfit ? '+' : ''}
                        {pos.pnlPercent.toFixed(2)}%)
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">UNREALIZED P&L</div>
                    </div>
                  </div>

                  {/* Price points */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">ENTRY</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ${pos.entryPrice.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">CURRENT</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ${pos.currentPrice.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-400 block">STOP LOSS</span>
                      <span className="font-semibold text-rose-500">
                        ${pos.stopLoss.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 block">TAKE PROFIT</span>
                      <span className="font-semibold text-emerald-500">
                        ${pos.takeProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Risk at open: ${pos.riskAmount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onClosePosition(pos.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors border border-rose-500/20"
                    >
                      Close Position (Market)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: NEW ORDER FORM */}
      {activeTab === 'NEW_ORDER' && (
        <form
          onSubmit={handleSubmitOrder}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Institutional Order Execution
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              {selectedSymbol.symbol} @ ${selectedSymbol.price}
            </span>
          </div>

          {/* Pre-flight Error Banner */}
          {preflightError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Risk Guardian Rejection:</strong>
                {preflightError}
              </div>
            </div>
          )}

          {/* Side Selector (Long / Short) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSideChange('LONG')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                side === 'LONG'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              LONG / BUY
            </button>
            <button
              type="button"
              onClick={() => handleSideChange('SHORT')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                side === 'SHORT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              SHORT / SELL
            </button>
          </div>

          {/* Price Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Entry Price ($)
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-rose-500 block mb-1">
                Stop Loss ($) *Mandatory
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-900/60 text-sm font-mono font-bold text-rose-500 focus:outline-hidden focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-emerald-500 block mb-1">
                Take Profit ($) *Min 1:2
              </label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-900/60 text-sm font-mono font-bold text-emerald-500 focus:outline-hidden focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Risk Sizing Controls */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Risk % per trade:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {riskPercent}% (${sizing.riskAmount})
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max={riskSettings.maxRiskPerTradePercent * 2}
              step="0.25"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block">CALC QUANTITY:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{sizing.quantity} units</span>
              </div>
              <div>
                <span className="text-slate-400 block">POSITION VALUE:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">${sizing.positionValue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">RISK / REWARD:</span>
                <span className={`font-bold ${currentRR >= 2 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  1 : {currentRR} {currentRR < 2 && '(Below 1:2 min)'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Execute Validated {side} Order</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* VIEW 3: SIZING CALCULATOR */}
      {activeTab === 'CALCULATOR' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Institutional Position Sizing Formula
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Formula: <code className="text-cyan-400 font-mono">Position Size = (Account Balance × Risk %) ÷ |Entry - StopLoss|</code>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">ACCOUNT EQUITY</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                ${riskSettings.accountBalance.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">MAX RISK PER TRADE</span>
              <span className="text-sm font-bold text-emerald-500">
                {riskSettings.maxRiskPerTradePercent}% (${(riskSettings.accountBalance * riskSettings.maxRiskPerTradePercent / 100).toFixed(2)})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">DAILY LOSS CEILING</span>
              <span className="text-sm font-bold text-rose-500">
                {riskSettings.dailyLossLimitPercent}% (${(riskSettings.accountBalance * riskSettings.dailyLossLimitPercent / 100).toFixed(2)})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">CONCURRENT LIMIT</span>
              <span className="text-sm font-bold text-cyan-400">
                {riskSettings.maxOpenTrades} trades max
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
