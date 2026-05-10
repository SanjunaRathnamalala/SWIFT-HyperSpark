import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Firebase imports
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

/* ─── Firebase Setup & Storage helpers ──────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyDT7DzUs5m50ni1uEdMXBpj025Lsf7NnvM",
  authDomain: "biogas-demo.firebaseapp.com",
  databaseURL: "https://biogas-demo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "biogas-demo",
  storageBucket: "biogas-demo.firebasestorage.app",
  messagingSenderId: "361921966081",
  appId: "1:361921966081:web:3f911999ffa43458c75000",
  measurementId: "G-HVE7JM9277"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DB_PATH = "swift-live-state";
const DEFAULTS = { bioPressure:1.45, hasLeak:false, battery:78, source:"biogas", digestTemp:33 };

// Write helper for the Admin panel
async function writeShared(s) {
  try { 
    await set(ref(db, DB_PATH), s); 
  } catch (err) {
    console.error("Firebase write error:", err);
  }
}

/* ─── Weekly mock data ──────────────────────────────────────────────────────── */
const HISTORY = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => {
  const bio = 42 + Math.round(Math.random()*38);
  const lpg = 14 + Math.round(Math.random()*28);
  return { day:d, biogas:bio, lpg:lpg, saved:Math.round(bio*0.58) };
});

/* ─── CSS helper ────────────────────────────────────────────────────────────── */
const GRN  = "#22c55e"; const BLU = "#38bdf8"; const ORG = "#f97316";
const RED  = "#ef4444"; const AMB = "#eab308"; const GRY = "#6b7280";
const BG   = "rgba(2,10,6,0.80)";
const CARD = { background:BG, backdropFilter:"blur(18px)", border:"1px solid rgba(34,197,94,0.14)", borderRadius:14, padding:20 };
// Changed to a clean, readable sans-serif font
const SANS = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* ─── Animated blob background ──────────────────────────────────────────────── */
function Bg() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, background:"#010d05", overflow:"hidden" }}>
      {[
        { left:"8%",  top:"20%", w:380, h:340, col:"#052e18", anim:"b1" },
        { left:"60%", top:"45%", w:420, h:380, col:"#051830", anim:"b2" },
        { left:"30%", top:"5%",  w:300, h:280, col:"#043320", anim:"b3" },
        { left:"75%", top:"10%", w:260, h:260, col:"#021a28", anim:"b4" },
        { left:"5%",  top:"65%", w:340, h:300, col:"#062b1a", anim:"b5" },
      ].map((b,i) => (
        <div key={i} style={{
          position:"absolute", left:b.left, top:b.top, width:b.w, height:b.h,
          borderRadius:"50%", background:b.col,
          filter:"blur(60px)", animation:`${b.anim} ${14+i*3}s ease-in-out infinite`,
        }}/>
      ))}
    </div>
  );
}

