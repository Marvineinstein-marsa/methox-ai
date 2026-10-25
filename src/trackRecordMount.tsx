import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type K = { t: number; o: number; h: number; l: number; c: number };
type Sig = { id: string; sym: string; t: number; e: number; sl: number; tp: number; st: "OPEN" | "WIN" | "LOSS" | "EXPIRED"; x?: number; r?: number; at?: number };
type DB = { sigs: Sig[]; scan: Record<string, number> };

const SYMS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
const API = "https://data-api.binance.vision/api/v3";
const KEY = "methox-track-v1";
const HOUR = 3600000;
const FEE = 0.001; // 0.1% per side
const EXPIRE = 48; // candles before an unresolved signal is closed

const f = (n: number) => (n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n >= 1 ? n.toFixed(3) : n.toFixed(5));
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

const load = (): DB => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "");
    if (d && Array.isArray(d.sigs)) return { sigs: d.sigs, scan: d.scan || {} };
  } catch {}
  return { sigs: [], scan: {} };
};
const save = (d: DB) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ sigs: d.sigs.slice(0, 300), scan: d.scan }));
  } catch {}
};

async function klines(sym: string): Promise<K[]> {
  const r = await fetch(`${API}/klines?symbol=${sym}&interval=1h&limit=300`);
  if (!r.ok) throw new Error("Market data unavailable");
  return (await r.json()).map((k: any) => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
}
const lastClosed = (K: K[]) => (K[K.length - 1].t + HOUR > Date.now() ? K.length - 2 : K.length - 1);

const ema = (a: number[], n: number) => {
  const k = 2 / (n + 1), o = [a[0]];
  for (let i = 1; i < a.length; i++) o.push(a[i] * k + o[i - 1] * (1 - k));
  return o;
};

function analyze(K: K[]) {
  const c = K.map((x) => x.c);
  const e12 = ema(c, 12), e26 = ema(c, 26);
  const ml = e12.map((v, i) => v - e26[i]);
  const sg = ema(ml, 9);
  const h = ml.map((v, i) => v - sg[i]);
  const e9 = ema(c, 9), e21 = ema(c, 21);
  const rsi = [50], atr = [K[0].h - K[0].l];
  let ag = 0, al = 0, at = atr[0];
  for (let i = 1; i < K.length; i++) {
    const d = c[i] - c[i - 1], g = Math.max(d, 0), l = Math.max(-d, 0);
    if (i <= 14) { ag += g / 14; al += l / 14; } else { ag = (ag * 13 + g) / 14; al = (al * 13 + l) / 14; }
    rsi.push(i < 14 ? 50 : al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    const tr = Math.max(K[i].h - K[i].l, Math.abs(K[i].h - c[i - 1]), Math.abs(K[i].l - c[i - 1]));
    at = (at * 13 + tr) / 14;
    atr.push(at);
  }
  const score = (i: number) => {
    if (i < 35) return 0;
    let s = e9[i] > e21[i] ? 1 : -1;
    if (h[i] > 0 && h[i] > h[i - 1]) s++; else if (h[i] < 0 && h[i] < h[i - 1]) s--;
    if (rsi[i] < 30) s++; else if (rsi[i] > 70) s--;
    return s;
  };
  return { e9, e21, h, rsi, atr, score };
}

function fin(s: Sig, st: Sig["st"], x: number, at: number) {
  s.st = st; s.x = x; s.at = at;
  s.r = (x - s.e - FEE * (s.e + x)) / (s.e - s.sl);
}

async function cycle(db: DB): Promise<DB> {
  for (const sym of SYMS) {
    try {
      const K = await klines(sym);
      const n = lastClosed(K);
      const A = analyze(K);
      // 1) resolve open signals using candles after the signal
      for (const s of db.sigs) {
        if (s.sym !== sym || s.st !== "OPEN") continue;
        if (K[0].t > s.t + HOUR) { fin(s, "EXPIRED", K[n].c, K[n].t + HOUR); continue; }
        let cnt = 0;
        for (const k of K) {
          if (k.t <= s.t) continue;
          cnt++;
          if (k.l <= s.sl) { fin(s, "LOSS", s.sl, k.t + HOUR); break; }
          if (k.h >= s.tp) { fin(s, "WIN", s.tp, k.t + HOUR); break; }
          if (cnt >= EXPIRE) { fin(s, "EXPIRED", k.c, k.t + HOUR); break; }
        }
      }
      // 2) log a new BUY signal from candles that closed since the last scan (forward only)
      const last = db.scan[sym];
      if (last !== undefined && !db.sigs.some((s) => s.sym === sym && s.st === "OPEN")) {
        for (let i = 35; i <= n; i++) {
          if (K[i].t > last && A.score(i) >= 2) {
            const e = K[i].c, a = A.atr[i];
            db.sigs.unshift({ id: sym + "-" + K[i].t, sym, t: K[i].t, e, sl: e - 1.5 * a, tp: e + 3 * a, st: "OPEN" });
            break;
          }
        }
      }
      db.scan[sym] = K[n].t;
    } catch {}
  }
  return db;
}

function stats(S: Sig[]) {
  const d = S.filter((s) => s.st !== "OPEN");
  const w = d.filter((s) => (s.r ?? 0) > 0), l = d.filter((s) => (s.r ?? 0) <= 0);
  const gw = sum(w.map((s) => s.r ?? 0)), gl = -sum(l.map((s) => s.r ?? 0));
  const tot = sum(d.map((s) => s.r ?? 0));
  return { logged: S.length, open: S.length - d.length, done: d.length, winRate: d.length ? (w.length / d.length) * 100 : 0, profitFactor: gl ? gw / gl : gw ? Infinity : 0, totalR: tot, avgR: d.length ? tot / d.length : 0 };
}

async function context(sym: string) {
  const K = await klines(sym);
  const i = lastClosed(K), A = analyze(K), p = K[i].c, a = A.atr[i], s = A.score(i);
  return {
    symbol: sym, timeframe: "1h", price: p, score: s, signal: s >= 2 ? "BUY" : s <= -2 ? "SELL" : "HOLD",
    trend: A.e9[i] > A.e21[i] ? "up" : "down", macdHistogram: +A.h[i].toFixed(4), macdRising: A.h[i] > A.h[i - 1],
    rsi: +A.rsi[i].toFixed(1), atr: +a.toFixed(4), stopLoss: p - 1.5 * a, takeProfit: p + 3 * a, riskReward: "1:2",
  };
}

async function ask(mode: string, question: string, data: any) {
  const r = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, question, data }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Coach unavailable");
  return String(j.reply || "");
}

const C = { bg: "#0b1220", cd: "#111a2b", bd: "#1f2d44", tx: "#e6edf5", mu: "#8798ab", up: "#22c55e", dn: "#ef4444", ac: "#2dd4bf" };
const btn = (bg: string, color = "#04201c"): any => ({ background: bg, color, border: 0, borderRadius: 10, padding: "10px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" });
const card: any = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 12, marginBottom: 10 };

