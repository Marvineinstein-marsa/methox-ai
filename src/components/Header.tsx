import React, { useState } from 'react';
import { ShieldAlert, Sun, Moon, Lock, Unlock, AlertTriangle, Power } from 'lucide-react';
import { RiskSettings, TradingMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  tradingMode: TradingMode;
  setTradingMode: (m: TradingMode) => void;
  riskSettings: RiskSettings;
  onActivateKillSwitch: () => void;
  onDeactivateKillSwitch: () => void;
  todayLossPercent: number;
  openPositionsCount: number;
  userEmail: string;
  is2FAEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  tradingMode,
  setTradingMode,
  riskSettings,
  onActivateKillSwitch,
  onDeactivateKillSwitch,
  todayLossPercent,
  openPositionsCount,
  userEmail,
  is2FAEnabled,
}) => {
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState(false);
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);

  const handleModeSwitch = (newMode: TradingMode) => {
    if (newMode === 'live') {
      setShowLiveConfirmModal(true);
    } else {
      setTradingMode('paper');
    }
  };

  const confirmLiveTrading = () => {
    setTradingMode('live');
    setShowLiveConfirmModal(false);
  };

  const lossCapacityUsed = Math.min(
    100,
    Math.max(0, (todayLossPercent / riskSettings.dailyLossLimitPercent) * 100)
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-6">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
            <span className="font-mono font-bold text-white text-base">M</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                Methox Ai
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800">
                PRO
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400">
              Quantitative Intelligence & Risk Guardian
            </p>
          </div>
        </div>

        {/* Center: Risk Status & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mode Segmented Switch */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleModeSwitch('paper')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                tradingMode === 'paper'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paper Mode
            </button>
            <button
              onClick={() => handleModeSwitch('live')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                tradingMode === 'live'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
              }`}
            >
              Live API
            </button>
          </div>

          {/* Daily Risk Capacity Bar (Hidden on tiny screens) */}
          <div className="hidden lg:flex flex-col gap-0.5 min-w-[130px]">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Risk Used: {lossCapacityUsed.toFixed(0)}%</span>
              <span>Limit: {riskSettings.dailyLossLimitPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  lossCapacityUsed > 75
                    ? 'bg-rose-500'
                    : lossCapacityUsed > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${lossCapacityUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Actions: Kill Switch, Theme, PWA */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Emergency Kill Switch */}
          {riskSettings.killSwitchActive ? (
            <button
              onClick={onDeactivateKillSwitch}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30 whitespace-nowrap"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Trading</span>
            </button>
          ) : (
            <button
              onClick={() => setShowKillSwitchModal(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60 transition-colors whitespace-nowrap"
              title="Close all positions & halt trading"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">KILL SWITCH</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Live Trading */}
      {showLiveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">Switch to Live Broker Trading?</h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to enable REAL capital execution through your connected exchange API.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <p>• Mandatory 1:2 Risk/Reward check will still be strictly enforced server-side.</p>
              <p>• Stop-losses are automatic and non-negotiable on all orders.</p>
              <p>• Initial size cap protection is enabled for your first 10 trades.</p>
              <p className="font-semibold text-rose-500 dark:text-rose-400">
                • Trading involves substantial risk of loss. Never trade with capital you cannot afford to lose.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLiveConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel (Keep Paper)
              </button>
              <button
                onClick={confirmLiveTrading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
              >
                I Understand, Enable Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Kill Switch */}
      {showKillSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-900 p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-rose-400">ENGAGE EMERGENCY KILL SWITCH?</h2>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              This action will IMMEDIATELY:
            </p>
            <ul className="mt-3 text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Market-close all <strong className="text-white">{openPositionsCount} open positions</strong></li>
              <li>Cancel all pending limit orders and algorithmic triggers</li>
              <li>Halt all automatic and manual trade execution</li>
              <li>Record a high-priority incident in the immutable audit log</li>
            </ul>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowKillSwitchModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onActivateKillSwitch();
                  setShowKillSwitchModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40"
              >
                CONFIRM KILL SWITCH
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
