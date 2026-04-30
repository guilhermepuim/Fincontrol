import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";

/* ══ SUNO BRANDBOOK AZUL ══ */
var BL = "#1B72B8";
var BD = "#154F82";
var BG = "#E8F2FA";
var TX = "#212121";
var T2 = "#4B4B4B";
var T3 = "#666666";
var TM = "#999999";
var BR = "#DDDDDD";
var OK = "#00A000";
var ER = "#FD0000";
var WN = "#F46B08";

var DS = 14000;
var DP = { essenciais: 50, investimentos: 25, desejos: 25 };
var GR = [
  { id: "essenciais", label: "Essenciais", color: "#0D9488" },
  { id: "investimentos", label: "Investimentos", color: "#1A2B5F" },
  { id: "desejos", label: "Desejos", color: "#D97706" },
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
var PC = ["#0D9488","#1A2B5F","#D97706","#0D6E8A","#60A5FA","#A78BFA","#EC4899","#00A000","#06B6D4","#7C3AED"];

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
  card: { background: "#fff", borderRadius: 8, padding: 16, marginBottom: 10, border: "1px solid " + BR },
  cardA: function(c) { return { background: "#fff", borderRadius: 8, padding: 16, marginBottom: 10, border: "1px solid " + BR, borderLeft: "3px solid " + c }; },
  inp: { background: "#FAFAFA", border: "1px solid " + BR, borderRadius: 6, padding: "10px 12px", color: TX, fontSize: 14, fontFamily: "'Inter',sans-serif", width: "100%", outline: "none", boxSizing: "border-box" },
  btn: function(c) { return { background: c, border: "none", borderRadius: 6, padding: "10px 18px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }; },
  btnO: { background: "#fff", border: "1px solid " + BR, borderRadius: 6, padding: "10px 18px", color: T3, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  tag: function(c) { return { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: c + "12", color: c, whiteSpace: "nowrap", marginRight: 3 }; },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  ck: { accentColor: BL, width: 16, height: 16, cursor: "pointer" },
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

/* ══ MAIN APP ══ */

/* ══ LOGIN SCREEN ══ */
function LoginScreen({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFA", fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 40, border: "1px solid #DDDDDD", textAlign: "center", maxWidth: 320, width: "90%" }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: "#212121" }}>{"Fin"}</span>
          <span style={{ color: "#1B72B8" }}>{"Control"}</span>
        </div>
        <p style={{ color: "#666666", fontSize: 13, marginBottom: 32, lineHeight: 1.5 }}>{"Seu controle financeiro pessoal"}</p>
        <button onClick={onLogin}
          style={{ background: "#1B72B8", border: "none", borderRadius: 8, padding: "13px 24px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, margin: "0 auto", width: "100%", justifyContent: "center" }}>
          <span style={{ fontSize: 18 }}>{"G"}</span>
          {"Entrar com Google"}
        </button>
        <p style={{ color: "#BBBBBB", fontSize: 11, marginTop: 20 }}>{"Seus dados ficam salvos na nuvem"}</p>
      </div>
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
      var mp = await ld("fc2-maps", {});
      var pMo = mo === 0 ? 11 : mo - 1;
      var pYr = mo === 0 ? yr - 1 : yr;
      var pm = await ld("fc2-m-" + tk(pYr, pMo), { tx: [], cr: [], fs: {} });
      if (!active) return;
      sCfg(c); sMd(m); sMp(mp); sPv(pm); sSI(String(c.salary)); sLd(false);
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
    return <div style={{ background: "#fff", color: TM, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}>{"Carregando..."}</div>;
  }
  if (user === null) {
    return <LoginScreen onLogin={function() { signInWithPopup(auth, googleProvider); }} />;
  }
  if (loading || !cfg) {
    return <div style={{ background: "#fff", color: TM, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}>{"Carregando..."}</div>;
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
      var hasR = hasRT || Object.keys(mFs).length > 0;
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
      if (hasR) {
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
      } else {
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
    { id: "dash", l: "Dashboard" }, { id: "proj", l: "Projeção" }, { id: "input", l: "Input" },
    { id: "fixas", l: "Fixas" }, { id: "monthly", l: "Mensal" }, { id: "deve", l: "Devedores" },
  ];

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
    <div style={{ fontFamily: "'Inter',sans-serif", background: "#FAFAFA", color: TX, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#fff", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid " + BR }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 700, color: T2 }}>{"Fin"}</span>
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 700, color: BL }}>{"Control"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ background: "#F0F0F0", border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: T2 }} onClick={goPrev}>{"◀"}</button>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: BD, minWidth: 130, textAlign: "center" }}>{MS[mo] + " " + String(yr)}</span>
          <button style={{ background: "#F0F0F0", border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: T2 }} onClick={goNext}>{"▶"}</button>
        </div>
        <button onClick={function() { signOut(auth); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: TM, padding: "4px 6px" }} title="Sair">{"Sair"}</button>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", display: "flex", borderBottom: "1px solid " + BR, overflowX: "auto" }}>
        {tabs.map(function(t) {
          var ac = tab === t.id;
          return (
            <button key={t.id} onClick={function() { sTab(t.id); sErr(""); sTxS(""); sCfC(false); sCatF(null); }}
              style={{ padding: "10px 16px", border: "none", background: "transparent", fontFamily: "'Inter',sans-serif", color: ac ? BL : "#BBBBBB", fontWeight: ac ? 700 : 500, fontSize: 12, cursor: "pointer", borderBottom: ac ? "2px solid " + BL : "2px solid transparent", whiteSpace: "nowrap" }}>
              {t.l}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "14px 16px", maxWidth: 720, margin: "0 auto" }}>

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dash" && (
          <div>
            {/* Salary */}
            <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.lbl}>{"RENDA MENSAL"}</div>
                {eSal ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input style={{ ...S.inp, width: 110, textAlign: "right" }} value={salI}
                      onChange={function(e) { sSI(e.target.value); }}
                      onKeyDown={function(e) { if (e.key === "Enter") { saveCfg({ ...cfg, salary: parseFloat(salI) || DS }); sES(false); } }} />
                    <button style={S.btn(BL)} onClick={function() { saveCfg({ ...cfg, salary: parseFloat(salI) || DS }); sES(false); }}>{"OK"}</button>
                  </div>
                ) : (
                  <div onClick={function() { sSI(String(sal)); sES(true); }} style={{ cursor: "pointer" }}>
                    <div style={S.data(BL)}>{fmt(totalInc)}</div>
                    {extraCr > 0 && <div style={S.cap}>{"Salário " + fmt(sal) + " + Extra " + fmt(extraCr)}</div>}
                  </div>
                )}
              </div>
              <div style={{ ...S.cap, cursor: "pointer" }} onClick={function() { sSI(String(sal)); sES(true); }}>{"✏️"}</div>
            </div>

            {/* Fixed summary */}
            {fxd.length > 0 && (
              <div style={{ ...S.card, cursor: "pointer" }} onClick={function() { sTab("fixas"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={S.lbl}>{"CONTAS FIXAS"}</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: BL }}>{String(fxPd) + "/" + String(fxd.length)}</span>
                </div>
                <PB value={fxPd} max={fxd.length} color={BL} />
                <div style={{ ...S.cap, marginTop: 4 }}>{fmt(fxMy) + "/mês"}</div>
              </div>
            )}

            {/* Budget cards */}
            {GR.map(function(g) {
              var b = bud[g.id]; var s = spent[g.id]; var r = b > 0 ? s / b : 0;
              var pv = prevSp ? prevSp[g.id] : null;
              var diff = pv !== null ? s - pv : null;
              var isInv = g.id === "investimentos";
              return (
                <div key={g.id} style={S.cardA(g.color)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={S.lbl}>{g.label.toUpperCase() + " (" + String(cfg.pcts[g.id]) + "%)"}</div>
                      <div style={S.data(g.color)}>{fmt(s)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={S.cap}>{"Meta " + fmt(b)}</div>
                      {diff !== null && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: (isInv ? diff > 0 : diff < 0) ? OK : ER, marginTop: 2 }}>
                          {(diff > 0 ? "▲ " : "▼ ") + fmt(Math.abs(diff))}
                        </div>
                      )}
                    </div>
                  </div>
                  <PB value={s} max={b} color={g.color} noWarn={isInv} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={S.cap}>{pct(r)}</span>
                    <span style={{ ...S.cap, color: r > 1 ? (isInv ? OK : ER) : TM }}>
                      {r > 1 ? (isInv ? "Acima da meta! +" + fmt(s - b) : "Estourou " + fmt(s - b)) : "Restam " + fmt(b - s)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div style={S.card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><div style={S.lbl}>{"CRÉDITOS"}</div><div style={S.data(OK)}>{fmt(totCr)}</div></div>
                <div><div style={S.lbl}>{"DÉBITOS"}</div><div style={S.data(ER)}>{fmt(totDb)}</div></div>
              </div>
              <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={S.lbl}>{"SALDO"}</div>
                  <div style={S.data(totCr - totDb + dRcv >= 0 ? OK : ER)}>{fmt(totCr - totDb + dRcv)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={S.lbl}>{"TAXA POUPANÇA"}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: savR >= 0.25 ? OK : savR >= 0.1 ? WN : ER }}>{pct(savR)}</div>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div style={S.card}>
              <div style={S.lbl}>{"DISTRIBUIÇÃO POR CATEGORIA"}</div>
              {GR.map(function(g) {
                var items = pieD[g.id];
                if (items.length === 0) return null;
                var total = items.reduce(function(a, it) { return a + it.value; }, 0);
                return (
                  <div key={g.id} style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: g.color, marginBottom: 6 }}>{g.label + " — " + fmt(spent[g.id])}</div>
                    {items.slice(0, 6).map(function(item, idx) {
                      var p = total > 0 ? item.value / total : 0;
                      return (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: PC[idx % PC.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, flex: 1, color: T3 }}>{item.icon + " " + item.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: TX }}>{fmt(item.value)}</span>
                          <span style={{ ...S.cap, minWidth: 34, textAlign: "right" }}>{pct(p)}</span>
                          <div style={{ width: 50, height: 4, background: "#F0F0F0", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: String(p * 100) + "%", height: "100%", background: PC[idx % PC.length], borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Debtors */}
            {Object.keys(debtors).length > 0 && (
              <div style={S.cardA("#D97706")}>
                <div style={S.lbl}>{"A RECEBER"}</div>
                {Object.entries(debtors).map(function(e2) {
                  return (
                    <div key={e2[0]} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 13, color: T3 }}>{e2[0]}</span>
                      <span style={{ fontWeight: 700, color: "#D97706", fontSize: 13 }}>{fmt(e2[1].pending)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ PROJEÇÃO ═══ */}
        {tab === "proj" && (
          <div>
            {/* Metas */}
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
              <div style={S.lbl}>{"PROJEÇÃO 12 MESES"}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, marginTop: 6 }}>
                {nwProjection.map(function(val, idx) {
                  var h = nwMax > 0 ? (val / nwMax) * 70 : 0;
                  var isCur = idx === mo;
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: "100%", height: h, background: isCur ? BD : BL + "50", borderRadius: "2px 2px 0 0" }} />
                      <div style={{ fontSize: 7, color: isCur ? BD : "#BBBBBB", marginTop: 2, fontWeight: isCur ? 700 : 400 }}>{MA[idx]}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, ...S.cap }}>
                <span>{"Agora: " + fmt(nwBalance)}</span>
                <span style={{ fontWeight: 700, color: BD }}>{"Em 12m: " + fmt(nwProjection[11])}</span>
              </div>
              {nwHistory.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  <div style={S.lbl}>{"HISTÓRICO"}</div>
                  {nwHistory.slice(-4).reverse().map(function(h, idx) {
                    return (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", ...S.cap, padding: "2px 0" }}>
                        <span>{sd(h.date)}</span><span style={{ fontWeight: 600, color: TX }}>{fmt(h.balance)}</span>
                      </div>
                    );
                  })}
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
                      <div style={{ width: String(simFV > 0 ? (nwBalance / simFV) * 100 : 0) + "%", background: "#1A2B5F", transition: "width 0.4s" }} />
                      <div style={{ width: String(simFV > 0 ? (simTotalAport / simFV) * 100 : 0) + "%", background: BL, transition: "width 0.4s" }} />
                      <div style={{ flex: 1, background: OK, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                      {[["#1A2B5F", "Patrimônio atual"], [BL, "Aportes"], [OK, "Juros (" + pct(jurosRatio) + ")"]].map(function(it) {
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
                        <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: "hidden", opacity: d.real ? 1 : 0.35, outline: isH ? "2px solid " + BL : "none", outlineOffset: 1 }}>
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
                                <div style={{ marginTop: 2 }}>
                                  <PB value={spC[cat2.id] || 0} max={lim} color={g.color} noWarn={g.id === "investimentos"} />
                                  <div style={{ ...S.cap, marginTop: 1 }}>{fmt(spC[cat2.id] || 0) + " / limite " + fmt(lim)}</div>
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
    </div>
  );
}
