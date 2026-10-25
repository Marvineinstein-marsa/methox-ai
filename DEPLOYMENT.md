# Methox Ai - Deployment & Architecture Guide

Methox Ai is a production-grade AI trading assistant and risk guardian platform engineered with a mobile-first PWA frontend, live TradingView candlestick charts, real-time WebSocket market streams, quantitative indicator calculus, server-side Gemini AI trade reasoning, an automated stop-loss risk engine, a 1-click emergency Kill Switch, backtesting, and a psychological trading journal coach.

---

## 1. Directory Structure

```
├── .env.example              # Full list of runtime environment variables
├── index.html                # PWA entry point with meta tags & Google Fonts
├── metadata.json             # Applet capabilities & metadata
├── package.json              # Full-stack dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite & VitePWA configuration
├── server.ts                 # Full-stack Express API backend + Vite middleware
│
├── public/
│   ├── icon.svg              # Brand SVG monogram
│   └── manifest.webmanifest  # Installable PWA manifest
│
├── db/
│   └── schema.sql            # Complete Supabase / PostgreSQL relational schema
│
└── src/
    ├── main.tsx              # React DOM entry
    ├── App.tsx               # Main application coordinator & real-time state
    ├── index.css             # Tailwind v4 styles, scrollbars, safe-area utilities
    │
    ├── types/
    │   └── index.ts          # Core types: Candle, Indicators, Signal, Position, Risk
    │
    ├── lib/
    │   ├── indicators.ts     # SMA, EMA, RSI, MACD, Bollinger Bands, ATR, S/R, Sizing
    │   ├── marketData.ts     # Binance WebSocket & REST kline feeds + multi-asset fallback
    │   ├── signalEngine.ts   # AI signal generator & confluence matrix
    │   ├── riskEngine.ts     # Pre-flight order validator, 1:2 R:R enforcer, Kill Switch
    │   └── backtester.ts     # Historical strategy backtest simulator & preset rules
    │
    ├── components/
    │   ├── Header.tsx        # Brand, mode toggle, Kill Switch, risk capacity meter
    │   ├── CandleChart.tsx   # TradingView lightweight-charts with EMA & S/R overlays
    │   ├── BottomNav.tsx     # Mobile thumb-zone bottom navigation bar
    │   └── PWAInstallButton.tsx # In-app PWA install trigger & iOS Safari guide
    │
    └── views/
        ├── MarketView.tsx    # Live watchlist, candlestick chart, indicators HUD, MTF
        ├── SignalsView.tsx   # AI trade signals feed, confidence scores, 1-click execute
        ├── TradesView.tsx    # Positions ledger, automated SL order form, sizing tool
        ├── TrackerView.tsx   # Cumulative equity curve, win rate, CSV export, print
        ├── JournalView.tsx   # Psychological journal with emotions & AI coach review
        ├── BacktestView.tsx  # Historical strategy testing & live certification
        ├── CalendarView.tsx  # Economic calendar with volatility blackout alerts
        ├── AuditLogView.tsx  # Immutable audit and compliance incident ledger
        └── SettingsView.tsx  # Risk settings, AES-256 broker API keys, 2FA toggle
```

---

## 2. Database Setup (Supabase / PostgreSQL)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in the Supabase Dashboard.
3. Open `/db/schema.sql` from this codebase, paste its contents into the SQL Editor, and click **Run**.
4. This script sets up:
   - `profiles` table with 2FA TOTP support.
   - `broker_credentials` table with AES-256 encryption fields.
   - `risk_settings` table for limits (max risk %, daily loss %, min 1:2 R:R, Kill Switch).
   - `positions` & `ai_signals` tables.
   - `journal_entries` & `strategies` tables.
   - `audit_logs` table for compliance.
   - Full Row Level Security (RLS) policies and performance indexes.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` and populate your secrets:

```bash
# Gemini AI API Key (Injected automatically in AI Studio)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Credentials
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
DATABASE_URL="postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres"

# AES-256 Encryption secret for broker keys stored in database
API_ENCRYPTION_SECRET="32-byte-hex-string"

# Optional Exchange Keys (can also be entered securely via the Settings UI)
BINANCE_API_KEY=""
BINANCE_API_SECRET=""
```

---

## 4. Deploying to Production

### Deploying to Render / Railway (Full-Stack Backend + Frontend)
1. Push your repository to GitHub.
2. In Render, create a new **Web Service** connected to your repo.
3. Set the build command:
   ```bash
   npm install && npm run build
   ```
4. Set the start command:
   ```bash
   npm start
   ```
5. Add your environment variables in the Render Environment tab.

### Deploying to Vercel (Frontend)
1. Import repository in Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variables.

---

## 5. Risk Safeguards Overview

- **Automatic Stop-Loss:** Every single order requires an explicit stop-loss. No naked orders are permitted.
- **1:2 Minimum Risk/Reward:** Orders below a 1:2 R:R are automatically rejected before submission.
- **Daily Loss Ceiling:** If realized losses hit the daily threshold (default 3%), new executions are locked.
- **Max Open Trades:** Limits simultaneous exposure across positions.
- **Emergency Kill Switch:** A prominent master switch that market-closes all active positions, cancels pending triggers, and freezes trading until manually unlocked.
- **Strategy Certification:** Live trading is restricted for any strategy until it has been backtested and paper-tested.
