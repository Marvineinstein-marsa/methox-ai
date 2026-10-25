import React, { useState } from 'react';
import { JournalEntry, Position } from '../types';
import { BookOpen, Sparkles, Brain, CheckCircle, AlertTriangle, MessageSquareQuote } from 'lucide-react';

interface JournalViewProps {
  journalEntries: JournalEntry[];
  positions: Position[];
  onAddJournalEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => void;
  aiCoachFeedback: string | null;
  onRunCoachReview: () => void;
  isLoadingCoach: boolean;
}

export const JournalView: React.FC<JournalViewProps> = ({
  journalEntries,
  positions,
  onAddJournalEntry,
  aiCoachFeedback,
  onRunCoachReview,
  isLoadingCoach,
}) => {
  const [symbol, setSymbol] = useState(positions[0]?.symbol || 'BTCUSDT');
  const [action, setAction] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState(positions[0]?.entryPrice || 94250);
  const [exitPrice, setExitPrice] = useState(positions[0]?.closePrice || 95500);
  const [pnl, setPnl] = useState(125.0);
  const [entryReason, setEntryReason] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [emotion, setEmotion] = useState<JournalEntry['emotion']>('Disciplined');
  const [rulesFollowed, setRulesFollowed] = useState(true);
  const [lessonsLearned, setLessonsLearned] = useState('');

  const emotionsList: JournalEntry['emotion'][] = [
    'Disciplined',
    'FOMO',
    'Revenge',
    'Hesitant',
    'Greedy',
    'Fearful',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryReason.trim()) return;

    onAddJournalEntry({
      symbol,
      action,
      entryPrice,
      exitPrice,
      pnl,
      entryReason,
      exitReason,
      emotion,
      rulesFollowed,
      lessonsLearned,
    });

    setEntryReason('');
    setExitReason('');
    setLessonsLearned('');
  };

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Header & AI Coach Request */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            Trading Journal & AI Mindset Coach
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Document psychological factors and let Gemini identify recurring trading flaws
          </p>
        </div>

        <button
          onClick={onRunCoachReview}
          disabled={isLoadingCoach}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-all"
        >
          <Brain className={`w-4 h-4 ${isLoadingCoach ? 'animate-pulse' : ''}`} />
          <span>{isLoadingCoach ? 'Analyzing Patterns...' : 'Analyze My Mindset'}</span>
        </button>
      </div>

      {/* AI Coach Insights Box */}
      {aiCoachFeedback && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Coach Behavioral Diagnosis
          </div>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {aiCoachFeedback}
          </p>
        </div>
      )}

      {/* New Journal Entry Form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Log New Trade Introspection
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">Asset Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">Direction</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as 'LONG' | 'SHORT')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">Entry Price ($)</label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">Realized PnL ($)</label>
            <input
              type="number"
              step="any"
              value={pnl}
              onChange={(e) => setPnl(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
            />
          </div>
        </div>

        {/* Emotion Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Dominant Emotional State During Execution
          </label>
          <div className="flex flex-wrap gap-2">
            {emotionsList.map((em) => (
              <button
                type="button"
                key={em}
                onClick={() => setEmotion(em)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  emotion === em
                    ? em === 'Disciplined'
                      ? 'bg-emerald-600 text-white'
                      : em === 'FOMO' || em === 'Revenge'
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Reasoning and Lessons textareas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">
              Why did you enter? (Setup, trigger, catalyst)
            </label>
            <textarea
              rows={2}
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              placeholder="e.g. 15m bullish order block test with RSI oversold recovery..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1">
              Lessons Learned / Invalidation observation
            </label>
            <textarea
              rows={2}
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="e.g. Honored the stop-loss quickly without second-guessing..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={rulesFollowed}
              onChange={(e) => setRulesFollowed(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>I followed my trading plan without deviations</span>
          </label>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-all"
          >
            Save Journal Entry
          </button>
        </div>
      </form>

      {/* Entries Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Logged Introspections ({journalEntries.length})
        </h3>

        {journalEntries.map((entry) => {
          const isProfit = (entry.pnl || 0) >= 0;
          return (
            <div
              key={entry.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {entry.symbol}
                  </span>
                  <span className="font-semibold text-slate-500">{entry.action}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      entry.emotion === 'Disciplined'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : entry.emotion === 'FOMO' || entry.emotion === 'Revenge'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {entry.emotion}
                  </span>
                </div>

                <div
                  className={`font-mono font-bold tabular-nums ${
                    isProfit ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {isProfit ? '+' : ''}${entry.pnl?.toFixed(2) || '0.00'}
                </div>
              </div>

              <div className="text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-slate-100">Thesis:</strong> {entry.entryReason}
              </div>

              {entry.lessonsLearned && (
                <div className="text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">Key takeaway:</strong> {entry.lessonsLearned}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
