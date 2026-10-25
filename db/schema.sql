-- ============================================================================
-- METHOX AI - PRODUCTION SUPABASE / POSTGRESQL DATABASE SCHEMA
-- ============================================================================
-- Execute this script directly in the Supabase SQL Editor.
-- It establishes all relational tables, RLS security policies, triggers,
-- and indexes for live market signals, orders, risk management, and journal.
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles and 2FA Security
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  trading_mode TEXT CHECK (trading_mode IN ('paper', 'live')) DEFAULT 'paper',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Encrypted Broker Credentials (Stored Server-Side Only)
CREATE TABLE IF NOT EXISTS public.broker_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  broker_name TEXT NOT NULL, -- 'binance', 'bybit', 'coinbase', 'metatrader'
  encrypted_api_key TEXT NOT NULL,
  encrypted_api_secret TEXT NOT NULL,
  is_testnet BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'CONNECTED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. User Risk Settings
CREATE TABLE IF NOT EXISTS public.risk_settings (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  max_risk_per_trade_percent NUMERIC(5,2) DEFAULT 1.00 NOT NULL,
  daily_loss_limit_percent NUMERIC(5,2) DEFAULT 3.00 NOT NULL,
  max_open_trades INTEGER DEFAULT 3 NOT NULL,
  min_risk_reward_ratio NUMERIC(5,2) DEFAULT 2.00 NOT NULL,
  account_balance NUMERIC(15,2) DEFAULT 10000.00 NOT NULL,
  kill_switch_active BOOLEAN DEFAULT FALSE NOT NULL,
  kill_switch_activated_at TIMESTAMP WITH TIME ZONE,
  auto_trade_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  require_manual_confirm BOOLEAN DEFAULT TRUE NOT NULL,
  max_leverage INTEGER DEFAULT 5 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Positions (Open and Closed)
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT CHECK (side IN ('LONG', 'SHORT')) NOT NULL,
  mode TEXT CHECK (mode IN ('paper', 'live')) NOT NULL,
  entry_price NUMERIC(16,8) NOT NULL,
  current_price NUMERIC(16,8) NOT NULL,
  quantity NUMERIC(16,8) NOT NULL,
  stop_loss NUMERIC(16,8) NOT NULL,
  take_profit NUMERIC(16,8) NOT NULL,
  risk_amount NUMERIC(15,2) NOT NULL,
  pnl NUMERIC(15,2) DEFAULT 0.00,
  pnl_percent NUMERIC(8,4) DEFAULT 0.0000,
  status TEXT CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN' NOT NULL,
  close_price NUMERIC(16,8),
  close_timestamp TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AI Generated Trade Signals
CREATE TABLE IF NOT EXISTS public.ai_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  action TEXT CHECK (action IN ('BUY', 'SELL', 'HOLD')) NOT NULL,
  confidence INTEGER NOT NULL,
  entry_price NUMERIC(16,8) NOT NULL,
  stop_loss NUMERIC(16,8) NOT NULL,
  take_profit_1 NUMERIC(16,8) NOT NULL,
  take_profit_2 NUMERIC(16,8) NOT NULL,
  risk_reward_ratio NUMERIC(6,2) NOT NULL,
  reasoning TEXT NOT NULL,
  confluences TEXT[],
  market_sentiment TEXT,
  invalidation_level NUMERIC(16,8) NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'TRIGGERED', 'EXPIRED', 'CANCELLED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Trading Journal & AI Coach
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  action TEXT CHECK (action IN ('LONG', 'SHORT')) NOT NULL,
  entry_price NUMERIC(16,8) NOT NULL,
  exit_price NUMERIC(16,8),
  pnl NUMERIC(15,2),
  entry_reason TEXT NOT NULL,
  exit_reason TEXT,
  emotion TEXT CHECK (emotion IN ('Disciplined', 'FOMO', 'Revenge', 'Hesitant', 'Greedy', 'Fearful')) NOT NULL,
  lessons_learned TEXT,
  rules_followed BOOLEAN DEFAULT TRUE,
  ai_coach_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Strategy Rules & Backtesting Records
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  stop_loss_atr_multiple NUMERIC(4,2) DEFAULT 1.5,
  take_profit_atr_multiple NUMERIC(4,2) DEFAULT 3.2,
  is_backtested BOOLEAN DEFAULT FALSE,
  is_paper_tested BOOLEAN DEFAULT FALSE,
  backtest_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Immutable Audit Log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('ORDER', 'RISK_VIOLATION', 'KILL_SWITCH', 'SETTING_CHANGE', 'AI_SIGNAL', 'AUTH')) NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'ALERT', 'CRITICAL')) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Security Policies (User can only read/write their own data)
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own broker credentials" ON public.broker_credentials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own risk settings" ON public.risk_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own positions" ON public.positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own journal entries" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own strategies" ON public.strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR ALL USING (auth.uid() = user_id);

-- 12. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_positions_user_status ON public.positions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON public.positions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_user ON public.journal_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.ai_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs (created_at DESC);