/* ─── Shared styles injected once ───────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      body{margin:0;overflow-x:hidden}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#22c55e33;border-radius:4px}
      input[type=range]{accent-color:#22c55e;width:100%;cursor:pointer}
      @keyframes b1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.1)}}
      @keyframes b2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-35px,25px) scale(0.92)}}
      @keyframes b3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,35px) scale(1.08)}}
      @keyframes b4{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-28px,-18px) scale(1.05)}}
      @keyframes b5{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(32px,-22px) scale(0.95)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25}}
      @keyframes glow{0%,100%{box-shadow:0 0 18px var(--gc)}50%{box-shadow:0 0 42px var(--gc)}}
      @keyframes breath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
      @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes slidein{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}

      /* ── Responsive grid ── */
      .top-grid{display:grid;grid-template-columns:1fr 2fr 1fr;gap:14px;margin-bottom:14px}
      .mid-grid{display:grid;grid-template-columns:1fr 1fr 2fr;gap:14px;margin-bottom:14px} /* Adjusted since LPG is removed */
      .admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}

      @media(max-width:900px){
        .top-grid{grid-template-columns:1fr 1fr;gap:12px}
        .mid-grid{grid-template-columns:1fr 1fr;gap:12px}
        .admin-grid{grid-template-columns:1fr}
      }
      @media(max-width:560px){
        .top-grid{grid-template-columns:1fr;gap:10px}
        .mid-grid{grid-template-columns:1fr;gap:10px}
        .admin-grid{grid-template-columns:1fr}
      }
    `}</style>
  );
}

/* ─── Widgets ────────────────────────────────────────────────────────────────── */

function Dot({ color, pulse }) {
  return <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:color, boxShadow:`0 0 7px ${color}`, animation: pulse ? "pulse 0.9s infinite" : "none" }}/>;
}

function Label({ children }) {
  return <div style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:GRY, letterSpacing:1.5, marginBottom:8 }}>{children}</div>;
}

function ActiveSource({ source }) {
  const cfg = { biogas:{icon:"🌿",color:GRN,label:"BIOGAS",sub:"Primary source active"}, lpg:{icon:"🔥",color:ORG,label:"LPG",sub:"Backup source active"}, off:{icon:"⏸",color:GRY,label:"IDLE",sub:"No gas flowing"} };
  const c = cfg[source] || cfg.off;
  return (
    <div style={{ textAlign:"center", padding:"8px 0" }}>
      <Label>ACTIVE SOURCE</Label>
      <div style={{ "--gc":c.color, margin:"10px auto", width:100, height:100, borderRadius:"50%", border:`2px solid ${c.color}`, background:`radial-gradient(circle, ${c.color}20, transparent 70%)`, display:"flex", alignItems:"center", justifyContent:"center", animation: source!=="off"?"glow 2.5s ease-in-out infinite":"none" }}>
        <span style={{ fontSize:40 }}>{c.icon}</span>
      </div>
      <div style={{ fontFamily:SANS, fontSize:24, color:c.color, fontWeight:700, letterSpacing:2 }}>{c.label}</div>
      <div style={{ fontFamily:SANS, fontSize:13, color:GRY, marginTop:4 }}>{c.sub}</div>
    </div>
  );
}

function PressureBar({ value }) {
  const MAX = 3.2;
  const p = Math.max(0, Math.min(value/MAX, 1));
  const zones = [{end:0.5/MAX,col:"#374151"},{end:1.0/MAX,col:"#854d0e"},{end:2.0/MAX,col:"#166534"},{end:2.5/MAX,col:"#854d0e"},{end:1,col:"#7f1d1d"}];
  const barCol = value<0.5?"#6b7280":value<1.0?AMB:value<=2.0?GRN:value<=2.5?AMB:RED;
  const status = value<0.5?"INSUFFICIENT":value<1.0?"LOW PRESSURE":value<=2.0?"OPERATIONAL":value<=2.5?"HIGH PRESSURE":"⚠ SAFETY OUTLET ACTIVE";
  const statusCol = value<0.5?GRY:value<1.0?AMB:value<=2.0?GRN:value<=2.5?AMB:RED;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10 }}>
        <Label>BIOGAS PRESSURE</Label>
        <span style={{ fontFamily:SANS, fontSize:28, color:barCol, fontWeight:700 }}>{value.toFixed(2)}<span style={{fontSize:16,color:GRY, fontWeight:500}}> bar</span></span>
      </div>
      {/* track */}
      <div style={{ position:"relative", height:20, borderRadius:10, overflow:"hidden", background:"#0d1a10", border:"1px solid #1a2e1a" }}>
        {zones.map((z,i,a) => { const from=(i===0?0:a[i-1].end)*100; return <div key={i} style={{position:"absolute",left:`${from}%`,width:`${(z.end-(i===0?0:a[i-1].end))*100}%`,height:"100%",background:z.col,opacity:0.35}}/> })}
        <div style={{ position:"absolute", left:0, width:`${p*100}%`, height:"100%", background:`linear-gradient(90deg,#052e18,${barCol})`, transition:"width 0.5s ease", borderRadius:10 }}/>
        {[0.5,1.0,2.0,2.5].map(v => <div key={v} style={{position:"absolute",left:`${(v/MAX)*100}%`,top:0,width:2,height:"100%",background:"#010d05",opacity:0.8}}/>)}
      </div>
      {/* zone labels */}
      <div style={{ display:"flex", fontFamily:SANS, fontSize:11, fontWeight:600, color:"#6b7280", marginTop:6 }}>
        {[["DEAD",""],["LOW",""],["OPTIMAL",""],["HIGH",""],["SAFETY",""]].map(([l],i)=>(
          <div key={i} style={{flex:zones[i] ? zones[i].end-(i===0?0:(zones[i-1]?.end||0)) : 0.15,textAlign:"center",overflow:"hidden"}}>{l}</div>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12 }}>
        <Dot color={statusCol} pulse={value>=2.5||value<0.5}/>
        <span style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:statusCol, letterSpacing:1 }}>{status}</span>
      </div>
    </div>
  );
}