function Track() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"rec" | "coach">("rec");
  const [db, setDb] = useState<DB>(load);
  const [sym, setSym] = useState("BTCUSDT");
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    let stop = false;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const next = await cycle(load());
        save(next);
        if (!stop) setDb({ sigs: [...next.sigs], scan: next.scan });
      } catch {}
      running.current = false;
    };
    run();
    const id = setInterval(run, 60000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  const S = stats(db.sigs);

  const coach = async (mode: string) => {
    setBusy(true); setErr(""); setReply("");
    try {
      const data = mode === "review" ? { stats: S, recent: db.sigs.slice(0, 15).map((s) => ({ sym: s.sym, status: s.st, r: s.r })) } : await context(sym);
      setReply(await ask(mode, q, data));
    } catch (e: any) { setErr(e?.message || "Coach unavailable"); }
    setBusy(false);
  };

  const clear = () => {
    if (!confirm("Erase the whole signal track record?")) return;
    const e = { sigs: [], scan: {} };
    save(e); setDb(e);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Track record" style={{ ...btn(C.ac), position: "fixed", right: 12, bottom: "calc(84px + env(safe-area-inset-bottom, 0px))", zIndex: 9999, borderRadius: 999, boxShadow: "0 4px 14px rgba(0,0,0,.5)" }}>
        📊 Track{S.open ? ` · ${S.open} open` : ""}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: C.bg, color: C.tx, overflowY: "auto", fontFamily: "system-ui,sans-serif", padding: "calc(12px + env(safe-area-inset-top, 0px)) 12px calc(24px + env(safe-area-inset-bottom, 0px))" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <b style={{ fontSize: 18 }}>Methox Track &amp; Coach</b>
              <button onClick={() => setOpen(false)} style={btn(C.cd, C.tx)}>✕ Close</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setTab("rec")} style={btn(tab === "rec" ? C.ac : C.cd, tab === "rec" ? "#04201c" : C.tx)}>Track record</button>
              <button onClick={() => setTab("coach")} style={btn(tab === "coach" ? C.ac : C.cd, tab === "coach" ? "#04201c" : C.tx)}>AI Coach</button>
            </div>

            {tab === "rec" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {[
                    ["Signals logged", S.logged], ["Open now", S.open], ["Finished", S.done],
                    ["Win rate", S.done ? S.winRate.toFixed(0) + "%" : "–"],
                    ["Profit factor", S.done ? (S.profitFactor === Infinity ? "∞" : S.profitFactor.toFixed(2)) : "–"],
                    ["Total result", S.done ? S.totalR.toFixed(1) + " R" : "–"],
                  ].map(([a, b]) => (
                    <div key={String(a)} style={{ ...card, marginBottom: 0, padding: 9 }}>
                      <div style={{ color: C.mu, fontSize: 11 }}>{a}</div><b style={{ fontSize: 16 }}>{b}</b>
                    </div>
                  ))}
                </div>
                <div style={{ ...card, fontSize: 12, color: C.mu }}>
                  {S.done < 30 ? `Only ${S.done} finished signals. You need 30 or more before these numbers mean anything.` : "Enough results to judge. Compare the profit factor with 1.3 or more as a minimum."}
                  <br />Rules: 1h candles, BUY only, stop-loss 1.5×ATR, take-profit 3×ATR, 0.1% fee each side. A signal is logged once, when its candle closes, and is never changed afterwards. It records while this page is open, and catches up on candles closed since your last visit.
                </div>
                <div style={card}>
                  <b>Signals</b>
                  {db.sigs.length === 0 && <div style={{ color: C.mu, fontSize: 13, marginTop: 6 }}>Nothing yet. Keep the app open and the first BUY will appear when its candle closes.</div>}
                  {db.sigs.slice(0, 40).map((s) => (
                    <div key={s.id} style={{ borderBottom: `1px solid ${C.bd}`, padding: "8px 0", fontSize: 13 }}>
                      <b>{s.sym}</b> BUY · entry {f(s.e)} · SL {f(s.sl)} · TP {f(s.tp)}<br />
                      <span style={{ color: s.st === "WIN" ? C.up : s.st === "LOSS" ? C.dn : C.mu, fontWeight: 700 }}>{s.st}</span>
                      {s.r !== undefined && <span style={{ color: s.r >= 0 ? C.up : C.dn }}> {s.r >= 0 ? "+" : ""}{s.r.toFixed(2)} R</span>}
                      <span style={{ color: C.mu, fontSize: 11 }}> · {new Date(s.t + HOUR).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
                <button onClick={clear} style={btn(C.cd, C.dn)}>Clear record</button>
              </>
            )}

            {tab === "coach" && (
              <>
                <div style={card}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={sym} onChange={(e) => setSym(e.target.value)} style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 9, flex: 1 }}>
                      {SYMS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Optional question, e.g. Why not buy now?" style={{ width: "100%", background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 14 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button disabled={busy} onClick={() => coach("signal")} style={btn(C.ac)}>Explain signal</button>
                    <button disabled={busy} onClick={() => coach("review")} style={btn(C.cd, C.tx)}>Review my record</button>
                  </div>
                </div>
                {busy && <div style={{ color: C.mu }}>Thinking…</div>}
                {err && <div style={{ ...card, color: C.dn }}>{err}</div>}
                {reply && <div style={{ ...card, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 14 }}>{reply}</div>}
                <div style={{ color: C.mu, fontSize: 11 }}>The coach explains rules and risk. It cannot predict the market and this is not financial advice.</div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const el = document.createElement("div");
el.id = "methox-track-root";
document.body.appendChild(el);
createRoot(el).render(<Track />);
