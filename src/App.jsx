
import { useState, useEffect, useCallback, useRef } from "react";

// ── CONFIG ──────────────────────────────────────────────────────
const FMP_KEY    = import.meta.env.VITE_FMP_KEY;
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY;

const TICKERS = [
  "MSFT","GOOGL","AMZN","META","NVDA","ORCL",
  "TSM","AAPL","TSLA","AMD","INTC","MU",
  "ASML","QCOM","CRM","AVGO","SNOW","PLTR","DELL"
];

const STATIC = {
  MSFT:  { name:"Microsoft",    sector:"cloud",   fy23c:28,  fy25c:118, fy23r:211, fy25r:282, earnDate:"2026-07-28", earnLabel:"Q4 FY26", note:"Capex 4x暴增，Azure+AI變現滯後" },
  GOOGL: { name:"Alphabet",     sector:"cloud",   fy23c:32,  fy25c:96,  fy23r:308, fy25r:402, earnDate:"2026-07-29", earnLabel:"Q2 2026",  note:"GCP加速，廣告AI效益即時" },
  AMZN:  { name:"Amazon",       sector:"cloud",   fy23c:52,  fy25c:131, fy23r:575, fy25r:638, earnDate:"2026-07-30", earnLabel:"Q2 2026",  note:"AWS主力，2026 Capex $200B" },
  META:  { name:"Meta",         sector:"cloud",   fy23c:28,  fy25c:71,  fy23r:117, fy25r:185, earnDate:"2026-07-29", earnLabel:"Q2 2026",  note:"廣告AI效益最快，Incr.Return最高" },
  NVDA:  { name:"NVIDIA",       sector:"infra",   fy23c:1.1, fy25c:3.2, fy23r:27,  fy25r:131, earnDate:"2026-08-26", earnLabel:"Q2 FY27",  note:"鏟子商，AI軍備競賽最大受益者" },
  ORCL:  { name:"Oracle",       sector:"cloud",   fy23c:7,   fy25c:20,  fy23r:50,  fy25r:66,  earnDate:"2026-06-10", earnLabel:"Q4 FY26",  note:"OCI高速成長，Cap/Rev 57%警戒" },
  TSM:   { name:"TSMC",         sector:"foundry", fy23c:30,  fy25c:35,  fy23r:70,  fy25r:115, earnDate:"2026-07-17", earnLabel:"Q2 2026",  note:"3nm/5nm滿載，毛利率59%" },
  AAPL:  { name:"Apple",        sector:"consumer",fy23c:11,  fy25c:13,  fy23r:383, fy25r:416, earnDate:"2026-07-30", earnLabel:"Q3 FY26",  note:"輕資產，Apple Intelligence嵌入" },
  TSLA:  { name:"Tesla",        sector:"ev",      fy23c:8.9, fy25c:11.3,fy23r:97,  fy25r:97,  earnDate:"2026-07-22", earnLabel:"Q2 2026",  note:"FY25營收零成長，押注Robotaxi" },
  AMD:   { name:"AMD",          sector:"semi",    fy23c:0.4, fy25c:0.8, fy23r:23,  fy25r:26,  earnDate:"2026-07-28", earnLabel:"Q2 2026",  note:"Fabless，MI300X GPU放量 YTD+141%" },
  INTC:  { name:"Intel",        sector:"foundry", fy23c:25,  fy25c:22,  fy23r:54,  fy25r:53,  earnDate:"2026-07-24", earnLabel:"Q2 2026",  note:"轉型代工廠，Incr.Return負值" },
  MU:    { name:"Micron",       sector:"semi",    fy23c:7.7, fy25c:14,  fy23r:16,  fy25r:37,  earnDate:"2026-06-25", earnLabel:"Q3 FY26",  note:"HBM需求爆發，週期風險存" },
  ASML:  { name:"ASML",         sector:"infra",   fy23c:1.3, fy25c:1.8, fy23r:29,  fy25r:41,  earnDate:"2026-07-15", earnLabel:"Q2 2026",  note:"EUV壟斷，YTD +51%" },
  QCOM:  { name:"Qualcomm",     sector:"semi",    fy23c:0.9, fy25c:1.0, fy23r:36,  fy25r:44,  earnDate:"2026-07-30", earnLabel:"Q3 FY26",  note:"AI PC切入，NVDA新晶片競壓" },
  CRM:   { name:"Salesforce",   sector:"infra",   fy23c:0.7, fy25c:1.0, fy23r:26,  fy25r:38,  earnDate:"2026-08-26", earnLabel:"Q2 FY27",  note:"Agentforce AI變現引擎" },
  AVGO:  { name:"Broadcom",     sector:"semi",    fy23c:0.6, fy25c:1.9, fy23r:36,  fy25r:51,  earnDate:"2026-09-04", earnLabel:"Q3 FY26",  note:"AI ASIC訂製晶片，Google TPU" },
  SNOW:  { name:"Snowflake",    sector:"infra",   fy23c:0.2, fy25c:0.4, fy23r:2.1, fy25r:3.6, earnDate:"2026-08-20", earnLabel:"Q2 FY27",  note:"資料雲+AI workload，財報後+36%" },
  PLTR:  { name:"Palantir",     sector:"infra",   fy23c:0.05,fy25c:0.08,fy23r:1.9, fy25r:3.0, earnDate:"2026-08-04", earnLabel:"Q2 2026",  note:"AIP爆發，P/E 176x估值高" },
  DELL:  { name:"Dell Tech",    sector:"infra",   fy23c:0.6, fy25c:2.2, fy23r:102, fy25r:96,  earnDate:"2026-08-27", earnLabel:"Q2 FY27",  note:"AI伺服器爆發，52週+330%" },
};

