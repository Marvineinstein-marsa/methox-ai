import { AuditLogItem, Position, RiskSettings, StrategyRule, TradingMode } from '../types';
import { calculateRiskReward } from './indicators';

export interface OrderPreflightCheck {
  valid: boolean;
  violations: string[];
  calculatedRiskAmount: number;
  calculatedRiskPercent: number;
  riskRewardRatio: number;
  requiresKillSwitchReset: boolean;
}

/**
 * Validates an intended order against all institutional safety and risk rules.
 */
export function validateOrder(
  params: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    mode: TradingMode;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    quantity: number;
    strategy?: StrategyRule;
  },
  settings: RiskSettings,
  openPositions: Position[],
  todayRealizedPnL: number
): OrderPreflightCheck {
  const violations: string[] = [];

  // 1. Mandatory Kill Switch Check
  if (settings.killSwitchActive) {
    violations.push('KILL SWITCH IS ACTIVE: Emergency circuit breaker engaged. All trading halted.');
    return {
      valid: false,
      violations,
      calculatedRiskAmount: 0,
      calculatedRiskPercent: 0,
      riskRewardRatio: 0,
      requiresKillSwitchReset: true,
    };
  }

  // 2. Mandatory Stop-Loss Validation
  if (!params.stopLoss || params.stopLoss <= 0) {
    violations.push('AUTOMATIC STOP-LOSS ENFORCED: Every order must specify a strictly positive stop-loss level.');
  }

  if (params.side === 'LONG' && params.stopLoss >= params.entryPrice) {
    violations.push('INVALID LONG STOP-LOSS: Long stop-loss must be strictly below entry price.');
  }

  if (params.side === 'SHORT' && params.stopLoss <= params.entryPrice) {
    violations.push('INVALID SHORT STOP-LOSS: Short stop-loss must be strictly above entry price.');
  }

  // 3. Mandatory Take-Profit & 1:2 Risk-Reward Rule
  if (!params.takeProfit || params.takeProfit <= 0) {
    violations.push('TAKE PROFIT REQUIRED: Take-profit target must be specified to verify risk-reward compliance.');
  }

  const rr = calculateRiskReward(params.entryPrice, params.stopLoss, params.takeProfit);
  if (rr < settings.minRiskRewardRatio) {
    violations.push(
      `RISK/REWARD REJECTED: Trade R:R is 1:${rr.toFixed(2)}, which is below the mandatory minimum of 1:${settings.minRiskRewardRatio.toFixed(1)}.`
    );
  }

  // 4. Max Risk per trade calculation
  const riskAmount = Math.abs(params.entryPrice - params.stopLoss) * params.quantity;
  const riskPercent = (riskAmount / settings.accountBalance) * 100;

  if (riskPercent > settings.maxRiskPerTradePercent * 1.05) {
    // 5% margin tolerance for rounding
    violations.push(
      `EXCESSIVE RISK: Trade risk is ${riskPercent.toFixed(2)}% of account equity ($${riskAmount.toFixed(2)}), exceeding the max risk limit of ${settings.maxRiskPerTradePercent}%.`
    );
  }

  // 5. Daily Loss Limit Check
  const maxDailyLossAmount = (settings.accountBalance * settings.dailyLossLimitPercent) / 100;
  if (todayRealizedPnL <= -maxDailyLossAmount) {
    violations.push(
      `DAILY LOSS LIMIT BREACHED: Daily realized loss is -$${Math.abs(todayRealizedPnL).toFixed(2)} (>= ${settings.dailyLossLimitPercent}% limit). Trading is locked until the next session.`
    );
  }

  // 6. Max Open Positions Check
  const activeCount = openPositions.filter((p) => p.status === 'OPEN').length;
  if (activeCount >= settings.maxOpenTrades) {
    violations.push(
      `MAX OPEN TRADES REACHED: You currently have ${activeCount} active positions (Max allowed: ${settings.maxOpenTrades}). Close an existing position before entering a new one.`
    );
  }

  // 7. Strategy Qualification Check (Live Mode constraint)
  if (params.mode === 'live' && params.strategy) {
    if (!params.strategy.isBacktested) {
      violations.push('STRATEGY NOT BACKTESTED: Live trading is restricted for unverified strategies. Please run historical backtesting first.');
    }
    if (!params.strategy.isPaperTested) {
      violations.push('STRATEGY NOT PAPER-TESTED: Strategy must be vetted in paper trading mode before live execution.');
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    calculatedRiskAmount: Number(riskAmount.toFixed(2)),
    calculatedRiskPercent: Number(riskPercent.toFixed(2)),
    riskRewardRatio: rr,
    requiresKillSwitchReset: false,
  };
}

/**
 * Creates an immutable audit log entry
 */
export function createAuditLog(
  category: AuditLogItem['category'],
  message: string,
  severity: AuditLogItem['severity'],
  details?: Record<string, unknown>
): AuditLogItem {
  return {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    category,
    message,
    severity,
    details,
  };
}
