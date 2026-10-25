import React, { useState } from 'react';
import { Candle, SymbolInfo, TechnicalIndicators, Timeframe } from '../types';
import { CandleChart } from '../components/CandleChart';
import { ArrowUpRight, ArrowDownRight, Activity, Sliders, RefreshCw, Zap } from 'lucide-react';

interface MarketViewProps {
  symbols: SymbolInfo[];
  selectedSymbol: SymbolInfo;
  onSelectSymbol: (symbol: SymbolInfo) => void;
  candles: Candle[];
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  indicators: TechnicalIndicators;
  theme: 'dark' | 'light';
  onGenerateSignal: () => void;
  onOpenTradeForm: () => void;
  isConnectingWs: boolean;
}

export const MarketView: React.FC<MarketViewProps> = ({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  candles,
  timeframe,
  setTimeframe,
  indicators,
  theme,
  onGenerateSignal,
  onOpenTradeForm,
  isConnectingWs,
}) => {
  const [showEma20, setShowEma20] = useState(true);
  const [showEma50, setShowEma50] = useState(true);
  const [showEma200, setShowEma200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showSR, setShowSR] = useState(true);

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

  const trendColor =
    indicators.trend.includes('BULLISH')
      ? 'text-emerald-500'
      : indicators.trend.includes('BEARISH')
      ? 'text-rose-500'
      : 'text-amber-500';

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto">
      {/* 1. Watchlist Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {symbols.map((sym) => {
          const isSelected = sym.symbol === selectedSymbol.symbol;
          const isPositive = sym.change24h >= 0;
          return (
            <button
              key={sym.symbol}
              onClick={() => onSelectSymbol(sym)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-200">{sym.baseAsset}</span>
                <span className={isPositive ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
                  {isPositive ? '+' : ''}
                  {sym.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                ${sym.price < 10 ? sym.price.toFixed(4) : sym.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Symbol Info Header & Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {selectedSymbol.displayName}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {selectedSymbol.symbol}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>High: ${selectedSymbol.high24h.toLocaleString()}</span>
              <span>·</span>
              <span>Low: ${selectedSymbol.low24h.toLocaleString()}</span>
              <span>·</span>
              <span>Vol: {selectedSymbol.volume24h.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe pill tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={onGenerateSignal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>AI Signal</span>
          </button>

          <button
            onClick={onOpenTradeForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:opacity-90 transition-all"
          >
            <span>Execute</span>
          </button>
        </div>
      </div>

      {/* 3. Indicator Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Sliders className="w-3 h-3" /> Overlays:
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showEma20}
              onChange={(e) => setShowEma20(e.target.checked)}
              className="rounded text-sky-500 focus:ring-0"
            />
            <span className="text-sky-500 dark:text-sky-400">EMA 20</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showEma50}
              onChange={(e) => setShowEma50(e.target.checked)}
              className="rounded text-yellow-500 focus:ring-0"
            />
            <span className="text-yellow-600 dark:text-yellow-400">EMA 50</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showEma200}
              onChange={(e) => setShowEma200(e.target.checked)}
              className="rounded text-pink-500 focus:ring-0"
            />
            <span className="text-pink-600 dark:text-pink-400">EMA 200</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showBollinger}
              onChange={(e) => setShowBollinger(e.target.checked)}
              className="rounded text-purple-500 focus:ring-0"
            />
            <span className="text-purple-600 dark:text-purple-400">Bollinger</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showSR}
              onChange={(e) => setShowSR(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span className="text-slate-700 dark:text-slate-300">Key S/R</span>
          </label>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          ATR(14): <span className="text-slate-900 dark:text-slate-200">${indicators.atr.toFixed(2)}</span>
        </div>
      </div>

      {/* 4. Candlestick Chart */}
      <CandleChart
        candles={candles}
        indicators={indicators}
        theme={theme}
        symbol={selectedSymbol.symbol}
        showEma20={showEma20}
        showEma50={showEma50}
        showEma200={showEma200}
        showBollinger={showBollinger}
        showSupportResistance={showSR}
      />

      {/* 5. Quantitative Technical HUD & Multi-Timeframe Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* RSI Box */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">RSI Momentum (14)</div>
          <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {indicators.rsi.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral Equilibrium'}
          </div>
        </div>

        {/* MACD Box */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">MACD Histogram</div>
          <div
            className={`text-lg font-mono font-bold mt-1 tabular-nums ${
              indicators.macd.histogram >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {indicators.macd.histogram >= 0 ? '+' : ''}
            {indicators.macd.histogram.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {indicators.macd.histogram >= 0 ? 'Bullish Acceleration' : 'Bearish Pressure'}
          </div>
        </div>

        {/* Structural Trend */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Macro Trend</div>
          <div className={`text-base font-bold mt-1 truncate ${trendColor}`}>
            {indicators.trend.replace('_', ' ')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Score: {indicators.trendScore > 0 ? '+' : ''}
            {indicators.trendScore} / 100
          </div>
        </div>

        {/* Multi-Timeframe Confirmation */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">MTF Alignment</div>
          <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
            {(['15m', '1h', '4h', '1D'] as const).map((tf) => {
              const bias = indicators.multiTimeframeAlignment[tf];
              const isBull = bias === 'BULLISH';
              return (
                <div
                  key={tf}
                  className={`py-1 rounded font-semibold ${
                    isBull
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  <div>{tf}</div>
                  <div className="text-[8px]">{isBull ? 'BUY' : 'SELL'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
