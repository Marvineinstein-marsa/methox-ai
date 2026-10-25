import React from 'react';
import {
  TrendingUp,
  Zap,
  Layers,
  PieChart,
  BookOpen,
  Settings,
  PlayCircle,
  Calendar,
  FileText,
} from 'lucide-react';

export type ActiveTab =
  | 'market'
  | 'signals'
  | 'trades'
  | 'tracker'
  | 'journal'
  | 'settings'
  | 'backtester'
  | 'calendar'
  | 'audit';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openPositionsCount: number;
  activeSignalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  openPositionsCount,
  activeSignalsCount,
}) => {
  const tabs = [
    { id: 'market' as const, label: 'Market', icon: TrendingUp },
    {
      id: 'signals' as const,
      label: 'Signals',
      icon: Zap,
      badge: activeSignalsCount > 0 ? activeSignalsCount : undefined,
    },
    {
      id: 'trades' as const,
      label: 'Trades',
      icon: Layers,
      badge: openPositionsCount > 0 ? openPositionsCount : undefined,
    },
    { id: 'tracker' as const, label: 'Tracker', icon: PieChart },
    { id: 'journal' as const, label: 'Journal', icon: BookOpen },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-6 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full min-w-[44px] min-h-[44px] transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-mono font-bold bg-emerald-500 text-white flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
