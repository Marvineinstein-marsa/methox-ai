import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
  LineStyle,
} from 'lightweight-charts';
import { Candle, TechnicalIndicators } from '../types';
import { calculateBollingerBands, calculateEMA } from '../lib/indicators';

interface CandleChartProps {
  candles: Candle[];
  indicators?: TechnicalIndicators;
  theme: 'dark' | 'light';
  symbol: string;
  showEma20?: boolean;
  showEma50?: boolean;
  showEma200?: boolean;
  showBollinger?: boolean;
  showSupportResistance?: boolean;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  theme,
  symbol,
  showEma20 = true,
  showEma50 = true,
  showEma200 = false,
  showBollinger = false,
  showSupportResistance = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0b111e' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 420,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor, style: LineStyle.Dotted },
        horzLines: { color: gridColor, style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: {
          color: isDark ? '#475569' : '#cbd5e1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e293b' : '#334155',
        },
        horzLine: {
          color: isDark ? '#475569' : '#cbd5e1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e293b' : '#334155',
        },
      },
      timeScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        autoScale: true,
      },
    });

    chartRef.current = chart;

    // 2. Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // 3. Add Volume Series (Histogram at bottom 18% of chart)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    // Feed initial data
    if (candles && candles.length > 0) {
      const sorted = [...candles].sort((a, b) => a.time - b.time);
      candleSeries.setData(
        sorted.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeries.setData(
        sorted.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
        }))
      );

      const closes = sorted.map((c) => c.close);

      // EMA 20
      if (showEma20) {
        const ema20 = calculateEMA(closes, 20);
        const ema20Series = chart.addSeries(LineSeries, {
          color: '#38bdf8', // sky-400
          lineWidth: 2,
          title: 'EMA 20',
        });
        ema20Series.setData(
          sorted.map((c, i) => ({
            time: c.time as UTCTimestamp,
            value: ema20[i],
          }))
        );
      }

      // EMA 50
      if (showEma50) {
        const ema50 = calculateEMA(closes, 50);
        const ema50Series = chart.addSeries(LineSeries, {
          color: '#eab308', // yellow-500
          lineWidth: 2,
          title: 'EMA 50',
        });
        ema50Series.setData(
          sorted.map((c, i) => ({
            time: c.time as UTCTimestamp,
            value: ema50[i],
          }))
        );
      }

      // EMA 200
      if (showEma200) {
        const ema200 = calculateEMA(closes, 200);
        const ema200Series = chart.addSeries(LineSeries, {
          color: '#ec4899', // pink-500
          lineWidth: 2,
          title: 'EMA 200',
        });
        ema200Series.setData(
          sorted.map((c, i) => ({
            time: c.time as UTCTimestamp,
            value: ema200[i],
          }))
        );
      }

      // Bollinger Bands (20, 2)
      if (showBollinger) {
        const bb = calculateBollingerBands(closes, 20, 2);
        const bbUpperSeries = chart.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          title: 'BB Upper',
        });
        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          title: 'BB Lower',
        });

        bbUpperSeries.setData(
          sorted.map((c, i) => ({
            time: c.time as UTCTimestamp,
            value: bb.upper[i],
          }))
        );
        bbLowerSeries.setData(
          sorted.map((c, i) => ({
            time: c.time as UTCTimestamp,
            value: bb.lower[i],
          }))
        );
      }

      // Support & Resistance horizontal levels
      if (showSupportResistance && indicators) {
        indicators.supportLevels.slice(0, 2).forEach((sup, idx) => {
          candleSeries.createPriceLine({
            price: sup,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Support ${idx + 1}`,
          });
        });

        indicators.resistanceLevels.slice(0, 2).forEach((res, idx) => {
          candleSeries.createPriceLine({
            price: res,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Resistance ${idx + 1}`,
          });
        });
      }

      chart.timeScale().fitContent();
    }

    // 4. Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 420,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [
    candles,
    indicators,
    theme,
    symbol,
    showEma20,
    showEma50,
    showEma200,
    showBollinger,
    showSupportResistance,
  ]);

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-inner">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