const SECTOR_META = {
  cloud:   { label:"☁ 雲端" },
  infra:   { label:"🔧 AI基建" },
  semi:    { label:"💎 半導體" },
  foundry: { label:"🏭 代工" },
  consumer:{ label:"📱 消費" },
  ev:      { label:"⚡ EV" },
};

// ── SPARKLINE ─────────────────────────────────────────────────
function Spark({ prices, color }) {
  if (!prices || prices.length < 2) return <div style={{width:48,height:20}} />;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const W = 48, H = 20, pad = 2;
  const pts = prices.map((p, i) => {
    const x = pad + i * (W - 2*pad) / (prices.length - 1);
    const y = H - pad - ((p - min) / range) * (H - 2*pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(",");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{flexShrink:0}}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="2" fill={color}/>
    </svg>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function App() {
  const [quotes, setQuotes]       = useState({});
  const [history, setHistory]     = useState({});
  const [loading, setLoading]     = useState(false);
  const [loadStatus, setLoadStatus] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [sort, setSort]           = useState({ col:"ret", dir:-1 });
  const [showCal, setShowCal]     = useState(true);
  const fetchedRef = useRef(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const newQuotes = {};
    const newStatus = {};

    await Promise.all(TICKERS.map(async (t) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${t}&token=${FINNHUB_KEY}`
        );
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        if (d.c && d.c > 0) {
          newQuotes[t] = { price: d.c, change: d.d, changePct: d.dp, high52: d.h, low52: d.l };
          newStatus[t] = "ok";
        } else {
          newStatus[t] = "nodata";
        }
      } catch(e) {
        newStatus[t] = "err";
      }
    }));

    setQuotes(newQuotes);
    setLoadStatus(newStatus);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    const now  = Math.floor(Date.now() / 1000);
    const from = now - 90 * 86400;
    const newHist = {};

    await Promise.all(TICKERS.map(async (t) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/stock/candle?symbol=${t}&resolution=W&from=${from}&to=${now}&token=${FINNHUB_KEY}`
        );
        const d = await res.json();
        if (d.s === "ok" && d.c?.length > 1) newHist[t] = d.c;
      } catch(e) {}
    }));
    setHistory(newHist);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchQuotes();
    fetchHistory();
  }, [fetchQuotes, fetchHistory]);

  const rows = TICKERS.map(t => {
    const s = STATIC[t];
    const q = quotes[t];
    const h = history[t];
    const dcapex = s.fy25c - s.fy23c;
    const drev   = s.fy25r - s.fy23r;
    const isSpecial = t === "NVDA" || t === "ASML";
    const ret = isSpecial ? 999 : dcapex < 0.1 ? null : drev / dcapex;
    const capratio = (s.fy25c / s.fy25r * 100);

    let trend3m = null;
    if (h && h.length >= 2) {
      const first = h[0], last = h[h.length - 1];
      trend3m = ((last - first) / first) * 100;
    }

    const today = new Date("2026-06-02");
    const eDate = new Date(s.earnDate);
    const daysToEarn = Math.round((eDate - today) / 86400000);

    return { ticker:t, ...s, dcapex, drev, ret, capratio, isSpecial, q, h, trend3m, daysToEarn };
  });

  const filtered = rows
    .filter(r => filter === "all" || r.sector === filter)
    .filter(r => !search || r.ticker.toLowerCase().includes(search.toLowerCase()) ||
                             r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col];
      if (sort.col === "price") { av = a.q?.price ?? -1; bv = b.q?.price ?? -1; }
      if (sort.col === "trend3m") { av = a.trend3m ?? -999; bv = b.trend3m ?? -999; }
      if (av === null || av === undefined) av = -9999;
      if (bv === null || bv === undefined) bv = -9999;
      return (av - bv) * sort.dir;
    });

  const handleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir * -1 } : { col, dir: -1 });
  };

  const retColor = (r) => {
    if (!r) return "#4b5563";
    if (r === 999) return "#60a5fa";
    if (r >= 2)  return "#34d399";
    if (r >= 1)  return "#2dd4bf";
    if (r >= 0.3)return "#fbbf24";
    return "#f87171";
  };

  const retLabel = (r, isSpecial) => {
    if (isSpecial) return { color:"#93c5fd", bg:"rgba(59,130,246,0.15)", border:"rgba(59,130,246,0.3)", text:"鏟子商" };
    if (r === null) return { color:"#4b5563", bg:"rgba(75,85,99,0.1)", border:"rgba(75,85,99,0.2)", text:"N/A" };
    if (r >= 2)  return { color:"#6ee7b7", bg:"rgba(52,211,153,0.15)", border:"rgba(52,211,153,0.3)", text:"強回收" };
    if (r >= 1)  return { color:"#2dd4bf", bg:"rgba(45,212,191,0.15)", border:"rgba(45,212,191,0.3)", text:"正回收" };
    if (r >= 0.3)return { color:"#fbbf24", bg:"rgba(251,191,36,0.15)", border:"rgba(251,191,36,0.3)", text:"投資期" };
    return { color:"#f87171", bg:"rgba(248,113,113,0.15)", border:"rgba(248,113,113,0.3)", text:"燒錢期" };
  };

  const SortTh = ({ col, children, right=true }) => (
    <th
      onClick={() => handleSort(col)}
      style={{
        padding:"8px 10px", fontSize:9, fontFamily:"monospace", fontWeight:700,
        textTransform:"uppercase", letterSpacing:"0.08em", color:"#3d5068",
        cursor:"pointer", userSelect:"none", whiteSpace:"nowrap",
        textAlign: right ? "right" : "left",
        background:"#0d1117", borderBottom:"1px solid #1a2535",
        position:"sticky", top:0, zIndex:10,
      }}
    >
      {children}{sort.col===col ? (sort.dir===1?" ▲":" ▼") : ""}
    </th>
  );

  return (
    <div style={{ background:"#070c12", minHeight:"100vh", fontFamily:"'IBM Plex Sans', system-ui, sans-serif", color:"#dce6f0", fontSize:13 }}>

      {/* TOP BAR */}
      <div style={{ background:"#0d1117", borderBottom:"1px solid #1a2535", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, position:"sticky", top:0, zIndex:100 }}>
        <div>
          <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#2dd4bf", letterSpacing:"0.04em" }}>
            // CAPEX RETURN + WATCHLIST
          </div>
          <div style={{ fontFamily:"monospace", fontSize:9, color:"#2d4060", marginTop:2 }}>
            AI Era 20強 ｜ FMP財報數據 + Finnhub即時報價 ｜ {lastRefresh ? `更新：${lastRefresh.toLocaleTimeString("zh-TW")}` : "載入中..."}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", background:"#111820", border:"1px solid #1e2d40", borderRadius:4, padding:"5px 10px", fontFamily:"monospace", fontSize:10, color:"#4b6480" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: loading ? "#fbbf24" : lastRefresh ? "#34d399" : "#4b6480", animation: loading ? "pulse 1s infinite" : "none" }}/>
            {loading ? "抓取中..." : lastRefresh ? "報價即時" : "待更新"}
          </div>
          <button
            onClick={() => { fetchQuotes(); fetchHistory(); }}
            disabled={loading}
            style={{ padding:"5px 12px", background:"rgba(45,212,191,0.1)", border:"1px solid #2dd4bf", color:"#2dd4bf", borderRadius:4, fontFamily:"monospace", fontSize:10, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.5:1 }}
          >
            {loading ? "⏳ 更新中" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 20px" }}>

        {/* FORMULA BAR */}
        <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:260, background:"#0d1117", border:"1px solid #1a2535", borderLeft:"3px solid #2dd4bf", borderRadius:4, padding:"9px 13px", fontFamily:"monospace", fontSize:10, color:"#4b6480", lineHeight:1.7 }}>
            <span style={{color:"#2dd4bf",fontWeight:700}}>Incr. Capex Return</span> = △Revenue ÷ △Capex (FY25 vs FY23)<br/>
            <span style={{color:"#34d399"}}>▸ &gt;2x 強回收</span>　<span style={{color:"#2dd4bf"}}>▸ 1–2x 正回收</span>　<span style={{color:"#fbbf24"}}>▸ 0.3–1x 投資期</span>　<span style={{color:"#f87171"}}>▸ &lt;0.3x 燒錢</span>
          </div>
          <div style={{ background:"#0d1117", border:"1px solid #1a2535", borderRadius:4, padding:"9px 13px", display:"flex", flexDirection:"column", gap:3 }}>
            {[["#34d399",">2x 強回收"],["#2dd4bf","1–2x 正回收"],["#fbbf24","0.3–1x 投資期"],["#f87171","<0.3x 燒錢"],["#60a5fa","∞ 鏟子商"]].map(([c,t]) => (
              <div key={t} style={{display:"flex",alignItems:"center",gap:6,fontFamily:"monospace",fontSize:9,color:"#4b6480"}}>
                <div style={{width:7,height:7,borderRadius:2,background:c,flexShrink:0}}/>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EARNINGS CALENDAR */}
        <div style={{ background:"#0d1117", border:"1px solid #1a2535", borderRadius:6, marginBottom:12, overflow:"hidden" }}>
          <div
            onClick={() => setShowCal(v => !v)}
            style={{ padding:"9px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", borderBottom: showCal ? "1px solid #1a2535" : "none" }}
          >
            <div style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:"#4b6480", letterSpacing:"0.06em", textTransform:"uppercase" }}>📅 財報日曆</div>
            <div style={{ fontFamily:"monospace", fontSize:10, color:"#2d4060" }}>{showCal ? "▲ 收合" : "▼ 展開"}</div>
          </div>
          {showCal && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, padding:12 }}>
              {[...rows].sort((a,b) => a.daysToEarn - b.daysToEarn).map(r => {
                const urgent = r.daysToEarn <= 3;
                const soon   = r.daysToEarn <= 30;
                return (
                  <div key={r.ticker} style={{
                    borderRadius:4, padding:"7px 10px",
                    border: urgent ? "1px solid #f87171" : soon ? "1px solid #fbbf24" : "1px solid #1a2535",
                    background: urgent ? "rgba(248,113,113,0.04)" : soon ? "rgba(251,191,36,0.04)" : "#111820",
                  }}>
                    <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#dce6f0"}}>{r.ticker}</div>
                    <div style={{fontFamily:"monospace",fontSize:10,color:urgent?"#f87171":soon?"#fbbf24":"#4b6480",marginTop:2}}>{r.earnDate.replace("2026-","")}</div>
                    <div style={{fontSize:9,color:"#2d4060",marginTop:1}}>{r.earnLabel}</div>
                    <div style={{
                      fontFamily:"monospace",fontSize:9,marginTop:4,padding:"1px 5px",borderRadius:2,display:"inline-block",
                      background:urgent?"rgba(248,113,113,0.15)":soon?"rgba(251,191,36,0.15)":"rgba(45,64,96,0.3)",
                      color:urgent?"#f87171":soon?"#fbbf24":"#2d4060"
                    }}>
                      {r.daysToEarn < 0 ? "已過" : r.daysToEarn === 0 ? "今天！" : `${r.daysToEarn}天後`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div style={{ display:"flex", gap:7, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
          {[["all","全部"],["cloud","☁ 雲端"],["infra","🔧 AI基建"],["semi","💎 半導體"],["foundry","🏭 代工"],["consumer","📱 消費"],["ev","⚡ EV"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding:"4px 10px", borderRadius:20, fontFamily:"monospace", fontSize:9, cursor:"pointer", transition:"all 0.15s", border:"1px solid", whiteSpace:"nowrap",
              background: filter===v ? "rgba(45,212,191,0.12)" : "transparent",
              borderColor: filter===v ? "#2dd4bf" : "#1e2d40",
              color: filter===v ? "#2dd4bf" : "#4b6480",
            }}>{l}</button>
          ))}
          <div style={{flex:1}}/>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜尋 ticker..."
            style={{ background:"#0d1117", border:"1px solid #1e2d40", color:"#dce6f0", padding:"4px 10px", borderRadius:4, fontFamily:"monospace", fontSize:10, width:130, outline:"none" }}
          />
        </div>

        {/* TABLE */}
        <div style={{ overflowX:"auto", border:"1px solid #1a2535", borderRadius:6 }}>
          <table style={{ borderCollapse:"separate", borderSpacing:0, width:"max-content", minWidth:"100%" }}>
            <thead>
              <tr>
                <th onClick={() => handleSort("ticker")} style={{
                  padding:"8px 10px", fontSize:9, fontFamily:"monospace", fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"0.08em", color:"#3d5068", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap",
                  textAlign:"left", background:"#0d1117", borderBottom:"1px solid #1a2535", borderRight:"1px solid #1a2535",
                  position:"sticky", left:0, top:0, zIndex:30, minWidth:145,
                }}>
                  代碼 / 公司{sort.col==="ticker"?(sort.dir===1?" ▲":" ▼"):""}
                </th>
                <th style={{
                  padding:"8px 10px", fontSize:9, fontFamily:"monospace", fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"0.08em", color:"#3d5068", whiteSpace:"nowrap", textAlign:"left",
                  background:"#0d1117", borderBottom:"1px solid #1a2535", borderRight:"1px solid #1a2535",
                  position:"sticky", left:145, top:0, zIndex:30, minWidth:85,
                }}>領域</th>
                <SortTh col="price">現價</SortTh>
                <SortTh col="trend3m">3月趨勢</SortTh>
                <SortTh col="fy23c">FY23 Cap</SortTh>
                <SortTh col="fy25c">FY25 Cap</SortTh>
                <SortTh col="dcapex">△Cap</SortTh>
                <SortTh col="fy23r">FY23 Rev</SortTh>
                <SortTh col="fy25r">FY25 Rev</SortTh>
                <SortTh col="drev">△Rev</SortTh>
                <SortTh col="capratio">Cap/Rev%</SortTh>
                <SortTh col="ret">Incr. Return</SortTh>
                <th style={{padding:"8px 10px",fontSize:9,fontFamily:"monospace",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#3d5068",background:"#0d1117",borderBottom:"1px solid #1a2535",position:"sticky",top:0,zIndex:10}}>評級</th>
                <SortTh col="daysToEarn">財報</SortTh>
                <th style={{padding:"8px 10px",fontSize:9,fontFamily:"monospace",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#3d5068",textAlign:"left",background:"#0d1117",borderBottom:"1px solid #1a2535",position:"sticky",top:0,zIndex:10,maxWidth:180}}>觀察</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const rc = retColor(r.ret);
                const rl = retLabel(r.ret, r.isSpecial);
                const sm = SECTOR_META[r.sector] || {};
                const q  = r.q;
                const t3 = r.trend3m;
                const tColor = !t3 ? "#4b5563" : t3 > 5 ? "#34d399" : t3 < -5 ? "#f87171" : "#9ca3af";
                const tArrow = !t3 ? "→" : t3 > 5 ? "↑" : t3 < -5 ? "↓" : "→";
                const capC = r.capratio > 40 ? "#f87171" : r.capratio > 20 ? "#fbbf24" : "#dce6f0";
                const earnC = r.daysToEarn <= 3 ? "#f87171" : r.daysToEarn <= 30 ? "#fbbf24" : "#4b6480";
                const barW = r.isSpecial ? 100 : r.ret === null || r.ret <= 0 ? 2 : Math.min(100, (r.ret/4)*100);
                const bg = idx % 2 === 0 ? "#070c12" : "#080e15";

                return (
                  <tr key={r.ticker} style={{ borderBottom:"1px solid #0f1820" }}>
                    <td style={{ padding:"8px 10px", background:bg, borderBottom:"1px solid #0f1820", borderRight:"1px solid #1a2535", position:"sticky", left:0, zIndex:5, minWidth:145 }}>
                      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#e2eaf4"}}>{r.ticker}</div>
                      <div style={{fontSize:10,color:"#4b6480",marginTop:1}}>{r.name}</div>
                    </td>
                    <td style={{ padding:"8px 10px", background:bg, borderBottom:"1px solid #0f1820", borderRight:"1px solid #1a2535", position:"sticky", left:145, zIndex:5, minWidth:85 }}>
                      <span style={{padding:"2px 6px",borderRadius:3,fontSize:9,fontFamily:"monospace",whiteSpace:"nowrap",color:"#94a3b8"}}>{sm.label}</span>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",background:bg,borderBottom:"1px solid #0f1820"}}>
                      {q ? (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
                          <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#e2eaf4"}}>
                            ${q.price >= 1000 ? q.price.toFixed(0) : q.price.toFixed(2)}
                          </span>
                          <span style={{fontFamily:"monospace",fontSize:9,color:q.changePct>=0?"#34d399":"#f87171"}}>
                            {q.changePct >= 0 ? "+" : ""}{q.changePct?.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{fontFamily:"monospace",fontSize:10,color: loadStatus[r.ticker]==="err"?"#f87171":"#2d4060"}}>
                          {loading ? "…" : loadStatus[r.ticker]==="err" ? "ERR" : "—"}
                        </span>
                      )}
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",background:bg,borderBottom:"1px solid #0f1820"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                        <Spark prices={r.h} color={tColor}/>
                        {t3 !== null ? (
                          <span style={{fontFamily:"monospace",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${tColor}18`,color:tColor,whiteSpace:"nowrap"}}>
                            {tArrow} {Math.abs(t3).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{fontFamily:"monospace",fontSize:9,color:"#2d4060"}}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#4b6480",background:bg,borderBottom:"1px solid #0f1820"}}>${r.fy23c}B</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#dce6f0",background:bg,borderBottom:"1px solid #0f1820"}}>${r.fy25c}B</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#fbbf24",background:bg,borderBottom:"1px solid #0f1820"}}>+${r.dcapex.toFixed(1)}B</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#4b6480",background:bg,borderBottom:"1px solid #0f1820"}}>${r.fy23r}B</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#dce6f0",background:bg,borderBottom:"1px solid #0f1820"}}>${r.fy25r}B</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#2dd4bf",background:bg,borderBottom:"1px solid #0f1820"}}>+${r.drev.toFixed(1)}B</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:capC,fontWeight:r.capratio>40?700:400,background:bg,borderBottom:"1px solid #0f1820"}}>{r.capratio.toFixed(1)}%</td>
                    <td style={{padding:"8px 10px",textAlign:"right",background:bg,borderBottom:"1px solid #0f1820",minWidth:130}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                        <div style={{width:56,height:4,background:"#1a2535",borderRadius:2,overflow:"hidden",flexShrink:0}}>
                          <div style={{width:`${barW}%`,height:"100%",background:rc,borderRadius:2}}/>
                        </div>
                        {r.isSpecial
                          ? <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#60a5fa",minWidth:44,textAlign:"right"}}>∞</span>
                          : r.ret === null
                            ? <span style={{fontFamily:"monospace",fontSize:11,color:"#2d4060",minWidth:44,textAlign:"right"}}>N/A</span>
                            : <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:rc,minWidth:44,textAlign:"right"}}>{r.ret.toFixed(2)}x</span>
                        }
                      </div>
                    </td>
                    <td style={{padding:"8px 10px",background:bg,borderBottom:"1px solid #0f1820"}}>
                      <span style={{padding:"2px 7px",borderRadius:3,fontSize:9,fontFamily:"monospace",fontWeight:700,border:"1px solid",color:rl.color,background:rl.bg,borderColor:rl.border}}>{rl.text}</span>
                    </td>
                    <td style={{padding:"8px 10px",background:bg,borderBottom:"1px solid #0f1820"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:1}}>
                        <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,color:earnC}}>{r.earnDate.replace("2026-","")}</span>
                        <span style={{fontSize:9,color:"#2d4060"}}>{r.daysToEarn < 0 ? "已過" : r.daysToEarn+"天後"}</span>
                      </div>
                    </td>
                    <td style={{padding:"8px 10px",fontSize:10,color:"#4b6480",textAlign:"left",maxWidth:180,whiteSpace:"normal",lineHeight:1.5,background:bg,borderBottom:"1px solid #0f1820"}}>{r.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div style={{marginTop:12,padding:"10px 14px",background:"#0d1117",border:"1px solid #1a2535",borderRadius:4,fontSize:9,color:"#2d4060",lineHeight:1.8,fontFamily:"monospace"}}>
          📡 報價來源：Finnhub API（即時）｜財報數據：FMP + 手動維護（FY2023/FY2025）｜Capex/Rev% &gt;40% 標紅警示｜本表為分析框架，非投資建議
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-track { background: #070c12; }
        ::-webkit-scrollbar-thumb { background: #1a2535; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2d4060; }
      `}</style>
    </div>
  );
}
