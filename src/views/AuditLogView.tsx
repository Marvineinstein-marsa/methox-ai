import React from 'react';
import { AuditLogItem } from '../types';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, Terminal } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLogItem[];
  onClearLogs?: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-500" />
              Immutable Audit & Risk Compliance Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks all executions, risk limits enforcement, and system state transitions
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 font-semibold">
            {logs.length} Events
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No audit log entries recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const isCrit = log.severity === 'CRITICAL';
              const isAlert = log.severity === 'ALERT';
              const isWarn = log.severity === 'WARNING';

              const severityBadge = isCrit
                ? 'bg-rose-600 text-white'
                : isAlert
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : isWarn
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500';

              return (
                <div key={log.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${severityBadge}`}>
                        {log.severity}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        [{log.category}]
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200">{log.message}</p>

                  {log.details && (
                    <pre className="text-[10px] p-2 rounded bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
