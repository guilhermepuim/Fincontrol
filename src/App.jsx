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
  // ESSENCIAIS
  { id: "moradia", name: "Moradia", icon: "🏠", group: "essenciais" },
  { id: "alimentacao", name: "Alimentação", icon: "🛒", group: "essenciais" },
  { id: "bernardo", name: "Filho", icon: "👶", group: "essenciais" },
  { id: "transporte", name: "Transporte", icon: "🚗", group: "essenciais" },
  { id: "saude", name: "Saúde", icon: "🏥", group: "essenciais" },
  { id: "educacao", name: "Educação", icon: "📚", group: "essenciais" },
  { id: "financiamento", name: "Financiamento / Dívida", icon: "💳", group: "essenciais" },
  { id: "impostos", name: "Impostos / Contador", icon: "📋", group: "essenciais" },
  { id: "pets", name: "Pets", icon: "🐾", group: "essenciais" },
  { id: "comerfora_suno", name: "Comer fora Suno", icon: "🍽️", group: "essenciais" },
  // INVESTIMENTOS
  { id: "investimentos_cat", name: "Investimentos", icon: "📈", group: "investimentos" },
  { id: "reservas", name: "Reservas e Metas", icon: "🎯", group: "investimentos" },
  // NÃO ESSENCIAIS
  { id: "compras", name: "Compras", icon: "🛍️", group: "desejos" },
  { id: "viagem", name: "Viagem", icon: "✈️", group: "desejos" },
  { id: "comerfora", name: "Comer fora / iFood", icon: "🍔", group: "desejos" },
  { id: "lazer", name: "Lazer", icon: "🎉", group: "desejos" },
  { id: "lazer_suno", name: "Lazer Suno", icon: "🏢", group: "desejos" },
  { id: "assinaturas", name: "Assinaturas", icon: "📺", group: "desejos" },
  { id: "beleza", name: "Beleza / Cuidado pessoal", icon: "💅", group: "desejos" },
  { id: "presentes", name: "Presentes", icon: "🎁", group: "desejos" },
  { id: "doacoes", name: "Doações / Caridade", icon: "❤️", group: "desejos" },
];
var PAYS = ["Cartão Nubank", "PIX", "Boleto", "Dinheiro", "Cartão Porto", "Cartão Itaú", "Cartão Inter"];
var MS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
var MA = MS.map(function(m) { return m.slice(0, 3); });
var PC = ["#1B5FAA","#1A3A5C","#9A7420","#003F5D","#4E97D1","#C9A84C","#7BB4E3","#2D7A3E","#0F2540","#6A90B8"];

/* ══ HELPERS ══ */

// Resolve o valor de uma conta fixa para um mês específico (YYYY-MM), levando em conta endDate + amountHistory + overrides
function resolveFixedValueForMonth(fx, yyyymm) {
  // endDate: se mês > endDate, fixa não existe (retorna null)
  if (fx.endDate && String(yyyymm) > String(fx.endDate)) return null;
  // override pontual: mês específico tem valor diferente
  if (fx.overrides && fx.overrides[yyyymm] !== undefined) return fx.overrides[yyyymm];
  // amountHistory: pega a mudança mais recente que começa em ou antes desse mês
  if (fx.amountHistory && fx.amountHistory.length > 0) {
    var sorted = fx.amountHistory.slice().sort(function(a, b) { return String(a.from).localeCompare(String(b.from)); });
    var applicable = null;
    sorted.forEach(function(h) { if (String(h.from) <= String(yyyymm)) applicable = h; });
    if (applicable) return applicable.amount;
  }
  return fx.amount;
}

function resolveFixedListForMonth(fxdList, yyyymm) {
  return (fxdList || []).map(function(fx) {
    var v = resolveFixedValueForMonth(fx, yyyymm);
    if (v === null) return null;
    return { ...fx, amount: v };
  }).filter(function(x) { return x !== null; });
}
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
.prumo-yr { display: flex; align-items: flex-end; gap: 4px; height: 160px; padding-top: 22px; }
.prumo-yr-col { flex: 1; display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative; }
.prumo-yr-stack { width: 100%; display: flex; flex-direction: column-reverse; border-radius: 4px 4px 0 0; overflow: hidden; transition: outline 120ms; min-height: 6px; }
.prumo-yr-stack > i { display: block; min-height: 1px; }
.prumo-yr-col:hover .prumo-yr-stack, .prumo-yr-col.active .prumo-yr-stack { outline: 2px solid var(--ink); outline-offset: 1px; }
.prumo-yr-mes { font-size: 9px; color: var(--ink-3); margin-top: 4px; font-weight: 600; }
.prumo-yr-mes.cur { color: var(--ink); font-weight: 800; }
.prumo-yr-val { font-family: var(--f-mono); font-size: 9px; color: var(--ink-3); margin-bottom: 4px; font-weight: 500; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }

/* DASH GRID — mobile first (DECLARADO ANTES de qualquer media query) */
.prumo-dash-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.prumo-dash-grid .full { grid-column: 1 / -1; }
.prumo-dash-grid .span2 { grid-column: 1 / -1; }

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

  /* DASHBOARD GRID DESKTOP — overrides do mobile */
  .prumo-dash-grid { grid-template-columns: 2fr 1fr 1fr; gap: 16px; align-items: start; }
  .prumo-dash-grid .span2 { grid-column: span 2; }
  .prumo-card { padding: 20px; }
  .prumo-big { font-size: 38px; }
  .prumo-ring-svg { width: 64px; height: 64px; margin: 0 auto 6px; }
  .prumo-ring-card { padding: 14px 10px; }
  .prumo-ring-lbl { font-size: 11px; }
  .prumo-ring-val { font-size: 22px; font-weight: 600; }
  .prumo-yr { height: 240px; padding-top: 30px; gap: 8px; }
  .prumo-yr-mes { font-size: 11px; }
  .prumo-yr-val { font-size: 10px; }
}

/* TOOLTIP ──────────────────────────────────────── */
.prumo-tip { position: absolute; bottom: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; box-shadow: var(--shadow-2); z-index: 20; min-width: 200px; white-space: nowrap; margin-bottom: 6px; pointer-events: auto; }

/* INPUTS PRUMO ──────────────────────────────────── */
.prumo-input { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 11px 13px; font-family: var(--f-ui); font-size: 14px; color: var(--ink); outline: none; transition: border-color .15s, box-shadow .15s; width: 100%; -webkit-appearance: none; appearance: none; }
.prumo-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px oklch(0.38 0.07 235 / .12); }
.prumo-input::placeholder { color: var(--ink-3); }
.prumo-input.mono { font-family: var(--f-mono); font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.prumo-input.right { text-align: right; }
select.prumo-input { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%2362728a' d='M0 0l5 6 5-6z'/></svg>"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 32px; cursor: pointer; }

.prumo-form { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.prumo-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.prumo-grid-3 { display: grid; grid-template-columns: 2fr 1fr 1.2fr auto; gap: 8px; align-items: stretch; }
@media (max-width: 600px) { .prumo-grid-3 { grid-template-columns: 1fr 1fr; } }

.prumo-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--ink-2); font-family: var(--f-ui); user-select: none; }
.prumo-check input { width: 18px; height: 18px; accent-color: var(--brand); cursor: pointer; margin: 0; }

.prumo-form-err { font-size: 12px; font-weight: 600; color: var(--neg); padding: 6px 10px; background: var(--neg-tint); border-radius: 8px; }

.prumo-cred-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.prumo-cred-row:last-child { border-bottom: none; }
.prumo-cred-tag { display: inline-block; padding: 2px 8px; background: var(--brand-tint); color: var(--brand); border-radius: 999px; font-size: 10px; font-weight: 600; font-family: var(--f-mono); letter-spacing: .05em; text-transform: uppercase; }

.prumo-csv-row { padding: 14px 0; border-bottom: 1px solid var(--line); }
.prumo-csv-row:last-child { border-bottom: none; }
.prumo-tag-mono { display: inline-block; padding: 2px 7px; background: var(--surface-2); color: var(--ink-3); border-radius: 6px; font-size: 10px; font-weight: 500; font-family: var(--f-mono); margin-right: 4px; }
.prumo-tag-mono.acc { background: var(--accent-tint); color: var(--accent-2); }

.prumo-btn-add { width: 44px; height: 44px; border-radius: 50%; background: var(--brand); color: var(--surface); border: none; font-size: 22px; font-weight: 300; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: stretch; }
.prumo-btn-add:disabled { opacity: .4; cursor: not-allowed; }

.prumo-icon-x { cursor: pointer; color: var(--neg); width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; background: transparent; border: 1px solid transparent; transition: background .15s; }
.prumo-icon-x:hover { background: var(--neg-tint); border-color: oklch(0.58 0.16 25 / .2); }

@media (min-width: 1100px) {
  .prumo-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  .prumo-form-grid .full { grid-column: 1 / -1; }
}

/* MINI STAT (caixinha de número compacta) ─────── */
.prumo-mini-stat { background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; text-align: center; }
.prumo-mini-stat .lbl { font-family: var(--f-mono); font-size: 9px; color: var(--ink-3); letter-spacing: .12em; text-transform: uppercase; font-weight: 500; margin-bottom: 3px; }
.prumo-mini-stat .val { font-family: var(--f-display); font-size: 14px; font-weight: 700; color: var(--ink); font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.prumo-mini-stat .val.pos { color: var(--pos); }
.prumo-mini-stat .val.neg { color: var(--neg); }
.prumo-mini-stat .val.brand { color: var(--brand); }
.prumo-mini-stat .val.warn { color: var(--accent-2); }
.prumo-mini-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.prumo-mini-stat-row.cols-2 { grid-template-columns: 1fr 1fr; }

/* DATA TABLE (tabela anual) ────────────────────── */
.prumo-data-table { width: 100%; border-collapse: collapse; font-size: 11px; font-family: var(--f-mono); font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.prumo-data-table th { padding: 6px 4px; text-align: center; color: var(--ink-3); border-bottom: 1px solid var(--line); font-weight: 500; letter-spacing: .05em; text-transform: uppercase; font-size: 9px; }
.prumo-data-table td { padding: 6px 4px; text-align: center; border-bottom: 1px solid var(--line); color: var(--ink-2); }
.prumo-data-table th.cur, .prumo-data-table td.cur { color: var(--ink); font-weight: 700; }
.prumo-data-table .row-lbl { font-family: var(--f-ui); text-align: left; font-weight: 600; font-size: 10px; }
.prumo-data-table .pos { color: var(--pos); }
.prumo-data-table .neg { color: var(--neg); }
.prumo-data-table .brand { color: var(--brand); }

/* COMPARE ROWS (barras horizontais comparativo) ─ */
.prumo-cmp-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.prumo-cmp-row:last-child { border-bottom: none; }
.prumo-cmp-bar-wrap { flex: 1; height: 22px; background: var(--surface-2); border-radius: 5px; overflow: hidden; position: relative; min-width: 110px; }
.prumo-cmp-bar { height: 100%; border-radius: 5px; display: flex; align-items: center; padding-left: 8px; transition: width .4s ease; min-width: 100px; box-sizing: border-box; }
.prumo-cmp-bar-lbl { font-size: 10px; color: var(--surface); font-weight: 600; font-family: var(--f-mono); white-space: nowrap; }

/* SIM CHART (saldo positivo/negativo) ──────────── */
.prumo-sim-bars { display: flex; align-items: center; gap: 2px; height: 80px; }
.prumo-sim-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: center; }
.prumo-sim-half { width: 100%; display: flex; flex-direction: column; }
.prumo-sim-axis { width: 100%; height: 1px; background: var(--line-2); }
.prumo-sim-bar-pos { width: 100%; background: var(--pos); border-radius: 2px 2px 0 0; }
.prumo-sim-bar-neg { width: 100%; background: var(--neg); border-radius: 0 0 2px 2px; }

/* IF MILESTONES (refeito v2 — limpo e bem posicionado) ─ */
.prumo-if-wrap { padding: 4px 0 0; }
.prumo-if-bar { position: relative; height: 14px; background: var(--surface-2); border-radius: 7px; overflow: visible; }
.prumo-if-track { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; }
.prumo-if-fill { height: 100%; background: linear-gradient(90deg, var(--brand), var(--accent)); border-radius: 7px; transition: width .8s ease; }
.prumo-if-fill.full { background: var(--pos); }
.prumo-if-pointer { position: absolute; top: -4px; bottom: -4px; width: 4px; background: var(--ink); border-radius: 2px; transform: translateX(-50%); transition: left .8s ease; box-shadow: 0 0 0 3px var(--surface); z-index: 2; }
.prumo-if-marks { position: relative; height: 28px; margin-top: 10px; }
.prumo-if-mark-pos { position: absolute; top: 0; transform: translateX(-50%); text-align: center; }
.prumo-if-mark-pos .tick { width: 1px; height: 5px; background: var(--line-2); margin: 0 auto 3px; }
.prumo-if-mark-pos .lbl { font-family: var(--f-mono); font-size: 9px; letter-spacing: .08em; color: var(--ink-3); font-weight: 600; white-space: nowrap; }
.prumo-if-mark-pos.reached .lbl { color: var(--pos); }
.prumo-if-mark-pos.reached .tick { background: var(--pos); }

/* MONTH BLOCK (análise visual mensal) ──────────── */
.prumo-month-block { padding: 10px 0; border-bottom: 1px solid var(--line); }
.prumo-month-block:last-child { border-bottom: none; }
.prumo-month-block.cur { background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 8px; }
.prumo-month-hd { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.prumo-month-name { font-family: var(--f-display); font-size: 14px; font-weight: 700; color: var(--ink); }
.prumo-month-name.muted { color: var(--ink-2); }
.prumo-month-stats { display: flex; gap: 14px; }
.prumo-month-stat .lbl { font-family: var(--f-mono); font-size: 9px; color: var(--ink-3); letter-spacing: .1em; text-transform: uppercase; }
.prumo-month-stat .v { font-family: var(--f-mono); font-size: 12px; font-weight: 700; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }

/* INPUT WITH PREFIX/SUFFIX ─────────────────────── */
.prumo-input-affix { position: relative; }
.prumo-input-affix .prefix, .prumo-input-affix .suffix { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--ink-3); font-weight: 600; font-family: var(--f-mono); pointer-events: none; }
.prumo-input-affix .prefix { left: 12px; }
.prumo-input-affix .suffix { right: 12px; }
.prumo-input-affix .prumo-input.with-prefix { padding-left: 32px; }
.prumo-input-affix .prumo-input.with-suffix { padding-right: 28px; }

/* SUCCESS BANNER ────────────────────────────────── */
.prumo-success { background: var(--pos-tint); border: 1px solid oklch(0.58 0.13 155 / .3); border-radius: 10px; padding: 10px 12px; }
.prumo-success-strong { font-size: 12px; font-weight: 700; color: var(--pos); }

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
  var pr = props.prumo;
  var tp = splits.reduce(function(a, s) { return a + (s.pct || 0); }, 0);
  if (pr) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
        {splits.map(function(s, i) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="prumo-input" style={{ flex: 1, fontSize: compact ? 12 : 13 }} placeholder="Com quem?" value={s.person}
                onChange={function(e) { var n = splits.slice(); n[i] = { ...n[i], person: e.target.value }; onChange(n); }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input className="prumo-input mono right" style={{ width: 64 }} type="number" value={s.pct}
                  onChange={function(e) { var n = splits.slice(); n[i] = { ...n[i], pct: parseInt(e.target.value) || 0 }; onChange(n); }} />
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>%</span>
              </div>
              {splits.length > 1 && (
                <button className="prumo-icon-x" onClick={function() { onChange(splits.filter(function(_, j) { return j !== i; })); }}>{"×"}</button>
              )}
            </div>
          );
        })}
        <button onClick={function() { onChange(splits.concat([{ person: "", pct: 0 }])); }}
          style={{ background: "transparent", border: "1px dashed var(--line-2)", borderRadius: 8, color: "var(--ink-3)", padding: "7px", cursor: "pointer", fontSize: 12, fontFamily: "var(--f-ui)", fontWeight: 600 }}>
          {"+ Pessoa"}
        </button>
        <div style={{ fontSize: 11, color: tp > 100 ? "var(--neg)" : "var(--ink-3)", fontFamily: "var(--f-mono)", letterSpacing: ".05em" }}>{"DIVIDIDO: " + String(tp) + "% — VOCÊ: " + String(100 - tp) + "%"}</div>
      </div>
    );
  }
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
      <button onClick={function() { onChange(splits.concat([{ person: "", pct: 0 }])); }}
        style={{ background: "transparent", border: "1px dashed " + BR, borderRadius: 6, color: TM, padding: "5px", cursor: "pointer", fontSize: 11 }}>
        {"+ Pessoa"}
      </button>
      <div style={{ ...S.cap, color: tp > 100 ? ER : TM }}>{"Dividido: " + String(tp) + "% — Você: " + String(100 - tp) + "%"}</div>
    </div>
  );
}

