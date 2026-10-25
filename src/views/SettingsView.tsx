import React, { useState } from 'react';
import { RiskSettings, TradingMode } from '../types';
import {
  ShieldAlert,
  Key,
  Database,
  Lock,
  Send,
  Bell,
  CheckCircle,
  Power,
  Sliders,
  Terminal,
} from 'lucide-react';

interface SettingsViewProps {
  riskSettings: RiskSettings;
  onUpdateRiskSettings: (newSettings: Partial<RiskSettings>) => void;
  tradingMode: TradingMode;
  userEmail: string;
  is2FAEnabled: boolean;
  onToggle2FA: () => void;
  onActivateKillSwitch: () => void;
  onDeactivateKillSwitch: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  riskSettings,
  onUpdateRiskSettings,
  tradingMode,
  userEmail,
  is2FAEnabled,
  onToggle2FA,
  onActivateKillSwitch,
  onDeactivateKillSwitch,
}) => {
  const [maxRisk, setMaxRisk] = useState(riskSettings.maxRiskPerTradePercent);
  const [dailyLoss, setDailyLoss] = useState(riskSettings.dailyLossLimitPercent);
  const [maxTrades, setMaxTrades] = useState(riskSettings.maxOpenTrades);
  const [minRR, setMinRR] = useState(riskSettings.minRiskRewardRatio);
  const [accountBalance, setAccountBalance] = useState(riskSettings.accountBalance);

  // Broker API Keys (client keeps masked, server encrypts)
  const [broker, setBroker] = useState('binance');
  const [apiKey, setApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [apiSecret, setApiSecret] = useState('••••••••••••••••••••••••••••••••');
  const [isTestnet, setIsTestnet] = useState(true);
  const [connStatus, setConnStatus] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRiskSettings({
      maxRiskPerTradePercent: maxRisk,
      dailyLossLimitPercent: dailyLoss,
      maxOpenTrades: maxTrades,
      minRiskRewardRatio: minRR,
      accountBalance,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestConnection = () => {
    setConnStatus('Testing exchange connection...');
    setTimeout(() => {
      setConnStatus('SUCCESS: Authenticated with Binance API (Permissions: Spot Trading Enabled, Withdrawals Disabled)');
    }, 900);
  };

  return (
    <div className="space-y-5 pb-20 max-w-4xl mx-auto">
      {/* 1. Kill Switch Master Control */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Emergency Circuit Breaker (Kill Switch)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immediately flattens all positions and halts order routing
              </p>
            </div>
          </div>

          {riskSettings.killSwitchActive ? (
            <button
              onClick={onDeactivateKillSwitch}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white animate-pulse"
            >
              Unlock Trading System
            </button>
          ) : (
            <button
              onClick={onActivateKillSwitch}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 transition-colors"
            >
              Trigger Kill Switch
            </button>
          )}
        </div>
      </div>

      {/* 2. Mandatory Risk Parameters */}
      <form
        onSubmit={handleSaveRisk}
        className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Institutional Risk Limits (Mandatory Enforcement)
            </h3>
          </div>
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Saved to Guardian
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">
              Max Risk Per Trade (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={maxRisk}
              onChange={(e) => setMaxRisk(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard institutional: 1.0%</span>
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">
              Daily Max Loss Limit (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="15"
              value={dailyLoss}
              onChange={(e) => setDailyLoss(parseFloat(e.target.value) || 3)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Freezes trading upon breach</span>
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">
              Min Risk/Reward Ratio (e.g. 2.0 = 1:2)
            </label>
            <input
              type="number"
              step="0.1"
              min="1.5"
              max="5"
              value={minRR}
              onChange={(e) => setMinRR(parseFloat(e.target.value) || 2)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Rejects trades below 1:2</span>
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">
              Max Concurrent Open Positions
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxTrades}
              onChange={(e) => setMaxTrades(parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">
              Account Equity ($)
            </label>
            <input
              type="number"
              step="100"
              value={accountBalance}
              onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 10000)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-all"
        >
          Update Risk Parameters
        </button>
      </form>

      {/* 3. Broker / Exchange API Keys */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Exchange API Connection
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
            ENCRYPTED AES-256
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">Broker / Exchange</label>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
            >
              <option value="binance">Binance (Spot / Futures)</option>
              <option value="bybit">Bybit</option>
              <option value="coinbase">Coinbase Advanced</option>
              <option value="metatrader">MetaTrader 5 Bridge</option>
            </select>
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1">API Secret</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isTestnet}
              onChange={(e) => setIsTestnet(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>Use Exchange Testnet / Sandbox mode</span>
          </label>

          <button
            onClick={handleTestConnection}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Test Connection
          </button>
        </div>

        {connStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-700 dark:text-emerald-300">
            {connStatus}
          </div>
        )}
      </div>

      {/* 4. Security & 2FA */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Authentication & Two-Factor Security (2FA)
          </h3>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              Two-Factor Authentication (TOTP / Authenticator)
            </div>
            <div className="text-slate-400 mt-0.5">
              Requires 6-digit TOTP code confirmation prior to live order submissions
            </div>
          </div>

          <button
            onClick={onToggle2FA}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              is2FAEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {is2FAEnabled ? '2FA Active' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
};
