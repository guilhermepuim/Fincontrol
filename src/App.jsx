import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";

/* ══ PRUMO BRANDBOOK — AZUL ══ */
var BL = "#1A3A5C";
var BD = "#0F2540";
var BG = "#E8F0FA";
var TX = "#0F2540";
var T2 = "#1A3A5C";
var T3 = "#2A5A8C";
var TM = "#6A90B8";
var BR = "#D8E8F4";
var OK = "#2D7A3E";
var ER = "#C0392B";
var WN = "#9A7420";
var TEAL = "#1B5FAA";
var AMB = "#9A7420";
var PETR = "#003F5D";
var CARD = "#FDFAF5";
var BGMAIN = "#F5F0E8";

var DS = 14000;
var DP = { essenciais: 50, investimentos: 25, desejos: 25 };
var GR = [
  { id: "essenciais", label: "Essenciais", color: "#1B5FAA" },
  { id: "investimentos", label: "Investimentos", color: "#1A3A5C" },
  { id: "desejos", label: "Não Essenciais", color: "#9A7420" },
];
var DC = [
  { id: "moradia", name: "Moradia", icon: "🏠", group: "essenciais" },
  { id: "alimentacao", name: "Alimentação", icon: "🛒", group: "essenciais" },
  { id: "transporte", name: "Transporte", icon: "🚗", group: "essenciais" },
  { id: "saude", name: "Saúde", icon: "🏥", group: "essenciais" },
  { id: "educacao", name: "Educação", icon: "📚", group: "essenciais" },
  { id: "dividas", name: "Dívidas e Impostos", icon: "💳", group: "essenciais" },
  { id: "ferramentas", name: "Ferramentas", icon: "🛠️", group: "essenciais" },
  { id: "vestuario", name: "Vestuário", icon: "👔", group: "essenciais" },
  { id: "comerfora_suno", name: "Comer fora Suno", icon: "🍽️", group: "essenciais" },
  { id: "bernardo", name: "Bernardo", icon: "👶", group: "essenciais" },
  { id: "investimentos_cat", name: "Investimentos", icon: "📈", group: "investimentos" },
  { id: "reservas", name: "Reservas e Metas", icon: "🎯", group: "investimentos" },
  { id: "compras", name: "Compras", icon: "🛍️", group: "desejos" },
  { id: "lazer", name: "Lazer", icon: "🎉", group: "desejos" },
  { id: "lazer_suno", name: "Lazer Suno", icon: "🏢", group: "desejos" },
  { id: "comerfora", name: "Comer fora / iFood", icon: "🍔", group: "desejos" },
  { id: "viagem", name: "Viagem", icon: "✈️", group: "desejos" },
  { id: "assinaturas", name: "Assinaturas", icon: "📺", group: "desejos" },
];
var PAYS = ["Cartão Nubank", "PIX", "Boleto", "Dinheiro", "Cartão Porto", "Cartão Itaú", "Cartão Inter"];
var MS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
var MA = MS.map(function(m) { return m.slice(0, 3); });
var PC = ["#1B5FAA","#1A3A5C","#9A7420","#003F5D","#4E97D1","#C9A84C","#7BB4E3","#2D7A3E","#0F2540","#6A90B8"];