function LeakStatus({ hasLeak }) {
  const col = hasLeak ? RED : GRN;
  return (
    <div style={{ textAlign:"center" }}>
      <Label>GAS LEAK SENSOR</Label>
      <div style={{ "--gc":col, margin:"10px auto", width:90, height:90, borderRadius:"50%", border:`2px solid ${col}`, background:`${col}15`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", animation:"glow 2s ease-in-out infinite" }}>
        <span style={{ fontSize:34 }}>{hasLeak ? "💨" : "🛡️"}</span>
      </div>
      <div style={{ fontFamily:SANS, fontSize:15, color:col, fontWeight:700, letterSpacing:1.5 }}>{hasLeak?"LEAK DETECTED":"NO LEAK"}</div>
      {hasLeak && <div style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:RED, marginTop:6, animation:"pulse 1s infinite" }}>AUTO SHUTOFF ENGAGED</div>}
    </div>
  );
}

function Battery({ pct }) {
  const col = pct>40?GRN:pct>15?AMB:RED;
  const bars = 5;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <Label>CTRL UNIT</Label>
      <div style={{ width:48, height:86, border:`2px solid #2d3d2d`, borderRadius:8, padding:4, background:"#0a1209", display:"flex", flexDirection:"column-reverse", gap:3 }}>
        {Array.from({length:bars}).map((_,i) => {
          const filled = pct >= ((i+1)/bars)*100-(100/bars)+1;
          return <div key={i} style={{ flex:1, borderRadius:3, background:filled?col:"#1a2e1a" }}/>;
        })}
      </div>
      <div style={{ width:18, height:6, background:"#2d3d2d", borderRadius:"3px 3px 0 0", marginTop:-2 }}/>
      <span style={{ fontFamily:SANS, fontSize:18, color:col, fontWeight:700 }}>{pct}%</span>
    </div>
  );
}

function TempWidget({ temp }) {
  const ok = temp>=28&&temp<=38;
  const col = ok?GRN:AMB;
  return (
    <div>
      <Label>DIGESTER TEMP</Label>
      <div style={{ fontFamily:SANS, fontSize:40, color:col, fontWeight:700 }}>{temp}°<span style={{fontSize:20, fontWeight:500, color:GRY}}>C</span></div>
      <div style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:col, marginTop:6 }}>{ok?"OPTIMAL (28–38°C)":"SUBOPTIMAL"}</div>
    </div>
  );
}

function Events() {
  const evts = [
    { t:"switch", time:"09:42", msg:"Switched → Biogas (pressure restored)" },
    { t:"ok",     time:"09:37", msg:"Biogas pressure stable at 1.2 bar" },
    { t:"switch", time:"09:31", msg:"Switched → LPG (low biogas pressure)" },
    { t:"ok",     time:"08:15", msg:"System boot — all sensors nominal" },
  ];
  return (
    <div>
      <Label>RECENT EVENTS</Label>
      {evts.map((e,i) => (
        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
          <div style={{ marginTop: 4 }}><Dot color={e.t==="switch"?ORG:GRN}/></div>
          <span style={{ fontFamily:SANS, fontSize:13, fontWeight:600, color:"#6b7280", flexShrink:0 }}>{e.time}</span>
          <span style={{ fontFamily:SANS, fontSize:13, color:"#d1d5db" }}>{e.msg}</span>
        </div>
      ))}
    </div>
  );
}