function CatS(props) {
  if (props.prumo) {
    return (
      <select className="prumo-input" value={props.value} onChange={props.onChange} style={props.sx || null}>
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
  var [editPctId, sEditPctId] = useState(null);
  var [pctDraft, sPctDraft] = useState("");
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

  /* ─── Reserva: configurável (atual / média 6m / média 12m / manual) ─── */
  var yrD = props.yrD;
  var myP = props.myP;
  var pat = (cfg && cfg.patrimonio) ? cfg.patrimonio : {};
  var reservaModo = (cfg && cfg.reservaModo) ? cfg.reservaModo : "current";
  var reservaManual = (cfg && cfg.reservaManual) ? cfg.reservaManual : 0;

  var calcEssMes = function(mData) {
    if (!mData) return 0;
    var txList = mData.tx || [];
    var sum = 0;
    txList.forEach(function(t) {
      if (t.reimbursed || t.src === "proj") return;
      var c = cats.find(function(cc) { return cc.id === t.cat; });
      if (c && c.group === "essenciais") sum += myP ? myP(t) : t.amount;
    });
    return sum;
  };

  var avgRecent = function(nMonths) {
    if (!yrD || yrD.length === 0) return 0;
    var monthsWithData = yrD.map(calcEssMes).filter(function(v) { return v > 0; });
    if (monthsWithData.length === 0) return 0;
    var slice = monthsWithData.slice(-nMonths);
    return slice.reduce(function(a, v) { return a + v; }, 0) / slice.length;
  };

  // RESERVA puramente de patrimonio.reserva (não usa PL total)
  var reservaTotal = pat.reserva || 0;
  // Base que gera renda passiva no termômetro IF: pat.invVariable
  var pBaseIncome = pat.invVariable || 0;

  var despEssMensal;
  if (reservaModo === "avg6") despEssMensal = avgRecent(6);
  else if (reservaModo === "avg12") despEssMensal = avgRecent(12);
  else if (reservaModo === "manual" && reservaManual > 0) despEssMensal = reservaManual;
  else despEssMensal = spent.essenciais;
  if (!despEssMensal || despEssMensal <= 0) despEssMensal = totalInc * 0.5;

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

  /* ─── Atividade recente (txs do mês atual + crs) — agrupada por dia ─── */
  var recentItems = [];
  txs.forEach(function(t) {
    if (t.src === "proj") return;
    var c = cats.find(function(cc) { return cc.id === t.cat; });
    recentItems.push({ id: t.id, kind: "tx", date: t.date || "", desc: t.desc, amount: t.amount, icon: c ? c.icon : "💸", catName: c ? c.name : "" });
  });
  crs.forEach(function(c) {
    recentItems.push({ id: c.id, kind: "cr", date: c.dateAdded || c.date || "", desc: c.desc, amount: c.amount, icon: "💼", catName: c.type || "Crédito extra" });
  });
  recentItems.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  var recentTop = recentItems.slice(0, 8);
  var groupedRecent = [];
  var seenDays = {};
  recentTop.forEach(function(it) {
    var dkey = String(it.date).slice(0, 10);
    if (!dkey) dkey = "sem-data";
    if (!seenDays[dkey]) {
      seenDays[dkey] = { key: dkey, items: [], totalDb: 0, totalCr: 0 };
      groupedRecent.push(seenDays[dkey]);
    }
    seenDays[dkey].items.push(it);
    if (it.kind === "cr") seenDays[dkey].totalCr += it.amount;
    else seenDays[dkey].totalDb += it.amount;
  });
  var todayKey = new Date().toISOString().slice(0, 10);
  var yKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  var dayLabel = function(k) {
    if (k === "sem-data") return "Sem data";
    if (k === todayKey) return "Hoje";
    if (k === yKey) return "Ontem";
    var d = new Date(k);
    if (isNaN(d.getTime())) return k;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  /* ─── Termômetro IF ─── */
  var rendaPassiva = pBaseIncome * 0.007;
  var ifPct = despEssMensal > 0 ? Math.min(rendaPassiva / despEssMensal, 1) * 100 : 0;
  var ifFillPct = Math.max(0, Math.min(100, ifPct));

  /* ─── Renda salário inline edit ─── */
  var saveSalary = function() {
    var raw = String(salI).replace(/\./g, "").replace(",", ".");
    var v = parseFloat(raw);
    if (!isNaN(v) && v > 0) saveCfg({ ...cfg, salary: v });
    sES(false);
  };
  var renderRendaEdit = function() {
    if (eSal) {
      return (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <input style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "var(--f-ui)", width: 130, textAlign: "right", outline: "none", color: "var(--ink)" }}
            autoFocus
            value={salI}
            inputMode="decimal"
            onChange={function(e) { sSI(e.target.value); }}
            onBlur={saveSalary}
            onKeyDown={function(e) { if (e.key === "Enter") saveSalary(); }} />
          <button className="prumo-btn brand" onMouseDown={function(e) { e.preventDefault(); }} onClick={saveSalary}>{"OK"}</button>
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
            var isEditing = editPctId === r.id;
            var savePct = function() {
              var v = parseInt(pctDraft, 10);
              if (!isNaN(v) && v >= 0 && v <= 100) {
                var newPcts = { ...cfg.pcts, [r.id]: v };
                saveCfg({ ...cfg, pcts: newPcts });
              }
              sEditPctId(null);
            };
            return (
              <div key={r.id} className="prumo-ring-card" style={{ position: "relative" }}>
                <Donut pct={r.used} color={r.color} />
                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", margin: "6px 0 2px" }}>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{r.label + " ·"}</span>
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      max="100"
                      value={pctDraft}
                      onChange={function(e) { sPctDraft(e.target.value); }}
                      onBlur={savePct}
                      onKeyDown={function(e) { if (e.key === "Enter") savePct(); if (e.key === "Escape") sEditPctId(null); }}
                      style={{ width: 38, padding: "2px 4px", border: "1px solid var(--brand)", borderRadius: 5, fontSize: 11, textAlign: "center", fontFamily: "var(--f-mono)", outline: "none" }}
                    />
                    <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{"%"}</span>
                  </div>
                ) : (
                  <div className="prumo-ring-lbl" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span>{r.label + " · " + String(r.pct) + "%"}</span>
                    <button
                      onClick={function() { sEditPctId(r.id); sPctDraft(String(r.pct)); }}
                      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--ink-4)", fontSize: 10, lineHeight: 1 }}
                      title="Editar meta"
                    >{"✎"}</button>
                  </div>
                )}
                <div className="prumo-ring-val">{String(r.used) + "%"}</div>
                <div className="prumo-cap" style={{ fontSize: 10, marginTop: 2 }}>{fmt(r.s) + " / " + fmt(r.b)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RESERVA */}
      <div className="prumo-card l-pos">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div className="prumo-lbl">{"Reserva de emergência"}</div>
          <select
            value={reservaModo}
            onChange={function(e) { saveCfg({ ...cfg, reservaModo: e.target.value }); }}
            style={{ fontSize: 9, padding: "3px 18px 3px 7px", border: "1px solid var(--line-2)", borderRadius: 6, background: "var(--surface)", color: "var(--ink-3)", fontFamily: "var(--f-mono)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, cursor: "pointer", outline: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path fill='%2362728a' d='M0 0l4 5 4-5z'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
          >
            <option value="current">{"MÊS ATUAL"}</option>
            <option value="avg6">{"MÉDIA 6M"}</option>
            <option value="avg12">{"MÉDIA 12M"}</option>
            <option value="manual">{"MANUAL"}</option>
          </select>
        </div>
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
        {reservaModo === "manual" && (
          <div style={{ marginTop: 10 }}>
            <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Definir essencial/mês (manual)"}</div>
            <div className="prumo-input-affix">
              <span className="prefix">{"R$"}</span>
              <input
                className="prumo-input mono right with-prefix"
                placeholder="0"
                inputMode="decimal"
                defaultValue={reservaManual > 0 ? String(reservaManual).replace(".", ",") : ""}
                onBlur={function(e) {
                  var raw = String(e.target.value).replace(/\./g, "").replace(",", ".");
                  var v = parseFloat(raw);
                  saveCfg({ ...cfg, reservaManual: isNaN(v) ? 0 : v });
                }}
                style={{ fontSize: 12, padding: "8px 11px 8px 30px" }}
              />
            </div>
          </div>
        )}
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="prumo-cap">{"Reserva"}</div>
            <div className="prumo-num" style={{ fontSize: 13 }}>{fmt(reservaTotal)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="prumo-cap">{reservaModo === "avg6" ? "Média 6m" : reservaModo === "avg12" ? "Média 12m" : reservaModo === "manual" ? "Manual" : "Mês atual"}</div>
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
        {groupedRecent.length === 0 ? (
          <div className="prumo-cap" style={{ padding: "20px 0", textAlign: "center" }}>{"Nenhum lançamento neste mês ainda. Use o botão + para começar."}</div>
        ) : groupedRecent.map(function(grp) {
          var hdrSum = grp.totalCr - grp.totalDb;
          var hdrLabel = grp.totalCr > 0 && grp.totalDb === 0 ? ("+ " + fmt(grp.totalCr)) : (grp.totalDb > 0 && grp.totalCr === 0 ? fmt(grp.totalDb) : (hdrSum >= 0 ? "+ " + fmt(hdrSum) : fmt(Math.abs(hdrSum))));
          return (
            <div key={grp.key}>
              <div className="prumo-section-h">
                <span>{dayLabel(grp.key).toUpperCase() + (grp.key.length === 10 ? " · " + grp.key.slice(8, 10) + " " + new Date(grp.key).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : "")}</span>
                <span>{hdrLabel}</span>
              </div>
              {grp.items.map(function(it) {
                return (
                  <div key={it.kind + "-" + it.id} className="prumo-tx">
                    <div className="prumo-tx-icon">{it.icon}</div>
                    <div className="prumo-tx-meat">
                      <div className="prumo-tx-desc">{it.desc}</div>
                      <div className="prumo-tx-meta">{it.catName}</div>
                    </div>
                    <div className={"prumo-tx-amt" + (it.kind === "cr" ? " in" : "")}>{(it.kind === "cr" ? "+" : "") + fmt(it.amount)}</div>
                  </div>
                );
              })}
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
              var cur = i === mo;
              var real = d.real;
              var brandCol = real ? "var(--brand)" : "oklch(0.78 0.04 235)";
              var inkCol = real ? "var(--ink-2)" : "oklch(0.78 0.015 250)";
              var accCol = real ? "var(--accent)" : "oklch(0.88 0.06 75)";
              return (
                <div key={i} className={"prumo-yr-col" + (hovM === i ? " active" : "")} onMouseEnter={function() { sHM(i); }} onMouseLeave={function() { sHM(null); }} onClick={function() { sHM(hovM === i ? null : i); }}>
                  {total > 0 && <div className="prumo-yr-val">{fK(total)}</div>}
                  <div className="prumo-yr-stack" style={{ height: String(h) + "%" }}>
                    <i style={{ flex: String(d.e) + " 0 0", background: brandCol }} />
                    <i style={{ flex: String(d.i) + " 0 0", background: inkCol }} />
                    <i style={{ flex: String(d.d) + " 0 0", background: accCol }} />
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

/* ══ ANÁLISE PRUMO ══ */
function AnalisePrumo(props) {
  var chD = props.chD;
  var mo = props.mo;
  var yr = props.yr;
  var yrD = props.yrD;
  var cats = props.cats;
  var myP = props.myP;

  var realMonths = chD.filter(function(d) { return d.real || d.td > 0 || d.cr > 0; });
  var allMax = Math.max.apply(null, chD.map(function(d) { return Math.max(d.td, d.cr); }).concat([1]));
  var groups = [
    { key: "e", label: "Essenciais", color: "var(--brand)" },
    { key: "i", label: "Investimentos", color: "var(--ink-2)" },
    { key: "d", label: "Não Essenciais", color: "var(--accent)" },
    { key: "cr", label: "Crédito", color: "var(--pos)" },
  ];

  var totDb = chD.reduce(function(a, d) { return a + d.td; }, 0);
  var totCr = chD.reduce(function(a, d) { return a + d.cr; }, 0);
  var totSd = chD.reduce(function(a, d) { return a + d.s; }, 0);

  /* Gastos por dia da semana (ano todo) */
  var dowStats = [
    { name: "Dom", total: 0, count: 0, avg: 0 },
    { name: "Seg", total: 0, count: 0, avg: 0 },
    { name: "Ter", total: 0, count: 0, avg: 0 },
    { name: "Qua", total: 0, count: 0, avg: 0 },
    { name: "Qui", total: 0, count: 0, avg: 0 },
    { name: "Sex", total: 0, count: 0, avg: 0 },
    { name: "Sáb", total: 0, count: 0, avg: 0 },
  ];
  if (yrD) {
    yrD.forEach(function(mDt) {
      (mDt.tx || []).forEach(function(t) {
        if (t.reimbursed || t.src === "proj" || !t.date) return;
        var c = cats.find(function(cc) { return cc.id === t.cat; });
        if (c && c.group === "investimentos") return;
        var d = new Date(t.date);
        if (isNaN(d.getTime())) return;
        var dow = d.getDay();
        var v = myP(t);
        dowStats[dow].total += v;
        dowStats[dow].count += 1;
      });
    });
    dowStats.forEach(function(s) { s.avg = s.count > 0 ? s.total / s.count : 0; });
  }
  var dowMax = Math.max.apply(null, dowStats.map(function(d) { return d.total; }).concat([1]));
  var dowTopIdx = dowStats.reduce(function(idx, d, i) { return d.total > dowStats[idx].total ? i : idx; }, 0);

  /* Destaques por categoria */
  var catStats = [];
  if (yrD) {
    catStats = cats.map(function(cat2) {
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
  }

  return (
    <div className="prumo-form-grid">
      {/* Comparativo Visual Mensal */}
      {realMonths.length > 0 && (
        <div className="prumo-card l-brand full">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Comparativo visual"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{String(yr) + " · mês a mês"}</h2>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {groups.map(function(g) {
                return (
                  <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ink-2)" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                    <span>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="prumo-cap" style={{ marginBottom: 14 }}>{"Apenas meses com dados reais ou movimentações"}</div>
          {chD.map(function(d, idx) {
            if (!d.real && d.td === 0 && d.cr === 0) return null;
            var isCur = idx === mo;
            return (
              <div key={idx} className={"prumo-month-block" + (isCur ? " cur" : "")}>
                <div className="prumo-month-hd">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={"prumo-month-name" + (isCur ? "" : " muted")}>{MA[idx]}{isCur ? " ◀" : ""}</span>
                    {!d.real && <span className="prumo-chip warn" style={{ fontSize: 9 }}>{"projeção"}</span>}
                  </div>
                  <div className="prumo-month-stats">
                    <div className="prumo-month-stat"><div className="lbl">{"Crédito"}</div><div className="v" style={{ color: "var(--pos)" }}>{fmt(d.cr)}</div></div>
                    <div className="prumo-month-stat"><div className="lbl">{"Débito"}</div><div className="v" style={{ color: "var(--neg)" }}>{fmt(d.td)}</div></div>
                    <div className="prumo-month-stat"><div className="lbl">{"Saldo"}</div><div className="v" style={{ color: d.s >= 0 ? "var(--pos)" : "var(--neg)" }}>{fmt(d.s)}</div></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {groups.map(function(g) {
                    var val = d[g.key] || 0;
                    if (val === 0) return null;
                    var barW = allMax > 0 ? (val / allMax) * 100 : 0;
                    return (
                      <div key={g.key} className="prumo-cmp-row" style={{ padding: "3px 0", border: "none" }}>
                        <div style={{ width: 78, fontSize: 10, color: "var(--ink-3)", textAlign: "right", flexShrink: 0, fontFamily: "var(--f-mono)", letterSpacing: ".05em", textTransform: "uppercase" }}>{g.label}</div>
                        <div className="prumo-cmp-bar-wrap">
                          <div className="prumo-cmp-bar" style={{ width: String(barW) + "%", background: g.color }}>
                            <span className="prumo-cmp-bar-lbl">{fmt(val)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "2px solid var(--line-2)", paddingTop: 12, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span className="prumo-lbl" style={{ marginBottom: 0, fontSize: 11, color: "var(--ink)" }}>{"Total ano"}</span>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ textAlign: "right" }}><div className="prumo-cap" style={{ fontSize: 10 }}>{"Débito"}</div><div className="prumo-num" style={{ color: "var(--neg)", fontSize: 13 }}>{fmt(totDb)}</div></div>
              <div style={{ textAlign: "right" }}><div className="prumo-cap" style={{ fontSize: 10 }}>{"Crédito"}</div><div className="prumo-num" style={{ color: "var(--pos)", fontSize: 13 }}>{fmt(totCr)}</div></div>
              <div style={{ textAlign: "right" }}><div className="prumo-cap" style={{ fontSize: 10 }}>{"Saldo"}</div><div className="prumo-num" style={{ color: totSd >= 0 ? "var(--pos)" : "var(--neg)", fontSize: 13 }}>{fmt(totSd)}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Gastos por dia da semana (ano todo) */}
      {yrD && dowStats.some(function(d) { return d.count > 0; }) && (
        <div className="prumo-card l-warn full">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Gastos por dia da semana"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Padrão de consumo no ano"}</h2>
            </div>
            <div className="prumo-chip warn">{"Pico: " + dowStats[dowTopIdx].name}</div>
          </div>
          <div className="prumo-cap" style={{ marginBottom: 14 }}>{"Investimentos não contam · valores totais do ano"}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, padding: "20px 0 0" }}>
            {dowStats.map(function(d, idx) {
              var bH = dowMax > 0 ? (d.total / dowMax) * 110 : 0;
              var isPeak = idx === dowTopIdx && d.total > 0;
              return (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                  {d.total > 0 && (
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: isPeak ? "var(--ink)" : "var(--ink-3)", fontWeight: isPeak ? 700 : 500, marginBottom: 4, fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums" }}>{fK(d.total)}</div>
                  )}
                  <div style={{ width: "100%", height: bH, minHeight: 3, background: isPeak ? "var(--accent)" : "var(--brand)", borderRadius: "4px 4px 0 0", opacity: isPeak ? 1 : 0.75, transition: "height 0.4s" }} />
                  <div style={{ fontSize: 10, color: isPeak ? "var(--ink)" : "var(--ink-3)", marginTop: 5, fontWeight: isPeak ? 800 : 600, fontFamily: "var(--f-ui)" }}>{d.name}</div>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12 }}>
            <div className="prumo-lbl" style={{ marginBottom: 8 }}>{"Detalhes por dia"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
              {dowStats.map(function(d, idx) {
                if (d.count === 0) return null;
                return (
                  <div key={idx} className="prumo-mini-stat" style={{ textAlign: "left", padding: "9px 11px" }}>
                    <div className="lbl" style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{d.name}</span>
                      {idx === dowTopIdx && <span style={{ color: "var(--accent-2)" }}>{"●"}</span>}
                    </div>
                    <div className="val" style={{ textAlign: "left", fontSize: 13 }}>{fmt(d.total)}</div>
                    <div className="prumo-cap" style={{ fontSize: 10, marginTop: 2, fontFamily: "var(--f-mono)" }}>{String(d.count) + " tx · média " + fmt(d.avg)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Destaques por Categoria */}
      {yrD && catStats.length > 0 && (
        <div className="prumo-card l-pos">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Destaques por categoria"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Maiores variações no ano"}</h2>
            </div>
          </div>
          <div className="prumo-cap" style={{ marginBottom: 10 }}>{"Categorias com maior diferença entre o pior e o melhor mês"}</div>
          {catStats.slice(0, 5).map(function(cs) {
            var grp = GR.find(function(g) { return g.id === cs.cat.group; });
            return (
              <div key={cs.cat.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{cs.cat.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{cs.cat.name}</div>
                    {grp && <span className="prumo-chip" style={{ fontSize: 9, marginTop: 3 }}>{grp.label}</span>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="prumo-cap" style={{ fontSize: 10 }}>{"Média"}</div>
                    <div className="prumo-num" style={{ fontSize: 13 }}>{fmt(cs.avg)}</div>
                  </div>
                </div>
                <div className="prumo-mini-stat-row">
                  <div className="prumo-mini-stat">
                    <div className="lbl">{"Mín"}</div>
                    <div className="val pos">{fmt(cs.min)}</div>
                  </div>
                  <div className="prumo-mini-stat">
                    <div className="lbl">{"Máx (" + (cs.maxMo >= 0 ? MA[cs.maxMo] : "—") + ")"}</div>
                    <div className="val neg">{fmt(cs.max)}</div>
                  </div>
                  <div className="prumo-mini-stat">
                    <div className="lbl">{"Variação"}</div>
                    <div className="val warn">{fmt(cs.variance)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights placeholder */}
      <div className="prumo-card l-accent">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Insights com IA"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Análise inteligente"}</h2>
          </div>
          <span className="prumo-chip warn">{"Em breve"}</span>
        </div>
        <div style={{ textAlign: "center", padding: "26px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>{"🧠"}</div>
          <div className="prumo-cap" style={{ lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>{"Análise inteligente do seu padrão financeiro anual com identificação de tendências, anomalias e recomendações personalizadas."}</div>
        </div>
      </div>
    </div>
  );
}

/* ══ PROJEÇÃO PRUMO ══ */
function calcSimAportes(nwBalance, simAporte, simTaxa, simTempo) {
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
  return { simA: simA, simR: simR, simN: simN, simFV: simFV, simTotalAport: simTotalAport, simJuros: simJuros, simAnos: simAnos, simBars: simBars, barMax: barMax, jurosRatio: jurosRatio };
}

function calcRendaPassiva(pBase, fxd, spt) {
  var rpTaxa = 0.007;
  var rpMensal = pBase * rpTaxa;
  var fxTotal = fxd.reduce(function(a, f) { return a + (f.hasSplit ? f.amount - spt(f) : f.amount); }, 0);
  var coverPct = fxTotal > 0 ? rpMensal / fxTotal : 0;
  var milestones = fxd.slice().sort(function(a, b) { return a.amount - b.amount; });
  var coveredFx = [];
  var remaining2 = rpMensal;
  milestones.forEach(function(f) {
    var myA = f.hasSplit ? f.amount - spt(f) : f.amount;
    if (remaining2 >= myA) { coveredFx.push(f); remaining2 -= myA; }
  });
  var uncovered = fxd.filter(function(f) { return coveredFx.indexOf(f) < 0; })
    .map(function(f2) {
      var myA2 = f2.hasSplit ? f2.amount - spt(f2) : f2.amount;
      var plNeeded2 = Math.ceil(myA2 / rpTaxa);
      return { f: f2, myA: myA2, plNeeded: plNeeded2, rpGerada: plNeeded2 * rpTaxa };
    })
    .filter(function(item) { return item.plNeeded > pBase; })
    .sort(function(a, b) { return a.myA - b.myA; });
  return { rpTaxa: rpTaxa, rpMensal: rpMensal, fxTotal: fxTotal, coverPct: coverPct, coveredFx: coveredFx, uncovered: uncovered };
}

function calcIF(pBase, totDb, totalInc, ifTarget) {
  var rpTaxa = 0.007;
  var rpMensal = pBase * rpTaxa;
  var ifTargetVal = parseFloat(String(ifTarget).replace(",", ".")) || 0;
  var totalExp = ifTargetVal > 0 ? ifTargetVal : (totDb > 0 ? totDb : totalInc * 0.75);
  var fiPct = totalExp > 0 ? Math.min(rpMensal / totalExp, 1) : 0;
  var plFor100 = totalExp > 0 ? Math.ceil(totalExp / rpTaxa) : 0;
  var milestones2 = [
    { pct: 0.25, label: "25% IF", desc: "Renda passiva cobre 1/4 dos gastos" },
    { pct: 0.50, label: "50% IF", desc: "Meio caminho andado" },
    { pct: 0.75, label: "75% IF", desc: "Quase lá!" },
    { pct: 1.00, label: "IF Total", desc: "Liberdade financeira completa" },
  ];
  var nextMilestone = milestones2.find(function(m) { return fiPct < m.pct; }) || milestones2[3];
  var plToNext = Math.max(0, Math.ceil((nextMilestone.pct * totalExp) / rpTaxa) - pBase);
  return { rpMensal: rpMensal, totalExp: totalExp, fiPct: fiPct, plFor100: plFor100, milestones: milestones2, nextMilestone: nextMilestone, plToNext: plToNext };
}

function ProjecaoPrumo(props) {
  var cfg = props.cfg;
  var savR = props.savR;
  var totalInc = props.totalInc;
  var invSp = props.invSp;
  var nwBalance = props.nwBalance;
  var nwHistory = props.nwHistory;
  var fxd = props.fxd;
  var spt = props.spt;
  var cats = props.cats;
  var totDb = props.totDb;
  var ifTarget = props.ifTarget;
  var sIfTarget = props.sIfTarget;
  var showIfEdit = props.showIfEdit;
  var sShowIfEdit = props.sShowIfEdit;
  var activeInst = props.activeInst;
  var totalInstMonthly = props.totalInstMonthly;
  var prevSp = props.prevSp;
  var spent = props.spent;
  var mo = props.mo;
  var yr = props.yr;
  var chD = props.chD;
  var chMx = props.chMx;
  var chMs = props.chMs;
  var hovM = props.hovM;
  var sHM = props.sHM;
  var showNw = props.showNw;
  var sShowNw = props.sShowNw;
  var nwInput = props.nwInput;
  var sNwI = props.sNwI;
  var updateNW = props.updateNW;
  var simAporte = props.simAporte;
  var sSimA = props.sSimA;
  var simTaxa = props.simTaxa;
  var sSimT = props.sSimT;
  var simTempo = props.simTempo;
  var sSimTp = props.sSimTp;
  var saveCfg = props.saveCfg;

  var sim = calcSimAportes(nwBalance, simAporte, simTaxa, simTempo);
  var pat = (cfg && cfg.patrimonio) ? cfg.patrimonio : {};
  var pBase = pat.invVariable || 0;
  var rp = calcRendaPassiva(pBase, fxd, spt);
  var fi = calcIF(pBase, totDb, totalInc, ifTarget);

  var hist = nwHistory.slice(-12);
  var maxV = nwHistory.length > 0 ? Math.max.apply(null, hist.map(function(h) { return h.balance; }).concat([1])) : 1;
  var minV = nwHistory.length > 0 ? Math.min.apply(null, hist.map(function(h) { return h.balance; })) : 0;
  var range = maxV - minV || 1;

  return (
    <div className="prumo-form-grid">

      {/* TAXA DE POUPANÇA */}
      <div className="prumo-card l-brand">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Taxa de poupança"}</div>
            <div className="prumo-cap">{"Investido / Renda total"}</div>
          </div>
          <div className="prumo-big" style={{ color: savR >= 0.25 ? "var(--pos)" : savR >= 0.1 ? "var(--accent-2)" : "var(--neg)" }}>{pct(savR)}</div>
        </div>
        <div className="prumo-meter" style={{ height: 8, marginTop: 8 }}>
          <i style={{ width: pct(Math.min(invSp / Math.max(totalInc, 1), 1)), background: "var(--brand)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
          <span className="prumo-num">{fmt(invSp)}</span>
          <span className="prumo-cap">{"Meta 25%: " + fmt(totalInc * 0.25)}</span>
        </div>
      </div>

      {/* PATRIMÔNIO LÍQUIDO + EDIÇÃO */}
      <div className="prumo-card l-pos">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Patrimônio líquido"}</div>
            <div className="prumo-big pos" style={{ marginTop: 4 }}>{fmt(nwBalance)}</div>
          </div>
          <button className="prumo-btn ghost" onClick={function() { sShowNw(!showNw); }}>{showNw ? "✕" : "✏️ Atualizar"}</button>
        </div>
        {showNw && (
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <input className="prumo-input mono right" placeholder="Saldo atual (R$)" value={nwInput} inputMode="decimal" onChange={function(e) { sNwI(e.target.value); }} />
            <button className="prumo-btn brand" onClick={updateNW}>{"OK"}</button>
          </div>
        )}
        <div className="prumo-mini-stat-row cols-2" style={{ marginTop: 10 }}>
          <div className="prumo-mini-stat"><div className="lbl">{"Investido este mês"}</div><div className="val brand">{fmt(invSp)}</div></div>
          <div className="prumo-mini-stat"><div className="lbl">{"Renda passiva (RV · 0,7%)"}</div><div className="val pos">{fmt(pBase * 0.007) + "/m"}</div></div>
        </div>
        {nwHistory.length > 1 && (
          <div style={{ marginTop: 14 }}>
            <div className="prumo-lbl" style={{ marginBottom: 6 }}>{"Evolução do patrimônio"}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
              {hist.map(function(h, idx) {
                var barH = ((h.balance - minV) / range) * 60 + 10;
                var isLast = idx === hist.length - 1;
                var isUp = idx > 0 && h.balance >= hist[idx - 1].balance;
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "100%", height: barH, background: isLast ? "var(--brand)" : (isUp ? "oklch(0.58 0.13 155 / .55)" : "oklch(0.58 0.16 25 / .45)"), borderRadius: "3px 3px 0 0", transition: "height 0.4s" }} />
                    <div style={{ fontSize: 8, color: isLast ? "var(--ink)" : "var(--ink-3)", marginTop: 3, fontWeight: isLast ? 700 : 500, fontFamily: "var(--f-mono)" }}>{sd(h.date).slice(0, 5)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
              <span className="prumo-cap">{"Mín: " + fmt(minV)}</span>
              <span className="prumo-num" style={{ color: "var(--brand)" }}>{"Atual: " + fmt(nwBalance)}</span>
              <span className="prumo-cap">{"Máx: " + fmt(maxV)}</span>
            </div>
            {hist.length >= 2 && (
              <div className={"prumo-chip " + (nwBalance > hist[0].balance ? "pos" : "neg")} style={{ marginTop: 10 }}>
                {(nwBalance > hist[0].balance ? "▲ +" : "▼ ") + fmt(Math.abs(nwBalance - hist[0].balance)) + " desde " + sd(hist[0].date).slice(0, 5) + " (" + pct(Math.abs((nwBalance - hist[0].balance) / hist[0].balance)) + ")"}
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Histórico"}</div>
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {nwHistory.slice().reverse().map(function(h2, idx2) {
                  return (
                    <div key={idx2} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                      <div>
                        <span className="prumo-num" style={{ fontSize: 12 }}>{fmt(h2.balance)}</span>
                        <span className="prumo-cap" style={{ marginLeft: 10, fontFamily: "var(--f-mono)", fontSize: 10 }}>{sd(h2.date)}</span>
                      </div>
                      <button className="prumo-icon-x" onClick={function() {
                        var newHist = nwHistory.filter(function(x) { return x.date !== h2.date; });
                        var newBal = newHist.length > 0 ? newHist[newHist.length - 1].balance : 0;
                        saveCfg({ ...cfg, netWorth: { balance: newBal, history: newHist } });
                      }} title="Remover entrada">{"×"}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TERMÔMETRO IF */}
      <div className="prumo-card l-accent full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Termômetro de liberdade financeira"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{"Quanto da sua vida o PL já financia"}</h2>
          </div>
          <button className="prumo-btn ghost" onClick={function() { sShowIfEdit(!showIfEdit); }}>{showIfEdit ? "Fechar" : "🎯 Definir meta"}</button>
        </div>
        {showIfEdit && (
          <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid var(--line)" }}>
            <div className="prumo-lbl">{"Gasto mensal desejado na IF"}</div>
            <div className="prumo-cap" style={{ marginBottom: 8 }}>{"Quanto você quer gastar por mês quando atingir a independência financeira"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="prumo-input mono right" placeholder="Ex: 15000" value={ifTarget} inputMode="decimal" onChange={function(e) { sIfTarget(e.target.value); }} />
              <button className="prumo-btn brand" onClick={function() { sShowIfEdit(false); }}>{"OK"}</button>
              {ifTarget && <button className="prumo-btn ghost" onClick={function() { sIfTarget(""); }}>{"Limpar"}</button>}
            </div>
            {!ifTarget && <div className="prumo-cap" style={{ marginTop: 6, color: "var(--accent-2)" }}>{"Sem meta definida — usando gastos do mês atual como referência"}</div>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <div className="prumo-big" style={{ color: fi.fiPct >= 1 ? "var(--pos)" : fi.fiPct >= 0.5 ? "var(--accent-2)" : "var(--brand)", fontSize: 44 }}>{pct(fi.fiPct)}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{"de Independência Financeira"}</div>
            <div className="prumo-cap">{"Renda passiva " + fmt(fi.rpMensal) + " / Gastos " + fmt(fi.totalExp)}</div>
          </div>
        </div>
        <div className="prumo-if-wrap">
          <div className="prumo-if-bar">
            <div className="prumo-if-track">
              <div className={"prumo-if-fill" + (fi.fiPct >= 1 ? " full" : "")} style={{ width: pct(fi.fiPct) }} />
            </div>
            {fi.fiPct > 0 && <div className="prumo-if-pointer" style={{ left: pct(Math.min(fi.fiPct, 1)) }} />}
          </div>
          <div className="prumo-if-marks">
            {fi.milestones.map(function(m) {
              var reached = fi.fiPct >= m.pct;
              return (
                <div key={m.label} className={"prumo-if-mark-pos" + (reached ? " reached" : "")} style={{ left: pct(m.pct) }}>
                  <div className="tick"></div>
                  <div className="lbl">{m.label + (reached ? " ✓" : "")}</div>
                </div>
              );
            })}
          </div>
        </div>
        {fi.fiPct < 1 && (
          <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 12, border: "1px solid var(--line)", marginTop: 10 }}>
            <div className="prumo-lbl" style={{ color: "var(--brand)", marginBottom: 6 }}>{"Próximo marco: " + fi.nextMilestone.label}</div>
            <div className="prumo-cap" style={{ marginBottom: 8 }}>{fi.nextMilestone.desc}</div>
            <div className="prumo-mini-stat-row">
              <div className="prumo-mini-stat"><div className="lbl">{"RV necessária"}</div><div className="val brand">{fmt(Math.ceil(fi.nextMilestone.pct * fi.totalExp / 0.007))}</div></div>
              <div className="prumo-mini-stat"><div className="lbl">{"Falta acumular"}</div><div className="val neg">{fmt(fi.plToNext)}</div></div>
              <div className="prumo-mini-stat"><div className="lbl">{"Renda passiva"}</div><div className="val pos">{fmt(fi.rpMensal) + "/m"}</div></div>
            </div>
          </div>
        )}
        {fi.fiPct >= 1 && (
          <div className="prumo-success" style={{ marginTop: 10, textAlign: "center" }}>
            <div className="prumo-success-strong" style={{ fontSize: 14 }}>{"🏆 Parabéns! Você atingiu a Independência Financeira!"}</div>
            <div className="prumo-cap" style={{ color: "var(--pos)", marginTop: 4 }}>{"Sua renda passiva cobre 100% dos seus gastos."}</div>
          </div>
        )}
        {fi.plFor100 > 0 && fi.fiPct < 1 && (
          <div className="prumo-cap" style={{ textAlign: "center", marginTop: 10, fontSize: 11 }}>{"IF Total: RV de " + fmt(fi.plFor100) + " gerando " + fmt(fi.totalExp) + "/mês"}</div>
        )}
      </div>

      {/* SIMULADOR DE APORTES */}
      <div className="prumo-card l-brand full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Simulador de aportes"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Juros compostos sobre o PL"}</h2>
          </div>
          <span style={{ fontSize: 22 }}>{"📈"}</span>
        </div>
        <div className="prumo-mini-stat-row" style={{ marginBottom: 14 }}>
          <div>
            <div className="prumo-lbl">{"Aporte/mês"}</div>
            <div className="prumo-input-affix">
              <span className="prefix">{"R$"}</span>
              <input className="prumo-input mono right with-prefix" value={simAporte} inputMode="decimal" onChange={function(e) { sSimA(e.target.value); }} />
            </div>
          </div>
          <div>
            <div className="prumo-lbl">{"Taxa mês"}</div>
            <div className="prumo-input-affix">
              <input className="prumo-input mono right with-suffix" value={simTaxa} inputMode="decimal" onChange={function(e) { sSimT(e.target.value); }} />
              <span className="suffix">{"%"}</span>
            </div>
          </div>
          <div>
            <div className="prumo-lbl">{"Tempo (m)"}</div>
            <input className="prumo-input mono right" value={simTempo} inputMode="numeric" onChange={function(e) { sSimTp(e.target.value); }} />
          </div>
        </div>
        <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div className="prumo-cap">{"Patrimônio em " + String(sim.simAnos) + " anos"}</div>
            <div className="prumo-big brand" style={{ fontSize: 30 }}>{fmt(sim.simFV)}</div>
          </div>
          <div className="prumo-mini-stat-row">
            <div className="prumo-mini-stat"><div className="lbl">{"PL hoje"}</div><div className="val">{fmt(nwBalance)}</div></div>
            <div className="prumo-mini-stat"><div className="lbl">{"Aportado"}</div><div className="val brand">{fmt(sim.simTotalAport)}</div></div>
            <div className="prumo-mini-stat"><div className="lbl">{"Juros"}</div><div className="val pos">{fmt(sim.simJuros > 0 ? sim.simJuros : 0)}</div></div>
          </div>
          <div className="prumo-lbl" style={{ marginTop: 14, marginBottom: 6 }}>{"Composição do PL final"}</div>
          <div style={{ height: 12, borderRadius: 6, overflow: "hidden", display: "flex" }}>
            <div style={{ width: String(sim.simFV > 0 ? (nwBalance / sim.simFV) * 100 : 0) + "%", background: "var(--ink)", transition: "width 0.4s" }} />
            <div style={{ width: String(sim.simFV > 0 ? (sim.simTotalAport / sim.simFV) * 100 : 0) + "%", background: "var(--brand)", transition: "width 0.4s" }} />
            <div style={{ flex: 1, background: "var(--pos)", transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 9, height: 9, borderRadius: 2, background: "var(--ink)" }} /><span className="prumo-cap" style={{ fontSize: 10 }}>{"PL atual"}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 9, height: 9, borderRadius: 2, background: "var(--brand)" }} /><span className="prumo-cap" style={{ fontSize: 10 }}>{"Aportes"}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 9, height: 9, borderRadius: 2, background: "var(--pos)" }} /><span className="prumo-cap" style={{ fontSize: 10 }}>{"Juros (" + pct(sim.jurosRatio) + ")"}</span></div>
          </div>
        </div>
        {sim.simBars.length > 0 && (
          <div>
            <div className="prumo-lbl" style={{ marginBottom: 8 }}>{"Evolução do PL"}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
              {sim.simBars.map(function(bar, idx) {
                var totalH = sim.barMax > 0 ? (bar.fv / sim.barMax) * 90 : 0;
                var principalH = bar.fv > 0 ? (bar.principal / bar.fv) * totalH : 0;
                var jurosH = totalH - principalH;
                var lbl = bar.m >= 12 ? String(Math.round(bar.m / 12)) + "a" : String(bar.m) + "m";
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: "hidden", height: totalH, minHeight: 2 }}>
                      <i style={{ flex: String(bar.principal) + " 0 0", background: "var(--brand)", display: "block", minHeight: 1 }} />
                      <i style={{ flex: String(bar.juros > 0 ? bar.juros : 0) + " 0 0", background: "var(--pos)", display: "block", minHeight: 1 }} />
                    </div>
                    <div style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 3, fontFamily: "var(--f-mono)", fontWeight: 600 }}>{lbl}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RENDA PASSIVA + GAMIFICATION */}
      <div className="prumo-card l-pos full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Renda passiva do PL"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Renda variável × 0,7% a.m."}</h2>
          </div>
          <span style={{ fontSize: 22 }}>{"🏦"}</span>
        </div>
        <div className="prumo-cap" style={{ marginBottom: 10 }}>{"Base de cálculo: " + fmt(pBase) + " em renda variável (definido na aba Vida)"}</div>
        <div className="prumo-mini-stat-row cols-2" style={{ marginBottom: 12 }}>
          <div className="prumo-mini-stat"><div className="lbl">{"Renda passiva/mês"}</div><div className="val brand" style={{ fontSize: 18 }}>{fmt(rp.rpMensal)}</div></div>
          <div className="prumo-mini-stat"><div className="lbl">{"Total fixas/mês"}</div><div className="val" style={{ color: rp.coverPct >= 1 ? "var(--pos)" : "var(--ink)", fontSize: 18 }}>{fmt(rp.fxTotal)}</div></div>
        </div>
        <div className="prumo-meter" style={{ height: 10 }}>
          <i style={{ width: pct(Math.min(rp.coverPct, 1)), background: rp.coverPct >= 1 ? "var(--pos)" : "var(--brand)" }} />
        </div>
        <div className="prumo-cap" style={{ marginTop: 6, textAlign: "center" }}>{"Cobre " + pct(Math.min(rp.coverPct, 1)) + " das fixas"}</div>
        {fxd.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="prumo-lbl" style={{ marginBottom: 6 }}>{"Contas que já conseguiria pagar"}</div>
            {rp.coveredFx.length === 0 ? (
              <div className="prumo-cap" style={{ color: "var(--neg)" }}>{"Ainda não cobre nenhuma fixa. Continue investindo em renda variável."}</div>
            ) : (
              <div>
                {rp.coveredFx.map(function(f) {
                  var cat2 = cats.find(function(c) { return c.id === f.cat; });
                  var myA = f.hasSplit ? f.amount - spt(f) : f.amount;
                  return (
                    <div key={f.id} className="prumo-tx" style={{ padding: "8px 0" }}>
                      <span style={{ fontSize: 18 }}>{"✅"}</span>
                      <div className="prumo-tx-meat"><div className="prumo-tx-desc">{(cat2 ? cat2.icon + " " : "") + f.name}</div></div>
                      <span className="prumo-tx-amt">{fmt(myA)}</span>
                    </div>
                  );
                })}
                <div className="prumo-success" style={{ marginTop: 10 }}>
                  <div className="prumo-success-strong">
                    {"💡 Com " + fmt(pBase) + " em renda variável você já paga " + String(rp.coveredFx.length) + " conta" + (rp.coveredFx.length > 1 ? "s" : "") + " fixa" + (rp.coveredFx.length > 1 ? "s" : "") + " todo mês — sem trabalhar."}
                  </div>
                </div>
              </div>
            )}
            {rp.uncovered.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"🎯 Próximas conquistas"}</div>
                <div className="prumo-cap" style={{ marginBottom: 10 }}>{"Da menor para a maior — quanto falta acumular em RV"}</div>
                {rp.uncovered.slice(0, 5).map(function(item) {
                  var faltaPL = item.plNeeded - pBase;
                  var progressPct = Math.min(pBase / item.plNeeded, 1);
                  var cat3 = cats.find(function(c) { return c.id === item.f.cat; });
                  return (
                    <div key={item.f.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{cat3 ? cat3.icon : "💳"}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.f.name}</div>
                            <div className="prumo-cap" style={{ fontSize: 11 }}>{fmt(item.myA) + "/mês"}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="prumo-num" style={{ color: "var(--brand)", fontSize: 12 }}>{"RV: " + fmt(item.plNeeded)}</div>
                          <div className="prumo-cap" style={{ color: "var(--neg)", fontSize: 10 }}>{"falta " + fmt(faltaPL)}</div>
                        </div>
                      </div>
                      <div className="prumo-meter">
                        <i style={{ width: pct(progressPct), background: "var(--pos)" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontFamily: "var(--f-mono)", color: "var(--ink-3)" }}>
                        <span>{fmt(pBase) + " atual"}</span>
                        <span>{pct(progressPct) + " do caminho"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {fxd.length === 0 && (
          <div className="prumo-cap" style={{ textAlign: "center", padding: 14 }}>{"Cadastre contas fixas para ver quais o seu PL já consegue pagar."}</div>
        )}
      </div>

      {/* PARCELAS ATIVAS */}
      {activeInst.length > 0 && (
        <div className="prumo-card l-warn full">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Parcelas ativas"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Compromissos parcelados"}</h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="prumo-cap">{"Custo mensal"}</div>
              <div className="prumo-big accent" style={{ fontSize: 22 }}>{fmt(totalInstMonthly)}</div>
            </div>
          </div>
          {activeInst.map(function(it, idx) {
            var cat2 = cats.find(function(c) { return c.id === it.cat; });
            return (
              <div key={idx} className="prumo-tx">
                <div className="prumo-tx-icon">{cat2 ? cat2.icon : "💳"}</div>
                <div className="prumo-tx-meat">
                  <div className="prumo-tx-desc">{it.desc}</div>
                  <div className="prumo-tx-meta">{String(it.remaining) + " parcelas restantes"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="prumo-tx-amt" style={{ color: "var(--accent-2)" }}>{fmt(it.amount) + "/m"}</div>
                  <div className="prumo-cap" style={{ fontSize: 10 }}>{"Total: " + fmt(it.amount * it.remaining)}</div>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span className="prumo-lbl" style={{ marginBottom: 0, color: "var(--ink)" }}>{"Compromisso total"}</span>
            <span className="prumo-num" style={{ color: "var(--accent-2)", fontSize: 14 }}>{fmt(activeInst.reduce(function(a, it) { return a + it.amount * it.remaining; }, 0))}</span>
          </div>
        </div>
      )}

      {/* COMPARATIVO MÊS A MÊS */}
      {prevSp && (
        <div className="prumo-card full">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Comparativo"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{MA[mo === 0 ? 11 : mo - 1] + " → " + MA[mo]}</h2>
            </div>
          </div>
          {GR.map(function(g) {
            var c2 = spent[g.id]; var pv = prevSp[g.id]; var diff = c2 - pv;
            var pD = pv > 0 ? diff / pv : 0;
            var isGood = g.id === "investimentos" ? diff > 0 : diff < 0;
            return (
              <div key={g.id} className="prumo-cmp-row">
                <div style={{ width: 4, height: 32, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>{g.label}</span>
                <span className="prumo-num" style={{ minWidth: 80, textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>{fmt(pv)}</span>
                <span style={{ color: "var(--ink-4)" }}>{"→"}</span>
                <span className="prumo-num" style={{ minWidth: 80, textAlign: "right", fontSize: 13 }}>{fmt(c2)}</span>
                <span className={"prumo-chip " + (isGood ? "pos" : "neg")} style={{ minWidth: 70, justifyContent: "center" }}>{(diff > 0 ? "▲ " : "▼ ") + pct(Math.abs(pD))}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* GRÁFICO ANUAL + TABELA */}
      {chD.length > 0 && (
        <div className="prumo-card full">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Projeção anual"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{String(yr) + " · fixas + parceladas"}</h2>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { l: "Ess.", c: "var(--brand)" },
                { l: "Inv.", c: "var(--ink-2)" },
                { l: "Des.", c: "var(--accent)" },
                { l: "Créd.", c: "var(--pos)", round: true }
              ].map(function(it) {
                return (
                  <div key={it.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ink-2)" }}>
                    <div style={{ width: 9, height: 9, borderRadius: it.round ? "50%" : 2, background: it.c }} />
                    <span>{it.l}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200, padding: "20px 0 0", position: "relative" }}>
            {chD.map(function(d, idx) {
              var bH = chMx > 0 ? (d.td / chMx) * 170 : 0;
              var cH = chMx > 0 ? (d.cr / chMx) * 170 : 0;
              var cu = idx === mo;
              var isH = hovM === idx;
              var brandCol = d.real ? "var(--brand)" : "oklch(0.78 0.04 235)";
              var inkCol = d.real ? "var(--ink-2)" : "oklch(0.78 0.015 250)";
              var accCol = d.real ? "var(--accent)" : "oklch(0.88 0.06 75)";
              return (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", cursor: "pointer" }}
                  onClick={function() { sHM(isH ? null : idx); }}
                  onMouseEnter={function() { sHM(idx); }}
                  onMouseLeave={function() { sHM(null); }}>
                  <div style={{ position: "absolute", bottom: cH, left: 0, right: 0, height: 2, background: "var(--pos)", borderRadius: 1, zIndex: 2 }} />
                  <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: "hidden", height: bH, minHeight: 4, outline: isH ? "2px solid var(--ink)" : "none", outlineOffset: 1 }}>
                    <i style={{ flex: String(d.e) + " 0 0", background: brandCol, display: "block", minHeight: 1 }} />
                    <i style={{ flex: String(d.i) + " 0 0", background: inkCol, display: "block", minHeight: 1 }} />
                    <i style={{ flex: String(d.d) + " 0 0", background: accCol, display: "block", minHeight: 1 }} />
                  </div>
                  <div style={{ fontSize: 9, color: cu ? "var(--ink)" : "var(--ink-3)", marginTop: 4, fontWeight: cu ? 800 : 600 }}>{d.mes}</div>
                  {isH && d.td > 0 && <ChartTip d={d} i={idx} cats={cats} />}
                </div>
              );
            })}
          </div>
          <div className="prumo-lbl" style={{ marginTop: 22, marginBottom: 6 }}>{"Saldo mensal"}</div>
          <div className="prumo-sim-bars">
            {chD.map(function(d, idx) {
              var h = chMs > 0 ? (Math.abs(d.s) / chMs) * 30 : 0;
              var pos = d.s >= 0;
              var cu = idx === mo;
              return (
                <div key={idx} className="prumo-sim-col">
                  <div className="prumo-sim-half" style={{ height: 30, justifyContent: "flex-end" }}>
                    {pos && <div className="prumo-sim-bar-pos" style={{ height: h, opacity: cu ? 1 : 0.55 }} />}
                  </div>
                  <div className="prumo-sim-axis" />
                  <div className="prumo-sim-half" style={{ height: 30, justifyContent: "flex-start" }}>
                    {!pos && <div className="prumo-sim-bar-neg" style={{ height: h, opacity: cu ? 1 : 0.55 }} />}
                  </div>
                  <div style={{ fontSize: 9, color: cu ? "var(--ink)" : "var(--ink-3)", fontWeight: cu ? 800 : 500 }}>{d.mes}</div>
                </div>
              );
            })}
          </div>
          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table className="prumo-data-table" style={{ minWidth: 460 }}>
              <thead>
                <tr>
                  <th></th>
                  {chD.map(function(d, idx) { return <th key={idx} className={idx === mo ? "cur" : ""}>{d.mes}</th>; })}
                </tr>
              </thead>
              <tbody>
                {[{ l: "Déb.", k: "td", c: "neg" }, { l: "Créd.", k: "cr", c: "pos" }, { l: "Saldo", k: "s", c: "brand" }].map(function(row) {
                  return (
                    <tr key={row.k}>
                      <td className={"row-lbl " + row.c}>{row.l}</td>
                      {chD.map(function(d, idx) {
                        var val = d[row.k] || 0;
                        var cls = row.k === "s" ? (val >= 0 ? "pos" : "neg") : "";
                        return <td key={idx} className={(idx === mo ? "cur " : "") + cls}>{fK(val)}</td>;
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
  );
}

/* ══ VIDA PRUMO (Patrimônio Líquido) ══ */
function VidaPrumo(props) {
  var [evolMode, sEvolMode] = useState("monthly");
  var cfg = props.cfg;
  var saveCfg = props.saveCfg;
  var nwHistory = props.nwHistory;

  var pat = cfg.patrimonio || {
    reserva: 0,
    invFixed: 0,
    invVariable: 0,
    invOther: 0,
    imoveis: 0,
    veiculos: 0,
    outrosAtivos: 0,
    financiamentos: 0,
    emprestimos: 0,
    cartao: 0,
    outrosPassivos: 0,
  };

  var totAtivosFin = (pat.reserva || 0) + (pat.invFixed || 0) + (pat.invVariable || 0) + (pat.invOther || 0);
  var totAtivosImob = (pat.imoveis || 0) + (pat.veiculos || 0) + (pat.outrosAtivos || 0);
  var totAtivos = totAtivosFin + totAtivosImob;
  var totPassivos = (pat.financiamentos || 0) + (pat.emprestimos || 0) + (pat.cartao || 0) + (pat.outrosPassivos || 0);
  var pl = totAtivos - totPassivos;
  var alavancagem = totAtivos > 0 ? totPassivos / totAtivos : 0;

  var update = function(field, raw) {
    var clean = String(raw).replace(/\./g, "").replace(",", ".");
    var v = parseFloat(clean);
    var newPat = { ...pat };
    newPat[field] = isNaN(v) ? 0 : v;
    var newTotAtivos = (newPat.reserva || 0) + (newPat.invFixed || 0) + (newPat.invVariable || 0) + (newPat.invOther || 0) + (newPat.imoveis || 0) + (newPat.veiculos || 0) + (newPat.outrosAtivos || 0);
    var newTotPassivos = (newPat.financiamentos || 0) + (newPat.emprestimos || 0) + (newPat.cartao || 0) + (newPat.outrosPassivos || 0);
    var newPL = newTotAtivos - newTotPassivos;
    var nw = cfg.netWorth || { balance: 0, history: [] };
    // Atualiza histórico: 1 ponto por dia (substitui o do dia se já existe)
    var today = new Date().toISOString().slice(0, 10);
    var hist = (nw.history || []).filter(function(h) { return String(h.date).slice(0, 10) !== today; });
    hist.push({ date: new Date().toISOString(), balance: newPL });
    hist = hist.slice(-365);
    saveCfg({ ...cfg, patrimonio: newPat, netWorth: { ...nw, balance: newPL, history: hist } });
  };

  // Composição: % de cada bucket no total de ativos
  var pctReserva = totAtivos > 0 ? (pat.reserva || 0) / totAtivos * 100 : 0;
  var pctInvFix = totAtivos > 0 ? (pat.invFixed || 0) / totAtivos * 100 : 0;
  var pctInvVar = totAtivos > 0 ? (pat.invVariable || 0) / totAtivos * 100 : 0;
  var pctInvOth = totAtivos > 0 ? (pat.invOther || 0) / totAtivos * 100 : 0;
  var pctImoveis = totAtivos > 0 ? (pat.imoveis || 0) / totAtivos * 100 : 0;
  var pctVeic = totAtivos > 0 ? (pat.veiculos || 0) / totAtivos * 100 : 0;
  var pctOutrosA = totAtivos > 0 ? (pat.outrosAtivos || 0) / totAtivos * 100 : 0;

  // Histórico agregado (último ponto de cada mês ou ano)
  var aggregated = (function() {
    if (!nwHistory || nwHistory.length === 0) return [];
    var byKey = {};
    nwHistory.forEach(function(h) {
      var d = new Date(h.date);
      if (isNaN(d.getTime())) return;
      var key = evolMode === "annual"
        ? String(d.getFullYear())
        : String(d.getFullYear()) + "-" + String(d.getMonth() + 1).padStart(2, "0");
      byKey[key] = { key: key, date: h.date, balance: h.balance };
    });
    return Object.values(byKey).sort(function(a, b) { return a.key.localeCompare(b.key); });
  })();
  var aggMax = aggregated.length > 0 ? Math.max.apply(null, aggregated.map(function(h) { return h.balance; }).concat([1])) : 1;
  var aggMin = aggregated.length > 0 ? Math.min.apply(null, aggregated.map(function(h) { return h.balance; })) : 0;
  var aggRange = aggMax - aggMin || 1;

  var inputRow = function(field, label, color) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: color || "var(--ink-3)" }} />
          <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>{label}</span>
        </div>
        <div className="prumo-input-affix" style={{ width: 150 }}>
          <span className="prefix">{"R$"}</span>
          <input
            className="prumo-input mono right with-prefix"
            placeholder="0"
            inputMode="decimal"
            defaultValue={(pat[field] || 0) > 0 ? String(pat[field] || 0).replace(".", ",") : ""}
            onBlur={function(e) { update(field, e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") e.target.blur(); }}
            style={{ fontSize: 12, padding: "8px 11px 8px 30px" }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="prumo-form-grid">

      {/* HERO PL */}
      <div className="prumo-card l-brand full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Patrimônio líquido"}</div>
            <div className="prumo-big brand" style={{ marginTop: 6, fontSize: 42 }}>{fmt(pl)}</div>
            <div className="prumo-cap" style={{ marginTop: 6 }}>{"Ativos − Passivos · atualizado automaticamente"}</div>
          </div>
        </div>
        <div className="prumo-mini-stat-row" style={{ marginTop: 14 }}>
          <div className="prumo-mini-stat"><div className="lbl">{"Total Ativos"}</div><div className="val pos">{fmt(totAtivos)}</div></div>
          <div className="prumo-mini-stat"><div className="lbl">{"Total Passivos"}</div><div className="val neg">{fmt(totPassivos)}</div></div>
          <div className="prumo-mini-stat"><div className="lbl">{"Alavancagem"}</div><div className={"val " + (alavancagem >= 0.5 ? "neg" : alavancagem >= 0.3 ? "warn" : "pos")}>{pct(alavancagem)}</div></div>
        </div>

        {/* Composição em barra empilhada */}
        {totAtivos > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="prumo-lbl" style={{ marginBottom: 6 }}>{"Composição dos ativos"}</div>
            <div style={{ height: 14, borderRadius: 7, overflow: "hidden", display: "flex", background: "var(--surface-2)" }}>
              {pctReserva > 0 && <div style={{ width: pctReserva + "%", background: "var(--pos)" }} title={"Reserva " + pct(pctReserva / 100)} />}
              {pctInvFix > 0 && <div style={{ width: pctInvFix + "%", background: "var(--brand)" }} title={"Renda Fixa " + pct(pctInvFix / 100)} />}
              {pctInvVar > 0 && <div style={{ width: pctInvVar + "%", background: "var(--brand-2)" }} title={"Renda Variável " + pct(pctInvVar / 100)} />}
              {pctInvOth > 0 && <div style={{ width: pctInvOth + "%", background: "var(--ink-2)" }} title={"Outros invest. " + pct(pctInvOth / 100)} />}
              {pctImoveis > 0 && <div style={{ width: pctImoveis + "%", background: "var(--accent)" }} title={"Imóveis " + pct(pctImoveis / 100)} />}
              {pctVeic > 0 && <div style={{ width: pctVeic + "%", background: "var(--accent-2)" }} title={"Veículos " + pct(pctVeic / 100)} />}
              {pctOutrosA > 0 && <div style={{ width: pctOutrosA + "%", background: "var(--ink-3)" }} title={"Outros ativos " + pct(pctOutrosA / 100)} />}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {[
                { l: "Reserva", c: "var(--pos)", v: pctReserva },
                { l: "Renda Fixa", c: "var(--brand)", v: pctInvFix },
                { l: "Renda Var.", c: "var(--brand-2)", v: pctInvVar },
                { l: "Outros inv.", c: "var(--ink-2)", v: pctInvOth },
                { l: "Imóveis", c: "var(--accent)", v: pctImoveis },
                { l: "Veículos", c: "var(--accent-2)", v: pctVeic },
                { l: "Outros at.", c: "var(--ink-3)", v: pctOutrosA },
              ].filter(function(x) { return x.v > 0; }).map(function(x) {
                return (
                  <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }} />
                    <span style={{ fontSize: 10, color: "var(--ink-2)", fontFamily: "var(--f-mono)" }}>{x.l + " " + x.v.toFixed(1) + "%"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ATIVOS FINANCEIROS */}
      <div className="prumo-card l-pos">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Ativos financeiros"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Reserva + investimentos"}</h2>
          </div>
          <div className="prumo-num" style={{ color: "var(--pos)", fontSize: 15 }}>{fmt(totAtivosFin)}</div>
        </div>
        {inputRow("reserva", "Reserva de emergência", "var(--pos)")}
        {inputRow("invFixed", "Renda fixa", "var(--brand)")}
        {inputRow("invVariable", "Renda variável", "var(--brand-2)")}
        {inputRow("invOther", "Outros investimentos", "var(--ink-2)")}
      </div>

      {/* ATIVOS IMOBILIZADOS */}
      <div className="prumo-card l-warn">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Ativos imobilizados"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Bens não-líquidos"}</h2>
          </div>
          <div className="prumo-num" style={{ color: "var(--accent-2)", fontSize: 15 }}>{fmt(totAtivosImob)}</div>
        </div>
        {inputRow("imoveis", "Imóveis", "var(--accent)")}
        {inputRow("veiculos", "Veículos", "var(--accent-2)")}
        {inputRow("outrosAtivos", "Outros bens", "var(--ink-3)")}
      </div>

      {/* PASSIVOS */}
      <div className="prumo-card l-neg full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Passivos"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Dívidas e compromissos"}</h2>
          </div>
          <div className="prumo-num" style={{ color: "var(--neg)", fontSize: 15 }}>{fmt(totPassivos)}</div>
        </div>
        {inputRow("financiamentos", "Financiamentos", "var(--neg)")}
        {inputRow("emprestimos", "Empréstimos", "var(--neg)")}
        {inputRow("cartao", "Saldo de cartão", "var(--neg)")}
        {inputRow("outrosPassivos", "Outras dívidas", "var(--ink-3)")}
      </div>

      {/* EVOLUÇÃO DO PL */}
      {aggregated.length > 1 && (
        <div className="prumo-card full">
          <div className="prumo-card-hd">
            <div>
              <div className="prumo-lbl">{"Evolução do PL"}</div>
              <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{evolMode === "annual" ? "Por ano" : "Por mês"}</h2>
            </div>
            <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 3, borderRadius: 999, border: "1px solid var(--line)" }}>
              <button
                onClick={function() { sEvolMode("monthly"); }}
                style={{ padding: "5px 12px", border: "none", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", background: evolMode === "monthly" ? "var(--ink)" : "transparent", color: evolMode === "monthly" ? "var(--surface)" : "var(--ink-2)", fontFamily: "var(--f-ui)" }}>{"Mensal"}</button>
              <button
                onClick={function() { sEvolMode("annual"); }}
                style={{ padding: "5px 12px", border: "none", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", background: evolMode === "annual" ? "var(--ink)" : "transparent", color: evolMode === "annual" ? "var(--surface)" : "var(--ink-2)", fontFamily: "var(--f-ui)" }}>{"Anual"}</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, marginTop: 14 }}>
            {aggregated.map(function(h, idx) {
              var barH = ((h.balance - aggMin) / aggRange) * 110 + 14;
              var isLast = idx === aggregated.length - 1;
              var isUp = idx > 0 && h.balance >= aggregated[idx - 1].balance;
              var lbl;
              if (evolMode === "annual") {
                lbl = h.key;
              } else {
                var parts = h.key.split("-");
                lbl = MS[parseInt(parts[1], 10) - 1].slice(0, 3) + "/" + parts[0].slice(2);
              }
              return (
                <div key={h.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: "100%", height: barH, background: isLast ? "var(--brand)" : (isUp ? "oklch(0.58 0.13 155 / .55)" : "oklch(0.58 0.16 25 / .45)"), borderRadius: "3px 3px 0 0", transition: "height 0.4s" }} />
                  <div style={{ fontSize: 9, color: isLast ? "var(--ink)" : "var(--ink-3)", marginTop: 4, fontWeight: isLast ? 700 : 500, fontFamily: "var(--f-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{lbl}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, flexWrap: "wrap", gap: 8 }}>
            <span className="prumo-cap">{"Mín: " + fmt(aggMin)}</span>
            {aggregated.length >= 2 && (
              <span className={"prumo-chip " + (pl > aggregated[0].balance ? "pos" : "neg")}>
                {(pl > aggregated[0].balance ? "▲ +" : "▼ ") + fmt(Math.abs(pl - aggregated[0].balance)) + " no período"}
              </span>
            )}
            <span className="prumo-cap">{"Máx: " + fmt(aggMax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ FIXAS PRUMO ══ */
function FixasPrumo(props) {
  var [editFx, sEditFx] = useState(null); // {id, amount, endDate, scope}
  var cfg = props.cfg;
  var cats = props.cats;
  var fxd = props.fxd;
  var fs = props.fs;
  var md = props.md;
  var saveMd = props.saveMd;
  var saveCfg = props.saveCfg;
  var ff = props.ff;
  var sFf = props.sFf;
  var showFx = props.showFx;
  var sSFx = props.sSFx;
  var err = props.err;
  var sErr = props.sErr;
  var tab = props.tab;
  var addFx = props.addFx;
  var rmFx = props.rmFx;
  var togFP = props.togFP;
  var spt = props.spt;
  var gsp = props.gsp;
  var addPart = props.addPart;
  var pO = props.pO;
  var sPO = props.sPO;
  var pV = props.pV;
  var sPV = props.sPV;
  var fxPd = props.fxPd;
  var fxMy = props.fxMy;
  var mo = props.mo;
  var yr = props.yr;

  var currentYM = tk(yr, mo);

  var applyFxEdit = function() {
    if (!editFx) return;
    var fxdRaw = cfg.fixed || [];
    var fxIdx = fxdRaw.findIndex(function(f) { return f.id === editFx.id; });
    if (fxIdx < 0) { sEditFx(null); return; }
    var orig = fxdRaw[fxIdx];
    var clean = function(s) { return parseFloat(String(s).replace(/\./g, "").replace(",", ".")); };
    var newAmount = editFx.amount ? clean(editFx.amount) : NaN;
    var newEndDate = editFx.endDate || null;
    var updatedFx = { ...orig };

    if (!isNaN(newAmount) && newAmount > 0 && newAmount !== orig.amount) {
      if (editFx.scope === "month") {
        // override pontual neste mês
        var ov = { ...(orig.overrides || {}) };
        ov[currentYM] = newAmount;
        updatedFx.overrides = ov;
      } else if (editFx.scope === "future") {
        // mudança permanente a partir deste mês
        var hist = (orig.amountHistory || []).slice();
        hist = hist.filter(function(h) { return h.from !== currentYM; });
        hist.push({ from: currentYM, amount: newAmount });
        updatedFx.amountHistory = hist;
      } else {
        // permanent — muda o valor base
        updatedFx.amount = newAmount;
      }
    }
    // endDate sempre aplica (ou remove)
    if (editFx.endDate === "") {
      delete updatedFx.endDate;
    } else if (newEndDate) {
      updatedFx.endDate = newEndDate;
    }
    var newFxd = fxdRaw.slice();
    newFxd[fxIdx] = updatedFx;
    saveCfg({ ...cfg, fixed: newFxd });
    sEditFx(null);
  };

  return (
    <div className="prumo-form-grid">
      {/* HEADER + STATS + FORM */}
      <div className="prumo-card l-brand full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Contas fixas · " + MS[mo]}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{fxd.length > 0 ? String(fxPd) + " de " + String(fxd.length) + " pagas" : "Nenhuma conta cadastrada"}</h2>
          </div>
          <button className={"prumo-btn " + (showFx ? "ghost" : "brand")} onClick={function() { sSFx(!showFx); sErr(""); }}>{showFx ? "Cancelar" : "+ Nova fixa"}</button>
        </div>
        {fxd.length > 0 && (
          <div className="prumo-mini-stat-row cols-2" style={{ marginTop: 10 }}>
            <div className="prumo-mini-stat"><div className="lbl">{"Progresso do mês"}</div><div className="val brand">{pct(fxd.length > 0 ? fxPd / fxd.length : 0)}</div></div>
            <div className="prumo-mini-stat"><div className="lbl">{"Total/mês (sua parte)"}</div><div className="val">{fmt(fxMy)}</div></div>
          </div>
        )}
        {fxd.length > 0 && (
          <div className="prumo-meter" style={{ marginTop: 12, height: 8 }}>
            <i style={{ width: pct(fxd.length > 0 ? fxPd / fxd.length : 0), background: "var(--brand)" }} />
          </div>
        )}
        {showFx && (
          <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: 16, marginTop: 14, border: "1px solid var(--line)" }}>
            <div className="prumo-lbl" style={{ marginBottom: 8 }}>{"Nova conta fixa"}</div>
            <div className="prumo-form">
              <div className="prumo-grid-2">
                <input className="prumo-input" placeholder="Nome (ex: Aluguel)" value={ff.name} onChange={function(e) { sFf({ ...ff, name: e.target.value }); }} />
                <input className="prumo-input mono right" placeholder="0,00" value={ff.amount} inputMode="decimal" onChange={function(e) { sFf({ ...ff, amount: e.target.value }); }} />
              </div>
              <div className="prumo-grid-2">
                <CatS prumo value={ff.cat} onChange={function(e) { sFf({ ...ff, cat: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                <select className="prumo-input" value={ff.pay} onChange={function(e) { sFf({ ...ff, pay: e.target.value }); }}>
                  {PAYS.map(function(p) { return <option key={p}>{p}</option>; })}
                </select>
              </div>
              <div className="prumo-lbl" style={{ marginTop: 4 }}>{"Modo de acompanhamento"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ m: "budget", l: "Orçamento", d: "Paga em PIX/Boleto, acompanha valor pago" }, { m: "checklist", l: "Checklist", d: "Cartão de crédito, só marca como pago" }].map(function(o) {
                  var active = (ff.mode || "budget") === o.m;
                  return (
                    <div key={o.m} onClick={function() { sFf({ ...ff, mode: o.m }); }}
                      style={{ flex: 1, padding: 12, borderRadius: 10, cursor: "pointer", border: active ? "2px solid var(--brand)" : "1px solid var(--line)", background: active ? "var(--brand-tint)" : "var(--surface)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--brand)" : "var(--ink)" }}>{o.l}</div>
                      <div className="prumo-cap" style={{ fontSize: 11, marginTop: 2 }}>{o.d}</div>
                    </div>
                  );
                })}
              </div>
              <label className="prumo-check" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={ff.hs} onChange={function(e) { sFf({ ...ff, hs: e.target.checked }); }} />{"Dividir com outra pessoa"}
              </label>
              {ff.hs && <SE prumo splits={ff.sp} onChange={function(s) { sFf({ ...ff, sp: s }); }} />}
              {err && tab === "fixas" && <div className="prumo-form-err">{"⚠️ " + err}</div>}
              <button className="prumo-btn brand" style={{ padding: "12px 18px", fontSize: 13, marginTop: 2 }} onClick={addFx}>{"Salvar fixa"}</button>
            </div>
          </div>
        )}
      </div>

      {/* LISTA DE FIXAS */}
      {fxd.length === 0 ? (
        <div className="prumo-card full" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"📋"}</div>
          <div className="prumo-cap">{"Nenhuma conta fixa cadastrada. Use o botão acima para adicionar a primeira."}</div>
        </div>
      ) : (
        <div className="prumo-card full" style={{ padding: 0 }}>
          <div style={{ padding: "16px 18px 8px" }}>
            <div className="prumo-lbl">{"Suas fixas deste mês"}</div>
          </div>
          {fxd.map(function(f) {
            var cat2 = cats.find(function(c) { return c.id === f.cat; });
            var ip = fs[f.id] === "paid";
            var myA = f.hasSplit ? f.amount - spt(f) : f.amount;
            var sp2 = gsp(f);
            var mode = f.mode || "budget";
            var parts = fs[f.id + "_p"] || [];
            var pSum = parts.reduce(function(a, p) { return a + p.amount; }, 0);
            var isO = pO === f.id;
            var partPct = f.amount > 0 ? Math.min(pSum / f.amount, 1) : 0;
            var remainAmt = Math.max(0, f.amount - pSum);
            // Resolve original do cfg para mostrar overrides/endDate
            var fxdRaw = cfg.fixed || [];
            var origFx = fxdRaw.find(function(x) { return x.id === f.id; }) || f;
            var hasOverrideThisMonth = origFx.overrides && origFx.overrides[currentYM] !== undefined;
            var hasFutureHistory = (origFx.amountHistory || []).some(function(h) { return String(h.from) <= String(currentYM); });
            var endDateLabel = null;
            if (origFx.endDate) {
              var parts2 = origFx.endDate.split("-");
              if (parts2.length === 2) endDateLabel = MS[parseInt(parts2[1], 10) - 1].slice(0, 3) + "/" + parts2[0];
            }
            return (
              <div key={f.id} style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", opacity: ip ? 0.55 : 1, background: ip ? "var(--surface-2)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <label className="prumo-check" style={{ paddingTop: 2 }}>
                    <input type="checkbox" checked={ip} onChange={function() { togFP(f.id); }} />
                  </label>
                  <div style={{ fontSize: 20, lineHeight: 1, paddingTop: 2 }}>{cat2 ? cat2.icon : "📄"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, textDecoration: ip ? "line-through" : "none", color: "var(--ink)" }}>{f.name}</span>
                      <span className={"prumo-chip " + (mode === "budget" ? "pos" : "brand")} style={{ fontSize: 10 }}>{mode === "budget" ? "Orçamento" : "Cartão"}</span>
                      {hasOverrideThisMonth && <span className="prumo-chip warn" style={{ fontSize: 10 }}>{"ajuste do mês"}</span>}
                      {endDateLabel && <span className="prumo-chip" style={{ fontSize: 10 }}>{"até " + endDateLabel}</span>}
                      {sp2.map(function(s, j) {
                        return <span key={j} className="prumo-chip warn" style={{ fontSize: 10 }}>{"÷ " + s.person + " " + String(s.pct) + "%"}</span>;
                      })}
                    </div>
                    {!ip && mode === "budget" && (
                      <div style={{ marginTop: 8 }}>
                        <div className="prumo-meter" style={{ height: 6 }}>
                          <i style={{ width: pct(partPct), background: partPct >= 1 ? "var(--pos)" : "var(--brand)" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span className="prumo-num" style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmt(pSum) + " pago"}</span>
                          {remainAmt > 0 ? (
                            <span className="prumo-num" style={{ fontSize: 11, color: "var(--accent-2)" }}>{"falta " + fmt(remainAmt)}</span>
                          ) : (
                            <span className="prumo-num" style={{ fontSize: 11, color: "var(--pos)" }}>{"✓ Quitada"}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="prumo-num" style={{ fontSize: 14, color: "var(--ink)" }}>{fmt(f.amount)}</div>
                    {f.hasSplit && <div className="prumo-cap" style={{ fontSize: 10, color: "var(--brand)" }}>{"Você: " + fmt(myA)}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {!ip && mode === "budget" && (
                      <button onClick={function() { sPO(isO ? null : f.id); sPV(""); }}
                        style={{ background: isO ? "var(--brand)" : "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 6, color: isO ? "var(--surface)" : "var(--brand)", width: 26, height: 26, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "var(--f-ui)" }}
                        title="Registrar pagamento parcial">{isO ? "×" : "+"}</button>
                    )}
                    <button onClick={function() {
                      var fxdRaw = cfg.fixed || [];
                      var orig = fxdRaw.find(function(x) { return x.id === f.id; }) || f;
                      sEditFx({ id: f.id, amount: String(f.amount).replace(".", ","), endDate: orig.endDate || "", scope: "future", origName: f.name });
                    }}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 6, color: "var(--ink-3)", width: 26, height: 26, cursor: "pointer", fontSize: 12, fontFamily: "var(--f-ui)" }}
                      title="Editar valor / prazo">{"✎"}</button>
                    <button onClick={function() { rmFx(f.id); }} className="prumo-icon-x" title="Remover">{"×"}</button>
                  </div>
                </div>
                {isO && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, marginLeft: 56 }}>
                    <div className="prumo-input-affix" style={{ flex: 1 }}>
                      <span className="prefix">{"R$"}</span>
                      <input className="prumo-input mono right with-prefix" placeholder="0,00" value={pV} inputMode="decimal"
                        autoFocus
                        onChange={function(e) { sPV(e.target.value); }}
                        onKeyDown={function(e) { if (e.key === "Enter") addPart(f.id); }} />
                    </div>
                    <button className="prumo-btn brand" onClick={function() { addPart(f.id); }}>{"Registrar"}</button>
                  </div>
                )}
                {parts.length > 0 && (
                  <div style={{ marginLeft: 56, marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--line-2)" }}>
                    {parts.map(function(p, pi3) {
                      return (
                        <div key={pi3} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 11 }}>
                          <span className="prumo-cap" style={{ fontFamily: "var(--f-mono)" }}>{sd(p.date) + " — " + fmt(p.amount)}</span>
                          <button onClick={function() { saveMd({ ...md, fs: { ...fs, [f.id + "_p"]: parts.filter(function(_, idx2) { return idx2 !== pi3; }) } }); }}
                            className="prumo-icon-x" style={{ width: 18, height: 18, fontSize: 11 }}>{"×"}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* MODAL EDIT */}
      {editFx && (
        <>
          <div className="prumo-sheet-overlay" onClick={function() { sEditFx(null); }}></div>
          <div className="prumo-sheet" style={{ maxWidth: 480, margin: "0 auto", left: 16, right: 16 }}>
            <div className="prumo-sheet-handle"></div>
            <div className="prumo-sheet-h">{"Editar fixa"}</div>
            <div className="prumo-sheet-sub">{editFx.origName}</div>
            <div className="prumo-form" style={{ marginTop: 4 }}>
              <div>
                <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Valor"}</div>
                <div className="prumo-input-affix">
                  <span className="prefix">{"R$"}</span>
                  <input className="prumo-input mono right with-prefix"
                    placeholder="0,00"
                    inputMode="decimal"
                    value={editFx.amount}
                    onChange={function(e) { sEditFx({ ...editFx, amount: e.target.value }); }} />
                </div>
              </div>
              <div>
                <div className="prumo-lbl" style={{ marginBottom: 6 }}>{"Escopo da mudança de valor"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { v: "month", l: "Só este mês", d: "Aplica só em " + MS[mo] + "/" + String(yr) },
                    { v: "future", l: "A partir deste mês", d: "Vale daqui pra frente, meses anteriores ficam como estão" },
                    { v: "permanent", l: "Para sempre (retroativo)", d: "Substitui o valor base. Útil pra correção de erro de cadastro." },
                  ].map(function(opt) {
                    var active = editFx.scope === opt.v;
                    return (
                      <div key={opt.v} onClick={function() { sEditFx({ ...editFx, scope: opt.v }); }}
                        style={{ padding: 10, borderRadius: 10, cursor: "pointer", border: active ? "2px solid var(--brand)" : "1px solid var(--line)", background: active ? "var(--brand-tint)" : "var(--surface)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid " + (active ? "var(--brand)" : "var(--line-2)"), background: active ? "var(--brand)" : "transparent", flexShrink: 0 }} />
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--brand)" : "var(--ink)" }}>{opt.l}</div>
                        </div>
                        <div className="prumo-cap" style={{ fontSize: 11, marginTop: 4, marginLeft: 22 }}>{opt.d}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Prazo final (opcional)"}</div>
                <div className="prumo-cap" style={{ marginBottom: 6 }}>{"A fixa some da projeção depois desse mês. Útil pra financiamentos."}</div>
                <input className="prumo-input" type="month" value={editFx.endDate} onChange={function(e) { sEditFx({ ...editFx, endDate: e.target.value }); }} />
                {editFx.endDate && (
                  <button className="prumo-btn ghost" style={{ marginTop: 6, fontSize: 11 }} onClick={function() { sEditFx({ ...editFx, endDate: "" }); }}>{"Sem prazo"}</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button className="prumo-btn brand" style={{ flex: 1, padding: "12px 18px" }} onClick={applyFxEdit}>{"Salvar"}</button>
                <button className="prumo-btn ghost" onClick={function() { sEditFx(null); }}>{"Cancelar"}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══ DEVEDORES PRUMO ══ */
function DevedoresPrumo(props) {
  var debtors = props.debtors;
  var df = props.df;
  var sDf = props.sDf;
  var showDebt = props.showDebt;
  var sSDbt = props.sSDbt;
  var addDebt = props.addDebt;
  var togFR = props.togFR;
  var togDR = props.togDR;
  var togRcv = props.togRcv;
  var rmD = props.rmD;
  var mo = props.mo;

  var devEntries = Object.entries(debtors);
  var totalPending = devEntries.reduce(function(a, e) { return a + e[1].pending; }, 0);
  var totalAll = devEntries.reduce(function(a, e) { return a + e[1].total; }, 0);
  var totalReceived = totalAll - totalPending;

  return (
    <div className="prumo-form-grid">
      {/* HERO + FORM */}
      <div className="prumo-card l-warn full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Devedores · " + MS[mo]}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{devEntries.length > 0 ? fmt(totalPending) + " a receber" : "Nenhuma dívida"}</h2>
          </div>
          <button className={"prumo-btn " + (showDebt ? "ghost" : "accent")} onClick={function() { sSDbt(!showDebt); }}>{showDebt ? "Cancelar" : "+ Devedor manual"}</button>
        </div>
        {devEntries.length > 0 && (
          <div className="prumo-mini-stat-row" style={{ marginTop: 10 }}>
            <div className="prumo-mini-stat"><div className="lbl">{"Pessoas"}</div><div className="val">{String(devEntries.length)}</div></div>
            <div className="prumo-mini-stat"><div className="lbl">{"Pendente"}</div><div className="val warn">{fmt(totalPending)}</div></div>
            <div className="prumo-mini-stat"><div className="lbl">{"Já recebido"}</div><div className="val pos">{fmt(totalReceived)}</div></div>
          </div>
        )}
        {showDebt && (
          <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: 16, marginTop: 14, border: "1px solid var(--line)" }}>
            <div className="prumo-lbl" style={{ marginBottom: 8 }}>{"Novo devedor manual"}</div>
            <div className="prumo-cap" style={{ marginBottom: 10 }}>{"Use isso para dívidas que não vêm de splits automáticos de lançamentos"}</div>
            <div className="prumo-form">
              <input className="prumo-input" placeholder="Descrição (ex: Empréstimo para João)" value={df.desc} onChange={function(e) { sDf({ ...df, desc: e.target.value }); }} />
              <div className="prumo-grid-2">
                <input className="prumo-input mono right" placeholder="0,00" value={df.amount} inputMode="decimal" onChange={function(e) { sDf({ ...df, amount: e.target.value }); }} />
                <input className="prumo-input" placeholder="Quem deve?" value={df.person} onChange={function(e) { sDf({ ...df, person: e.target.value }); }} />
              </div>
              <button className="prumo-btn brand" style={{ padding: "12px 18px", fontSize: 13, marginTop: 2 }} onClick={addDebt}>{"Adicionar"}</button>
            </div>
          </div>
        )}
      </div>

      {/* LISTA */}
      {devEntries.length === 0 ? (
        <div className="prumo-card full" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"🤝"}</div>
          <div className="prumo-cap">{"Sem dívidas a receber neste mês. Splits de despesas e devedores manuais aparecem aqui."}</div>
        </div>
      ) : devEntries.map(function(e2) {
        var person = e2[0];
        var data = e2[1];
        var initial = String(person || "?").charAt(0).toUpperCase();
        var paidPct = data.total > 0 ? (data.total - data.pending) / data.total : 0;
        var allDone = data.pending === 0 && data.total > 0;
        return (
          <div key={person} className={"prumo-card " + (allDone ? "l-pos" : "l-warn") + " full"}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div className="prumo-dev-av" style={{ width: 42, height: 42, fontSize: 16 }}>{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: 0, color: "var(--ink)" }}>{person}</h3>
                <div className="prumo-cap" style={{ marginTop: 2 }}>{String(data.items.length) + " lançamento" + (data.items.length === 1 ? "" : "s")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="prumo-lbl" style={{ fontSize: 9 }}>{allDone ? "Quitado" : "Pendente"}</div>
                <div className="prumo-big" style={{ color: allDone ? "var(--pos)" : "var(--accent-2)", fontSize: 26, marginTop: 2 }}>{fmt(data.pending)}</div>
              </div>
            </div>
            <div className="prumo-meter" style={{ height: 8 }}>
              <i style={{ width: pct(paidPct), background: allDone ? "var(--pos)" : "var(--brand)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
              <span className="prumo-cap">{fmt(data.total - data.pending) + " recebido"}</span>
              <span className="prumo-cap">{pct(paidPct) + " do total"}</span>
            </div>
            <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
              {data.items.map(function(it, idx) {
                return (
                  <div key={idx} className="prumo-tx" style={{ opacity: it.rcv ? 0.55 : 1, padding: "10px 0" }}>
                    <label className="prumo-check">
                      <input type="checkbox" checked={it.rcv || false}
                        onChange={function() {
                          if (it.src === "fx") togFR(it.id);
                          else if (it.src === "manual") togDR(it.id);
                          else togRcv(it.id);
                        }} />
                    </label>
                    <div className="prumo-tx-meat">
                      <div className="prumo-tx-desc" style={{ textDecoration: it.rcv ? "line-through" : "none" }}>{it.desc}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                        {it.src === "fx" && <span className="prumo-chip" style={{ fontSize: 9 }}>{"Conta fixa"}</span>}
                        {it.src === "manual" && <span className="prumo-chip brand" style={{ fontSize: 9 }}>{"Manual"}</span>}
                        {!it.src && <span className="prumo-chip warn" style={{ fontSize: 9 }}>{"Split"}</span>}
                      </div>
                    </div>
                    <div className={"prumo-tx-amt"} style={{ color: it.rcv ? "var(--pos)" : "var(--accent-2)" }}>{fmt(it.debt)}</div>
                    {it.src === "manual" && (
                      <button onClick={function() { rmD(it.id); }} className="prumo-icon-x">{"×"}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ METAS PRUMO ══ */
function MetasPrumo(props) {
  var goals = props.goals;
  var gf = props.gf;
  var sGf = props.sGf;
  var showGoal = props.showGoal;
  var sSGl = props.sSGl;
  var addGoal = props.addGoal;
  var updGS = props.updGS;
  var updGD = props.updGD;
  var rmG = props.rmG;
  var cats = props.cats;
  var spC = props.spC;
  var catLimits = props.catLimits;
  var editLimId = props.editLimId;
  var sELimId = props.sELimId;
  var editLimV = props.editLimV;
  var sELimV = props.sELimV;
  var setCatLimit = props.setCatLimit;

  var goalsActive = goals.filter(function(g) { return (g.saved || 0) < g.target; });
  var goalsDone = goals.filter(function(g) { return (g.saved || 0) >= g.target; });

  return (
    <div className="prumo-form-grid">
      {/* HERO METAS */}
      <div className="prumo-card l-accent full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Metas"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>{goals.length === 0 ? "Sem metas" : String(goalsActive.length) + " em andamento · " + String(goalsDone.length) + " atingidas"}</h2>
          </div>
          <button className={"prumo-btn " + (showGoal ? "ghost" : "accent")} onClick={function() { sSGl(!showGoal); }}>{showGoal ? "Cancelar" : "+ Nova meta"}</button>
        </div>
        {showGoal && (
          <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: 16, marginTop: 14, border: "1px solid var(--line)" }}>
            <div className="prumo-lbl" style={{ marginBottom: 8 }}>{"Nova meta"}</div>
            <div className="prumo-form">
              <input className="prumo-input" placeholder="Nome da meta (ex: Viagem Europa 2027)" value={gf.name} onChange={function(e) { sGf({ ...gf, name: e.target.value }); }} />
              <div className="prumo-grid-2">
                <div>
                  <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Valor alvo"}</div>
                  <div className="prumo-input-affix">
                    <span className="prefix">{"R$"}</span>
                    <input className="prumo-input mono right with-prefix" placeholder="0,00" value={gf.target} inputMode="decimal" onChange={function(e) { sGf({ ...gf, target: e.target.value }); }} />
                  </div>
                </div>
                <div>
                  <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Já guardou"}</div>
                  <div className="prumo-input-affix">
                    <span className="prefix">{"R$"}</span>
                    <input className="prumo-input mono right with-prefix" placeholder="0,00" value={gf.saved} inputMode="decimal" onChange={function(e) { sGf({ ...gf, saved: e.target.value }); }} />
                  </div>
                </div>
              </div>
              <div>
                <div className="prumo-lbl" style={{ marginBottom: 4 }}>{"Prazo final"}</div>
                <input className="prumo-input" type="date" value={gf.deadline} onChange={function(e) { sGf({ ...gf, deadline: e.target.value }); }} />
              </div>
              <button className="prumo-btn brand" style={{ padding: "12px 18px", fontSize: 13, marginTop: 2 }} onClick={addGoal}>{"Salvar meta"}</button>
            </div>
          </div>
        )}
      </div>

      {/* LISTA DE METAS */}
      {goals.length === 0 ? (
        <div className="prumo-card full" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"🎯"}</div>
          <div className="prumo-cap">{"Sem metas ainda. Defina objetivos com prazo para acompanhar o progresso."}</div>
        </div>
      ) : goals.map(function(g) {
        var r = g.target > 0 ? (g.saved || 0) / g.target : 0;
        var remain = g.target - (g.saved || 0);
        var done = remain <= 0;
        var mL = 0;
        if (g.deadline) {
          var dl = new Date(g.deadline); var td2 = new Date();
          mL = Math.max(0, (dl.getFullYear() - td2.getFullYear()) * 12 + (dl.getMonth() - td2.getMonth()));
        }
        var mN = mL > 0 && remain > 0 ? remain / mL : 0;
        return (
          <div key={g.id} className={"prumo-card " + (done ? "l-pos" : "l-accent")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600, margin: 0, color: "var(--ink)" }}>{g.name}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span className="prumo-cap" style={{ fontSize: 10, fontFamily: "var(--f-mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>{"Prazo"}</span>
                  <input type="date" value={g.deadline || ""} onChange={function(e) { updGD(g.id, e.target.value); }}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 7px", color: "var(--ink-2)", fontSize: 11, outline: "none", fontFamily: "var(--f-mono)" }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="prumo-num" style={{ fontSize: 13, color: "var(--ink-3)" }}>{fmt(g.saved || 0)}</div>
                <div className="prumo-num" style={{ fontSize: 11, color: "var(--ink-4)" }}>{"de " + fmt(g.target)}</div>
                <div style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 700, color: done ? "var(--pos)" : "var(--accent-2)", marginTop: 4, fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums" }}>{pct(r)}</div>
              </div>
            </div>
            <div className="prumo-meter" style={{ height: 8 }}>
              <i style={{ width: pct(Math.min(r, 1)), background: done ? "var(--pos)" : "var(--accent)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
              <span className="prumo-cap">{done ? "✓ Meta atingida" : "Falta " + fmt(remain)}</span>
              {!done && mL > 0 && remain > 0 && <span className="prumo-num" style={{ color: "var(--brand)" }}>{fmt(mN) + "/mês · " + String(mL) + "m"}</span>}
              {!done && mL === 0 && remain > 0 && <span className="prumo-chip neg" style={{ fontSize: 10 }}>{"Prazo vencido"}</span>}
            </div>
            {!done && (
              <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center" }}>
                <div className="prumo-input-affix" style={{ flex: 1 }}>
                  <span className="prefix">{"R$"}</span>
                  <input className="prumo-input mono right with-prefix" placeholder="atualizar valor guardado" id={"g-" + g.id} inputMode="decimal" style={{ fontSize: 12 }} />
                </div>
                <button onClick={function() { var el = document.getElementById("g-" + g.id); var v2 = parseFloat(String(el.value || "").replace(/\./g, "").replace(",", ".")); if (!isNaN(v2)) { updGS(g.id, v2); el.value = ""; } }} className="prumo-btn brand">{"Salvar"}</button>
                <button onClick={function() { rmG(g.id); }} className="prumo-icon-x">{"×"}</button>
              </div>
            )}
            {done && (
              <button onClick={function() { rmG(g.id); }} className="prumo-btn ghost" style={{ marginTop: 10, fontSize: 11 }}>{"🗑 Arquivar meta atingida"}</button>
            )}
          </div>
        );
      })}

      {/* LIMITES POR CATEGORIA */}
      <div className="prumo-card l-brand full">
        <div className="prumo-card-hd">
          <div>
            <div className="prumo-lbl">{"Limites por categoria"}</div>
            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Cap mensal por categoria"}</h2>
          </div>
        </div>
        <div className="prumo-cap" style={{ marginBottom: 12 }}>{"Defina o teto mensal de cada categoria e acompanhe estouros"}</div>
        {GR.map(function(g) {
          var visibleCats = cats.filter(function(c) { return c.group === g.id && ((spC[c.id] || 0) > 0 || catLimits[c.id]); });
          if (visibleCats.length === 0) return null;
          return (
            <div key={g.id} style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: g.color }} />
                <span className="prumo-lbl" style={{ marginBottom: 0 }}>{g.label}</span>
              </div>
              {visibleCats.map(function(cat2) {
                var lim = catLimits[cat2.id];
                var spent2 = spC[cat2.id] || 0;
                var isEditLim2 = editLimId === cat2.id;
                var usedPct = lim > 0 ? Math.min(spent2 / lim, 1) : 0;
                var overLimit = lim && spent2 > lim;
                return (
                  <div key={cat2.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16 }}>{cat2.icon}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{cat2.name}</span>
                      <span className="prumo-num" style={{ fontSize: 13, color: overLimit ? "var(--neg)" : "var(--ink)" }}>{fmt(spent2)}</span>
                      <button onClick={function() { sELimId(isEditLim2 ? null : cat2.id); sELimV(lim ? String(lim) : ""); }}
                        className={"prumo-chip " + (lim ? "brand" : "")} style={{ cursor: "pointer", fontSize: 10, border: lim ? "1px solid oklch(0.38 0.07 235 / .25)" : "1px solid var(--line)" }}>
                        {lim ? "🎯 " + fmt(lim) : "+ definir"}
                      </button>
                    </div>
                    {lim && (
                      <div style={{ marginTop: 8 }}>
                        <div className="prumo-meter">
                          <i style={{ width: pct(usedPct), background: overLimit ? "var(--neg)" : (g.id === "investimentos" ? "var(--pos)" : g.color) }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span className="prumo-cap" style={{ fontSize: 10 }}>{pct(usedPct) + " utilizado"}</span>
                          {overLimit ? (
                            <span className="prumo-chip neg" style={{ fontSize: 10 }}>{"+" + fmt(spent2 - lim) + " estourado"}</span>
                          ) : (
                            <span className="prumo-chip pos" style={{ fontSize: 10 }}>{"sobram " + fmt(lim - spent2)}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {isEditLim2 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <div className="prumo-input-affix" style={{ flex: 1 }}>
                          <span className="prefix">{"R$"}</span>
                          <input className="prumo-input mono right with-prefix" placeholder="limite mensal" value={editLimV} inputMode="decimal"
                            autoFocus
                            onChange={function(e) { sELimV(e.target.value); }}
                            onKeyDown={function(e) { if (e.key === "Enter") setCatLimit(cat2.id, editLimV); }}
                            style={{ fontSize: 12 }} />
                        </div>
                        <button className="prumo-btn brand" onClick={function() { setCatLimit(cat2.id, editLimV); }}>{"OK"}</button>
                        {lim && <button className="prumo-btn ghost" onClick={function() { setCatLimit(cat2.id, "0"); }}>{"Remover"}</button>}
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
  var [eD, sED] = useState([{ person: "", pct: 0 }]);
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
  var emFm = { desc: "", valor: "", cat: "", pay: "Cartão Nubank", hs: false, sp: [{ person: "", pct: 0 }], date: "", reimb: false, ic: "", it: "", note: "" };
  var [fm, sFm] = useState(emFm);
  var [cf, sCf] = useState({ desc: "", valor: "", type: "Bônus" });
  var [ff, sFf] = useState({ name: "", amount: "", cat: "", pay: "PIX", hs: false, sp: [{ person: "", pct: 0 }], mode: "budget" });
  var [df, sDf] = useState({ desc: "", amount: "", person: "" });
  var [gf, sGf] = useState({ name: "", target: "", deadline: "", saved: "0" });
  var [simAporte, sSimA] = useState("1000");
  var [simTaxa, sSimT] = useState("1");
  var [simTempo, sSimTp] = useState("60");
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

  // CFG é GLOBAL — carrega 1x quando user.uid muda, NUNCA recarrega por mudança de mês
  var [cfgLoaded, sCfgLoaded] = useState(false);
  useEffect(function() {
    if (!user || !user.uid) { sCfgLoaded(false); return; }
    var active = true;
    (async function() {
      var c = await ld("fc2-cfg", { salary: DS, pcts: DP, categories: DC, fixed: [], goals: [], catLimits: {}, netWorth: { balance: 0, history: [] } });
      var rv = await ld("fc2-rollover", {});
      var mp = await ld("fc2-maps", {});
      if (!active) return;
      // MIGRAÇÃO: se o cfg existente não tem alguma categoria default nova, adiciona
      var existingCats = c.categories || [];
      var existingIds = existingCats.map(function(x) { return x.id; });
      var needsMigration = false;
      DC.forEach(function(defCat) {
        if (existingIds.indexOf(defCat.id) < 0) {
          existingCats.push(defCat);
          needsMigration = true;
        }
      });
      // Renomeia "Bernardo" → "Filho" automaticamente (preservando o id)
      existingCats = existingCats.map(function(cat) {
        if (cat.id === "bernardo" && cat.name === "Bernardo") {
          needsMigration = true;
          return { ...cat, name: "Filho" };
        }
        return cat;
      });
      if (needsMigration) {
        c = { ...c, categories: existingCats };
        sv("fc2-cfg", c); // persiste a migração no Firebase
      }
      sCfg(c); sMp(mp); sSI(String(c.salary)); setRollover(rv); sCfgLoaded(true);
    })();
    return function() { active = false; };
  }, [user && user.uid]);

  // Dados MENSAIS — recarrega quando muda mês/ano (mas só depois do cfg ter carregado)
  useEffect(function() {
    if (!user || !user.uid || !cfgLoaded) return;
    var active = true;
    (async function() {
      sLd(true);
      var m = await ld("fc2-m-" + tk(yr, mo), { tx: [], cr: [], fs: {}, debts: [] });
      var pMo = mo === 0 ? 11 : mo - 1;
      var pYr = mo === 0 ? yr - 1 : yr;
      var pm = await ld("fc2-m-" + tk(pYr, pMo), { tx: [], cr: [], fs: {} });
      if (!active) return;
      sMd(m); sPv(pm); sLd(false);
    })();
    return function() { active = false; };
  }, [yr, mo, user && user.uid, cfgLoaded]);

  useEffect(function() {
    if (!user || !user.uid || !cfgLoaded) return;
    var active = true;
    (async function() {
      var r = [];
      for (var i = 0; i < 12; i++) {
        r.push(await ld("fc2-m-" + tk(yr, i), { tx: [], cr: [], fs: {} }));
      }
      if (active) sYrD(r);
    })();
    return function() { active = false; };
  }, [yr, mo, user && user.uid, cfgLoaded]);

  var saveMd = useCallback(function(d) { sMd(d); sv("fc2-m-" + mK, d); }, [mK]);
  // GUARDRAIL: saveCfg só salva se cfg já foi carregado do Firebase — impede sobrescrita com defaults durante load
  var saveCfg = useCallback(function(c) {
    if (!cfgLoaded) {
      console.warn("[saveCfg bloqueado] cfg ainda não carregou; ignorando para evitar perda de dados");
      return;
    }
    sCfg(c); sv("fc2-cfg", c);
  }, [cfgLoaded]);
  var saveMaps = useCallback(function(m) { sMp(m); sv("fc2-maps", m); }, []);

  var ifTarget = (cfg && cfg.ifTarget) ? cfg.ifTarget : "";
  var sIfTarget = function(v) { saveCfg({ ...cfg, ifTarget: v }); };

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
  var fxdRaw = cfg.fixed || [];
  var fxd = resolveFixedListForMonth(fxdRaw, tk(yr, mo));
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
    var fRRaw = cfg.fixed || [];
    for (var ci = 0; ci < 12; ci++) {
      var mDt = yrD[ci] || { tx: [], cr: [], fs: {} };
      var mTx = mDt.tx || [];
      var mCr = mDt.cr || [];
      var mFs = mDt.fs || {};
      var fR = resolveFixedListForMonth(fRRaw, tk(yr, ci));
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
    if (fm.hs) {
      var spInvalid = fm.sp.filter(function(s) { return !s.person || !String(s.person).trim() || !s.pct || s.pct <= 0; });
      if (spInvalid.length > 0 || fm.sp.length === 0) { sErr("Preencha nome e % de todas as pessoas no split"); return; }
    }
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
    if (ff.hs) {
      var spInvalidFx = ff.sp.filter(function(s) { return !s.person || !String(s.person).trim() || !s.pct || s.pct <= 0; });
      if (spInvalidFx.length > 0 || ff.sp.length === 0) { sErr("Preencha nome e % de todas as pessoas no split"); return; }
    }
    sErr("");
    var sp = ff.hs ? ff.sp.filter(function(s) { return s.person && s.pct > 0; }) : [];
    var newFx = { id: uid(), name: ff.name, amount: a, cat: ff.cat, payment: ff.pay, splits: sp, hasSplit: sp.length > 0, mode: ff.mode };
    saveCfg({ ...cfg, fixed: fxd.concat([newFx]) });
    sFf({ name: "", amount: "", cat: "", pay: "PIX", hs: false, sp: [{ person: "", pct: 0 }], mode: "budget" });
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
    sDf({ desc: "", amount: "", person: "" }); sSDbt(false);
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
    sED(e.length > 0 ? e.slice() : [{ person: "", pct: 0 }]);
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
        ic[r._idx] = maps[d2] || ""; is2[r._idx] = { on: false, sp: [{ person: "", pct: 0 }] };
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
          <div className="prumo-quick-add" onClick={function() { sChatOpen(true); }}>
            <span className="ico-q">{"✦"}</span>
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
            md={md} catLimits={catLimits} goals={goals} chD={chD} chMx={chMx} hovM={hovM} sHM={sHM} mo={mo} yr={yr}
            sTab={goTab} eSal={eSal} sES={sES} salI={salI} sSI={sSI} saveCfg={saveCfg} DS={DS}
            nw={nw} monthlyInvest={monthlyInvest} yrD={yrD} myP={myP}
          />
        )}

        {/* ═══ VIDA (PL) — placeholder ═══ */}
        {tab === "vida" && (
          <VidaPrumo cfg={cfg} saveCfg={saveCfg} nwHistory={nwHistory} />
        )}


        {/* ═══ PROJEÇÃO ═══ */}
        {tab === "proj" && (
          <ProjecaoPrumo
            cfg={cfg} savR={savR} totalInc={totalInc} invSp={invSp}
            nwBalance={nwBalance} nwHistory={nwHistory} fxd={fxd} spt={spt} cats={cats}
            totDb={totDb} ifTarget={ifTarget} sIfTarget={sIfTarget}
            showIfEdit={showIfEdit} sShowIfEdit={sShowIfEdit}
            activeInst={activeInst} totalInstMonthly={totalInstMonthly}
            prevSp={prevSp} spent={spent} mo={mo} yr={yr}
            chD={chD} chMx={chMx} chMs={chMs} hovM={hovM} sHM={sHM}
            showNw={showNw} sShowNw={sShowNw} nwInput={nwInput} sNwI={sNwI} updateNW={updateNW}
            simAporte={simAporte} sSimA={sSimA} simTaxa={simTaxa} sSimT={sSimT} simTempo={simTempo} sSimTp={sSimTp}
            saveCfg={saveCfg}
          />
        )}

        {/* ═══ ANÁLISE ═══ */}
        {tab === "analise" && (
          <AnalisePrumo chD={chD} mo={mo} yr={yr} yrD={yrD} cats={cats} myP={myP} />
        )}

        {/* ═══ METAS ═══ */}

        {/* ═══ LANÇAMENTOS (INPUT) ═══ */}
        {tab === "input" && (
          <div className="prumo-form-grid">
            {/* NOVO GASTO */}
            <div className="prumo-card l-neg">
              <div className="prumo-card-hd" style={{ marginBottom: 4 }}>
                <div>
                  <div className="prumo-lbl">{"Novo gasto"}</div>
                  <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Adicionar despesa"}</h2>
                </div>
              </div>
              <div className="prumo-form">
                <input className="prumo-input" placeholder="Descrição (ex: Mercado Pão de Açúcar)" value={fm.desc} onChange={function(e) { sFm({ ...fm, desc: e.target.value }); }} />
                <div className="prumo-grid-2">
                  <input className="prumo-input mono right" placeholder="0,00" value={fm.valor} inputMode="decimal" onChange={function(e) { sFm({ ...fm, valor: e.target.value }); }} />
                  <input className="prumo-input" type="date" value={fm.date} onChange={function(e) { sFm({ ...fm, date: e.target.value }); }} />
                </div>
                <div className="prumo-grid-2">
                  <CatS prumo value={fm.cat} onChange={function(e) { sFm({ ...fm, cat: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                  <select className="prumo-input" value={fm.pay} onChange={function(e) { sFm({ ...fm, pay: e.target.value }); }}>
                    {PAYS.map(function(p) { return <option key={p}>{p}</option>; })}
                  </select>
                </div>
                <input className="prumo-input" style={{ fontSize: 13 }} placeholder="Nota (opcional)" value={fm.note} onChange={function(e) { sFm({ ...fm, note: e.target.value }); }} />
                <div className="prumo-grid-2">
                  <input className="prumo-input mono" placeholder="Parcela atual" value={fm.ic} onChange={function(e) { sFm({ ...fm, ic: e.target.value }); }} />
                  <input className="prumo-input mono" placeholder="Total parcelas" value={fm.it} onChange={function(e) { sFm({ ...fm, it: e.target.value }); }} />
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingTop: 4 }}>
                  <label className="prumo-check">
                    <input type="checkbox" checked={fm.hs} onChange={function(e) { sFm({ ...fm, hs: e.target.checked }); }} />{"Dividir"}
                  </label>
                  <label className="prumo-check">
                    <input type="checkbox" checked={fm.reimb} onChange={function(e) { sFm({ ...fm, reimb: e.target.checked }); }} />{"Reembolsado"}
                  </label>
                </div>
                {fm.hs && <SE prumo splits={fm.sp} onChange={function(s) { sFm({ ...fm, sp: s }); }} />}
                {err && tab === "input" && <div className="prumo-form-err">{"⚠️ " + err}</div>}
                <button className="prumo-btn brand" style={{ padding: "13px 18px", fontSize: 13, marginTop: 2 }} onClick={addTx}>{"Adicionar lançamento"}</button>
              </div>
            </div>

            {/* CRÉDITO EXTRA */}
            <div className="prumo-card l-pos">
              <div className="prumo-card-hd" style={{ marginBottom: 4 }}>
                <div>
                  <div className="prumo-lbl">{"Crédito extra"}</div>
                  <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>{"Receitas adicionais"}</h2>
                </div>
              </div>
              <div className="prumo-form">
                <div className="prumo-grid-3">
                  <input className="prumo-input" placeholder="Descrição" value={cf.desc} onChange={function(e) { sCf({ ...cf, desc: e.target.value }); }} />
                  <input className="prumo-input mono right" placeholder="Valor" value={cf.valor} inputMode="decimal" onChange={function(e) { sCf({ ...cf, valor: e.target.value }); }} />
                  <select className="prumo-input" value={cf.type} onChange={function(e) { sCf({ ...cf, type: e.target.value }); }}>
                    {["Bônus", "Variável", "Reembolso", "Outro"].map(function(t) { return <option key={t}>{t}</option>; })}
                  </select>
                  <button className="prumo-btn-add" onClick={addCr} title="Adicionar crédito">{"+"}</button>
                </div>
                {crs.length === 0 ? (
                  <div className="prumo-cap" style={{ padding: "12px 0 4px" }}>{"Nenhum crédito extra registrado neste mês."}</div>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    {crs.map(function(c) {
                      return (
                        <div key={c.id} className="prumo-cred-row">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: "var(--ink)" }}>{c.desc}</div>
                            <div style={{ marginTop: 3 }}><span className="prumo-cred-tag">{c.type}</span></div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="prumo-num" style={{ color: "var(--pos)", fontSize: 14 }}>{"+" + fmt(c.amount)}</span>
                            <button className="prumo-icon-x" onClick={function() { rmCr(c.id); }} title="Remover">{"×"}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* IMPORTAR CSV NUBANK */}
            <div className="prumo-card l-accent full">
              <div className="prumo-card-hd" style={{ marginBottom: 4 }}>
                <div>
                  <div className="prumo-lbl">{"Importar extrato Nubank"}</div>
                  <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "var(--ink)" }}>
                    {!csvR ? "Upload de CSV" : String(csvR.length) + " transações detectadas"}
                  </h2>
                </div>
              </div>
              {!csvR ? (
                <div className="prumo-form">
                  <div className="prumo-cap">{"Dedup automático. Duplicatas são ignoradas, projeções de parcelas são substituídas pelos lançamentos reais."}</div>
                  <input ref={fr} type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
                  <button className="prumo-btn accent" style={{ alignSelf: "flex-start", padding: "11px 18px" }} onClick={function() { if (fr.current) fr.current.click(); }}>{"Selecionar CSV"}</button>
                </div>
              ) : (
                <div className="prumo-form">
                  <div className="prumo-cap">{"Categorize cada transação antes de importar. Marque ‘Dividir’ se for despesa compartilhada."}</div>
                  <div style={{ maxHeight: 480, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                    {csvR.map(function(row, idx) {
                      var desc = row.title || row["Título"] || row["Descrição"] || row.description || "?";
                      var amt = row.amount || row.Valor || row.valor || "?";
                      var dt = row.date || row.Data || "";
                      var inst = pi(desc);
                      var c2 = csvSp[row._idx] || { on: false, sp: [{ person: "", pct: 0 }] };
                      return (
                        <div key={idx} className="prumo-csv-row">
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{desc}</div>
                              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap" }}>
                                {dt && <span className="prumo-tag-mono">{dt}</span>}
                                {inst && <span className="prumo-tag-mono acc">{"P " + String(inst.c) + "/" + String(inst.t)}</span>}
                              </div>
                            </div>
                            <span className="prumo-num" style={{ color: "var(--accent-2)", fontSize: 15 }}>{amt}</span>
                          </div>
                          <CatS prumo value={csvC[row._idx] || ""} onChange={function(e) { sCC({ ...csvC, [row._idx]: e.target.value }); }} cats={cats} pcts={cfg.pcts} />
                          <label className="prumo-check" style={{ marginTop: 8 }}>
                            <input type="checkbox" checked={c2.on} onChange={function(e) { sCSp({ ...csvSp, [row._idx]: { ...c2, on: e.target.checked } }); }} />{"Dividir"}
                          </label>
                          {c2.on && <SE prumo compact splits={c2.sp} onChange={function(s) { sCSp({ ...csvSp, [row._idx]: { ...c2, sp: s } }); }} />}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button className="prumo-btn brand" style={{ flex: 1, padding: "12px 18px" }} onClick={impAll}>{"✓ Importar tudo"}</button>
                    <button className="prumo-btn ghost" onClick={function() { sCR(null); }}>{"Cancelar"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ FIXAS ═══ */}

        {/* ═══ FIXAS ═══ */}
        {tab === "fixas" && (
          <FixasPrumo
            cfg={cfg} cats={cats} fxd={fxd} fs={fs} md={md} saveMd={saveMd} saveCfg={saveCfg}
            ff={ff} sFf={sFf} showFx={showFx} sSFx={sSFx} err={err} sErr={sErr} tab={tab}
            addFx={addFx} rmFx={rmFx} togFP={togFP} spt={spt} gsp={gsp} addPart={addPart}
            pO={pO} sPO={sPO} pV={pV} sPV={sPV}
            fxPd={fxPd} fxMy={fxMy} mo={mo} yr={yr}
          />
        )}

        {/* ═══ DEVEDORES ═══ */}
        {tab === "deve" && (
          <DevedoresPrumo
            debtors={debtors} df={df} sDf={sDf} showDebt={showDebt} sSDbt={sSDbt}
            addDebt={addDebt} togFR={togFR} togDR={togDR} togRcv={togRcv} rmD={rmD} mo={mo}
          />
        )}

        {/* ═══ METAS ═══ */}
        {tab === "metas" && (
          <MetasPrumo
            goals={goals} gf={gf} sGf={sGf} showGoal={showGoal} sSGl={sSGl} addGoal={addGoal}
            updGS={updGS} updGD={updGD} rmG={rmG}
            cats={cats} spC={spC} catLimits={catLimits}
            editLimId={editLimId} sELimId={sELimId} editLimV={editLimV} sELimV={sELimV} setCatLimit={setCatLimit}
          />
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

      </div>
        </main>
      </div>

      {/* MOBILE TABBAR */}
      <nav className="prumo-tabbar">
        <button className={"prumo-tab" + (tab === "dash" ? " active" : "")} onClick={function() { goTab("dash"); }}>
          <span className="ico">{"◐"}</span>
          <span className="lbl-t">{"Início"}</span>
        </button>
        <button className="prumo-tab" onClick={function() { sChatOpen(true); }}>
          <span className="ico">{"✦"}</span>
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
      <button className="prumo-fab" onClick={function() { sChatOpen(true); }} aria-label="Assistente">{"✦"}</button>

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
