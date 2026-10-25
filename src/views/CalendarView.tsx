import React, { useEffect, useState } from 'react';
import { EconomicEvent } from '../types';
import { Calendar, AlertTriangle, Clock, Globe2, ShieldAlert } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [warning, setWarning] = useState<string>('');
  const [pauseTradingRecommended, setPauseTradingRecommended] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/economic-calendar')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.events) {
          setEvents(data.events);
          setWarning(data.warning || '');
          setPauseTradingRecommended(data.highImpactActive ?? true);
        }
      })
      .catch(() => {
        // Fallback
        setEvents([
          {
            id: 'cpi',
            title: 'US Consumer Price Index (CPI YoY)',
            country: 'United States',
            currency: 'USD',
            impact: 'HIGH',
            date: 'Today',
            time: '13:30 UTC',
            forecast: '2.4%',
            previous: '2.5%',
            pauseTradingRecommended: true,
          },
          {
            id: 'fomc',
            title: 'Federal Reserve Interest Rate Decision',
            country: 'United States',
            currency: 'USD',
            impact: 'HIGH',
            date: 'Tomorrow',
            time: '18:00 UTC',
            forecast: '4.75%',
            previous: '4.75%',
            pauseTradingRecommended: true,
          },
        ]);
      });
  }, []);

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Volatility Warning Banner */}
      {pauseTradingRecommended && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Macro Volatility Warning: Trading Pause Recommended
            </h3>
            <p className="leading-relaxed">
              {warning || 'High impact macroeconomic prints scheduled. Slippage and spread expansion are elevated around major news releases.'}
            </p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          High-Impact Economic Calendar & News Feed
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Monitored live by Methox Ai to prevent execution during spread expansion windows
        </p>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {events.map((ev) => (
            <div key={ev.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{ev.title}</span>
                  <span
                    className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                      ev.impact === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {ev.impact}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{ev.country}</span>
                  <span>·</span>
                  <span>{ev.date} at {ev.time}</span>
                  <span>·</span>
                  <span className="font-mono text-cyan-400">{ev.currency}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px]">FORECAST</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{ev.forecast}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">PREVIOUS</span>
                  <span className="text-slate-500">{ev.previous}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