function Graph() {
  const totalB = HISTORY.reduce((a,b)=>a+b.biogas,0);
  const totalL = HISTORY.reduce((a,b)=>a+b.lpg,0);
  const saved  = HISTORY.reduce((a,b)=>a+b.saved,0);
  const pct    = Math.round(totalB/(totalB+totalL)*100);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <Label>WEEKLY ANALYTICS</Label>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
          {[{l:"Biogas",v:`${totalB}L`,c:GRN},{l:"LPG",v:`${totalL}L`,c:ORG},{l:"Saved",v:`~${saved}L`,c:BLU}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontFamily:SANS,fontSize:18,color:s.c,fontWeight:700}}>{s.v}</div>
              <div style={{fontFamily:SANS,fontSize:12, fontWeight:500,color:GRY}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={HISTORY} margin={{top:4,right:4,bottom:0,left:-24}}>
          <defs>
            {[["bio",GRN],["lpg",ORG],["sav",BLU]].map(([id,col])=>(
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={col} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={col} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a"/>
          <XAxis dataKey="day" tick={{fill:GRY,fontSize:12,fontFamily:SANS}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:GRY,fontSize:12,fontFamily:SANS}} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{background:"#070f08",border:"1px solid #1a2e1a",fontFamily:SANS,fontSize:12, borderRadius:8}} labelStyle={{color:"#9ca3af"}}/>
          <Legend wrapperStyle={{fontFamily:SANS,fontSize:12, fontWeight:500, marginTop:10}}/>
          <Area type="monotone" dataKey="biogas" name="Biogas (L)" stroke={GRN} fill="url(#bio)" strokeWidth={3}/>
          <Area type="monotone" dataKey="lpg"    name="LPG (L)"    stroke={ORG} fill="url(#lpg)" strokeWidth={3}/>
          <Area type="monotone" dataKey="saved"  name="LPG Saved"  stroke={BLU} fill="url(#sav)" strokeWidth={3} strokeDasharray="6 3"/>
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ marginTop:20, padding:"12px 16px", borderRadius:12, background:`${GRN}0d`, border:`1px solid ${GRN}30`, display:"flex", alignItems:"center", gap:16 }}>
        <span style={{fontFamily:SANS,fontSize:32,color:GRN,fontWeight:700}}>{pct}%</span>
        <div>
          <div style={{fontFamily:SANS,fontSize:14,fontWeight:600,color:GRN}}>BIOGAS PRIORITY EFFICIENCY</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard view ────────────────────────────────────────────────────────── */
function Dashboard({ state }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); }, []);

  return (
    <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"20px 14px 30px" }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:32, animation:"slidein 0.5s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:6 }}>
          <div style={{ flex:1, height:2, background:`linear-gradient(90deg, transparent, ${GRN}80)` }}/>
          <h1 style={{ margin:0, fontFamily:SANS, fontSize:"clamp(42px,8vw,64px)", fontWeight:900, letterSpacing:"clamp(4px,2vw,10px)", background:`linear-gradient(135deg,${GRN},${BLU},${GRN})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>SWIFT</h1>
          <div style={{ flex:1, height:2, background:`linear-gradient(90deg,${GRN}80, transparent)` }}/>
        </div>
        <p style={{ margin:0, fontFamily:SANS, fontSize:"clamp(10px,2vw,14px)", fontWeight:600, color:GRY, letterSpacing:"clamp(1px,0.5vw,3px)" }}>SMART WASTE-TO-FUEL INTELLIGENT FUEL TRANSITION</p>
        <div style={{ fontFamily:SANS, fontSize:12, fontWeight:500, color:"#6b7280", marginTop:8 }}>
          {time.toLocaleTimeString()} · HYPERSPARK © 2026
        </div>
      </div>

      {/* Top row */}
      <div className="top-grid">
        <div style={CARD}><ActiveSource source={state.source}/></div>
        <div style={CARD}><PressureBar value={state.bioPressure}/></div>
        <div style={CARD}><LeakStatus hasLeak={state.hasLeak}/></div>
      </div>

      {/* Mid row (LPG Removed, Grid adjusted) */}
      <div className="mid-grid">
        <div style={{...CARD,display:"flex",alignItems:"center",justifyContent:"center"}}><Battery pct={state.battery}/></div>
        <div style={CARD}><TempWidget temp={state.digestTemp}/></div>
        <div style={CARD}><Events/></div>
      </div>

      {/* Graph */}
      <div style={CARD}><Graph/></div>

      <div style={{ textAlign:"center", fontFamily:SANS, fontSize:12, fontWeight:500, color:"#2d3d2d", marginTop:24 }}>
        SWIFT v1.0 · Monitoring live
      </div>
    </div>
  );
}

/* ─── Admin panel ───────────────────────────────────────────────────────────── */
function AdminPanel({ state, setState }) {
  const [saved, setSaved] = useState(false);
  const [lastSave, setLastSave] = useState(null);

  const update = useCallback(async (patch) => {
    const next = { ...state, ...patch };
    setState(next);
    await writeShared(next);
    setSaved(true);
    setLastSave(new Date());
    setTimeout(()=>setSaved(false), 1200);
  }, [state, setState]);

  const srcBtns = ["biogas","lpg","off"];

  const sl = (label, key, min, max, step, unit) => (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:SANS, fontSize:13, fontWeight:600, color:"#9ca3af", marginBottom:8 }}>
        <span>{label}</span>
        <span style={{ color:GRN }}>{typeof state[key]==="number"?`${state[key].toFixed(step<1?2:0)} ${unit||""}`:state[key]}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={state[key]}
        onChange={e=>update({[key]:parseFloat(e.target.value)})}
        style={{ width:"100%" }}
      />
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:SANS, fontSize:11, color:"#6b7280", marginTop:4 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#010d05", color:"#e5e7eb", padding:20, position:"relative", zIndex:1 }}>
      <Bg/>
      <div style={{ position:"relative", zIndex:2, maxWidth:800, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <h1 style={{ margin:0, fontFamily:SANS, fontSize:32, fontWeight:900, letterSpacing:4, background:`linear-gradient(135deg,${GRN},${BLU})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>SWIFT ADMIN</h1>
          <p style={{ margin:"6px 0 0", fontFamily:SANS, fontSize:13, fontWeight:500, color:GRY, letterSpacing:2 }}>CONTROL PANEL — Changes sync to dashboard in real-time</p>
        </div>

        {/* Status bar */}
        <div style={{ ...CARD, marginBottom:20, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <Dot color={saved?GRN:GRY} pulse={saved}/>
          <span style={{ fontFamily:SANS, fontSize:13, fontWeight:600, color:saved?GRN:GRY }}>
            {saved ? "SYNCED TO DASHBOARD" : lastSave ? `Last sync: ${lastSave.toLocaleTimeString()}` : "Waiting for first change…"}
          </span>
          <span style={{ fontFamily:SANS, fontSize:12, color:"#6b7280", marginLeft:"auto" }}>Dashboard URL: remove #admin from the address bar</span>
        </div>

        <div className="admin-grid">
          {/* Pressures & levels */}
          <div style={CARD}>
            <div style={{ fontFamily:SANS, fontSize:12, fontWeight:700, color:GRY, letterSpacing:1.5, marginBottom:16 }}>GAS PARAMETERS</div>
            {sl("Biogas Pressure","bioPressure",0,3.2,0.05,"bar")}
          </div>

          {/* System */}
          <div style={CARD}>
            <div style={{ fontFamily:SANS, fontSize:12, fontWeight:700, color:GRY, letterSpacing:1.5, marginBottom:16 }}>SYSTEM STATUS</div>
            {sl("Battery Level","battery",0,100,1,"%")}
            {sl("Digester Temperature","digestTemp",10,55,1,"°C")}
          </div>

          {/* Active source */}
          <div style={CARD}>
            <div style={{ fontFamily:SANS, fontSize:12, fontWeight:700, color:GRY, letterSpacing:1.5, marginBottom:16 }}>ACTIVE FUEL SOURCE</div>
            <div style={{ display:"flex", gap:10 }}>
              {srcBtns.map(s => (
                <button key={s} onClick={()=>update({source:s})} style={{
                  flex:1, padding:"14px 0", fontFamily:SANS, fontSize:13, fontWeight:600, letterSpacing:1,
                  background: state.source===s ? `${GRN}22` : "transparent",
                  border:`1px solid ${state.source===s?GRN:"#2d3d2d"}`,
                  color: state.source===s?GRN:GRY, borderRadius:8, cursor:"pointer", transition:"all 0.2s"
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
            <div style={{ fontFamily:SANS, fontSize:12, fontWeight:500, color:"#6b7280", marginTop:12 }}>Active: <span style={{color:GRN, fontWeight:700}}>{state.source.toUpperCase()}</span></div>
          </div>

          {/* Leak */}
          <div style={CARD}>
            <div style={{ fontFamily:SANS, fontSize:12, fontWeight:700, color:GRY, letterSpacing:1.5, marginBottom:16 }}>GAS LEAK SENSOR</div>
            <div style={{ display:"flex", gap:10 }}>
              {[false,true].map(v => (
                <button key={String(v)} onClick={()=>update({hasLeak:v})} style={{
                  flex:1, padding:"14px 0", fontFamily:SANS, fontSize:13, fontWeight:600, letterSpacing:1,
                  background: state.hasLeak===v ? (v?`${RED}22`:`${GRN}22`) : "transparent",
                  border:`1px solid ${state.hasLeak===v?(v?RED:GRN):"#2d3d2d"}`,
                  color: state.hasLeak===v?(v?RED:GRN):GRY, borderRadius:8, cursor:"pointer", transition:"all 0.2s"
                }}>{v?"⚠ LEAK":"✓ CLEAR"}</button>
              ))}
            </div>
            <div style={{ fontFamily:SANS, fontSize:12, fontWeight:500, color:"#6b7280", marginTop:12 }}>Status: <span style={{color:state.hasLeak?RED:GRN, fontWeight:700}}>{state.hasLeak?"LEAK DETECTED":"NO LEAK"}</span></div>
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ ...CARD, marginTop:20 }}>
          <div style={{ fontFamily:SANS, fontSize:12, fontWeight:700, color:GRY, letterSpacing:1.5, marginBottom:16 }}>QUICK PRESETS — Tap to apply a scenario instantly</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { label:"Normal Operation",  vals:{ bioPressure:1.5,  hasLeak:false, battery:85, source:"biogas",  digestTemp:33 }},
              { label:"Low Biogas → LPG",  vals:{ bioPressure:0.7,  hasLeak:false, battery:80, source:"lpg",     digestTemp:30 }},
              { label:"Overpressure Alert",vals:{ bioPressure:2.8,  hasLeak:false, battery:75, source:"biogas",  digestTemp:35 }},
              { label:"Gas Leak Emergency",vals:{ bioPressure:1.2,  hasLeak:true,  battery:72, source:"off",     digestTemp:31 }},
              { label:"Full Healthy System",vals:{bioPressure:1.8,  hasLeak:false, battery:95, source:"biogas",  digestTemp:35 }},
            ].map(p => (
              <button key={p.label} onClick={()=>update(p.vals)} style={{
                padding:"10px 16px", fontFamily:SANS, fontSize:12, fontWeight:600, letterSpacing:0.5,
                background:"transparent", border:`1px solid #2d3d2d`, color:"#9ca3af",
                borderRadius:8, cursor:"pointer", transition:"all 0.2s",
              }}
              onMouseEnter={e=>{e.target.style.borderColor=GRN;e.target.style.color=GRN;}}
              onMouseLeave={e=>{e.target.style.borderColor="#2d3d2d";e.target.style.color="#9ca3af";}}
              >{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ textAlign:"center", fontFamily:SANS, fontSize:12, fontWeight:500, color:"#1a2e1a", marginTop:24 }}>SWIFT ADMIN · HYPERSPARK</div>
      </div>
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────────────────────────── */
export default function App() {
  const [mode,  setMode]  = useState(() => typeof window!=="undefined" && window.location.hash==="#admin" ? "admin" : "dash");
  const [state, setState] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Listen for hash changes (so tab on same device can switch)
  useEffect(() => {
    const onHash = () => setMode(window.location.hash==="#admin"?"admin":"dash");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Firebase Real-time Listener (Replaces the 2-second polling)
  useEffect(() => {
    const stateRef = ref(db, DB_PATH);
    
    // onValue listens for ANY change in the database and triggers instantly
    const unsubscribe = onValue(stateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setState({ ...DEFAULTS, ...data });
      }
      setReady(true); // Mark app as ready once the first read completes
    });

    // Cleanup listener when component unmounts
    return () => unsubscribe();
  }, []);

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"#010d05", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"'Inter', system-ui, sans-serif", fontSize:14, fontWeight:600, color:"#22c55e", letterSpacing:4, animation:"pulse 1s infinite" }}>INITIALISING…</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", color:"#e5e7eb" }}>
      <GlobalStyles/>
      {mode === "dash" ? (
        <>
          <Bg/>
          <Dashboard state={state}/>
        </>
      ) : (
        <AdminPanel state={state} setState={setState}/>
      )}
    </div>
  );
}