/* ══ HELPERS ══ */
function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(v) { return String(((v || 0) * 100).toFixed(1)) + "%"; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function tk(y, m) { return String(y) + "-" + String(m + 1).padStart(2, "0"); }
function sd(d) { try { return new Date(d).toLocaleDateString("pt-BR"); } catch (e) { return String(d || ""); } }
function fK(v) { var a = Math.abs(v || 0); if (a >= 1000) return (v < 0 ? "-" : "") + (a / 1000).toFixed(1) + "k"; return String(Math.round(v || 0)); }

function gsp(tx) {
  if (tx.splits && tx.splits.length > 0) return tx.splits;
  if (tx.split && tx.splitPerson) return [{ person: tx.splitPerson, pct: tx.splitPct || 30 }];
  return [];
}
function spt(tx) { return gsp(tx).reduce(function(a, s) { return a + tx.amount * (s.pct / 100); }, 0); }
function myP(tx) { if (tx.reimbursed) return 0; return tx.amount - spt(tx); }
function pi(d) { var m = d.match(/(\d+)\s*\/\s*(\d+)/); return m ? { c: +m[1], t: +m[2] } : null; }
function nd(d) { return d.toLowerCase().replace(/\s*\d+\s*\/\s*\d+\s*/g, "").replace(/parcela\s*/gi, "").trim(); }

/* ══ PRUMO DESIGN SYSTEM — TOKENS + CLASSES ══ */
var PRUMO_TOKENS = `
:root {
  --bg: oklch(0.985 0.004 80);
  --surface: oklch(1 0 0);
  --surface-2: oklch(0.965 0.006 80);
  --ink: oklch(0.22 0.02 250);
  --ink-2: oklch(0.42 0.025 250);
  --ink-3: oklch(0.62 0.02 250);
  --ink-4: oklch(0.82 0.012 250);
  --line: oklch(0.92 0.008 80);
  --line-2: oklch(0.88 0.01 80);
  --brand: oklch(0.38 0.07 235);
  --brand-2: oklch(0.30 0.075 235);
  --brand-tint: oklch(0.96 0.022 235);
  --accent: oklch(0.72 0.13 75);
  --accent-2: oklch(0.62 0.14 65);
  --accent-tint: oklch(0.96 0.04 75);
  --pos: oklch(0.58 0.13 155);
  --pos-tint: oklch(0.96 0.035 155);
  --warn: oklch(0.72 0.13 75);
  --neg: oklch(0.58 0.16 25);
  --neg-tint: oklch(0.96 0.035 25);
  --r-s: 10px; --r-m: 14px; --r-l: 20px; --r-pill: 999px;
  --shadow-1: 0 1px 2px oklch(0.22 0.02 250 / 0.04);
  --shadow-2: 0 4px 14px oklch(0.22 0.02 250 / 0.06);
  --shadow-3: 0 12px 40px oklch(0.22 0.02 250 / 0.10);
  --f-ui: 'Inter', system-ui, sans-serif;
  --f-display: 'Inter', system-ui, sans-serif;
  --f-mono: 'JetBrains Mono', ui-monospace, monospace;
  --sb: 240px;
}
.prumo-root, .prumo-root * { box-sizing: border-box; }
.prumo-root { font-family: var(--f-ui); color: var(--ink); -webkit-font-smoothing: antialiased; }
.prumo-root button { font-family: var(--f-ui); }

/* SHELL ──────────────────────────────────────────── */
.prumo-shell { display: grid; grid-template-columns: 1fr; min-height: 100vh; background: var(--bg); }
.prumo-sidebar { display: none; }
.prumo-main { padding: 18px 16px 100px; min-width: 0; }
.prumo-mobile-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 18px 8px; background: var(--bg); }
.prumo-mobile-header .greet { font-size: 11px; color: var(--ink-3); font-weight: 500; }
.prumo-mobile-header .title { font-family: var(--f-display); font-size: 26px; font-weight: 500; letter-spacing: -.015em; line-height: 1.1; color: var(--ink); }
.prumo-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%); display: flex; align-items: center; justify-content: center; color: var(--surface); font-weight: 700; font-size: 13px; flex-shrink: 0; cursor: pointer; }
.prumo-topbar { display: none; }
.prumo-month-mobile { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 0 18px 14px; padding: 8px 12px; background: var(--surface); border-radius: var(--r-pill); border: 1px solid var(--line); }
.prumo-month-mobile button { background: var(--surface-2); border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; color: var(--ink-2); font-size: 12px; font-weight: 700; }
.prumo-month-mobile span { font-family: var(--f-mono); font-size: 11px; letter-spacing: .12em; color: var(--ink); font-weight: 600; text-transform: uppercase; }
.prumo-quick-add { display: none; }

/* TABBAR / FAB MOBILE ───────────────────────────── */
.prumo-tabbar { position: fixed; bottom: 0; left: 0; right: 0; height: 76px; padding: 8px 8px 18px; background: oklch(1 0 0 / .92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; z-index: 40; }
.prumo-tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; color: var(--ink-3); padding: 4px 0; background: transparent; border: none; }
.prumo-tab .ico { font-size: 18px; line-height: 1; }
.prumo-tab .lbl-t { font-size: 9px; font-weight: 600; }
.prumo-tab.active { color: var(--brand); }
.prumo-fab { position: fixed; bottom: 88px; right: 16px; width: 52px; height: 52px; border-radius: 50%; background: var(--accent); color: oklch(0.22 0.04 60); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-3); border: none; font-size: 26px; font-weight: 300; cursor: pointer; z-index: 30; }

/* CARDS ─────────────────────────────────────────── */
.prumo-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-l); padding: 18px; margin-bottom: 12px; }
.prumo-card.l-brand { border-left: 3px solid var(--brand); }
.prumo-card.l-pos { border-left: 3px solid var(--pos); }
.prumo-card.l-warn { border-left: 3px solid var(--warn); }
.prumo-card.l-neg { border-left: 3px solid var(--neg); }
.prumo-card.l-accent { border-left: 3px solid var(--accent); }
.prumo-card-hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }

/* TYPO ──────────────────────────────────────────── */
.prumo-lbl { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; margin-bottom: 4px; }
.prumo-cap { font-size: 12px; color: var(--ink-3); font-family: var(--f-ui); }
.prumo-big { font-family: var(--f-display); font-size: 30px; font-weight: 700; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; letter-spacing: -.02em; line-height: 1; color: var(--ink); }
.prumo-big.brand { color: var(--brand); }
.prumo-big.pos { color: var(--pos); }
.prumo-big.neg { color: var(--neg); }
.prumo-big.accent { color: var(--accent-2); }
.prumo-big sup { font-size: 60%; color: var(--ink-3); font-weight: 500; }
.prumo-num { font-family: var(--f-mono); font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; font-weight: 600; }

/* CHIPS ─────────────────────────────────────────── */
.prumo-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: var(--r-pill); font-size: 11px; font-weight: 600; background: var(--surface-2); color: var(--ink-2); border: 1px solid var(--line); white-space: nowrap; }
.prumo-chip.pos { background: var(--pos-tint); color: var(--pos); border-color: oklch(0.58 0.13 155 / .2); }
.prumo-chip.neg { background: var(--neg-tint); color: var(--neg); border-color: oklch(0.58 0.16 25 / .2); }
.prumo-chip.warn { background: var(--accent-tint); color: var(--accent-2); border-color: oklch(0.62 0.14 65 / .2); }
.prumo-chip.brand { background: var(--brand-tint); color: var(--brand); border-color: oklch(0.38 0.07 235 / .2); }

/* METER ─────────────────────────────────────────── */
.prumo-meter { height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
.prumo-meter > i { display: block; height: 100%; border-radius: 3px; transition: width .4s ease; }

/* RING / DONUT ──────────────────────────────────── */
.prumo-ring-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.prumo-ring-card { background: var(--surface-2); border-radius: var(--r-m); padding: 11px 8px; text-align: center; border: 1px solid var(--line); }
.prumo-ring-svg { width: 56px; height: 56px; margin: 0 auto 4px; display: block; }
.prumo-ring-lbl { font-size: 10px; color: var(--ink-3); font-weight: 600; }
.prumo-ring-val { font-family: var(--f-display); font-size: 16px; font-weight: 600; color: var(--ink); }

/* TX ROW ────────────────────────────────────────── */
.prumo-tx { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.prumo-tx:last-child { border-bottom: none; }
.prumo-tx-icon { width: 36px; height: 36px; border-radius: var(--r-s); background: var(--surface-2); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.prumo-tx-meat { flex: 1; min-width: 0; }
.prumo-tx-desc { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prumo-tx-meta { font-size: 10px; color: var(--ink-3); margin-top: 1px; }
.prumo-tx-amt { font-family: var(--f-mono); font-size: 13px; font-weight: 600; color: var(--ink); font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.prumo-tx-amt.in { color: var(--pos); }
.prumo-section-h { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); margin: 14px 0 4px; display: flex; justify-content: space-between; font-weight: 500; }

/* BUTTONS ───────────────────────────────────────── */
.prumo-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 14px; border-radius: var(--r-pill); font-size: 12px; font-weight: 600; border: 1px solid transparent; cursor: pointer; font-family: var(--f-ui); }
.prumo-btn.brand { background: var(--ink); color: var(--surface); }
.prumo-btn.ghost { background: transparent; color: var(--ink); border-color: var(--line-2); }
.prumo-btn.accent { background: var(--accent); color: oklch(0.22 0.04 60); }

/* MOBILE MORE SHEET ─────────────────────────────── */
.prumo-sheet-overlay { position: fixed; inset: 0; background: oklch(0.22 0.02 250 / .35); z-index: 50; }
.prumo-sheet { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-radius: 28px 28px 0 0; padding: 6px 18px 28px; box-shadow: 0 -10px 40px oklch(0.22 0.02 250 / .15); z-index: 51; max-height: 80vh; overflow-y: auto; }
.prumo-sheet-handle { width: 36px; height: 4px; background: var(--line-2); border-radius: 2px; margin: 4px auto 14px; }
.prumo-sheet-h { font-family: var(--f-display); font-size: 20px; font-weight: 500; margin-bottom: 4px; color: var(--ink); }
.prumo-sheet-sub { font-size: 11px; color: var(--ink-3); margin-bottom: 14px; }
.prumo-sheet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.prumo-sheet-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-m); cursor: pointer; font-size: 13px; font-weight: 600; color: var(--ink); font-family: var(--f-ui); text-align: left; }
.prumo-sheet-item.active { background: var(--ink); color: var(--surface); border-color: var(--ink); }

/* DEVEDOR ROW ────────────────────────────────────── */
.prumo-dev { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); }
.prumo-dev:last-child { border-bottom: none; }
.prumo-dev-av { width: 32px; height: 32px; border-radius: 50%; background: var(--brand-tint); color: var(--brand); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }

/* ANNUAL CHART ────────────────────────────────── */
.prumo-yr { display: flex; align-items: flex-end; gap: 4px; height: 130px; padding-top: 18px; }
.prumo-yr-col { flex: 1; display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative; }
.prumo-yr-stack { width: 100%; display: flex; flex-direction: column-reverse; border-radius: 3px 3px 0 0; overflow: hidden; transition: outline 120ms; min-height: 4px; }
.prumo-yr-col:hover .prumo-yr-stack, .prumo-yr-col.active .prumo-yr-stack { outline: 2px solid var(--ink); outline-offset: 1px; }
.prumo-yr-mes { font-size: 9px; color: var(--ink-3); margin-top: 4px; font-weight: 600; }
.prumo-yr-mes.cur { color: var(--ink); font-weight: 800; }

/* DESKTOP ≥ 1100px ──────────────────────────────── */
@media (min-width: 1100px) {
  .prumo-shell { grid-template-columns: var(--sb) 1fr; }
  .prumo-sidebar { display: block; background: var(--surface); border-right: 1px solid var(--line); padding: 22px 14px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .prumo-sb-logo { display: flex; align-items: baseline; gap: 8px; padding: 0 8px 22px; }
  .prumo-sb-logo .glyph { width: 18px; height: 18px; border-radius: 50%; background: var(--ink); display: inline-flex; align-items: center; justify-content: center; }
  .prumo-sb-logo .glyph::after { content: ''; width: 5px; height: 5px; background: var(--accent); border-radius: 50%; }
  .prumo-sb-logo .word { font-family: var(--f-display); font-size: 20px; font-weight: 500; letter-spacing: -.015em; color: var(--ink); }
  .prumo-sb-section { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); padding: 12px 10px 6px; font-weight: 500; }
  .prumo-sb-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; color: var(--ink-2); cursor: pointer; font-size: 13px; font-weight: 500; background: transparent; border: none; width: 100%; text-align: left; font-family: var(--f-ui); }
  .prumo-sb-item:hover { background: var(--surface-2); color: var(--ink); }
  .prumo-sb-item.active { background: var(--ink); color: var(--surface); }
  .prumo-sb-item .ico { font-size: 14px; width: 18px; text-align: center; }
  .prumo-sb-item .badge { margin-left: auto; background: var(--accent); color: oklch(0.22 0.04 60); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
  .prumo-sb-foot { margin-top: 18px; padding: 12px; background: var(--surface-2); border-radius: 12px; display: flex; align-items: center; gap: 10px; }
  .prumo-sb-foot .av { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--brand), var(--accent)); color: var(--surface); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .prumo-sb-foot .nm { font-size: 12px; font-weight: 600; color: var(--ink); }
  .prumo-sb-foot .em { font-size: 10px; color: var(--ink-3); }

  .prumo-main { padding: 26px 36px 40px; }
  .prumo-mobile-header { display: none; }
  .prumo-month-mobile { display: none; }
  .prumo-tabbar { display: none; }
  .prumo-fab { display: none; }
  .prumo-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
  .prumo-topbar h1 { font-family: var(--f-display); font-size: 32px; font-weight: 700; letter-spacing: -.02em; margin: 0; color: var(--ink); }
  .prumo-topbar .greet { font-size: 12px; color: var(--ink-3); margin-bottom: 2px; }
  .prumo-topbar-r { display: flex; gap: 12px; align-items: center; }
  .prumo-month-pill { display: inline-flex; align-items: center; gap: 14px; padding: 7px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-pill); }
  .prumo-month-pill button { background: var(--surface-2); border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; color: var(--ink-2); font-weight: 700; font-size: 11px; }
  .prumo-month-pill span { font-family: var(--f-mono); font-size: 11px; letter-spacing: .12em; font-weight: 600; text-transform: uppercase; color: var(--ink); }
  .prumo-quick-add { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 4px 4px 4px 16px; margin-bottom: 22px; box-shadow: var(--shadow-1); cursor: pointer; }
  .prumo-quick-add .ico-q { color: var(--ink-3); font-size: 16px; }
  .prumo-quick-add .qa-text { flex: 1; font-size: 13px; color: var(--ink-3); padding: 10px 0; }
  .prumo-quick-add .kbd { font-family: var(--f-mono); font-size: 10px; padding: 3px 6px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 5px; color: var(--ink-3); }

  /* DASHBOARD GRID DESKTOP */
  .prumo-dash-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; align-items: start; }
  .prumo-card { padding: 20px; }
  .prumo-big { font-size: 38px; }
  .prumo-ring-svg { width: 60px; height: 60px; margin: 0 auto 6px; }
  .prumo-ring-card { padding: 14px; }
  .prumo-ring-val { font-size: 18px; }
  .prumo-yr { height: 220px; padding-top: 28px; gap: 8px; }
  .prumo-yr-mes { font-size: 11px; }
}
.prumo-dash-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.prumo-dash-grid .full { grid-column: 1 / -1; }
.prumo-dash-grid .span2 { grid-column: 1 / -1; }
@media (min-width: 1100px) { .prumo-dash-grid .span2 { grid-column: span 2; } }

/* TOOLTIP ──────────────────────────────────────── */
.prumo-tip { position: absolute; bottom: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; box-shadow: var(--shadow-2); z-index: 20; min-width: 200px; white-space: nowrap; margin-bottom: 6px; pointer-events: auto; }

/* LEGACY CHAT FAB — só aparece em desktop */
.prumo-legacy-chat-fab { display: none !important; }
@media (min-width: 1100px) { .prumo-legacy-chat-fab { display: flex !important; } }
`;

var _uid = null;
async function ld(k, fb) {
  try {
    var key = (_uid ? _uid + "__" : "") + k;
    var snap = await getDoc(doc(db, "userdata", key));
    return snap.exists() ? JSON.parse(snap.data().value) : fb;
  } catch (e) { return fb; }
}
async function sv(k, d) {
  try {
    var key = (_uid ? _uid + "__" : "") + k;
    await setDoc(doc(db, "userdata", key), { value: JSON.stringify(d) });
  } catch (e) { console.error(e); }
}

function calcSpent(mData, cats, fxd) {
  var sp = { essenciais: 0, investimentos: 0, desejos: 0 };
  var sc = {};
  cats.forEach(function(c) { sc[c.id] = 0; });
  var txs = mData.tx || [];
  var fs2 = mData.fs || {};
  txs.forEach(function(tx) {
    var cat = cats.find(function(c) { return c.id === tx.cat; });
    if (cat) { var v = myP(tx); sp[cat.group] += v; sc[cat.id] += v; }
  });
  fxd.forEach(function(f) {
    if ((f.mode || "budget") !== "budget") return;
    var cat = cats.find(function(c) { return c.id === f.cat; });
    if (!cat) return;
    var parts = fs2[f.id + "_p"] || [];
    var pS = parts.reduce(function(a, p) { return a + p.amount; }, 0);
    if (fs2[f.id] === "paid") {
      var v = f.hasSplit ? f.amount - spt(f) : f.amount;
      sp[cat.group] += v; sc[cat.id] += v;
    } else if (pS > 0) {
      var myPc = f.hasSplit ? (1 - gsp(f).reduce(function(a2, s) { return a2 + s.pct / 100; }, 0)) : 1;
      sp[cat.group] += pS * myPc; sc[cat.id] += pS * myPc;
    }
  });
  return { spent: sp, spentByCat: sc };
}

/* ══ STYLES ══ */
var S = {
  card: { background: CARD, borderRadius: 8, padding: 16, marginBottom: 10, border: "1px solid " + BR },
  cardA: function(c) { return { background: CARD, borderRadius: 8, padding: 16, marginBottom: 10, border: "1px solid " + BR, borderLeft: "3px solid " + c }; },
  inp: { background: BG, border: "1px solid " + BR, borderRadius: 6, padding: "10px 12px", color: TX, fontSize: 14, fontFamily: "'Inter',sans-serif", width: "100%", outline: "none", boxSizing: "border-box" },
  btn: function(c) { return { background: c, border: "none", borderRadius: 6, padding: "10px 18px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }; },
  btnO: { background: CARD, border: "1px solid " + BR, borderRadius: 6, padding: "10px 18px", color: T3, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  tag: function(c) { return { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: c + "20", color: c, whiteSpace: "nowrap", marginRight: 3 }; },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  ck: { accentColor: OK, width: 16, height: 16, cursor: "pointer" },
  lbl: { fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: TM, textTransform: "uppercase", marginBottom: 4 },
  h2: { fontFamily: "'Montserrat',sans-serif", fontSize: 14, fontWeight: 700, color: BD },
  data: function(c) { return { fontSize: 28, fontWeight: 700, color: c || TX, fontFamily: "'Inter',sans-serif", lineHeight: 1.1 }; },
  cap: { fontSize: 11, color: TM, fontFamily: "'Inter',sans-serif" },
};

/* ══ COMPONENTS ══ */
function PB(props) {
  var r = props.max > 0 ? props.value / props.max : 0;
  var c = props.noWarn ? (props.color || BL) : (r > 1 ? ER : r > 0.85 ? WN : (props.color || BL));
  return (
    <div style={{ background: "#F0F0F0", borderRadius: 4, height: 6, overflow: "hidden", width: "100%" }}>
      <div style={{ width: String(Math.min(r * 100, 100)) + "%", height: "100%", borderRadius: 4, background: c, transition: "width 0.4s" }} />
    </div>
  );
}

function SE(props) {
  var splits = props.splits;
  var onChange = props.onChange;
  var compact = props.compact;
  var tp = splits.reduce(function(a, s) { return a + (s.pct || 0); }, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 0" }}>
      {splits.map(function(s, i) {
        return (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ ...S.inp, flex: 1, fontSize: compact ? 12 : 14 }} placeholder="Com quem?" value={s.person}
              onChange={function(e) { var n = splits.slice(); n[i] = { ...n[i], person: e.target.value }; onChange(n); }} />
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <input style={{ ...S.inp, width: 56, textAlign: "center" }} type="number" value={s.pct}
                onChange={function(e) { var n = splits.slice(); n[i] = { ...n[i], pct: parseInt(e.target.value) || 0 }; onChange(n); }} />
              <span style={{ fontSize: 12, color: TM, fontWeight: 700 }}>%</span>
            </div>
            {splits.length > 1 && (
              <span onClick={function() { onChange(splits.filter(function(_, j) { return j !== i; })); }}
                style={{ cursor: "pointer", color: ER, fontSize: 15 }}>{"×"}</span>
            )}
          </div>
        );
      })}
      <button onClick={function() { onChange(splits.concat([{ person: "", pct: 30 }])); }}
        style={{ background: "transparent", border: "1px dashed " + BR, borderRadius: 6, color: TM, padding: "5px", cursor: "pointer", fontSize: 11 }}>
        {"+ Pessoa"}
      </button>
      <div style={{ ...S.cap, color: tp > 100 ? ER : TM }}>{"Dividido: " + String(tp) + "% — Você: " + String(100 - tp) + "%"}</div>
    </div>
  );
}

function CatS(props) {
  return (
    <select style={{ ...S.inp, ...props.sx }} value={props.value} onChange={props.onChange}>
      <option value="">{"Categoria"}</option>
      {GR.map(function(g) {
        return (
          <optgroup key={g.id} label={g.label + " (" + String(props.pcts[g.id]) + "%)"}>
            {props.cats.filter(function(c) { return c.group === g.id; }).map(function(c) {
              return <option key={c.id} value={c.id}>{c.icon + " " + c.name}</option>;
            })}
          </optgroup>
        );
      })}
    </select>
  );
}

function ChartTip(props) {
  var d = props.d;
  var i = props.i;
  var cats2 = props.cats;
  var items = Object.entries(d.cats || {}).map(function(e2) {
    var co = cats2.find(function(c) { return c.id === e2[0]; });
    return { id: e2[0], name: co ? co.name : e2[0], icon: co ? co.icon : "", group: co ? co.group : "", value: e2[1] };
  }).filter(function(x) { return x.value > 0; }).sort(function(a, b) { return b.value - a.value; });
  var left = i < 6 ? 0 : "auto";
  var right = i >= 6 ? 0 : "auto";
  return (
    <div style={{ position: "absolute", bottom: "100%", left: left, right: right, marginBottom: 8, background: "#fff", border: "1px solid " + BR, borderRadius: 8, padding: "10px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", zIndex: 20, minWidth: 180, whiteSpace: "nowrap" }}
      onClick={function(e) { e.stopPropagation(); }}>
      <div style={{ ...S.h2, fontSize: 12, marginBottom: 6, borderBottom: "1px solid #F0F0F0", paddingBottom: 4 }}>{MS[i] + (d.real ? "" : " (projeção)")}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, ...S.cap }}>
        <span>{"Débitos"}</span><span style={{ fontWeight: 700, color: ER }}>{fmt(d.td)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, ...S.cap }}>
        <span>{"Créditos"}</span><span style={{ fontWeight: 700, color: OK }}>{fmt(d.cr)}</span>
      </div>
      {GR.map(function(g) {
        var gi = items.filter(function(x) { return x.group === g.id; });
        if (gi.length === 0) return null;
        var gt = gi.reduce(function(a, x) { return a + x.value; }, 0);
        return (
          <div key={g.id} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: g.color, textTransform: "uppercase", marginBottom: 2 }}>{g.label + " " + fmt(gt)}</div>
            {gi.slice(0, 5).map(function(it) {
              return (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T3, padding: "1px 0 1px 8px" }}>
                  <span>{it.icon + " " + it.name}</span>
                  <span style={{ fontWeight: 600, color: TX }}>{fmt(it.value)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 4, marginTop: 2, display: "flex", justifyContent: "space-between", ...S.cap }}>
        <span style={{ fontWeight: 700, color: BD }}>{"Saldo"}</span>
        <span style={{ fontWeight: 700, color: d.s >= 0 ? OK : ER }}>{fmt(d.s)}</span>
      </div>

    </div>
  );
}

/* ══ DONUT (PRUMO RING) ══ */
function Donut(props) {
  var pct = Math.max(0, Math.min(100, props.pct || 0));
  var color = props.color || "var(--brand)";
  var size = props.size || 56;
  var stroke = props.stroke || 6;
  var r = (size - stroke) / 2;
  var c = 2 * Math.PI * r;
  var off = c * (1 - pct / 100);
  return (
    <svg className="prumo-ring-svg" viewBox={"0 0 " + String(size) + " " + String(size)} style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={String(c)} strokeDashoffset={String(off)} strokeLinecap="round"
        transform={"rotate(-90 " + String(size / 2) + " " + String(size / 2) + ")"}
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

/* ══ DASHBOARD PRUMO ══ */
function DashboardPrumo(props) {
  var cfg = props.cfg;
  var sal = props.sal;
  var totalInc = props.totalInc;
  var extraCr = props.extraCr;
  var bud = props.bud;
  var budWithRollover = props.budWithRollover;
  var spent = props.spent;
  var prevSp = props.prevSp;
  var GR = props.GR;
  var cats = props.cats;
  var spC = props.spC;
  var totDb = props.totDb;
  var savR = props.savR;
  var dRcv = props.dRcv;
  var debtors = props.debtors;
  var txs = props.txs;
  var crs = props.crs;
  var fxd = props.fxd;
  var fs = props.fs;
  var md = props.md;
  var catLimits = props.catLimits;
  var goals = props.goals;
  var chD = props.chD;
  var chMx = props.chMx;
  var hovM = props.hovM;
  var sHM = props.sHM;
  var mo = props.mo;
  var sTab = props.sTab;
  var eSal = props.eSal;
  var sES = props.sES;
  var salI = props.salI;
  var sSI = props.sSI;
  var saveCfg = props.saveCfg;
  var DS = props.DS;
  var nw = props.nw;
  var monthlyInvest = props.monthlyInvest;

  /* ─── Hero numbers ─── */
  var saldoLivre = totalInc - totDb + dRcv;
  var saldoSinal = saldoLivre >= 0;
  var saldoCents = Math.round((Math.abs(saldoLivre) % 1) * 100);
  var saldoIntStr = Math.floor(Math.abs(saldoLivre)).toLocaleString("pt-BR");
  var saldoCentsStr = (saldoCents < 10 ? "0" : "") + String(saldoCents);
  var prevSaldo = null;
  if (prevSp) {
    var prevTotDb = (prevSp.essenciais || 0) + (prevSp.investimentos || 0) + (prevSp.desejos || 0);
    prevSaldo = totalInc - prevTotDb;
  }
  var saldoDelta = prevSaldo !== null ? saldoLivre - prevSaldo : null;

  /* ─── Reserva (estimativa: saldo investimentos / despesa essencial mensal) ─── */
  var reservaTotal = nw && nw.balance ? nw.balance : 0;
  var despEssMensal = spent.essenciais > 0 ? spent.essenciais : (totalInc * 0.5);
  var mesesCobertos = despEssMensal > 0 ? reservaTotal / despEssMensal : 0;
  var reservaPct = Math.min(mesesCobertos / 12, 1) * 100;
  var reservaStatus = "Insuficiente";
  var reservaChipKind = "neg";
  if (mesesCobertos >= 12) { reservaStatus = "Excelente"; reservaChipKind = "pos"; }
  else if (mesesCobertos >= 6) { reservaStatus = "Razoável"; reservaChipKind = "pos"; }
  else if (mesesCobertos >= 3) { reservaStatus = "Atenção"; reservaChipKind = "warn"; }

  /* ─── Score (mantido do código original) ─── */
  var scoreS = Math.min(savR / 0.25, 1) * 40;
  var limCats = cats.filter(function(c) { return catLimits[c.id]; });
  var limOk = limCats.filter(function(c) { return (spC[c.id] || 0) <= catLimits[c.id]; }).length;
  var scoreL = limCats.length > 0 ? (limOk / limCats.length) * 30 : 30;
  var goalsTotal = goals.length;
  var avgGP = goalsTotal > 0 ? goals.reduce(function(a, g) { return a + Math.min((g.saved || 0) / g.target, 1); }, 0) / goalsTotal : 1;
  var scoreG = avgGP * 30;
  var scoreNum = Math.round(scoreS + scoreL + scoreG);
  var scoreColor = scoreNum >= 80 ? "var(--pos)" : scoreNum >= 60 ? "var(--warn)" : scoreNum >= 40 ? "var(--accent-2)" : "var(--neg)";
  var scoreLbl = scoreNum >= 80 ? "Excelente" : scoreNum >= 60 ? "Bom" : scoreNum >= 40 ? "Regular" : "Atenção";

  /* ─── Anéis 50/25/25 ─── */
  var rings = GR.map(function(g) {
    var b = budWithRollover[g.id] || bud[g.id] || 0;
    var s = spent[g.id] || 0;
    var p = b > 0 ? Math.round((s / b) * 100) : 0;
    var color = "var(--brand)";
    if (g.id === "investimentos") color = "var(--pos)";
    if (g.id === "desejos") color = "var(--warn)";
    return { id: g.id, label: g.label, pct: cfg.pcts[g.id] || 0, used: p, color: color, b: b, s: s };
  });

  /* ─── Devedores top ─── */
  var devList = Object.entries(debtors).map(function(e2) { return { name: e2[0], pending: e2[1].pending, total: e2[1].total }; });
  devList.sort(function(a, b) { return b.pending - a.pending; });
  var devTop = devList.slice(0, 3);
  var devTotalPending = devList.reduce(function(a, d) { return a + d.pending; }, 0);

  /* ─── Atividade recente (txs do mês atual + crs) ─── */
  var recentItems = [];
  txs.forEach(function(t) {
    if (t.src === "proj") return;
    var c = cats.find(function(cc) { return cc.id === t.cat; });
    recentItems.push({ id: t.id, kind: "tx", date: t.date || "", desc: t.desc, amount: t.amount, icon: c ? c.icon : "💸", catName: c ? c.name : "" });
  });
  crs.forEach(function(c) {
    recentItems.push({ id: c.id, kind: "cr", date: c.dateAdded || "", desc: c.desc, amount: c.amount, icon: "💼", catName: c.type || "Crédito extra" });
  });
  recentItems.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  var recentTop = recentItems.slice(0, 6);

  /* ─── Termômetro IF ─── */
  var rendaPassiva = reservaTotal * 0.007;
  var ifPct = despEssMensal > 0 ? Math.min(rendaPassiva / despEssMensal, 1) * 100 : 0;
  var ifFillPct = Math.max(0, Math.min(100, ifPct));

  /* ─── Renda salário inline edit ─── */
  var renderRendaEdit = function() {
    if (eSal) {
      return (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <input style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "var(--f-ui)", width: 130, textAlign: "right", outline: "none", color: "var(--ink)" }}
            value={salI} onChange={function(e) { sSI(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") { saveCfg({ ...cfg, salary: parseFloat(salI) || DS }); sES(false); } }} />
          <button className="prumo-btn brand" onClick={function() { saveCfg({ ...cfg, salary: parseFloat(salI) || DS }); sES(false); }}>{"OK"}</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="prumo-dash-grid">
      {/* HERO ─ Saldo + Score + Anéis ─ span2 */}
      <div className="prumo-card l-brand span2">
        <div className="prumo-card-hd">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="prumo-lbl">{"Saldo livre do mês"}</div>
            <div className="prumo-big brand" style={{ marginTop: 6 }}>
              {(saldoSinal ? "" : "−") + "R$ " + saldoIntStr}<sup>{"," + saldoCentsStr}</sup>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              {saldoDelta !== null && (
                <span className={"prumo-chip " + (saldoDelta >= 0 ? "pos" : "neg")}>
                  {(saldoDelta >= 0 ? "▲ " : "▼ ") + fmt(Math.abs(saldoDelta)) + " vs. mês ant."}
                </span>
              )}
              <span className="prumo-cap" onClick={function() { sSI(String(sal)); sES(true); }} style={{ cursor: "pointer" }}>
                {"Renda " + fmt(totalInc) + " · " + pct(savR) + " poupado"}
              </span>
            </div>
            {renderRendaEdit()}
            {extraCr > 0 && !eSal && (
              <div className="prumo-cap" style={{ marginTop: 4, fontSize: 11 }}>{"Salário " + fmt(sal) + " + Extra " + fmt(extraCr)}</div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="prumo-lbl">{"Score do mês"}</div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 30, fontWeight: 700, color: scoreColor, lineHeight: 1, marginTop: 4, fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums" }}>{String(scoreNum)}</div>
            <div style={{ fontSize: 12, color: scoreColor, fontWeight: 700, marginTop: 2 }}>{scoreLbl}</div>
          </div>
        </div>
        <div className="prumo-ring-row">
          {rings.map(function(r) {
            return (
              <div key={r.id} className="prumo-ring-card">
                <Donut pct={r.used} color={r.color} />
                <div className="prumo-ring-lbl">{r.label + " · " + String(r.pct) + "%"}</div>
                <div className="prumo-ring-val">{String(r.used) + "%"}</div>
                <div className="prumo-cap" style={{ fontSize: 10, marginTop: 2 }}>{fmt(r.s) + " / " + fmt(r.b)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RESERVA */}
      <div className="prumo-card l-pos">
        <div className="prumo-lbl">{"Reserva de emergência"}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: "var(--f-display)", fontSize: 38, fontWeight: 500, color: "var(--pos)", lineHeight: 1, fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums" }}>
            {mesesCobertos.toFixed(1).replace(".", ",")}
          </span>
          <span className="prumo-cap">{"meses"}</span>
        </div>
        <div className={"prumo-chip " + reservaChipKind} style={{ marginTop: 8 }}>{"⚡ " + reservaStatus}</div>
        <div className="prumo-meter" style={{ marginTop: 14, height: 10 }}>
          <i style={{ width: String(reservaPct) + "%", background: "linear-gradient(90deg, var(--warn), var(--pos))" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span className="prumo-cap">{"0m"}</span>
          <span className="prumo-cap">{"3m"}</span>
          <span className="prumo-cap">{"6m"}</span>
          <span className="prumo-cap" style={{ color: "var(--pos)", fontWeight: 700 }}>{"12m+"}</span>
        </div>
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="prumo-cap">{"Reserva"}</div>
            <div className="prumo-num" style={{ fontSize: 13 }}>{fmt(reservaTotal)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="prumo-cap">{"Essencial/mês"}</div>
            <div className="prumo-num" style={{ fontSize: 13 }}>{fmt(despEssMensal)}</div>
          </div>
        </div>
      </div>

      {/* A RECEBER */}
      <div className="prumo-card l-warn" style={{ cursor: "pointer" }} onClick={function() { sTab("deve"); }}>
        <div className="prumo-lbl">{"A receber"}</div>
        <div className="prumo-big accent" style={{ fontSize: 30, marginTop: 4 }}>{fmt(devTotalPending)}</div>
        <div className="prumo-cap" style={{ marginTop: 4 }}>
          {String(devList.length) + " " + (devList.length === 1 ? "pessoa" : "pessoas") + " · " + String(Object.values(debtors).reduce(function(a, d) { return a + d.items.length; }, 0)) + " lançamentos"}
        </div>
        {devTop.length === 0 ? (
          <div className="prumo-cap" style={{ marginTop: 14, padding: "10px 0", textAlign: "center" }}>{"Nenhum devedor neste mês 👍"}</div>
        ) : devTop.map(function(d, i) {
          var initial = String(d.name || "?").charAt(0).toUpperCase();
          return (
            <div key={i} className="prumo-dev">
              <div className="prumo-dev-av">{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{d.name}</div>
                <div className="prumo-cap">{d.pending > 0 ? "pendente" : "✓ quitado"}</div>
              </div>
              <div className="prumo-num" style={{ color: d.pending > 0 ? "var(--accent-2)" : "var(--pos)" }}>{d.pending > 0 ? fmt(d.pending) : "✓"}</div>
            </div>
          );
        })}
      </div>

      {/* ATIVIDADE RECENTE ─ span2 */}
      <div className="prumo-card span2">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Atividade recente"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{"Últimos lançamentos"}</h2>
          </div>
          <button className="prumo-btn ghost" onClick={function() { sTab("input"); }}>{"Ver todos →"}</button>
        </div>
        {recentTop.length === 0 ? (
          <div className="prumo-cap" style={{ padding: "20px 0", textAlign: "center" }}>{"Nenhum lançamento neste mês ainda. Use o botão + para começar."}</div>
        ) : recentTop.map(function(it) {
          return (
            <div key={it.kind + "-" + it.id} className="prumo-tx">
              <div className="prumo-tx-icon">{it.icon}</div>
              <div className="prumo-tx-meat">
                <div className="prumo-tx-desc">{it.desc}</div>
                <div className="prumo-tx-meta">{it.catName + (it.date ? " · " + sd(it.date) : "")}</div>
              </div>
              <div className={"prumo-tx-amt" + (it.kind === "cr" ? " in" : "")}>{(it.kind === "cr" ? "+" : "") + fmt(it.amount)}</div>
            </div>
          );
        })}
      </div>

      {/* TERMÔMETRO IF */}
      <div className="prumo-card">
        <div className="prumo-lbl">{"Termômetro de IF"}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0 12px" }}>
          <span style={{ fontFamily: "var(--f-display)", fontSize: 38, fontWeight: 500, color: "var(--brand)", lineHeight: 1, fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums" }}>{ifPct.toFixed(0) + "%"}</span>
          <div style={{ fontSize: 12, lineHeight: 1.3 }}>
            <div className="prumo-num" style={{ fontSize: 13 }}>{fmt(rendaPassiva) + "/m"}</div>
            <div className="prumo-cap" style={{ fontSize: 11 }}>{"renda passiva (0,7%)"}</div>
          </div>
        </div>
        <div style={{ position: "relative", height: 14, background: "var(--surface-2)", borderRadius: 7, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: String(ifFillPct) + "%", background: "linear-gradient(90deg, var(--brand), var(--accent))" }} />
          <div style={{ position: "absolute", left: "25%", top: 0, bottom: 0, width: 2, background: "oklch(1 0 0 / .6)" }} />
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "oklch(1 0 0 / .6)" }} />
          <div style={{ position: "absolute", left: "75%", top: 0, bottom: 0, width: 2, background: "oklch(1 0 0 / .6)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span className="prumo-cap" style={{ fontSize: 10, fontFamily: "var(--f-mono)" }}>{"25%"}</span>
          <span className="prumo-cap" style={{ fontSize: 10, fontFamily: "var(--f-mono)", color: "var(--brand)", fontWeight: 700 }}>{"50%"}</span>
          <span className="prumo-cap" style={{ fontSize: 10, fontFamily: "var(--f-mono)" }}>{"75%"}</span>
          <span className="prumo-cap" style={{ fontSize: 10, fontFamily: "var(--f-mono)" }}>{"IF"}</span>
        </div>
      </div>

      {/* PROJEÇÃO ANUAL ─ full */}
      <div className="prumo-card full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Projeção anual"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{"Despesa mensal · 12 meses"}</h2>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-2)" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand)" }}></span>{"Essenciais"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-2)" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ink-2)" }}></span>{"Investim."}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-2)" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }}></span>{"Não-ess."}</div>
          </div>
        </div>
        {chD && chD.length > 0 ? (
          <div className="prumo-yr">
            {chD.map(function(d, i) {
              var total = d.e + d.i + d.d;
              var h = chMx > 0 ? (total / chMx) * 100 : 0;
              var eH = total > 0 ? (d.e / total) * h : 0;
              var iH = total > 0 ? (d.i / total) * h : 0;
              var dH = total > 0 ? (d.d / total) * h : 0;
              var cur = i === mo;
              return (
                <div key={i} className={"prumo-yr-col" + (hovM === i ? " active" : "")} onMouseEnter={function() { sHM(i); }} onMouseLeave={function() { sHM(null); }} onClick={function() { sHM(hovM === i ? null : i); }}>
                  <div className="prumo-yr-stack" style={{ height: String(h) + "%", opacity: d.real ? 1 : 0.4 }}>
                    <div style={{ height: String(eH) + "%", background: "var(--brand)" }}></div>
                    <div style={{ height: String(iH) + "%", background: "var(--ink-2)" }}></div>
                    <div style={{ height: String(dH) + "%", background: "var(--accent)" }}></div>
                  </div>
                  <div className={"prumo-yr-mes" + (cur ? " cur" : "")}>{d.mes}</div>
                  {hovM === i && <ChartTip d={d} i={i} cats={cats} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="prumo-cap" style={{ padding: "30px 0", textAlign: "center" }}>{"Carregando dados anuais..."}</div>
        )}
      </div>
    </div>
  );
}

/* ══ MAIN APP ══ */

/* ══ LOGIN SCREEN ══ */
function LoginScreen({ onLogin }) {
  return (
    <div className="prumo-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "var(--f-ui)" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 36, border: "1px solid var(--line)", textAlign: "center", maxWidth: 340, width: "90%", boxShadow: "var(--shadow-2)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "center", marginBottom: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", display: "block" }} />
          </span>
          <span style={{ fontFamily: "var(--f-display)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.015em", color: "var(--ink)" }}>{"Prumo"}</span>
        </div>
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 28, lineHeight: 1.55, marginTop: 6 }}>{"Seu controle financeiro pessoal"}</p>
        <button onClick={onLogin}
          style={{ background: "var(--ink)", border: "none", borderRadius: 999, padding: "12px 24px", color: "var(--surface)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, margin: "0 auto", width: "100%", justifyContent: "center", fontFamily: "var(--f-ui)" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{"G"}</span>
          {"Entrar com Google"}
        </button>
        <p style={{ color: "var(--ink-4)", fontSize: 11, marginTop: 20, fontFamily: "var(--f-mono)", letterSpacing: "0.08em" }}>{"DADOS NA NUVEM · FIREBASE"}</p>
      </div>
      <style>{PRUMO_TOKENS}</style>
    </div>
  );
}

export default function App() {
  var now = new Date();
  var [user, sUser] = useState(undefined);
  var [yr, sYr] = useState(now.getFullYear());
  var [mo, sMo] = useState(now.getMonth());
  var [tab, sTab] = useState("dash");
  var [cfg, sCfg] = useState(null);
  var [md, sMd] = useState({ tx: [], cr: [], fs: {}, debts: [] });
  var [maps, sMp] = useState({});
  var [yrD, sYrD] = useState(null);
  var [pvMd, sPv] = useState(null);
  var [loading, sLd] = useState(true);
  var [eSal, sES] = useState(false);
  var [salI, sSI] = useState("");
  var [csvR, sCR] = useState(null);
  var [csvC, sCC] = useState({});
  var [csvSp, sCSp] = useState({});
  var [showFx, sSFx] = useState(false);
  var [err, sErr] = useState("");
  var [pO, sPO] = useState(null);
  var [pV, sPV] = useState("");
  var [eId, sEId] = useState(null);
  var [eD, sED] = useState([{ person: "Duda", pct: 30 }]);
  var [txSearch, sTxS] = useState("");
  var [cfCl, sCfC] = useState(false);
  var [catF, sCatF] = useState(null);
  var [showDebt, sSDbt] = useState(false);
  var [showGoal, sSGl] = useState(false);
  var [hovM, sHM] = useState(null);
  var [editTxId, sETxId] = useState(null);
  var [editTxF, sETxF] = useState({ desc: "", valor: "", cat: "", note: "" });
  var [nwInput, sNwI] = useState("");
  var [showNw, sShowNw] = useState(false);
  var [editLimId, sELimId] = useState(null);
  var [editLimV, sELimV] = useState("");
  var fr = useRef(null);
  var emFm = { desc: "", valor: "", cat: "", pay: "Cartão Nubank", hs: false, sp: [{ person: "Duda", pct: 30 }], date: "", reimb: false, ic: "", it: "", note: "" };
  var [fm, sFm] = useState(emFm);
  var [cf, sCf] = useState({ desc: "", valor: "", type: "Bônus" });
  var [ff, sFf] = useState({ name: "", amount: "", cat: "", pay: "PIX", hs: false, sp: [{ person: "Duda", pct: 30 }], mode: "budget" });
  var [df, sDf] = useState({ desc: "", amount: "", person: "Duda" });
  var [gf, sGf] = useState({ name: "", target: "", deadline: "", saved: "0" });
  var [simAporte, sSimA] = useState("1000");
  var [simTaxa, sSimT] = useState("1");
  var [simTempo, sSimTp] = useState("60");
  var [ifTarget, sIfTarget] = useState("");
  var [showIfEdit, sShowIfEdit] = useState(false);
  var [rollover, setRollover] = useState({});
  var [chatOpen, sChatOpen] = useState(false);
  var [showMore, sShowMore] = useState(false);
  var [aiInsight, sAiInsight] = useState("");
  var [aiLoading, sAiLoading] = useState(false);
  var [chatMsgs, sChatMsgs] = useState([]);
  var [chatInput, sChatIn] = useState("");
  var [chatLd, sChatLd] = useState(false);
  var chatEndRef = useRef(null);

  var mK = tk(yr, mo);
  var cats = (cfg && cfg.categories) ? cfg.categories : DC;

  useEffect(function() {
    var unsub = onAuthStateChanged(auth, function(u) {
      _uid = u ? u.uid : null;
      sUser(u || null);
    });
    return unsub;
  }, []);

  useEffect(function() {
    var active = true;
    (async function() {
      sLd(true);
      var c = await ld("fc2-cfg", { salary: DS, pcts: DP, categories: DC, fixed: [], goals: [], catLimits: {}, netWorth: { balance: 0, history: [] } });
      var m = await ld("fc2-m-" + tk(yr, mo), { tx: [], cr: [], fs: {}, debts: [] });
      var rv = await ld("fc2-rollover", {});
      var mp = await ld("fc2-maps", {});
      var pMo = mo === 0 ? 11 : mo - 1;
      var pYr = mo === 0 ? yr - 1 : yr;
      var pm = await ld("fc2-m-" + tk(pYr, pMo), { tx: [], cr: [], fs: {} });
      if (!active) return;
      sCfg(c); sMd(m); sMp(mp); sPv(pm); sSI(String(c.salary)); setRollover(rv); sLd(false);
    })();
    return function() { active = false; };
  }, [yr, mo]);

  useEffect(function() {
    var active = true;
    (async function() {
      var r = [];
      for (var i = 0; i < 12; i++) {
        r.push(await ld("fc2-m-" + tk(yr, i), { tx: [], cr: [], fs: {} }));
      }
      if (active) sYrD(r);
    })();
    return function() { active = false; };
  }, [yr, mo]);

  var saveMd = useCallback(function(d) { sMd(d); sv("fc2-m-" + mK, d); }, [mK]);
  var saveCfg = useCallback(function(c) { sCfg(c); sv("fc2-cfg", c); }, []);
  var saveMaps = useCallback(function(m) { sMp(m); sv("fc2-maps", m); }, []);

  if (user === undefined) {
    return <div style={{ background: BGMAIN, color: TM, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}>{"Carregando..."}</div>;
  }
  if (user === null) {
    return <LoginScreen onLogin={function() { signInWithPopup(auth, googleProvider); }} />;
  }
  if (loading || !cfg) {
    return <div style={{ background: BGMAIN, color: TM, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}>{"Carregando..."}</div>;
  }

  var sal = cfg.salary || DS;
  var txs = md.tx || [];
  var crs = md.cr || [];
  var fs = md.fs || {};
  var fxd = cfg.fixed || [];
  var goals = cfg.goals || [];
  var catLimits = cfg.catLimits || {};
  var nw = cfg.netWorth || { balance: 0, history: [] };
  var extraCr = crs.reduce(function(a, c) { return a + c.amount; }, 0);
  var totalInc = sal + extraCr;
  var bud = {};
  GR.forEach(function(g) { bud[g.id] = totalInc * ((cfg.pcts[g.id] || 0) / 100); });
  var cur = calcSpent(md, cats, fxd);
  var spent = cur.spent;
  var spC = cur.spentByCat;
  var totCr = totalInc;
  var totDbTx = txs.filter(function(t) { return !t.reimbursed; }).reduce(function(a, t) { return a + t.amount; }, 0);
  var totDbFx = fxd.filter(function(f) { return (f.mode || "budget") === "budget" && fs[f.id] === "paid"; }).reduce(function(a, f) { return a + f.amount; }, 0);
  var totDbP = fxd.filter(function(f) { return (f.mode || "budget") === "budget" && fs[f.id] !== "paid"; })
    .reduce(function(a, f) { return a + (fs[f.id + "_p"] || []).reduce(function(a2, p) { return a2 + p.amount; }, 0); }, 0);
  var totDb = totDbTx + totDbFx + totDbP;

  /* ── Rollover calculation ── */
  var saveRollover = function(rv) { setRollover(rv); sv("fc2-rollover", rv); };
  var prevKey = tk(mo === 0 ? yr - 1 : yr, mo === 0 ? 11 : mo - 1);
  var rvCredit = {};
  GR.forEach(function(g) {
    var prevBud = totalInc * ((cfg.pcts[g.id] || 0) / 100);
    var prevSpentG = prevSp ? prevSp[g.id] : 0;
    var leftover = prevBud - prevSpentG;
    var existing = (rollover[prevKey] || {})[g.id] || 0;
    rvCredit[g.id] = existing || (leftover > 0 && g.id !== "investimentos" ? Math.round(leftover) : 0);
  });
  var budWithRollover = {};
  GR.forEach(function(g) { budWithRollover[g.id] = bud[g.id] + (rvCredit[g.id] || 0); });

  /* ── Anomaly detection ── */
  var anomalies = [];
  if (yrD) {
    cats.forEach(function(cat2) {
      var hist = [];
      yrD.forEach(function(mDt, idx) {
        if (idx === mo) return;
        var mTxs = mDt.tx || [];
        var total = mTxs.filter(function(t) { return t.cat === cat2.id && !t.reimbursed; })
          .reduce(function(a, t) { return a + myP(t); }, 0);
        if (total > 0) hist.push(total);
      });
      if (hist.length < 2) return;
      var avg = hist.reduce(function(a, v) { return a + v; }, 0) / hist.length;
      var cur2 = spC[cat2.id] || 0;
      if (avg > 50 && cur2 > avg * 1.5) {
        anomalies.push({ cat: cat2, cur: cur2, avg: avg, delta: cur2 - avg, pct: (cur2 - avg) / avg });
      }
    });
    anomalies.sort(function(a, b) { return b.delta - a.delta; });
  }

  var debtors = {};
  function addD(p, it) {
    if (!debtors[p]) debtors[p] = { items: [], total: 0, pending: 0 };
    debtors[p].items.push(it);
    debtors[p].total += it.debt;
    if (!it.rcv) debtors[p].pending += it.debt;
  }
  txs.forEach(function(tx) {
    gsp(tx).forEach(function(s) { addD(s.person || "?", { id: tx.id, desc: tx.desc, amount: tx.amount, debt: tx.amount * (s.pct / 100), rcv: tx.received, src: "tx" }); });
  });
  fxd.filter(function(f) { return gsp(f).length > 0; }).forEach(function(f) {
    gsp(f).forEach(function(s) { addD(s.person || "?", { id: f.id, desc: f.name, amount: f.amount, debt: f.amount * (s.pct / 100), rcv: !!fs[f.id + "_r"], src: "fx" }); });
  });
  (md.debts || []).forEach(function(d) {
    addD(d.person || "?", { id: d.id, desc: d.desc, amount: d.amount, debt: d.amount, rcv: d.received || false, src: "manual" });
  });
  var dRcv = Object.values(debtors).reduce(function(a, d) { return a + (d.total - d.pending); }, 0);
  var fxPd = fxd.filter(function(f) { return fs[f.id] === "paid"; }).length;
  var fxMy = fxd.reduce(function(a, f) { return a + (f.hasSplit ? f.amount - spt(f) : f.amount); }, 0);
  var invSp = spent.investimentos;
  var savR = totalInc > 0 ? invSp / totalInc : 0;
  var prevSp = pvMd ? calcSpent(pvMd, cats, fxd).spent : null;

  /* Active installments */
  var activeInst = [];
  if (yrD) {
    var seen = {};
    yrD.forEach(function(mDt) {
      (mDt.tx || []).forEach(function(tx) {
        if (tx.src !== "proj") return;
        var inst = pi(tx.desc);
        if (!inst) return;
        var key = nd(tx.desc) + "|" + String(Math.round(tx.amount));
        if (!seen[key]) seen[key] = { desc: nd(tx.desc), amount: tx.amount, cat: tx.cat, remaining: 0 };
        seen[key].remaining++;
      });
    });
    Object.values(seen).forEach(function(it) { if (it.remaining > 0) activeInst.push(it); });
    activeInst.sort(function(a, b) { return b.amount - a.amount; });
  }
  var totalInstMonthly = activeInst.reduce(function(a, it) { return a + it.amount; }, 0);

  /* Net worth projection */
  var nwBalance = nw.balance || 0;
  var nwHistory = nw.history || [];
  var monthlyInvest = invSp > 0 ? invSp : totalInc * 0.25;
  var nwProjection = [];
  for (var pi2 = 0; pi2 < 12; pi2++) {
    nwProjection.push(Math.round(nwBalance + monthlyInvest * (pi2 + 1)));
  }
  var nwMax = Math.max.apply(null, nwProjection.concat([nwBalance, 1]));

  /* Annual chart */
  var chD = [];
  var chMx = 1;
  var chMs = 1;
  if (yrD && cfg) {
    var cR = cfg.categories || DC;
    var fR = cfg.fixed || [];
    for (var ci = 0; ci < 12; ci++) {
      var mDt = yrD[ci] || { tx: [], cr: [], fs: {} };
      var mTx = mDt.tx || [];
      var mCr = mDt.cr || [];
      var mFs = mDt.fs || {};
      var es = 0; var iv = 0; var de = 0;
      var mC = sal + mCr.reduce(function(a2, c2) { return a2 + c2.amount; }, 0);
      var catBk = {};
      function aCB(cid, val) { if (!catBk[cid]) catBk[cid] = 0; catBk[cid] += val; }
      var hasRT = mTx.some(function(t2) { return t2.src !== "proj"; });
      var hasRFs = Object.keys(mFs).filter(function(k) { return !k.endsWith("_p") && !k.endsWith("_r"); }).length > 0;
      var hasR = hasRT || hasRFs;
      var isPastNoData = ci < mo && !hasR;
      mTx.forEach(function(t2) {
        var ct = cR.find(function(c2) { return c2.id === t2.cat; });
        if (ct && !t2.reimbursed) {
          var v2 = myP(t2);
          if (ct.group === "essenciais") es += v2;
          else if (ct.group === "investimentos") iv += v2;
          else de += v2;
          aCB(ct.id, v2);
        }
      });
      if (hasR && !isPastNoData) {
        fR.forEach(function(f2) {
          if (mFs[f2.id] === "paid" && (f2.mode || "budget") === "budget") {
            var ct = cR.find(function(c2) { return c2.id === f2.cat; });
            if (ct) {
              var v2 = f2.hasSplit ? f2.amount - spt(f2) : f2.amount;
              if (ct.group === "essenciais") es += v2;
              else if (ct.group === "investimentos") iv += v2;
              else de += v2;
              aCB(ct.id, v2);
            }
          }
        });
      } else if (!isPastNoData && ci >= mo) {
        fR.forEach(function(f2) {
          var ct = cR.find(function(c2) { return c2.id === f2.cat; });
          if (ct) {
            var v2 = f2.hasSplit ? f2.amount - spt(f2) : f2.amount;
            if (ct.group === "essenciais") es += v2;
            else if (ct.group === "investimentos") iv += v2;
            else de += v2;
            aCB(ct.id, v2);
          }
        });
      }
      var tD = Math.round(es + iv + de);
      chD.push({ mes: MA[ci], e: Math.round(es), i: Math.round(iv), d: Math.round(de), td: tD, cr: Math.round(mC), s: Math.round(mC - tD), real: hasR, cats: catBk });
    }
    chMx = Math.max.apply(null, chD.map(function(d) { return Math.max(d.td, d.cr); }).concat([1]));
    chMs = Math.max.apply(null, chD.map(function(d) { return Math.abs(d.s); }).concat([1]));
  }

  var pieD = {};
  GR.forEach(function(g) {
    pieD[g.id] = cats.filter(function(c) { return c.group === g.id && (spC[c.id] || 0) > 0; })
      .map(function(c) { return { id: c.id, name: c.name, icon: c.icon, value: spC[c.id] }; })
      .sort(function(a, b) { return b.value - a.value; });
  });

  /* ── Navigation ── */
  var goPrev = function() {
    if (mo === 0) { sMo(11); sYr(function(y) { return y - 1; }); }
    else { sMo(function(m) { return m - 1; }); }
  };
  var goNext = function() {
    if (mo === 11) { sMo(0); sYr(function(y) { return y + 1; }); }
    else { sMo(function(m) { return m + 1; }); }
  };

  /* ── Actions ── */
  var addTx = function() {
    var v = parseFloat(fm.valor.replace(",", "."));
    if (!fm.desc) { sErr("Descrição"); return; }
    if (isNaN(v)) { sErr("Valor"); return; }
    if (!fm.cat) { sErr("Categoria"); return; }
    sErr("");
    var sp = fm.hs ? fm.sp.filter(function(s) { return s.person && s.pct > 0; }) : [];
    var newTx = { id: uid(), desc: fm.desc, amount: v, cat: fm.cat, payment: fm.pay, splits: sp, hasSplit: sp.length > 0, date: fm.date || new Date().toISOString(), received: false, reimbursed: fm.reimb, note: fm.note || "", src: "manual" };
    saveMd({ ...md, tx: txs.concat([newTx]) });
    var ic = parseInt(fm.ic);
    var it = parseInt(fm.it);
    if (ic && it && ic < it) {
      for (var ii = ic + 1; ii <= it; ii++) {
        var fmo = (mo + (ii - ic)) % 12;
        var fy = yr + Math.floor((mo + (ii - ic)) / 12);
        var fKey = tk(fy, fmo);
        var projDesc = fm.desc + " " + String(ii) + "/" + String(it);
        var projTx = { ...newTx, id: uid(), desc: projDesc, date: "", src: "proj" };
        ld("fc2-m-" + fKey, { tx: [], cr: [], fs: {} }).then(function(fd) {
          sv("fc2-m-" + fKey, { ...fd, tx: fd.tx.concat([projTx]) });
        });
      }
    }
    sFm(emFm);
  };

  var saveTxEdit = function(id) {
    var v = parseFloat(editTxF.valor.replace(",", "."));
    if (!editTxF.desc || isNaN(v) || !editTxF.cat) return;
    var updated = txs.map(function(t) {
      if (t.id !== id) return t;
      return { ...t, desc: editTxF.desc, amount: v, cat: editTxF.cat, note: editTxF.note };
    });
    saveMd({ ...md, tx: updated });
    sETxId(null);
  };

  var openTxEdit = function(tx) {
    if (editTxId === tx.id) { sETxId(null); return; }
    sETxId(tx.id);
    sETxF({ desc: tx.desc, valor: String(tx.amount), cat: tx.cat, note: tx.note || "" });
  };

  var addCr = function() {
    var v = parseFloat(cf.valor.replace(",", "."));
    if (!cf.desc || isNaN(v)) return;
    saveMd({ ...md, cr: crs.concat([{ id: uid(), desc: cf.desc, amount: v, type: cf.type }]) });
    sCf({ desc: "", valor: "", type: "Bônus" });
  };

  var addFx = function() {
    var a = parseFloat(ff.amount.replace(",", "."));
    if (!ff.name) { sErr("Nome"); return; }
    if (isNaN(a)) { sErr("Valor"); return; }
    if (!ff.cat) { sErr("Categoria"); return; }
    sErr("");
    var sp = ff.hs ? ff.sp.filter(function(s) { return s.person && s.pct > 0; }) : [];
    var newFx = { id: uid(), name: ff.name, amount: a, cat: ff.cat, payment: ff.pay, splits: sp, hasSplit: sp.length > 0, mode: ff.mode };
    saveCfg({ ...cfg, fixed: fxd.concat([newFx]) });
    sFf({ name: "", amount: "", cat: "", pay: "PIX", hs: false, sp: [{ person: "Duda", pct: 30 }], mode: "budget" });
    sSFx(false);
  };

  var addPart = function(fid) {
    var v = parseFloat(pV.replace(",", "."));
    if (isNaN(v) || v <= 0) return;
    var parts = (fs[fid + "_p"] || []).concat([{ amount: v, date: new Date().toISOString() }]);
    saveMd({ ...md, fs: { ...fs, [fid + "_p"]: parts } });
    sPV(""); sPO(null);
  };

  var addDebt = function() {
    var v = parseFloat(df.amount.replace(",", "."));
    if (!df.desc || isNaN(v) || !df.person) return;
    var debts = (md.debts || []).concat([{ id: uid(), desc: df.desc, amount: v, person: df.person, received: false }]);
    saveMd({ ...md, debts: debts });
    sDf({ desc: "", amount: "", person: "Duda" }); sSDbt(false);
  };

  var addGoal = function() {
    var t = parseFloat(gf.target.replace(",", "."));
    var s = parseFloat(gf.saved.replace(",", ".")) || 0;
    if (!gf.name || isNaN(t)) return;
    var newGoal = { id: uid(), name: gf.name, target: t, saved: s, deadline: gf.deadline };
    saveCfg({ ...cfg, goals: goals.concat([newGoal]) });
    sGf({ name: "", target: "", deadline: "", saved: "0" }); sSGl(false);
  };

  var sendChat = function() {
    var msg = chatInput.trim();
    if (!msg || chatLd) return;
    var userMsg = { role: "user", text: msg };
    var newMsgs = chatMsgs.concat([userMsg]);
    sChatMsgs(newMsgs);
    sChatIn("");
    sChatLd(true);
    sChatMsgs(function(prev) { return prev.concat([{ role: "ai", text: "🔜 Assistente financeiro em breve! Esta funcionalidade estará disponível em breve." }]); });
    sChatLd(false);
  };

  var updGS = function(id, v) {
    var updated = goals.map(function(g) { return g.id === id ? { ...g, saved: v } : g; });
    saveCfg({ ...cfg, goals: updated });
  };
  var updGD = function(id, d2) {
    var updated = goals.map(function(g) { return g.id === id ? { ...g, deadline: d2 } : g; });
    saveCfg({ ...cfg, goals: updated });
  };
  var rmG = function(id) { saveCfg({ ...cfg, goals: goals.filter(function(g) { return g.id !== id; }) }); };
  var setCatLimit = function(catId, val) {
    var v = parseFloat(val.replace(",", "."));
    var lims = Object.assign({}, catLimits);
    if (isNaN(v) || v <= 0) { delete lims[catId]; } else { lims[catId] = v; }
    saveCfg({ ...cfg, catLimits: lims }); sELimId(null);
  };
  var updateNW = function() {
    var v = parseFloat(nwInput.replace(",", "."));
    if (isNaN(v)) return;
    var h = (nw.history || []).concat([{ date: new Date().toISOString(), balance: v }]);
    saveCfg({ ...cfg, netWorth: { balance: v, history: h } });
    sNwI(""); sShowNw(false);
  };

  var rmTx = function(id) { saveMd({ ...md, tx: txs.filter(function(t) { return t.id !== id; }) }); };
  var rmCr = function(id) { saveMd({ ...md, cr: crs.filter(function(c) { return c.id !== id; }) }); };
  var rmFx = function(id) { saveCfg({ ...cfg, fixed: fxd.filter(function(f) { return f.id !== id; }) }); };
  var togRcv = function(id) {
    var updated = txs.map(function(t) { return t.id === id ? { ...t, received: !t.received } : t; });
    saveMd({ ...md, tx: updated });
  };
  var togRe = function(id) {
    var updated = txs.map(function(t) { return t.id === id ? { ...t, reimbursed: !t.reimbursed } : t; });
    saveMd({ ...md, tx: updated });
  };
  var togFP = function(id) { saveMd({ ...md, fs: { ...fs, [id]: fs[id] === "paid" ? "" : "paid" } }); };
  var togFR = function(id) { saveMd({ ...md, fs: { ...fs, [id + "_r"]: fs[id + "_r"] ? "" : "done" } }); };
  var rmD = function(id) { saveMd({ ...md, debts: (md.debts || []).filter(function(d2) { return d2.id !== id; }) }); };
  var togDR = function(id) {
    var updated = (md.debts || []).map(function(d2) { return d2.id === id ? { ...d2, received: !d2.received } : d2; });
    saveMd({ ...md, debts: updated });
  };
  var clrMo = function() { saveMd({ tx: [], cr: [], fs: {}, debts: [] }); sCfC(false); };
  var openSE = function(tx) {
    if (eId === tx.id) { sEId(null); return; }
    var e = gsp(tx);
    sED(e.length > 0 ? e.slice() : [{ person: "Duda", pct: 30 }]);
    sEId(tx.id);
  };
  var savSE = function(id) {
    var cl = eD.filter(function(s) { return s.person && s.pct > 0; });
    var updated = txs.map(function(t) { return t.id === id ? { ...t, splits: cl, hasSplit: cl.length > 0 } : t; });
    saveMd({ ...md, tx: updated }); sEId(null);
  };
  var rmSE = function(id) {
    var updated = txs.map(function(t) { return t.id === id ? { ...t, splits: [], hasSplit: false } : t; });
    saveMd({ ...md, tx: updated }); sEId(null);
  };

  var handleCSV = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function(ev) {
      var ls = ev.target.result.split("\n").filter(function(l) { return l.trim(); });
      if (ls.length < 2) return;
      var hdr = ls[0].split(",").map(function(h) { return h.trim().replace(/"/g, ""); });
      var rows = ls.slice(1).map(function(l, idx) {
        var c2 = l.split(",").map(function(c3) { return c3.trim().replace(/"/g, ""); });
        var o = { _idx: idx };
        hdr.forEach(function(h, j) { o[h] = c2[j] || ""; });
        return o;
      }).filter(function(r) { return !((r.title || r["Título"] || r["Descrição"] || "").toLowerCase().includes("pagamento")); });
      sCR(rows);
      var ic = {}; var is2 = {};
      rows.forEach(function(r) {
        var d2 = (r.title || r["Título"] || r["Descrição"] || r.description || "").toLowerCase().trim();
        ic[r._idx] = maps[d2] || ""; is2[r._idx] = { on: false, sp: [{ person: "Duda", pct: 30 }] };
      });
      sCC(ic); sCSp(is2);
    };
    rd.readAsText(f, "utf-8"); e.target.value = "";
  };

  var impAll = function() {
    if (!csvR) return;
    var nt = []; var nm = Object.assign({}, maps); var fut = {};
    var sk = 0; var rp = 0; var ad = 0;
    csvR.forEach(function(row) {
      var cid = csvC[row._idx]; if (!cid) return;
      var desc = row.title || row["Título"] || row["Descrição"] || row.description || "Importado";
      var amt = Math.abs(parseFloat((row.amount || row.Valor || row.valor || "").replace(",", ".")));
      if (isNaN(amt) || !amt) return;
      var dt = row.date || row.Data || row.data || "";
      var c2 = csvSp[row._idx] || { on: false, sp: [] };
      var sp = c2.on ? c2.sp.filter(function(s) { return s.person && s.pct > 0; }) : [];
      var inst = pi(desc); var dL = desc.toLowerCase().trim();
      var exC = txs.find(function(ex) { return ex.src === "csv" && ex.desc.toLowerCase().trim() === dL && Math.abs(ex.amount - amt) < 0.01 && (ex.date || "").slice(0, 10) === (dt || "").slice(0, 10); });
      if (exC) { sk++; return; }
      if (inst) {
        var nrm = nd(desc);
        var pIdx = txs.findIndex(function(ex) {
          if (ex.src !== "proj") return false;
          var ei = pi(ex.desc); if (!ei) return false;
          return nd(ex.desc) === nrm && ei.c === inst.c && Math.abs(ex.amount - amt) < 1;
        });
        if (pIdx >= 0) { txs.splice(pIdx, 1); rp++; }
      }
      var newTx2 = { id: uid(), desc: desc, amount: amt, cat: cid, payment: "Cartão Nubank", splits: sp, hasSplit: sp.length > 0, date: dt || new Date().toISOString(), received: false, reimbursed: false, note: "", src: "csv" };
      nt.push(newTx2); ad++; if (dL) nm[dL] = cid;
      if (inst && inst.c < inst.t) {
        for (var ii2 = inst.c + 1; ii2 <= inst.t; ii2++) {
          var fmo2 = (mo + (ii2 - inst.c)) % 12;
          var fy2 = yr + Math.floor((mo + (ii2 - inst.c)) / 12);
          var fKey2 = tk(fy2, fmo2);
          if (!fut[fKey2]) fut[fKey2] = [];
          var futDesc = desc.replace(/\d+\s*\/\s*\d+/, String(ii2) + "/" + String(inst.t));
          fut[fKey2].push({ ...newTx2, id: uid(), desc: futDesc, date: "", src: "proj" });
        }
      }
    });
    saveMd({ ...md, tx: txs.concat(nt) }); saveMaps(nm);
    Object.entries(fut).forEach(function(e2) {
      var fKey3 = e2[0]; var ft = e2[1];
      ld("fc2-m-" + fKey3, { tx: [], cr: [], fs: {} }).then(function(fd) {
        var ex = (fd.tx || []).slice();
        ft.forEach(function(ntx) {
          var ni = pi(ntx.desc); var nn = nd(ntx.desc);
          ex = ex.filter(function(e3) { if (e3.src !== "proj") return true; var ei = pi(e3.desc); return !(ei && nd(e3.desc) === nn && ei.c === ni.c); });
          ex.push(ntx);
        });
        sv("fc2-m-" + fKey3, { ...fd, tx: ex });
      });
    });
    sCR(null);
    alert("✅ " + String(ad) + " adicionadas" + (rp ? ", " + String(rp) + " projeções substituídas" : "") + (sk ? ", " + String(sk) + " duplicadas ignoradas" : ""));
  };

  var tabs = [
    { id: "dash", l: "Dashboard", ico: "◐", grp: "Visão" },
    { id: "analise", l: "Análise", ico: "◇", grp: "Visão" },
    { id: "proj", l: "Projeção", ico: "↗", grp: "Visão" },
    { id: "input", l: "Lançamentos", ico: "≡", grp: "Operação" },
    { id: "fixas", l: "Fixas", ico: "⌶", grp: "Operação" },
    { id: "deve", l: "Devedores", ico: "⊕", grp: "Operação" },
    { id: "vida", l: "Vida (PL)", ico: "○", grp: "Patrimônio" },
    { id: "metas", l: "Metas", ico: "◯", grp: "Patrimônio" },
    { id: "monthly", l: "Mensal", ico: "▦", grp: "Patrimônio" },
  ];
  var tabGroups = ["Visão", "Operação", "Patrimônio"];
  var curTab = tabs.find(function(t) { return t.id === tab; }) || tabs[0];
  var goTab = function(id) { sTab(id); sErr(""); sTxS(""); sCfC(false); sCatF(null); sShowMore(false); };

  var filteredTxs = txs.filter(function(tx) {
    if (catF) {
      var cat2 = cats.find(function(c) { return c.id === tx.cat; });
      if (!cat2) return false;
      var isGrp = GR.some(function(g) { return g.id === catF; });
      if (isGrp) { if (cat2.group !== catF) return false; }
      else { if (tx.cat !== catF) return false; }
    }
    if (txSearch) {
      var q = txSearch.toLowerCase();
      var catName = ((cats.find(function(c) { return c.id === tx.cat; }) || {}).name || "").toLowerCase();
      if (tx.desc.toLowerCase().indexOf(q) < 0 && catName.indexOf(q) < 0) return false;
    }
    return true;
  });

  return (
    <div className="prumo-root" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{PRUMO_TOKENS}</style>

      {/* MOBILE HEADER */}
      <header className="prumo-mobile-header">
        <div>
          <div className="greet">{"Olá, " + ((user && user.displayName) ? String(user.displayName).split(" ")[0] : "Gui")}</div>
          <div className="title">{curTab.l}</div>
        </div>
        <div className="prumo-avatar" onClick={function() { signOut(auth); }} title="Sair">
          {((user && user.displayName) ? String(user.displayName).charAt(0) : "G").toUpperCase()}
        </div>
      </header>

      {/* MOBILE MONTH SWITCHER */}
      <div className="prumo-month-mobile">
        <button onClick={goPrev}>{"‹"}</button>
        <span>{MS[mo] + " " + String(yr)}</span>
        <button onClick={goNext}>{"›"}</button>
      </div>

      <div className="prumo-shell">
        {/* DESKTOP SIDEBAR */}
        <aside className="prumo-sidebar">
          <div className="prumo-sb-logo">
            <span className="glyph"></span>
            <span className="word">{"Prumo"}</span>
          </div>
          {tabGroups.map(function(grp) {
            return (
              <div key={grp}>
                <div className="prumo-sb-section">{grp}</div>
                {tabs.filter(function(t) { return t.grp === grp; }).map(function(t) {
                  var ac = tab === t.id;
                  var badge = null;
                  if (t.id === "fixas") {
                    var pend = fxd.filter(function(f) { return fs[f.id] !== "paid" && (f.mode || "budget") === "budget"; }).length;
                    if (pend > 0) badge = pend;
                  }
                  if (t.id === "deve") {
                    var devCount = Object.values(debtors).filter(function(d) { return d.pending > 0; }).length;
                    if (devCount > 0) badge = devCount;
                  }
                  return (
                    <button key={t.id} className={"prumo-sb-item" + (ac ? " active" : "")} onClick={function() { goTab(t.id); }}>
                      <span className="ico">{t.ico}</span>
                      <span>{t.l}</span>
                      {badge !== null && <span className="badge">{String(badge)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div className="prumo-sb-foot">
            <div className="av">{((user && user.displayName) ? String(user.displayName).charAt(0) : "G").toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(user && user.displayName) ? String(user.displayName) : "Guilherme"}</div>
              <div className="em" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(user && user.email) ? String(user.email) : ""}</div>
            </div>
            <button onClick={function() { signOut(auth); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--ink-3)", padding: "4px 6px", fontFamily: "var(--f-ui)" }} title="Sair">{"Sair"}</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="prumo-main">
          {/* DESKTOP TOPBAR */}
          <div className="prumo-topbar">
            <div>
              <div className="greet">{"Olá, " + ((user && user.displayName) ? String(user.displayName).split(" ")[0] : "Gui") + " · " + new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</div>
              <h1>{curTab.l}</h1>
            </div>
            <div className="prumo-topbar-r">
              <div className="prumo-month-pill">
                <button onClick={goPrev}>{"‹"}</button>
                <span>{MS[mo].toUpperCase() + " " + String(yr)}</span>
                <button onClick={goNext}>{"›"}</button>
              </div>
            </div>
          </div>

          {/* DESKTOP QUICK ADD */}
          <div className="prumo-quick-add" onClick={function() { goTab("input"); }}>
            <span className="ico-q">{"＋"}</span>
            <span className="qa-text">{"Lance: 'Mercado 234' · 'Café 18 PIX' · 'Uber 26 dividir Duda'..."}</span>
            <span className="kbd">{"N"}</span>
          </div>

          <div key={tab} className="fc-tab-content">

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dash" && (
          <DashboardPrumo
            cfg={cfg} sal={sal} totalInc={totalInc} extraCr={extraCr} bud={bud} budWithRollover={budWithRollover}
            spent={spent} prevSp={prevSp} GR={GR} cats={cats} spC={spC} totDb={totDb}
            savR={savR} dRcv={dRcv} debtors={debtors} txs={txs} crs={crs} fxd={fxd} fs={fs}
            md={md} catLimits={catLimits} goals={goals} chD={chD} chMx={chMx} hovM={hovM} sHM={sHM} mo={mo}
            sTab={goTab} eSal={eSal} sES={sES} salI={salI} sSI={sSI} saveCfg={saveCfg} DS={DS}
            nw={nw} monthlyInvest={monthlyInvest}
          />
        )}

        {/* ═══ VIDA (PL) — placeholder ═══ */}
        {tab === "vida" && (
          <div className="prumo-card l-brand">
            <div className="prumo-lbl">{"Patrimônio Líquido"}</div>
            <div className="prumo-big brand">{fmt(nw.balance || 0)}</div>
            <div className="prumo-cap" style={{ marginTop: 8 }}>{"Tela completa em construção. Por enquanto, valor consolidado vindo de Configurações > Patrimônio."}</div>
            <button className="prumo-btn ghost" style={{ marginTop: 14 }} onClick={function() { goTab("proj"); }}>{"Ir para Projeção →"}</button>
          </div>
        )}


        {/* ═══ PROJEÇÃO ═══ */}
        {tab === "proj" && (
          <div>
            {/* Taxa de poupança */}
            <div style={S.cardA(BL)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={S.lbl}>{"TAXA DE POUPANÇA"}</div><div style={S.cap}>{"Investido / Renda total"}</div></div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: savR >= 0.25 ? OK : savR >= 0.1 ? WN : ER }}>{pct(savR)}</div>
              </div>
              <PB value={invSp} max={totalInc} color={BL} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, ...S.cap }}>
                <span>{fmt(invSp)}</span><span>{"Meta 25%: " + fmt(totalInc * 0.25)}</span>
              </div>
            </div>

            {/* Patrimônio líquido */}
            <div style={S.cardA("#1A2B5F")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={S.lbl}>{"PATRIMÔNIO LÍQUIDO"}</div>
                <button style={{ ...S.btn(BD), padding: "6px 12px", fontSize: 12 }} onClick={function() { sShowNw(!showNw); }}>{"✏️ Atualizar"}</button>
              </div>
              {showNw && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <input style={{ ...S.inp, flex: 1 }} placeholder="Saldo atual (R$)" value={nwInput} inputMode="decimal" onChange={function(e) { sNwI(e.target.value); }} />
                  <button style={S.btn(BD)} onClick={updateNW}>{"OK"}</button>
                  <button style={S.btnO} onClick={function() { sShowNw(false); }}>{"×"}</button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div><div style={S.cap}>{"Saldo atual"}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#1A2B5F" }}>{fmt(nwBalance)}</div></div>
                <div><div style={S.cap}>{"Investido este mês"}</div><div style={{ fontSize: 22, fontWeight: 700, color: BL }}>{fmt(invSp)}</div></div>
              </div>

              {nwHistory.length > 1 && (
                <div style={{ marginTop: 10 }}>
                  <div style={S.lbl}>{"EVOLUÇÃO DO PATRIMÔNIO"}</div>
                  {(function() {
                    var hist = nwHistory.slice(-12);
                    var maxV = Math.max.apply(null, hist.map(function(h) { return h.balance; }).concat([1]));
                    var minV = Math.min.apply(null, hist.map(function(h) { return h.balance; }));
                    var range = maxV - minV || 1;
                    return (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
                          {hist.map(function(h, idx) {
                            var barH = ((h.balance - minV) / range) * 60 + 10;
                            var isLast = idx === hist.length - 1;
                            var isUp = idx > 0 && h.balance >= hist[idx-1].balance;
                            return (
                              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ width: "100%", height: barH, background: isLast ? BD : (isUp ? OK + "80" : ER + "60"), borderRadius: "3px 3px 0 0", transition: "height 0.4s" }} />
                                <div style={{ fontSize: 7, color: isLast ? BD : TM, marginTop: 2, fontWeight: isLast ? 700 : 400 }}>{sd(h.date).slice(0,5)}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, ...S.cap }}>
                          <span>{"Mín: " + fmt(minV)}</span>
                          <span style={{ fontWeight: 700, color: BD }}>{"Atual: " + fmt(nwBalance)}</span>
                          <span>{"Máx: " + fmt(maxV)}</span>
                        </div>
                        {hist.length >= 2 && (
                          <div style={{ marginTop: 6, padding: "6px 10px", background: nwBalance > hist[0].balance ? OK + "12" : ER + "12", borderRadius: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: nwBalance > hist[0].balance ? OK : ER }}>
                              {nwBalance > hist[0].balance ? "▲ +" : "▼ "}
                              {fmt(Math.abs(nwBalance - hist[0].balance)) + " desde " + sd(hist[0].date).slice(0,5) + " (" + pct(Math.abs((nwBalance - hist[0].balance) / hist[0].balance)) + ")"}
                            </span>
                          </div>
                        )}
                        <div style={{ marginTop: 10 }}>
                          <div style={S.lbl}>{"GERENCIAR HISTÓRICO"}</div>
                          {nwHistory.slice().reverse().map(function(h2, idx2) {
                            return (
                              <div key={idx2} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid " + BR }}>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: TX }}>{fmt(h2.balance)}</span>
                                  <span style={{ ...S.cap, marginLeft: 8 }}>{sd(h2.date)}</span>
                                </div>
                                <span onClick={function() {
                                  var newHist = nwHistory.filter(function(x) { return x.date !== h2.date; });
                                  var newBal = newHist.length > 0 ? newHist[newHist.length - 1].balance : 0;
                                  saveCfg({ ...cfg, netWorth: { balance: newBal, history: newHist } });
                                }} style={{ cursor: "pointer", color: ER, fontSize: 16, padding: "0 6px", fontWeight: 700 }} title="Remover entrada">{"×"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Simulador de aportes */}
            {(function() {
              var simA = parseFloat(String(simAporte).replace(",", ".")) || 0;
              var simR = (parseFloat(String(simTaxa).replace(",", ".")) || 0) / 100;
              var simN = parseInt(simTempo) || 0;
              var simFV = simN > 0 ? (nwBalance * Math.pow(1 + simR, simN) + (simR > 0 ? simA * (Math.pow(1 + simR, simN) - 1) / simR : simA * simN)) : nwBalance;
              var simTotalAport = simA * simN;
              var simJuros = simFV - nwBalance - simTotalAport;
              var simAnos = simN > 0 ? (simN / 12).toFixed(1) : "0";
              var numBars = Math.min(simN, 12);
              var step = numBars > 0 ? Math.ceil(simN / numBars) : 1;
              var simBars = [];
              for (var bi = 0; bi < numBars; bi++) {
                var mn = Math.min((bi + 1) * step, simN);
                var bv = mn > 0 ? (nwBalance * Math.pow(1 + simR, mn) + (simR > 0 ? simA * (Math.pow(1 + simR, mn) - 1) / simR : simA * mn)) : nwBalance;
                var bp = nwBalance + simA * mn;
                simBars.push({ m: mn, fv: bv, principal: bp, juros: bv - bp });
              }
              var barMax = simFV > 0 ? simFV : 1;
              var jurosRatio = simFV > 0 ? simJuros / simFV : 0;
              return (
                <div style={S.cardA(BL)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={S.lbl}>{"SIMULADOR DE APORTES"}</div>
                      <div style={{ ...S.cap, marginTop: 2 }}>{"Juros compostos sobre patrimônio atual"}</div>
                    </div>
                    <span style={{ fontSize: 20 }}>{"📈"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={S.lbl}>{"APORTE/MÊS"}</div>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: TM, fontWeight: 600 }}>{"R$"}</span>
                        <input style={{ ...S.inp, paddingLeft: 26, fontSize: 13 }} value={simAporte} inputMode="decimal"
                          onChange={function(e) { sSimA(e.target.value); }} />
                      </div>
                    </div>
                    <div>
                      <div style={S.lbl}>{"TAXA MÊS"}</div>
                      <div style={{ position: "relative" }}>
                        <input style={{ ...S.inp, paddingRight: 24, fontSize: 13 }} value={simTaxa} inputMode="decimal"
                          onChange={function(e) { sSimT(e.target.value); }} />
                        <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: TM, fontWeight: 600 }}>{"%"}</span>
                      </div>
                    </div>
                    <div>
                      <div style={S.lbl}>{"TEMPO (M)"}</div>
                      <input style={{ ...S.inp, fontSize: 13 }} value={simTempo} inputMode="numeric"
                        onChange={function(e) { sSimTp(e.target.value); }} />
                    </div>
                  </div>

                  <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", marginBottom: 12, border: "1px solid " + BL + "30" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <div style={S.cap}>{"Patrimônio em " + String(simAnos) + " anos"}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: BD }}>{fmt(simFV)}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                      <div style={{ textAlign: "center", padding: "6px 4px", background: "#fff", borderRadius: 6, border: "1px solid " + BR }}>
                        <div style={{ ...S.cap, marginBottom: 2 }}>{"Patrimônio hoje"}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T2 }}>{fmt(nwBalance)}</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "6px 4px", background: "#fff", borderRadius: 6, border: "1px solid " + BR }}>
                        <div style={{ ...S.cap, marginBottom: 2 }}>{"Total aportado"}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: BL }}>{fmt(simTotalAport)}</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "6px 4px", background: "#fff", borderRadius: 6, border: "1px solid " + BR }}>
                        <div style={{ ...S.cap, marginBottom: 2 }}>{"Juros gerados"}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: OK }}>{fmt(simJuros > 0 ? simJuros : 0)}</div>
                      </div>
                    </div>
                    <div style={S.lbl}>{"COMPOSIÇÃO DO PATRIMÔNIO FINAL"}</div>
                    <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex", marginTop: 4 }}>
                      <div style={{ width: String(simFV > 0 ? (nwBalance / simFV) * 100 : 0) + "%", background: "#003F5D", transition: "width 0.4s" }} />
                      <div style={{ width: String(simFV > 0 ? (simTotalAport / simFV) * 100 : 0) + "%", background: "#A3CEEF", transition: "width 0.4s" }} />
                      <div style={{ flex: 1, background: "#006DB2", transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                      {[["#003F5D", "Patrimônio atual"], ["#A3CEEF", "Aportes"], ["#006DB2", "Juros (" + pct(jurosRatio) + ")"]].map(function(it) {
                        return (
                          <div key={it[1]} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: it[0] }} />
                            <span style={{ fontSize: 9, color: TM }}>{it[1]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {simBars.length > 0 && (
                    <div>
                      <div style={S.lbl}>{"EVOLUÇÃO DO PATRIMÔNIO"}</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90, marginTop: 6 }}>
                        {simBars.map(function(bar, idx) {
                          var totalH = barMax > 0 ? (bar.fv / barMax) * 80 : 0;
                          var principalH = bar.fv > 0 ? (bar.principal / bar.fv) * totalH : 0;
                          var jurosH = totalH - principalH;
                          var lbl = bar.m >= 12 ? String(Math.round(bar.m / 12)) + "a" : String(bar.m) + "m";
                          return (
                            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: "hidden" }}>
                                <div style={{ height: principalH, background: BL + "80" }} />
                                <div style={{ height: jurosH, background: OK }} />
                              </div>
                              <div style={{ fontSize: 7, color: TM, marginTop: 2 }}>{lbl}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        {[[BL + "80", "Principal"], [OK, "Juros"]].map(function(it) {
                          return (
                            <div key={it[1]} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: it[0] }} />
                              <span style={{ fontSize: 9, color: TM }}>{it[1]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Renda Passiva */}
            {(function() {
              var rpTaxa = 0.007;
              var rpMensal = nwBalance * rpTaxa;
              var fxTotal = fxd.reduce(function(a, f) { return a + (f.hasSplit ? f.amount - spt(f) : f.amount); }, 0);
              var coverPct = fxTotal > 0 ? rpMensal / fxTotal : 0;
              var milestones = fxd.slice().sort(function(a, b) { return a.amount - b.amount; });
              var coveredFx = [];
              var remaining2 = rpMensal;
              milestones.forEach(function(f) {
                var myA = f.hasSplit ? f.amount - spt(f) : f.amount;
                if (remaining2 >= myA) { coveredFx.push(f); remaining2 -= myA; }
              });
              return (
                <div style={S.cardA("#7C3AED")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={S.lbl}>{"RENDA PASSIVA DO PL"}</div>
                      <div style={{ ...S.cap, marginTop: 2 }}>{"PL atual × 0,7% a.m. (padrão conservador)"}</div>
                    </div>
                    <span style={{ fontSize: 20 }}>{"🏦"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", border: "1px solid " + BL + "30" }}>
                      <div style={S.cap}>{"Renda passiva/mês"}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: BD, fontFamily: "'Montserrat',sans-serif" }}>{fmt(rpMensal)}</div>
                    </div>
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", border: "1px solid " + BL + "30" }}>
                      <div style={S.cap}>{"Cobre " + pct(Math.min(coverPct, 1)) + " das fixas"}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: coverPct >= 1 ? OK : "#7C3AED", fontFamily: "'Montserrat',sans-serif" }}>{fmt(fxTotal)}</div>
                    </div>
                  </div>
                  <PB value={rpMensal} max={Math.max(fxTotal, 1)} color="#7C3AED" noWarn={true} />
                  {fxd.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={S.lbl}>{"CONTAS QUE JÁ CONSEGUIRIA PAGAR"}</div>
                      {coveredFx.length === 0 ? (
                        <div style={{ ...S.cap, marginTop: 6, color: ER }}>{"Ainda não cobre nenhuma conta fixa. Continue investindo!"}</div>
                      ) : (
                        <div style={{ marginTop: 6 }}>
                          {coveredFx.map(function(f) {
                            var cat2 = cats.find(function(c) { return c.id === f.cat; });
                            var myA = f.hasSplit ? f.amount - spt(f) : f.amount;
                            return (
                              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #F0F0F0" }}>
                                <span style={{ color: OK, fontSize: 12 }}>{"✅"}</span>
                                <span style={{ fontSize: 12, color: T3, flex: 1 }}>{cat2 ? cat2.icon + " " : ""}{f.name}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: TX }}>{fmt(myA)}</span>
                              </div>
                            );
                          })}
                          <div style={{ marginTop: 8, padding: "8px 10px", background: "#F0FDF4", borderRadius: 6, border: "1px solid #86EFAC" }}>
                            <div style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>
                              {"💡 Com " + fmt(nwBalance) + " investido você já paga " + String(coveredFx.length) + " conta" + (coveredFx.length > 1 ? "s" : "") + " fixa" + (coveredFx.length > 1 ? "s" : "") + " todo mês — sem trabalhar."}
                            </div>
                          </div>
                        </div>
                      )}
                      {coveredFx.length < fxd.length && (
                        <div style={{ marginTop: 8 }}>
                          <div style={S.lbl}>{"🎮 PRÓXIMAS CONQUISTAS"}</div>
                          <div style={{ ...S.cap, marginBottom: 8 }}>{"Da menor para a maior — tangibilize o caminho"}</div>
                          {(function() {
                            var uncovered = fxd.filter(function(f) { return coveredFx.indexOf(f) < 0; })
                              .map(function(f2) {
                                var myA2 = f2.hasSplit ? f2.amount - spt(f2) : f2.amount;
                                var plNeeded2 = Math.ceil(myA2 / rpTaxa);
                                return { f: f2, myA: myA2, plNeeded: plNeeded2, rpGerada: plNeeded2 * rpTaxa };
                              })
                              .filter(function(item) { return item.plNeeded > nwBalance; })
                              .sort(function(a, b) { return a.myA - b.myA; });
                            if (uncovered.length === 0) return (
                              <div style={{ textAlign: "center", padding: "12px 0", color: OK, fontSize: 12, fontWeight: 600 }}>{"🏆 Você já cobre todas as contas fixas com sua renda passiva!"}</div>
                            );
                            return uncovered.slice(0, 5).map(function(item) {
                              var faltaPL = item.plNeeded - nwBalance;
                              var progressPct = Math.min(nwBalance / item.plNeeded, 1);
                              var cat3 = cats.find(function(c) { return c.id === item.f.cat; });
                              return (
                                <div key={item.f.id} style={{ padding: "10px 0", borderBottom: "1px solid " + BR }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 16 }}>{cat3 ? cat3.icon : "💳"}</span>
                                      <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: TX }}>{item.f.name}</div>
                                        <div style={S.cap}>{fmt(item.myA) + "/mês"}</div>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: PETR }}>{"PL: " + fmt(item.plNeeded)}</div>
                                      <div style={{ fontSize: 10, color: TEAL, fontWeight: 600 }}>{"→ gera " + fmt(item.rpGerada) + "/mês"}</div>
                                      <div style={{ ...S.cap, color: ER }}>{"falta " + fmt(faltaPL) + " no PL"}</div>
                                    </div>
                                  </div>
                                  <div style={{ height: 6, background: BR, borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ width: pct(progressPct), height: "100%", background: TEAL, borderRadius: 3, transition: "width 0.5s" }} />
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                    <span style={{ fontSize: 9, color: TM }}>{fmt(nwBalance) + " atual"}</span>
                                    <span style={{ fontSize: 9, color: TM }}>{pct(progressPct) + " do caminho"}</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {fxd.length === 0 && (
                    <div style={{ ...S.cap, textAlign: "center", padding: 12, color: TM }}>{"Cadastre contas fixas para ver quais o seu PL já consegue pagar."}</div>
                  )}
                </div>
              );
            })()}

            {/* Termômetro de Liberdade Financeira */}
            {(function() {
              var rpTaxa2 = 0.007;
              var rpMensal2 = nwBalance * rpTaxa2;
              var ifTargetVal = parseFloat(String(ifTarget).replace(",", ".")) || 0;
              var totalExp = ifTargetVal > 0 ? ifTargetVal : (totDb > 0 ? totDb : totalInc * 0.75);
              var fiPct = totalExp > 0 ? Math.min(rpMensal2 / totalExp, 1) : 0;
              var plFor100 = totalExp > 0 ? Math.ceil(totalExp / rpTaxa2) : 0;
              var plFor25 = Math.ceil(plFor100 * 0.25);
              var plFor50 = Math.ceil(plFor100 * 0.5);
              var milestones2 = [
                { pct: 0.25, label: "25% IF", desc: "Renda passiva cobre 1/4 dos gastos", color: "#60A5FA" },
                { pct: 0.50, label: "50% IF", desc: "Meio caminho andado", color: WN },
                { pct: 0.75, label: "75% IF", desc: "Quase lá!", color: "#A78BFA" },
                { pct: 1.00, label: "🏆 IF Total", desc: "Liberdade financeira completa", color: OK },
              ];
              var nextMilestone = milestones2.find(function(m) { return fiPct < m.pct; }) || milestones2[3];
              var plToNext = Math.max(0, Math.ceil((nextMilestone.pct * totalExp) / rpTaxa2) - nwBalance);
              return (
                <div style={S.cardA(OK)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={S.lbl}>{"TERMÔMETRO DE LIBERDADE FINANCEIRA"}</div>
                      <div style={{ ...S.cap, marginTop: 2 }}>{"Quanto da sua vida o PL já financia"}</div>
                    </div>
                    <button onClick={function() { sShowIfEdit(!showIfEdit); }}
                      style={{ ...S.btnO, padding: "5px 10px", fontSize: 11 }}>
                      {showIfEdit ? "Fechar" : "🎯 Definir meta"}
                    </button>
                  </div>
                  {showIfEdit && (
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", marginBottom: 12, border: "1px solid " + BR }}>
                      <div style={S.lbl}>{"GASTO MENSAL DESEJADO NA IF (R$)"}</div>
                      <div style={{ ...S.cap, marginBottom: 8 }}>{"Quanto você quer gastar por mês quando atingir a independência financeira"}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input style={{ ...S.inp, flex: 1 }} placeholder="Ex: 15000" value={ifTarget} inputMode="decimal"
                          onChange={function(e) { sIfTarget(e.target.value); }} />
                        <button style={S.btn(BD)} onClick={function() { sShowIfEdit(false); }}>{"OK"}</button>
                        {ifTarget && <button style={S.btnO} onClick={function() { sIfTarget(""); }}>{"Limpar"}</button>}
                      </div>
                      {!ifTarget && <div style={{ ...S.cap, marginTop: 6, color: WN }}>{"Sem meta definida — usando gastos do mês atual como referência"}</div>}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: fiPct >= 1 ? OK : fiPct >= 0.5 ? WN : BL }}>
                      {pct(fiPct)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>{"de Independência Financeira"}</div>
                      <div style={S.cap}>{"Renda passiva " + fmt(rpMensal2) + " / Gastos " + fmt(totalExp)}</div>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 20, background: "#F0F0F0", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(fiPct), background: fiPct >= 1 ? OK : "linear-gradient(90deg, " + BL + ", #7C3AED)", borderRadius: 10, transition: "width 0.8s ease" }} />
                    {milestones2.map(function(m) {
                      return (
                        <div key={m.label} style={{ position: "absolute", left: pct(m.pct), top: 0, bottom: 0, width: 2, background: "#ffffff60" }} />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    {milestones2.map(function(m) {
                      var reached = fiPct >= m.pct;
                      return (
                        <div key={m.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: reached ? m.color : TM }}>{m.label}</div>
                          {reached && <div style={{ fontSize: 9, color: OK }}>{"✅"}</div>}
                        </div>
                      );
                    })}
                  </div>
                  {fiPct < 1 && (
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", border: "1px solid " + BL + "30" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: BD, marginBottom: 4 }}>{"Próximo marco: " + nextMilestone.label}</div>
                      <div style={S.cap}>{nextMilestone.desc}</div>
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={S.cap}>{"PL necessário"}</span>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: BD }}>{fmt(Math.ceil(nextMilestone.pct * totalExp / rpTaxa2))}</span>
                            <span style={{ fontSize: 10, color: TEAL, fontWeight: 600, marginLeft: 6 }}>{"→ " + fmt(Math.ceil(nextMilestone.pct * totalExp / rpTaxa2) * rpTaxa2) + "/mês"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={S.cap}>{"Falta acumular"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: ER }}>{fmt(plToNext)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={S.cap}>{"Renda passiva atual"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{fmt(rpMensal2) + "/mês"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {fiPct >= 1 && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "12px", border: "1px solid #86EFAC", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>{"🏆 Parabéns! Você atingiu a Independência Financeira!"}</div>
                      <div style={{ ...S.cap, color: "#166534", marginTop: 4 }}>{"Sua renda passiva cobre 100% dos seus gastos."}</div>
                    </div>
                  )}
                  {plFor100 > 0 && fiPct < 1 && (
                    <div style={{ marginTop: 10, ...S.cap, textAlign: "center", color: TM }}>{"IF Total: PL de " + fmt(plFor100) + " gerando " + fmt(totalExp) + "/mês"}</div>
                  )}
                </div>
              );
            })()}

            {/* Parcelas ativas */}
            {activeInst.length > 0 && (
              <div style={S.cardA("#D97706")}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={S.lbl}>{"PARCELAS ATIVAS"}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={S.cap}>{"Custo mensal"}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#D97706" }}>{fmt(totalInstMonthly)}</div>
                  </div>
                </div>
                {activeInst.map(function(it, idx) {
                  var cat2 = cats.find(function(c) { return c.id === it.cat; });
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
                      <span style={{ fontSize: 14 }}>{cat2 ? cat2.icon : "💳"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{it.desc}</div>
                        <div style={S.cap}>{String(it.remaining) + " parcelas restantes"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#D97706" }}>{fmt(it.amount) + "/mês"}</div>
                        <div style={S.cap}>{"Total: " + fmt(it.amount * it.remaining)}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ ...S.cap, fontWeight: 700 }}>{"Compromisso total"}</span>
                  <span style={{ fontWeight: 700, color: "#D97706" }}>{fmt(activeInst.reduce(function(a, it) { return a + it.amount * it.remaining; }, 0))}</span>
                </div>
              </div>
            )}

            {/* Comparativo */}
            {prevSp && (
              <div style={S.card}>
                <div style={S.lbl}>{"COMPARATIVO " + MA[mo === 0 ? 11 : mo - 1].toUpperCase() + " → " + MA[mo].toUpperCase()}</div>
                <div style={{ marginTop: 8 }}>
                  {GR.map(function(g) {
                    var c2 = spent[g.id]; var pv = prevSp[g.id]; var diff = c2 - pv;
                    var pD = pv > 0 ? diff / pv : 0;
                    var isGood = g.id === "investimentos" ? diff > 0 : diff < 0;
                    return (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
                        <div style={{ width: 4, height: 28, borderRadius: 2, background: g.color }} />
                        <span style={{ flex: 1, fontSize: 13, color: T3 }}>{g.label}</span>
                        <span style={{ ...S.cap, minWidth: 70, textAlign: "right" }}>{fmt(pv)}</span>
                        <span style={{ color: "#BBBBBB" }}>{"→"}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 70, textAlign: "right" }}>{fmt(c2)}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isGood ? OK : ER, minWidth: 55, textAlign: "right" }}>{(diff > 0 ? "▲" : "▼") + " " + pct(Math.abs(pD))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gráfico anual */}
            {chD.length > 0 && (
              <div style={S.card}>
                <div style={S.h2}>{"Projeção Anual " + String(yr)}</div>
                <div style={{ ...S.cap, marginBottom: 10 }}>{"Fixas + parcelas projetadas"}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {[["Ess.", "#0D9488"], ["Inv.", "#1A2B5F"], ["Des.", "#D97706"], ["Créd.", "#2563EB"]].map(function(it) {
                    return (
                      <div key={it[0]} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: it[0] === "Créd." ? 7 : 2, background: it[1] }} />
                        <span style={{ fontSize: 10, color: TM }}>{it[0]}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 170, padding: "0 1px", position: "relative" }}>
                  {chD.map(function(d, idx) {
                    var bH = chMx > 0 ? (d.td / chMx) * 150 : 0;
                    var eH = d.td > 0 ? (d.e / d.td) * bH : 0;
                    var iH = d.td > 0 ? (d.i / d.td) * bH : 0;
                    var dH = d.td > 0 ? (d.d / d.td) * bH : 0;
                    var cH = chMx > 0 ? (d.cr / chMx) * 150 : 0;
                    var cu = idx === mo;
                    var isH = hovM === idx;
                    return (
                      <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", cursor: "pointer" }}
                        onClick={function() { sHM(isH ? null : idx); }}
                        onMouseEnter={function() { sHM(idx); }}
                        onMouseLeave={function() { sHM(null); }}>
                        <div style={{ position: "absolute", bottom: cH, left: 0, right: 0, height: 2, background: "#2563EB", borderRadius: 1, zIndex: 2 }} />
                        <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: "hidden", opacity: d.real ? 1 : 0.35, outline: isH ? "2px solid " + BL : "none", outlineOffset: 1, transformOrigin: "bottom", animation: "growBar 0.6s ease " + String(idx * 0.04) + "s both" }}>
                          <div style={{ height: eH, background: "#0D9488" }} />
                          <div style={{ height: iH, background: "#1A2B5F" }} />
                          <div style={{ height: dH, background: "#D97706" }} />
                        </div>
                        <div style={{ fontSize: 8, color: cu ? BD : "#BBBBBB", marginTop: 2, fontWeight: cu ? 800 : 400 }}>{d.mes}</div>
                        {isH && d.td > 0 && <ChartTip d={d} i={idx} cats={cats} />}
                      </div>
                    );
                  })}
                </div>
                <div style={{ ...S.lbl, marginTop: 14 }}>{"SALDO MENSAL"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 2, height: 80 }}>
                  {chD.map(function(d, idx) {
                    var h = chMs > 0 ? (Math.abs(d.s) / chMs) * 30 : 0;
                    var pos = d.s >= 0;
                    var cu = idx === mo;
                    return (
                      <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center" }}>
                        <div style={{ height: 30, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {pos && <div style={{ width: "100%", height: h, background: OK, borderRadius: "2px 2px 0 0", opacity: cu ? 1 : 0.5 }} />}
                        </div>
                        <div style={{ width: "100%", height: 1, background: BR }} />
                        <div style={{ height: 30, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                          {!pos && <div style={{ width: "100%", height: h, background: ER, borderRadius: "0 0 2px 2px", opacity: cu ? 1 : 0.5 }} />}
                        </div>
                        <div style={{ fontSize: 8, color: cu ? BD : "#BBBBBB", fontWeight: cu ? 800 : 400 }}>{d.mes}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ overflowX: "auto", marginTop: 8 }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 10, width: "100%", minWidth: 430 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: 4, textAlign: "left", color: TM, borderBottom: "1px solid #F0F0F0" }}>{""}</th>
                        {chD.map(function(d, idx) {
                          return <th key={idx} style={{ padding: 4, textAlign: "center", color: idx === mo ? BD : TM, borderBottom: "1px solid #F0F0F0", fontWeight: idx === mo ? 800 : 400 }}>{d.mes}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {[{ l: "Déb.", k: "td", c: ER }, { l: "Créd.", k: "cr", c: OK }, { l: "Saldo", k: "s", c: BD }].map(function(row) {
                        return (
                          <tr key={row.k}>
                            <td style={{ padding: 4, fontWeight: 700, color: row.c, borderBottom: "1px solid #FAFAFA" }}>{row.l}</td>
                            {chD.map(function(d, idx) {
                              var val = d[row.k] || 0;
                              var cellColor = row.k === "s" ? (val >= 0 ? OK : ER) : T3;
                              return <td key={idx} style={{ padding: 4, textAlign: "center", borderBottom: "1px solid #FAFAFA", color: cellColor, fontWeight: idx === mo ? 700 : 400 }}>{fK(val)}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ANÁLISE ANUAL ═══ */}
        {tab === "analise" && (
          <div>
            {/* Comparativo visual mensal */}
            {chD.length > 0 && (function() {
              var realMonths = chD.filter(function(d) { return d.real || d.td > 0 || d.cr > 0; });
              if (realMonths.length === 0) return null;
              var allMax = Math.max.apply(null, chD.map(function(d) { return Math.max(d.td, d.cr); }).concat([1]));
              var groups = [
                { key: "e", label: "Essenciais", color: TEAL },
                { key: "i", label: "Investimentos", color: BD },
                { key: "d", label: "Não Essenciais", color: AMB },
                { key: "cr", label: "Crédito", color: OK },
              ];
              return (
                <div style={S.card}>
                  <div style={{ ...S.h2, marginBottom: 2 }}>{"Comparativo Visual " + String(yr)}</div>
                  <div style={{ ...S.cap, marginBottom: 14 }}>{"Somente meses com dados reais"}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    {groups.map(function(g) {
                      return (
                        <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                          <span style={{ fontSize: 10, color: TM }}>{g.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {chD.map(function(d, idx) {
                    if (!d.real && d.td === 0 && d.cr === 0) return null;
                    var isCur = idx === mo;
                    return (
                      <div key={idx} style={{ marginBottom: 16, padding: isCur ? "10px 10px 10px 10px" : "6px 0", background: isCur ? BG : "transparent", borderRadius: isCur ? 8 : 0, border: isCur ? "1px solid " + BR : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, color: isCur ? BD : T2 }}>{MA[idx]}{isCur ? " ◀" : ""}</span>
                            {!d.real && <span style={{ ...S.cap, background: WN + "20", color: WN, padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>{"projeção"}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={S.cap}>{"Crédito"}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: OK }}>{fmt(d.cr)}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={S.cap}>{"Débito"}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: ER }}>{fmt(d.td)}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={S.cap}>{"Saldo"}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: d.s >= 0 ? OK : ER }}>{fmt(d.s)}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {groups.map(function(g) {
                            var val = d[g.key] || 0;
                            if (val === 0) return null;
                            var barW = allMax > 0 ? (val / allMax) * 100 : 0;
                            return (
                              <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 70, fontSize: 10, color: TM, textAlign: "right", flexShrink: 0 }}>{g.label}</div>
                                <div style={{ flex: 1, height: 20, background: BR, borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{ width: String(barW) + "%", height: "100%", background: g.color, borderRadius: 4, transition: "width 0.4s", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                                    {barW > 20 && <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{fmt(val)}</span>}
                                  </div>
                                </div>
                                {barW <= 20 && <span style={{ fontSize: 10, color: T3, fontWeight: 600, flexShrink: 0 }}>{fmt(val)}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: "2px solid " + BR, paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: BD }}>{"Total ano"}</span>
                    <div style={{ display: "flex", gap: 16 }}>
                      {[
                        { l: "Débito", v: chD.reduce(function(a, d) { return a + d.td; }, 0), c: ER },
                        { l: "Crédito", v: chD.reduce(function(a, d) { return a + d.cr; }, 0), c: OK },
                        { l: "Saldo", v: chD.reduce(function(a, d) { return a + d.s; }, 0), c: BD },
                      ].map(function(it) {
                        return (
                          <div key={it.l} style={{ textAlign: "right" }}>
                            <div style={S.cap}>{it.l}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: it.c }}>{fmt(it.v)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Categoria que mais variou */}
            {yrD && (
              <div style={S.cardA(TEAL)}>
                <div style={S.lbl}>{"DESTAQUES POR CATEGORIA"}</div>
                <div style={{ ...S.cap, marginBottom: 10, marginTop: 2 }}>{"Maiores variações no ano"}</div>
                {(function() {
                  var catStats = cats.map(function(cat2) {
                    var months = yrD.map(function(mDt) {
                      return (mDt.tx || []).filter(function(t) { return t.cat === cat2.id && !t.reimbursed; })
                        .reduce(function(a, t) { return a + myP(t); }, 0);
                    }).filter(function(v) { return v > 0; });
                    if (months.length < 3) return null;
                    var avg2 = months.reduce(function(a, v) { return a + v; }, 0) / months.length;
                    var max2 = Math.max.apply(null, months);
                    var min2 = Math.min.apply(null, months);
                    var variance = max2 - min2;
                    var maxMo = yrD.findIndex(function(mDt) {
                      return (mDt.tx || []).filter(function(t) { return t.cat === cat2.id && !t.reimbursed; })
                        .reduce(function(a, t) { return a + myP(t); }, 0) === max2;
                    });
                    return { cat: cat2, avg: avg2, max: max2, min: min2, variance: variance, maxMo: maxMo };
                  }).filter(Boolean).sort(function(a, b) { return b.variance - a.variance; });

                  return catStats.slice(0, 5).map(function(cs) {
                    var grp = GR.find(function(g) { return g.id === cs.cat.group; });
                    return (
                      <div key={cs.cat.id} style={{ padding: "10px 0", borderBottom: "1px solid " + BR }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{cs.cat.icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{cs.cat.name}</span>
                            <span style={{ ...S.tag(grp ? grp.color : TM), marginLeft: 6 }}>{grp ? grp.label : ""}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: TX }}>{"Média: " + fmt(cs.avg)}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1, background: OK + "12", borderRadius: 6, padding: "4px 8px", textAlign: "center" }}>
                            <div style={{ ...S.cap }}>{"Mín"}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: OK }}>{fmt(cs.min)}</div>
                          </div>
                          <div style={{ flex: 1, background: ER + "12", borderRadius: 6, padding: "4px 8px", textAlign: "center" }}>
                            <div style={{ ...S.cap }}>{"Máx (" + (cs.maxMo >= 0 ? MA[cs.maxMo] : "-") + ")"}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: ER }}>{fmt(cs.max)}</div>
                          </div>
                          <div style={{ flex: 1, background: WN + "12", borderRadius: 6, padding: "4px 8px", textAlign: "center" }}>
                            <div style={{ ...S.cap }}>{"Variação"}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: WN }}>{fmt(cs.variance)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* AI Insights */}
            <div style={S.cardA(BD)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={S.lbl}>{"✨ INSIGHTS COM IA"}</div>
                  <div style={{ ...S.cap, marginTop: 2 }}>{"Análise do seu padrão financeiro anual"}</div>
                </div>
                <button
                  onClick={function() {
                  sAiLoading(false);
                }}
                style={{ ...S.btn(TM), padding: "8px 14px", fontSize: 12, opacity: 0.5, cursor: "not-allowed" }}
                disabled={true}
              >
                {"🧠 Gerar análise"}
              </button>
            </div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{"🧠"}</div>
              <div style={{ fontSize: 12, color: TM, lineHeight: 1.6 }}>{"Análise inteligente do seu padrão financeiro anual."}</div>
              <div style={{ marginTop: 8, fontSize: 11, color: WN, fontWeight: 600, background: WN + "15", display: "inline-block", padding: "4px 12px", borderRadius: 12 }}>{"🔜 Em breve"}</div>
            </div>
            </div>
          </div>
        )}

        {/* ═══ METAS ═══ */}
        {tab === "metas" && (
          <div>
            {/* Metas */}}
            <div style={S.cardA("#7C3AED")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={S.lbl}>{"METAS"}</div>
                <button style={S.btn("#7C3AED")} onClick={function() { sSGl(!showGoal); }}>{showGoal ? "Cancelar" : "+ Meta"}</button>
              </div>
              {showGoal && (
                <div style={{ background: BG, borderRadius: 8, padding: 12, marginBottom: 12, border: "1px solid " + BR, display: "flex", flexDirection: "column", gap: 7 }}>
                  <input style={S.inp} placeholder="Nome da meta" value={gf.name} onChange={function(e) { sGf({ ...gf, name: e.target.value }); }} />
                  <div style={S.g2}>
                    <input style={S.inp} placeholder="Valor alvo (R$)" value={gf.target} inputMode="decimal" onChange={function(e) { sGf({ ...gf, target: e.target.value }); }} />
                    <input style={S.inp} placeholder="Já guardou" value={gf.saved} inputMode="decimal" onChange={function(e) { sGf({ ...gf, saved: e.target.value }); }} />
                  </div>
                  <input style={S.inp} type="date" value={gf.deadline} onChange={function(e) { sGf({ ...gf, deadline: e.target.value }); }} />
                  <button style={S.btn("#7C3AED")} onClick={addGoal}>{"Salvar"}</button>
                </div>
              )}
              {goals.length === 0 && !showGoal && <p style={{ ...S.cap, textAlign: "center", padding: 8 }}>{"Nenhuma meta."}</p>}
              {goals.map(function(g) {
                var r = g.target > 0 ? (g.saved || 0) / g.target : 0;
                var remain = g.target - (g.saved || 0);
                var mL = 0;
                if (g.deadline) {
                  var dl = new Date(g.deadline); var td2 = new Date();
                  mL = Math.max(0, (dl.getFullYear() - td2.getFullYear()) * 12 + (dl.getMonth() - td2.getMonth()));
                }
                var mN = mL > 0 && remain > 0 ? remain / mL : 0;
                return (
                  <div key={g.id} style={{ padding: "12px 0", borderBottom: "1px solid #F0F0F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: TX }}>{g.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <span style={S.cap}>{"Prazo:"}</span>
                          <input type="date" value={g.deadline || ""} onChange={function(e) { updGD(g.id, e.target.value); }}
                            style={{ background: "#FAFAFA", border: "1px solid " + BR, borderRadius: 4, padding: "2px 6px", color: T3, fontSize: 11, outline: "none" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: TX }}>{fmt(g.saved || 0) + " / " + fmt(g.target)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: r >= 1 ? OK : "#A78BFA" }}>{pct(r)}</div>
                      </div>
                    </div>
                    <PB value={g.saved || 0} max={g.target} color="#7C3AED" />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, ...S.cap }}>
                      <span>{"Falta " + fmt(remain)}</span>
                      {mL > 0 && remain > 0 && <span style={{ color: "#7C3AED", fontWeight: 700 }}>{fmt(mN) + "/mês (" + String(mL) + "m)"}</span>}
                      {mL === 0 && remain > 0 && <span style={{ color: ER, fontWeight: 700 }}>{"Prazo vencido"}</span>}
                      {remain <= 0 && <span style={{ color: OK, fontWeight: 700 }}>{"✅ Atingida!"}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "center" }}>
                      <input style={{ ...S.inp, width: 100, fontSize: 12 }} placeholder="Atualizar R$" id={"g-" + g.id} inputMode="decimal" />
                      <button onClick={function() { var el = document.getElementById("g-" + g.id); var v2 = parseFloat((el.value || "").replace(",", ".")); if (!isNaN(v2)) { updGS(g.id, v2); el.value = ""; } }} style={S.btn("#7C3AED")}>{"💾"}</button>
                      <span onClick={function() { rmG(g.id); }} style={{ cursor: "pointer", color: "#BBBBBB" }}>{"×"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Limites de gastos por categoria */}
            <div style={S.cardA(BL)}>
              <div style={S.lbl}>{"LIMITES POR CATEGORIA"}</div>
              <div style={{ ...S.cap, marginBottom: 10, marginTop: 2 }}>{"Defina limites mensais e acompanhe o progresso"}</div>
              {GR.map(function(g) {
                var catsWithLim = cats.filter(function(c) { return c.group === g.id && catLimits[c.id]; });
                var catsNoLim = cats.filter(function(c) { return c.group === g.id && !catLimits[c.id] && (spC[c.id] || 0) > 0; });
                if (catsWithLim.length === 0 && catsNoLim.length === 0) return null;
                return (
                  <div key={g.id} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: g.color, marginBottom: 6, textTransform: "uppercase" }}>{g.label}</div>
                    {cats.filter(function(c) { return c.group === g.id && ((spC[c.id] || 0) > 0 || catLimits[c.id]); }).map(function(cat2) {
                      var lim = catLimits[cat2.id];
                      var spent2 = spC[cat2.id] || 0;
                      var isEditLim2 = editLimId === cat2.id;
                      return (
                        <div key={cat2.id} style={{ padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: lim ? 4 : 0 }}>
                            <span>{cat2.icon}</span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TX }}>{cat2.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: lim && spent2 > lim ? ER : TX }}>{fmt(spent2)}</span>
                            <button onClick={function() { sELimId(isEditLim2 ? null : cat2.id); sELimV(lim ? String(lim) : ""); }}
                              style={{ background: lim ? BG : "#F5F5F5", border: "1px solid " + (lim ? BL : BR), borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: lim ? BL : TM, cursor: "pointer" }}>
                              {lim ? "🎯 " + fmt(lim) : "+ Limite"}
                            </button>
                          </div>
                          {lim && (
                            <div>
                              <PB value={spent2} max={lim} color={g.color} noWarn={g.id === "investimentos"} />
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={S.cap}>{pct(Math.min(spent2 / lim, 1)) + " utilizado"}</span>
                                {spent2 > lim ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: ER }}>{"⚠️ +" + fmt(spent2 - lim) + " estourado"}</span>
                                ) : (
                                  <span style={{ fontSize: 10, fontWeight: 600, color: OK }}>{"✅ sobram " + fmt(lim - spent2)}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {isEditLim2 && (
                            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                              <input style={{ ...S.inp, flex: 1, fontSize: 12 }} placeholder="Limite mensal (R$)" value={editLimV} inputMode="decimal"
                                onChange={function(e) { sELimV(e.target.value); }} />
                              <button style={S.btn(BL)} onClick={function() { setCatLimit(cat2.id, editLimV); }}>{"OK"}</button>
                              {lim && <button style={{ ...S.btnO, padding: "8px 10px", fontSize: 12 }} onClick={function() { setCatLimit(cat2.id, "0"); }}>{"Remover"}</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ INPUT ═══ */}
        {tab === "input" && (
          <div>
            <div style={S.cardA("#0D9488")}>
              <div style={S.lbl}>{"NOVO GASTO"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
                <input style={S.inp} placeholder="Descrição" value={fm.desc} onChange={function(e) { sFm({ ...fm, desc: e.target.value }); }} />
                <div style={S.g2}>
                  <input style={S.inp} placeholder="Valor (R$)" value={fm.valor} inputMode="decimal" onChange={function(e) { sFm({ ...fm, valor: e.target.value }); }} />
                  <input style={S.inp} type="date" value={fm.date} onChange={function(e) { sFm({ ...fm, date: e.target.value }); }} />
                </div>
                <div style={S.g2}>
                  <CatS value={fm.cat} onChange={function(e) { sFm({ ...fm, cat: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                  <select style={S.inp} value={fm.pay} onChange={function(e) { sFm({ ...fm, pay: e.target.value }); }}>
                    {PAYS.map(function(p) { return <option key={p}>{p}</option>; })}
                  </select>
                </div>
                <input style={{ ...S.inp, fontSize: 13 }} placeholder="Nota (opcional)" value={fm.note} onChange={function(e) { sFm({ ...fm, note: e.target.value }); }} />
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={fm.hs} style={S.ck} onChange={function(e) { sFm({ ...fm, hs: e.target.checked }); }} />{"Dividir"}
                </label>
                {fm.hs && <SE splits={fm.sp} onChange={function(s) { sFm({ ...fm, sp: s }); }} />}
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={fm.reimb} style={S.ck} onChange={function(e) { sFm({ ...fm, reimb: e.target.checked }); }} />{"Reembolsado"}
                </label>
                <div style={S.g2}>
                  <input style={S.inp} placeholder="Parcela atual" value={fm.ic} onChange={function(e) { sFm({ ...fm, ic: e.target.value }); }} />
                  <input style={S.inp} placeholder="Total parcelas" value={fm.it} onChange={function(e) { sFm({ ...fm, it: e.target.value }); }} />
                </div>
                <button style={S.btn("#0D9488")} onClick={addTx}>{"Adicionar"}</button>
                {err && tab === "input" && <div style={{ color: ER, fontSize: 12, fontWeight: 600 }}>{"⚠️ " + err}</div>}
              </div>
            </div>

            <div style={S.cardA(BL)}>
              <div style={S.lbl}>{"CRÉDITO EXTRA"}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                <input style={{ ...S.inp, flex: 2, minWidth: 90 }} placeholder="Descrição" value={cf.desc} onChange={function(e) { sCf({ ...cf, desc: e.target.value }); }} />
                <input style={{ ...S.inp, flex: 1, minWidth: 60 }} placeholder="Valor" value={cf.valor} inputMode="decimal" onChange={function(e) { sCf({ ...cf, valor: e.target.value }); }} />
                <select style={{ ...S.inp, flex: 1, minWidth: 80 }} value={cf.type} onChange={function(e) { sCf({ ...cf, type: e.target.value }); }}>
                  {["Bônus", "Variável", "Reembolso", "Outro"].map(function(t) { return <option key={t}>{t}</option>; })}
                </select>
                <button style={S.btn(BL)} onClick={addCr}>{"+"}</button>
              </div>
              {crs.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {crs.map(function(c) {
                    return (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #F0F0F0", fontSize: 13 }}>
                        <span style={{ color: T3 }}>{c.desc + " "}<span style={S.tag(BL)}>{c.type}</span></span>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontWeight: 700, color: BL }}>{fmt(c.amount)}</span>
                          <span onClick={function() { rmCr(c.id); }} style={{ cursor: "pointer", color: ER }}>{"×"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={S.cardA("#D97706")}>
              <div style={S.lbl}>{"IMPORTAR EXTRATO NUBANK"}</div>
              {!csvR ? (
                <div style={{ marginTop: 8 }}>
                  <p style={S.cap}>{"Dedup automático."}</p>
                  <input ref={fr} type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
                  <button style={{ ...S.btn("#D97706"), marginTop: 6 }} onClick={function() { if (fr.current) fr.current.click(); }}>{"Selecionar CSV"}</button>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <p style={{ ...S.cap, marginBottom: 6 }}>{String(csvR.length) + " transações"}</p>
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {csvR.map(function(row, idx) {
                      var desc = row.title || row["Título"] || row["Descrição"] || row.description || "?";
                      var amt = row.amount || row.Valor || row.valor || "?";
                      var dt = row.date || row.Data || "";
                      var inst = pi(desc);
                      var c2 = csvSp[row._idx] || { on: false, sp: [{ person: "Duda", pct: 30 }] };
                      return (
                        <div key={idx} style={{ padding: "10px 0", borderBottom: "1px solid #F0F0F0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: TX }}>{desc}</div>
                              <div style={{ display: "flex", gap: 3 }}>
                                {dt && <span style={S.tag(TM)}>{dt}</span>}
                                {inst && <span style={S.tag("#7C3AED")}>{"P " + String(inst.c) + "/" + String(inst.t)}</span>}
                              </div>
                            </div>
                            <span style={{ color: "#D97706", fontWeight: 700, fontSize: 16 }}>{amt}</span>
                          </div>
                          <CatS value={csvC[row._idx] || ""} onChange={function(e) { sCC({ ...csvC, [row._idx]: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer", marginTop: 6 }}>
                            <input type="checkbox" checked={c2.on} style={S.ck} onChange={function(e) { sCSp({ ...csvSp, [row._idx]: { ...c2, on: e.target.checked } }); }} />{"Dividir"}
                          </label>
                          {c2.on && <SE compact splits={c2.sp} onChange={function(s) { sCSp({ ...csvSp, [row._idx]: { ...c2, sp: s } }); }} />}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button style={S.btn(OK)} onClick={impAll}>{"✅ Importar"}</button>
                    <button style={S.btnO} onClick={function() { sCR(null); }}>{"Cancelar"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ FIXAS ═══ */}
        {tab === "fixas" && (
          <div>
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={S.h2}>{"Contas Fixas — " + MS[mo]}</div>
                <button style={S.btn(BL)} onClick={function() { sSFx(!showFx); sErr(""); }}>{showFx ? "Cancelar" : "+ Nova"}</button>
              </div>
              {showFx && (
                <div style={{ background: BG, borderRadius: 8, padding: 12, marginBottom: 12, border: "1px solid " + BR, display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={S.g2}>
                    <input style={S.inp} placeholder="Nome" value={ff.name} onChange={function(e) { sFf({ ...ff, name: e.target.value }); }} />
                    <input style={S.inp} placeholder="Valor (R$)" value={ff.amount} inputMode="decimal" onChange={function(e) { sFf({ ...ff, amount: e.target.value }); }} />
                  </div>
                  <div style={S.g2}>
                    <CatS value={ff.cat} onChange={function(e) { sFf({ ...ff, cat: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                    <select style={S.inp} value={ff.pay} onChange={function(e) { sFf({ ...ff, pay: e.target.value }); }}>
                      {PAYS.map(function(p) { return <option key={p}>{p}</option>; })}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[{ m: "budget", l: "💰 PIX/Boleto", d: "Orçamento" }, { m: "checklist", l: "💳 Cartão", d: "Checklist" }].map(function(o) {
                      return (
                        <div key={o.m} onClick={function() { sFf({ ...ff, mode: o.m }); }}
                          style={{ flex: 1, padding: 8, borderRadius: 6, cursor: "pointer", border: ff.mode === o.m ? "2px solid " + BL : "1px solid " + BR, background: ff.mode === o.m ? BG : "#fff" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: ff.mode === o.m ? BL : TM }}>{o.l}</div>
                          <div style={S.cap}>{o.d}</div>
                        </div>
                      );
                    })}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={ff.hs} style={S.ck} onChange={function(e) { sFf({ ...ff, hs: e.target.checked }); }} />{"Dividir"}
                  </label>
                  {ff.hs && <SE splits={ff.sp} onChange={function(s) { sFf({ ...ff, sp: s }); }} />}
                  <button style={S.btn(BL)} onClick={addFx}>{"Salvar"}</button>
                  {err && tab === "fixas" && <div style={{ color: ER, fontSize: 12 }}>{"⚠️ " + err}</div>}
                </div>
              )}
              {fxd.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, marginBottom: 3 }}>
                    <span>{String(fxPd) + "/" + String(fxd.length)}</span>
                    <span>{fmt(fxMy) + "/mês"}</span>
                  </div>
                  <PB value={fxPd} max={fxd.length} color={BL} />
                </div>
              )}
              {fxd.map(function(f) {
                var cat2 = cats.find(function(c) { return c.id === f.cat; });
                var ip = fs[f.id] === "paid";
                var myA = f.hasSplit ? f.amount - spt(f) : f.amount;
                var sp2 = gsp(f);
                var mode = f.mode || "budget";
                var parts = fs[f.id + "_p"] || [];
                var pSum = parts.reduce(function(a, p) { return a + p.amount; }, 0);
                var isO = pO === f.id;
                return (
                  <div key={f.id} style={{ padding: "10px 0", borderBottom: "1px solid #F0F0F0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: ip ? 0.5 : 1 }}>
                      <input type="checkbox" checked={ip} style={{ ...S.ck, width: 18, height: 18 }} onChange={function() { togFP(f.id); }} />
                      <span style={{ fontSize: 15 }}>{cat2 ? cat2.icon : "📄"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, textDecoration: ip ? "line-through" : "none", color: TX }}>{f.name}</div>
                        <div style={{ display: "flex", gap: 2, marginTop: 2, flexWrap: "wrap" }}>
                          <span style={S.tag(mode === "budget" ? "#0D9488" : "#7C3AED")}>{mode === "budget" ? "💰" : "💳"}</span>
                          {sp2.map(function(s, j) { return <span key={j} style={S.tag("#D97706")}>{"÷" + s.person + " " + String(s.pct) + "%"}</span>; })}
                        </div>
                        {!ip && mode === "budget" && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, marginBottom: 2 }}>
                              <span>{fmt(pSum)}</span><span>{fmt(f.amount)}</span>
                            </div>
                            <PB value={pSum} max={f.amount} color={BL} />
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TX }}>{fmt(f.amount)}</div>
                        {f.hasSplit && <div style={{ ...S.cap, color: BL }}>{"Você: " + fmt(myA)}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {!ip && <span onClick={function() { sPO(isO ? null : f.id); sPV(""); }} style={{ cursor: "pointer", fontSize: 16, color: BL }}>{"+"}</span>}
                        <span onClick={function() { rmFx(f.id); }} style={{ cursor: "pointer", color: "#BBBBBB" }}>{"×"}</span>
                      </div>
                    </div>
                    {isO && (
                      <div style={{ display: "flex", gap: 5, marginTop: 6, marginLeft: 40 }}>
                        <input style={{ ...S.inp, flex: 1 }} placeholder="Valor" value={pV} inputMode="decimal" onChange={function(e) { sPV(e.target.value); }} />
                        <button style={S.btn(BL)} onClick={function() { addPart(f.id); }}>{"OK"}</button>
                      </div>
                    )}
                    {parts.length > 0 && (
                      <div style={{ marginLeft: 40, marginTop: 3 }}>
                        {parts.map(function(p, pi3) {
                          return (
                            <div key={pi3} style={{ display: "flex", justifyContent: "space-between", ...S.cap, padding: "1px 0" }}>
                              <span>{sd(p.date) + " — " + fmt(p.amount)}</span>
                              <span onClick={function() { saveMd({ ...md, fs: { ...fs, [f.id + "_p"]: parts.filter(function(_, idx2) { return idx2 !== pi3; }) } }); }}
                                style={{ cursor: "pointer", color: ER, padding: "0 3px" }}>{"×"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {fxd.length === 0 && <p style={{ ...S.cap, textAlign: "center", padding: 16 }}>{"Nenhuma conta fixa."}</p>}
            </div>
          </div>
        )}

        {/* ═══ MENSAL ═══ */}
        {tab === "monthly" && (
          <div>
            <div style={S.card}>
              <div style={S.lbl}>
                {"POR CATEGORIA"}
                {catF && <span onClick={function() { sCatF(null); }} style={{ marginLeft: 8, fontSize: 10, color: BL, cursor: "pointer", fontWeight: 700, textTransform: "none" }}>{"✕ Limpar filtro"}</span>}
              </div>
              {GR.map(function(g) {
                var ci = cats.filter(function(c) { return c.group === g.id && (spC[c.id] || 0) > 0; })
                  .sort(function(a, b) { return (spC[b.id] || 0) - (spC[a.id] || 0); });
                if (ci.length === 0) return null;
                return (
                  <div key={g.id} style={{ marginTop: 10 }}>
                    <div onClick={function() { sCatF(catF === g.id ? null : g.id); }}
                      style={{ fontSize: 11, fontWeight: 700, color: g.color, marginBottom: 4, textTransform: "uppercase", cursor: "pointer", background: catF === g.id ? BG : "transparent", padding: "4px 6px", borderRadius: 4, marginLeft: -6 }}>
                      {g.label + " — " + fmt(spent[g.id]) + " / " + fmt(bud[g.id]) + (catF === g.id ? " ✓" : "")}
                    </div>
                    {ci.map(function(cat2) {
                      var isAc = catF === cat2.id;
                      var lim = catLimits[cat2.id];
                      var isEditLim = editLimId === cat2.id;
                      return (
                        <div key={cat2.id}>
                          <div onClick={function() { if (!isEditLim) sCatF(isAc ? null : cat2.id); }}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", marginLeft: -6, borderBottom: "1px solid #F0F0F0", cursor: "pointer", borderRadius: 4, background: isAc ? BG : "transparent" }}>
                            <span>{cat2.icon}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 12, color: isAc ? BD : T3, fontWeight: isAc ? 700 : 400 }}>{cat2.name}</span>
                              {lim && (
                                <div style={{ marginTop: 3 }}>
                                  <PB value={spC[cat2.id] || 0} max={lim} color={g.color} noWarn={g.id === "investimentos"} />
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                    <span style={{ ...S.cap }}>{fmt(spC[cat2.id] || 0) + " / " + fmt(lim)}</span>
                                    {(spC[cat2.id] || 0) > lim ? (
                                      <span style={{ fontSize: 10, fontWeight: 700, color: g.id === "investimentos" ? OK : ER }}>
                                        {"⚠️ +" + fmt((spC[cat2.id] || 0) - lim) + " (" + pct((spC[cat2.id] || 0) / lim) + ")"}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 10, fontWeight: 600, color: TM }}>
                                        {"sobram " + fmt(lim - (spC[cat2.id] || 0)) + " (" + pct((spC[cat2.id] || 0) / lim) + " usado)"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 12, color: TX }}>{fmt(spC[cat2.id])}</span>
                            <span onClick={function(e) { e.stopPropagation(); sELimId(isEditLim ? null : cat2.id); sELimV(lim ? String(lim) : ""); }}
                              style={{ cursor: "pointer", fontSize: 11, color: TM, padding: "0 4px" }} title="Definir limite">{"🎯"}</span>
                          </div>
                          {isEditLim && (
                            <div style={{ display: "flex", gap: 5, padding: "6px 0 6px 28px" }}>
                              <input style={{ ...S.inp, flex: 1, fontSize: 12 }} placeholder="Limite mensal (R$)" value={editLimV} inputMode="decimal" onChange={function(e) { sELimV(e.target.value); }} />
                              <button style={S.btn(BL)} onClick={function() { setCatLimit(cat2.id, editLimV); }}>{"OK"}</button>
                              {lim && <button style={{ ...S.btnO, padding: "8px 10px", fontSize: 12 }} onClick={function() { setCatLimit(cat2.id, "0"); }}>{"Remover"}</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={S.lbl}>
                  {"TRANSAÇÕES (" + String(txs.length) + ")"}
                  {catF && <span style={{ marginLeft: 6, fontSize: 10, color: BL, textTransform: "none" }}>{"— filtrado"}</span>}
                </div>
                {txs.length > 0 && !cfCl && (
                  <button onClick={function() { sCfC(true); }} style={{ background: "#fff", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", color: ER, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{"🗑️ Limpar"}</button>
                )}
                {cfCl && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: ER }}>{"Certeza?"}</span>
                    <button onClick={clrMo} style={S.btn(ER)}>{"Sim"}</button>
                    <button onClick={function() { sCfC(false); }} style={S.btnO}>{"Não"}</button>
                  </div>
                )}
              </div>
              <input style={{ ...S.inp, marginBottom: 6, fontSize: 12 }} placeholder="🔍 Pesquisar..." value={txSearch} onChange={function(e) { sTxS(e.target.value); }} />
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {txs.length === 0 && <p style={S.cap}>{"Nenhuma transação."}</p>}
                {filteredTxs.map(function(tx) {
                  var cat2 = cats.find(function(c) { return c.id === tx.cat; });
                  var grp = GR.find(function(g) { return g.id === (cat2 ? cat2.group : ""); });
                  var sp2 = gsp(tx);
                  var isE = eId === tx.id;
                  var isEd = editTxId === tx.id;
                  return (
                    <div key={tx.id} style={{ padding: "6px 0", borderBottom: "1px solid #F0F0F0", opacity: tx.reimbursed ? 0.5 : 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{cat2 ? cat2.icon : "?"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: TX }}>{tx.desc}</span>
                            {tx.date && <span style={S.cap}>{sd(tx.date)}</span>}
                          </div>
                          {tx.note && <div style={{ ...S.cap, color: T2, fontStyle: "italic", marginTop: 1 }}>{"📝 " + tx.note}</div>}
                          <div style={{ display: "flex", gap: 2, marginTop: 1, flexWrap: "wrap" }}>
                            <span style={S.tag(grp ? grp.color : TM)}>{cat2 ? cat2.name : "?"}</span>
                            {sp2.map(function(s, idx) { return <span key={idx} style={S.tag("#D97706")}>{"÷" + s.person}</span>; })}
                            {tx.reimbursed && <span style={S.tag("#7C3AED")}>{"Reemb."}</span>}
                            {tx.src === "proj" && <span style={S.tag("#2563EB")}>{"Proj."}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 55 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: TX }}>{fmt(tx.amount)}</div>
                          {sp2.length > 0 && <div style={{ ...S.cap, color: "#0D9488" }}>{"Vc: " + fmt(myP(tx))}</div>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span onClick={function() { openTxEdit(tx); }} style={{ cursor: "pointer", fontSize: 11, color: isEd ? BL : "#BBBBBB" }} title="Editar">{"✏️"}</span>
                          <span onClick={function() { openSE(tx); }} style={{ cursor: "pointer", fontSize: 11, color: sp2.length > 0 ? "#D97706" : "#BBBBBB" }}>{"÷"}</span>
                          <span onClick={function() { togRe(tx.id); }} style={{ cursor: "pointer", fontSize: 11 }}>{tx.reimbursed ? "💜" : "🔄"}</span>
                          <span onClick={function() { rmTx(tx.id); }} style={{ cursor: "pointer", color: ER, fontSize: 14 }}>{"×"}</span>
                        </div>
                      </div>
                      {isEd && (
                        <div style={{ marginTop: 6, marginLeft: 24, padding: 10, background: BG, borderRadius: 6, border: "1px solid " + BR }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: BD, marginBottom: 6 }}>{"Editar transação"}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input style={S.inp} placeholder="Descrição" value={editTxF.desc} onChange={function(e) { sETxF({ ...editTxF, desc: e.target.value }); }} />
                            <div style={S.g2}>
                              <input style={S.inp} placeholder="Valor (R$)" value={editTxF.valor} inputMode="decimal" onChange={function(e) { sETxF({ ...editTxF, valor: e.target.value }); }} />
                              <CatS value={editTxF.cat} onChange={function(e) { sETxF({ ...editTxF, cat: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                            </div>
                            <input style={S.inp} placeholder="Nota" value={editTxF.note} onChange={function(e) { sETxF({ ...editTxF, note: e.target.value }); }} />
                            <div style={{ display: "flex", gap: 5 }}>
                              <button style={S.btn(BL)} onClick={function() { saveTxEdit(tx.id); }}>{"Salvar"}</button>
                              <button style={S.btnO} onClick={function() { sETxId(null); }}>{"×"}</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {isE && (
                        <div style={{ marginTop: 6, marginLeft: 24, padding: 8, background: BG, borderRadius: 6, border: "1px solid " + BR }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#D97706", marginBottom: 5 }}>{"Dividir:"}</div>
                          <SE compact splits={eD} onChange={function(s) { sED(s); }} />
                          <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                            <button style={S.btn("#D97706")} onClick={function() { savSE(tx.id); }}>{"Salvar"}</button>
                            {sp2.length > 0 && <button onClick={function() { rmSE(tx.id); }} style={{ background: "#fff", border: "1px solid #FECACA", borderRadius: 6, padding: "5px 10px", color: ER, fontSize: 10, cursor: "pointer" }}>{"Remover"}</button>}
                            <button onClick={function() { sEId(null); }} style={S.btnO}>{"×"}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ DEVEDORES ═══ */}
        {tab === "deve" && (
          <div>
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={S.h2}>{"Devedores — " + MS[mo]}</div>
                <button style={S.btn("#D97706")} onClick={function() { sSDbt(!showDebt); }}>{showDebt ? "Cancelar" : "+ Novo"}</button>
              </div>
              {showDebt && (
                <div style={{ background: BG, borderRadius: 8, padding: 10, marginBottom: 12, border: "1px solid " + BR, display: "flex", flexDirection: "column", gap: 7 }}>
                  <input style={S.inp} placeholder="Descrição" value={df.desc} onChange={function(e) { sDf({ ...df, desc: e.target.value }); }} />
                  <div style={S.g2}>
                    <input style={S.inp} placeholder="Valor (R$)" value={df.amount} inputMode="decimal" onChange={function(e) { sDf({ ...df, amount: e.target.value }); }} />
                    <input style={S.inp} placeholder="Quem deve?" value={df.person} onChange={function(e) { sDf({ ...df, person: e.target.value }); }} />
                  </div>
                  <button style={S.btn("#D97706")} onClick={addDebt}>{"Adicionar"}</button>
                </div>
              )}
            </div>

            {Object.keys(debtors).length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 28 }}>
                <p style={S.cap}>{"Nenhuma dívida registrada."}</p>
              </div>
            ) : (
              Object.entries(debtors).map(function(e2) {
                var person = e2[0];
                var data = e2[1];
                return (
                  <div key={person} style={S.cardA("#D97706")}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: TX }}>{person}</div>
                      <div style={{ textAlign: "right" }}>
                        <div style={S.cap}>{"Pendente"}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#D97706" }}>{fmt(data.pending)}</div>
                      </div>
                    </div>
                    <PB value={data.total - data.pending} max={data.total} color={OK} />
                    <div style={{ marginTop: 8 }}>
                      {data.items.map(function(it, idx) {
                        return (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid #F0F0F0" }}>
                            <input type="checkbox" checked={it.rcv || false} style={S.ck}
                              onChange={function() {
                                if (it.src === "fx") togFR(it.id);
                                else if (it.src === "manual") togDR(it.id);
                                else togRcv(it.id);
                              }} />
                            <div style={{ flex: 1, opacity: it.rcv ? 0.5 : 1, textDecoration: it.rcv ? "line-through" : "none" }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: TX }}>{it.desc}</div>
                              <div style={{ display: "flex", gap: 3 }}>
                                <span style={S.cap}>{fmt(it.debt)}</span>
                                {it.src === "manual" && <span style={S.tag("#7C3AED")}>{"Manual"}</span>}
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: it.rcv ? OK : "#D97706", fontSize: 13 }}>{fmt(it.debt)}</span>
                            {it.src === "manual" && (
                              <span onClick={function() { rmD(it.id); }} style={{ cursor: "pointer", color: ER }}>{"×"}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
        </main>
      </div>

      {/* MOBILE TABBAR */}
      <nav className="prumo-tabbar">
        <button className={"prumo-tab" + (tab === "dash" ? " active" : "")} onClick={function() { goTab("dash"); }}>
          <span className="ico">{"◐"}</span>
          <span className="lbl-t">{"Início"}</span>
        </button>
        <button className={"prumo-tab" + (tab === "input" ? " active" : "")} onClick={function() { goTab("input"); }}>
          <span className="ico">{"≡"}</span>
          <span className="lbl-t">{"Lançar"}</span>
        </button>
        <button className="prumo-tab" disabled style={{ opacity: 0 }}>{" "}</button>
        <button className={"prumo-tab" + (tab === "analise" ? " active" : "")} onClick={function() { goTab("analise"); }}>
          <span className="ico">{"◇"}</span>
          <span className="lbl-t">{"Análise"}</span>
        </button>
        <button className={"prumo-tab" + (["vida","metas","monthly","proj","fixas","deve"].indexOf(tab) >= 0 ? " active" : "")} onClick={function() { sShowMore(true); }}>
          <span className="ico">{"○"}</span>
          <span className="lbl-t">{"Mais"}</span>
        </button>
      </nav>

      {/* MOBILE FAB */}
      <button className="prumo-fab" onClick={function() { goTab("input"); }} aria-label="Lançar despesa">{"+"}</button>

      {/* MOBILE SHEET "MAIS" */}
      {showMore && (
        <>
          <div className="prumo-sheet-overlay" onClick={function() { sShowMore(false); }}></div>
          <div className="prumo-sheet">
            <div className="prumo-sheet-handle"></div>
            <div className="prumo-sheet-h">{"Navegar"}</div>
            <div className="prumo-sheet-sub">{"Selecione uma seção"}</div>
            {tabGroups.map(function(grp) {
              return (
                <div key={grp} style={{ marginBottom: 14 }}>
                  <div className="prumo-lbl" style={{ marginBottom: 6 }}>{grp}</div>
                  <div className="prumo-sheet-grid">
                    {tabs.filter(function(t) { return t.grp === grp; }).map(function(t) {
                      var ac = tab === t.id;
                      return (
                        <button key={t.id} className={"prumo-sheet-item" + (ac ? " active" : "")} onClick={function() { goTab(t.id); }}>
                          <span style={{ fontSize: 16 }}>{t.ico}</span>
                          <span>{t.l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button className="prumo-btn ghost" style={{ width: "100%", marginTop: 6 }} onClick={function() { signOut(auth); }}>{"Sair da conta"}</button>
          </div>
        </>
      )}

      {/* ══ FLOATING AI CHAT ══ */}
      <style>{`
        @keyframes fadeInTab { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 #1B72B840; } 50% { box-shadow: 0 0 0 8px #1B72B820; } }
        .fc-tab-content { animation: fadeInTab 0.22s ease; }
        .fc-chat-msg { animation: slideUp 0.18s ease; }
        @media (min-width: 768px) { .fc-main { max-width: 100% !important; padding: 16px 32px !important; } }
        @media (min-width: 1200px) { .fc-main { padding: 16px 80px !important; } }
      `}</style>

      {chatOpen && (
        <div style={{ position: "fixed", bottom: 88, right: 16, width: 320, maxHeight: 420, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid " + BR, display: "flex", flexDirection: "column", zIndex: 1000, animation: "slideUp 0.2s ease" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid " + BR, display: "flex", justifyContent: "space-between", alignItems: "center", background: BL, borderRadius: "16px 16px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{"✨"}</span>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}>{"Assistente FinControl"}</div>
                <div style={{ color: "#ffffff90", fontSize: 10 }}>{"Diga o que gastou ou recebeu"}</div>
              </div>
            </div>
            <span onClick={function() { sChatOpen(false); }} style={{ color: "#ffffff80", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>{"×"}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, minHeight: 120, maxHeight: 260 }}>
            {chatMsgs.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 8px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{"💬"}</div>
                <div style={{ fontSize: 12, color: T2, lineHeight: 1.6, fontWeight: 500 }}>{"Diga o que gastou ou recebeu em linguagem natural."}</div>
                <div style={{ fontSize: 11, color: TM, marginTop: 10, fontStyle: "italic" }}>{"Ex: gastei 150 no mercado pix hoje"}</div>
              </div>
            )}
            {chatMsgs.map(function(m, ci) {
              var isUser = m.role === "user";
              return (
                <div key={ci} className="fc-chat-msg" style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isUser ? BL : "#F0F4F8", color: isUser ? "#fff" : TX, fontSize: 12, lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {chatLd && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 14px", borderRadius: "12px 12px 12px 2px", background: "#F0F4F8", fontSize: 14, color: BL }}>
                  <span style={{ letterSpacing: 3 }}>{"···"}</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid " + BR, display: "flex", gap: 6 }}>
            <input style={{ ...S.inp, flex: 1, fontSize: 12, borderRadius: 20, padding: "8px 14px" }}
              placeholder="Ex: gastei 80 no ifood pix..."
              value={chatInput}
              onChange={function(e) { sChatIn(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") sendChat(); }}
              disabled={chatLd} />
            <button onClick={sendChat} disabled={chatLd}
              style={{ background: chatLd ? BR : BL, border: "none", borderRadius: "50%", width: 36, height: 36, cursor: chatLd ? "default" : "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {"↑"}
            </button>
          </div>
        </div>
      )}

      <button className="prumo-legacy-chat-fab" onClick={function() { sChatOpen(!chatOpen); }}
        style={{ position: "fixed", bottom: 24, right: 16, width: 56, height: 56, borderRadius: "50%", background: chatOpen ? BD : BL, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(27,114,184,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, zIndex: 1001, transition: "background 0.2s", animation: chatOpen ? "none" : "pulse 2s infinite" }}>
        {chatOpen ? "×" : "✨"}
      </button>

    </div>
  );
}
