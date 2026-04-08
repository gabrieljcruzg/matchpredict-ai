"use client";
import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

/* ── Google Fonts ─────────────────────────────────────────────────── */
const FONT_URL = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&family=DM+Mono:wght@400;500&display=swap";

/* ── Competiciones ────────────────────────────────────────────────── */
const COMPETITIONS: Record<string, { emoji: string; color: string; teams: string[] }> = {
  "UEFA Champions League": {
    emoji: "🏆", color: "#1a56db",
    teams: ["Real Madrid", "Barcelona", "Manchester City", "Bayern Munich", "PSG", "Liverpool", "Arsenal", "Chelsea", "Juventus", "Inter Milan", "AC Milan", "Atlético Madrid", "Borussia Dortmund", "Napoli", "Tottenham", "Porto", "Benfica", "Ajax", "RB Leipzig", "Bayer Leverkusen", "Celtic", "Feyenoord", "Shakhtar Donetsk", "Monaco", "Sporting CP"],
  },
  "UEFA Europa League": {
    emoji: "🟠", color: "#f97316",
    teams: ["Sevilla", "Valencia", "Real Sociedad", "Athletic Bilbao", "Villarreal", "Roma", "Lazio", "Atalanta", "West Ham", "Leicester", "Rangers", "Feyenoord", "Braga", "Marseille", "Lyon", "Eintracht Frankfurt", "Bayer Leverkusen", "Galatasaray", "Fenerbahçe", "Slavia Praha"],
  },
  "CONCACAF Champions Cup": {
    emoji: "🌎", color: "#10b981",
    teams: ["América", "Chivas", "Cruz Azul", "Monterrey", "Tigres UANL", "Santos Laguna", "Atlas", "Toluca", "Pachuca", "León", "Seattle Sounders", "LA Galaxy", "LAFC", "Portland Timbers", "CF Montréal", "Toronto FC", "Club de Foot Montréal", "Alajuelense", "Saprissa", "Comunicaciones"],
  },
  "Premier League": {
    emoji: "🦁", color: "#8b1a1a",
    teams: ["Manchester City", "Arsenal", "Liverpool", "Chelsea", "Tottenham", "Manchester United", "Newcastle", "Aston Villa", "Brighton", "West Ham", "Crystal Palace", "Wolves", "Everton", "Brentford", "Fulham", "Nottingham Forest", "Burnley", "Sheffield United", "Luton Town", "Bournemouth"],
  },
  "La Liga": {
    emoji: "🇪🇸", color: "#c0392b",
    teams: ["Real Madrid", "Barcelona", "Atlético Madrid", "Real Sociedad", "Athletic Bilbao", "Villarreal", "Betis", "Valencia", "Sevilla", "Celta Vigo", "Osasuna", "Rayo Vallecano", "Getafe", "Girona", "Las Palmas", "Almería", "Mallorca", "Cádiz", "Granada", "Alaves"],
  },
  "Bundesliga": {
    emoji: "🦅", color: "#e74c3c",
    teams: ["Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig", "Union Berlin", "Freiburg", "Eintracht Frankfurt", "Wolfsburg", "Mainz", "Borussia Mönchengladbach", "Augsburg", "Werder Bremen", "Stuttgart", "Hoffenheim", "Köln", "Bochum", "Darmstadt", "Heidenheim"],
  },
  "Serie A": {
    emoji: "🇮🇹", color: "#2980b9",
    teams: ["Inter Milan", "AC Milan", "Juventus", "Napoli", "Roma", "Lazio", "Atalanta", "Fiorentina", "Torino", "Bologna", "Udinese", "Monza", "Sassuolo", "Lecce", "Empoli", "Frosinone", "Genoa", "Cagliari", "Salernitana", "Hellas Verona"],
  },
  "Ligue 1": {
    emoji: "🇫🇷", color: "#8e44ad",
    teams: ["PSG", "Monaco", "Marseille", "Lyon", "Lille", "Rennes", "Nice", "Lens", "Montpellier", "Toulouse", "Nantes", "Reims", "Strasbourg", "Lorient", "Metz", "Clermont", "Brest", "Le Havre", "RC Paris", "Saint-Étienne"],
  },
  "Eredivisie": {
    emoji: "🌷", color: "#e67e22",
    teams: ["Ajax", "PSV", "Feyenoord", "AZ Alkmaar", "Utrecht", "Vitesse", "Twente", "Heerenveen", "Groningen", "Sparta Rotterdam", "NEC", "Go Ahead Eagles", "Fortuna Sittard", "Excelsior", "Almere City", "PEC Zwolle"],
  },
  "Liga MX": {
    emoji: "🦅", color: "#16a34a",
    teams: ["América", "Chivas", "Cruz Azul", "Monterrey", "Tigres UANL", "Santos Laguna", "Atlas", "Toluca", "Pachuca", "León", "Tijuana", "Pumas UNAM", "Necaxa", "Querétaro", "San Luis", "Mazatlán", "Juárez", "Atlético San Luis"],
  },
};

const API = "https://matchpredict-ai-production.up.railway.app";

const TT = {
  contentStyle: { background: "#0a0a14", border: "1px solid #1e1e36", borderRadius: 8, fontSize: 12, fontFamily: "'DM Mono', monospace" },
  labelStyle: { color: "#606080" },
  cursor: { fill: "rgba(100,120,255,0.04)" },
};

/* ── helpers ──────────────────────────────────────────────────────── */
function pct(val: number, color: string) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: "#1e1e36", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${val}%`, height: "100%", background: color, borderRadius: 2, transition: "width .7s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color, width: 38, textAlign: "right" }}>{val}%</span>
    </div>
  );
}

function Chip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ flex: 1, background: `${color}0d`, border: `1px solid ${color}28`, borderRadius: 12, padding: "14px 10px", textAlign: "center", minWidth: 80 }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color, opacity: .6, marginTop: 2, fontFamily: "'DM Mono',monospace" }}>{sub}</div>}
      <div style={{ fontSize: 11, color: "#606080", marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Section({ icon, title, accent, children }: any) {
  return (
    <div style={{ background: "#0d0d1c", border: `1px solid ${accent}1a`, borderRadius: 16, padding: 24, boxShadow: `0 0 40px ${accent}08` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, background: `${accent}18`, border: `1px solid ${accent}35`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, color: "#e0e6f5", letterSpacing: ".02em" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export default function Home() {
  const [comp, setComp] = useState("UEFA Champions League");
  const [home, setHome] = useState("Real Madrid");
  const [away, setAway] = useState("Manchester City");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simCount, setSimCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = document.createElement("link");
    el.rel = "stylesheet"; el.href = FONT_URL;
    document.head.appendChild(el);
    setTimeout(() => setMounted(true), 80);
  }, []);

  /* sim counter animation */
  useEffect(() => {
    if (!loading) return;
    setSimCount(0);
    const iv = setInterval(() => setSimCount(n => { if (n >= 10000) { clearInterval(iv); return 10000; } return n + 412; }), 48);
    return () => clearInterval(iv);
  }, [loading]);

  /* reset teams when comp changes */
  const teams = COMPETITIONS[comp].teams;
  useEffect(() => {
    setHome(teams[0]);
    setAway(teams[1]);
    setData(null);
  }, [comp]);

  const predict = async () => {
    if (home === away) { setError("Selecciona equipos diferentes"); return; }
    setLoading(true); setError(""); setData(null);
    try {
      const r = await fetch(`${API}/predict?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`);
      setData(await r.json());
    } catch { setError("No se pudo conectar al backend. ¿Está corriendo en http://127.0.0.1:8000?"); }
    finally { setLoading(false); }
  };

  const accent = COMPETITIONS[comp].color;
  const compEmoji = COMPETITIONS[comp].emoji;

  const style: any = {
    wrapper: {
      minHeight: "100vh",
      background: "#06060f",
      color: "#e0e6f5",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity .4s ease",
    },
    select: {
      padding: "10px 14px",
      background: "#0d0d1c",
      border: `1px solid #1e1e36`,
      borderRadius: 10,
      color: "#e0e6f5",
      fontSize: 13,
      cursor: "pointer",
      outline: "none",
      fontFamily: "'DM Sans', sans-serif",
      width: "100%",
    },
  };

  return (
    <main style={style.wrapper}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
        @keyframes grain {
          0%,100% { transform:translate(0,0); }
          10% { transform:translate(-2%,-3%); }
          30% { transform:translate(3%,2%); }
          50% { transform:translate(-1%,4%); }
          70% { transform:translate(2%,-2%); }
          90% { transform:translate(-3%,1%); }
        }
        select option { background:#0d0d1c; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:#06060f; }
        ::-webkit-scrollbar-thumb { background:#1e1e36; border-radius:3px; }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid #1e1e36" }}>
        {/* animated bg mesh */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 400, height: 400, background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, animation: "pulse 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 320, height: 320, background: "radial-gradient(circle, #7c3aed18 0%, transparent 70%)", animation: "pulse 5s ease-in-out infinite 1s" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "28px 24px 24px" }}>
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, background: `linear-gradient(135deg,${accent},#7c3aed)`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: `0 0 24px ${accent}40` }}>⚽</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, letterSpacing: ".12em", lineHeight: 1, background: `linear-gradient(90deg,#e0e6f5,${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                MatchPredict AI
              </div>
              <div style={{ fontSize: 10, color: "#404060", letterSpacing: ".18em", fontFamily: "'DM Mono',monospace" }}>
                BAYESIAN · NEURAL NET · MONTE CARLO
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["ML Ensemble", "10K Monte Carlo", "Bayesian CI"].map(t => (
                <div key={t} style={{ padding: "5px 11px", background: "#0d0d1c", border: "1px solid #1e1e36", borderRadius: 20, fontSize: 11, color: "#606080", fontFamily: "'DM Mono',monospace" }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Competition pills */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#404060", letterSpacing: ".12em", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>COMPETICIÓN</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(COMPETITIONS).map(([name, cfg]) => (
                <button key={name} onClick={() => setComp(name)} style={{
                  padding: "7px 14px",
                  background: comp === name ? `${cfg.color}22` : "#0d0d1c",
                  border: `1px solid ${comp === name ? cfg.color + "60" : "#1e1e36"}`,
                  borderRadius: 20,
                  color: comp === name ? cfg.color : "#606080",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: comp === name ? 600 : 400,
                  transition: "all .2s",
                  boxShadow: comp === name ? `0 0 12px ${cfg.color}25` : "none",
                }}>
                  {cfg.emoji} {name}
                </button>
              ))}
            </div>
          </div>

          {/* Team selectors */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            {[{ val: home, set: setHome, label: "LOCAL 🏠" }, { val: away, set: setAway, label: "VISITANTE ✈️" }].map(({ val, set, label }) => (
              <div key={label} style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 10, color: "#404060", letterSpacing: ".12em", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{label}</div>
                <select value={val} onChange={e => set(e.target.value)} style={style.select}>
                  {teams.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}

            <button onClick={predict} disabled={loading} style={{
              padding: "11px 32px",
              background: loading ? "#1e1e36" : `linear-gradient(135deg,${accent},#7c3aed)`,
              border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
              letterSpacing: ".04em",
              boxShadow: loading ? "none" : `0 0 24px ${accent}40`,
              transition: "all .2s",
              whiteSpace: "nowrap",
            }}>
              {loading ? `⟳ ${simCount.toLocaleString()} sims…` : "🔮 PREDECIR"}
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 48px" }}>

        {error && (
          <div style={{ background: "#160a0a", border: "1px solid #ef444440", borderRadius: 12, padding: "14px 18px", color: "#ef4444", marginBottom: 20, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>
            ⚠ {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!data && !loading && (
          <div style={{ textAlign: "center", padding: "100px 20px", animation: "fadeUp .6s ease" }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>{compEmoji}</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 36, letterSpacing: ".1em", color: "#e0e6f5", marginBottom: 12 }}>
              {comp}
            </div>
            <p style={{ color: "#404060", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.8, fontSize: 14 }}>
              Selecciona dos equipos de <strong style={{ color: accent }}>{comp}</strong> y presiona PREDECIR para obtener un análisis completo con probabilidades bayesianas, distribuciones Monte Carlo, córners y tarjetas.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {[["🎯", "Resultado"], ["⚽", "Goles xG"], ["🚩", "Córners"], ["🟨", "Tarjetas"], ["🎲", "Monte Carlo"]].map(([ic, lb]) => (
                <div key={lb} style={{ padding: "12px 20px", background: "#0d0d1c", border: "1px solid #1e1e36", borderRadius: 12, fontSize: 13, color: "#404060" }}>
                  {ic} {lb}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: "center", padding: "100px 20px" }}>
            <div style={{ fontSize: 60, display: "inline-block", animation: "spin 1.4s linear infinite", marginBottom: 20 }}>⚽</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 48, color: accent, letterSpacing: ".08em", lineHeight: 1 }}>{simCount.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: "#404060", marginTop: 8, fontFamily: "'DM Mono',monospace" }}>simulaciones ejecutadas</div>
          </div>
        )}

        {/* DASHBOARD */}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .5s ease" }}>

            {/* Match banner */}
            <div style={{
              background: `linear-gradient(135deg,#0d0d1c,#0a0a18)`,
              border: `1px solid ${accent}30`,
              borderRadius: 16, padding: "22px 28px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 14,
              boxShadow: `0 0 48px ${accent}10`,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#404060", letterSpacing: ".14em", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>
                  {compEmoji} {comp.toUpperCase()}
                </div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, letterSpacing: ".06em", lineHeight: 1 }}>
                  <span style={{ color: accent }}>{home}</span>
                  <span style={{ color: "#2a2a44", margin: "0 16px" }}>VS</span>
                  <span style={{ color: "#ef4444" }}>{away}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ padding: "10px 18px", background: "#10b98114", border: "1px solid #10b98140", borderRadius: 12, fontSize: 14, color: "#10b981", fontWeight: 600 }}>
                  ⚽ <span style={{ fontFamily: "'DM Mono',monospace" }}>{data.monte_carlo.most_likely}</span>
                  <span style={{ fontSize: 11, color: "#10b98180", marginLeft: 6 }}>más probable</span>
                </div>
                <div style={{ padding: "10px 18px", background: `${accent}12`, border: `1px solid ${accent}35`, borderRadius: 12, fontSize: 13, color: accent }}>
                  🎯 <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{data.model_confidence}%</span>
                  <span style={{ fontSize: 11, color: `${accent}80`, marginLeft: 6 }}>confianza</span>
                </div>
              </div>
            </div>

            {/* Row 1: Resultado + Goles */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>

              <Section icon="🎯" title="Probabilidades de Resultado" accent={accent}>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <Chip label={`${home} gana`} value={`${data.result_probs.home_win}%`} color={accent} />
                  <Chip label="Empate" value={`${data.result_probs.draw}%`} color="#606080" />
                  <Chip label={`${away} gana`} value={`${data.result_probs.away_win}%`} color="#ef4444" />
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={[{ name: home, value: data.result_probs.home_win }, { name: "Empate", value: data.result_probs.draw }, { name: away, value: data.result_probs.away_win }]}
                      cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                      dataKey="value" paddingAngle={4}>
                      {[accent, "#2a2a44", "#ef4444"].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip {...TT} formatter={(v: any) => [`${v}%`, "Prob."]} />
                  </PieChart>
                </ResponsiveContainer>
              </Section>

              <Section icon="⚽" title="Goles Esperados (xG Model)" accent="#10b981">
                <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                  <Chip label={`xG ${home}`} value={data.expected_goals.xg_home} color={accent} />
                  <Chip label={`xG ${away}`} value={data.expected_goals.xg_away} color="#ef4444" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "#606080" }}>Over 2.5 Goles</span>
                    </div>
                    {pct(data.expected_goals.over_25, "#10b981")}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "#606080" }}>Ambos Anotan (BTTS)</span>
                    </div>
                    {pct(data.expected_goals.btts, "#10b981")}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={data.expected_goals.goals_dist} margin={{ left: -28 }}>
                    <XAxis dataKey="n" tick={{ fill: "#606080", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#606080", fontSize: 9 }} />
                    <Tooltip {...TT} formatter={(v: any) => [`${v}%`, "Prob."]} />
                    <Bar dataKey="p" fill="#10b981" radius={[3, 3, 0, 0]} opacity={.9} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Row 2: Corners + Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              <Section icon="🚩" title="Córners — Análisis Bayesiano" accent="#f59e0b">
                <div style={{ display: "flex", gap: 16, marginBottom: 22, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 56, color: "#f59e0b", lineHeight: 1, letterSpacing: ".04em" }}>{data.corners.expected}</div>
                    <div style={{ fontSize: 11, color: "#606080" }}>córners esperados</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#404060", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>INTERVALO 90%</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", color: "#f59e0b80", fontSize: 13 }}>{data.corners.ci_low}</span>
                      <div style={{ flex: 1, height: 6, background: "#1e1e36", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: `${Math.max(0, (data.corners.ci_low - 4) / 14 * 100)}%`, right: `${Math.max(0, 100 - (data.corners.ci_high - 4) / 14 * 100)}%`, height: "100%", background: "linear-gradient(90deg,#f59e0b60,#f59e0b)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono',monospace", color: "#f59e0b", fontSize: 13 }}>{data.corners.ci_high}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {[{ l: "Over 8.5 Córners", v: data.corners.over_85 }, { l: "Over 9.5 Córners", v: data.corners.over_95 }, { l: "Over 10.5 Córners", v: data.corners.over_105 }].map(({ l, v }) => (
                    <div key={l}><div style={{ fontSize: 12, color: "#606080", marginBottom: 5 }}>{l}</div>{pct(v, "#f59e0b")}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#404060", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>DISTRIBUCIÓN MONTE CARLO</div>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={data.corners.distribution} margin={{ left: -28 }}>
                    <XAxis dataKey="n" tick={{ fill: "#606080", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#606080", fontSize: 9 }} />
                    <Tooltip {...TT} formatter={(v: any) => [`${v}%`, "Prob."]} />
                    <Bar dataKey="p" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section icon="🟨" title="Tarjetas Amarillas — Tendencia Árbitro" accent="#fbbf24">
                <div style={{ display: "flex", gap: 16, marginBottom: 22, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 56, color: "#fbbf24", lineHeight: 1, letterSpacing: ".04em" }}>{data.yellow_cards.expected}</div>
                    <div style={{ fontSize: 11, color: "#606080" }}>amarillas esperadas</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#404060", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>INTERVALO 90%</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", color: "#fbbf2480", fontSize: 13 }}>{data.yellow_cards.ci_low}</span>
                      <div style={{ flex: 1, height: 6, background: "#1e1e36", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: `${Math.max(0, (data.yellow_cards.ci_low - 1) / 8 * 100)}%`, right: `${Math.max(0, 100 - (data.yellow_cards.ci_high - 1) / 8 * 100)}%`, height: "100%", background: "linear-gradient(90deg,#fbbf2460,#fbbf24)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono',monospace", color: "#fbbf24", fontSize: 13 }}>{data.yellow_cards.ci_high}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {[{ l: "Over 3.5 Amarillas", v: data.yellow_cards.over_35 }, { l: "Over 4.5 Amarillas", v: data.yellow_cards.over_45 }, { l: "Over 5.5 Amarillas", v: data.yellow_cards.over_55 }].map(({ l, v }) => (
                    <div key={l}><div style={{ fontSize: 12, color: "#606080", marginBottom: 5 }}>{l}</div>{pct(v, "#fbbf24")}</div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#404060", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>DISTRIBUCIÓN MONTE CARLO</div>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={data.yellow_cards.distribution} margin={{ left: -28 }}>
                    <XAxis dataKey="n" tick={{ fill: "#606080", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#606080", fontSize: 9 }} />
                    <Tooltip {...TT} formatter={(v: any) => [`${v}%`, "Prob."]} />
                    <Bar dataKey="p" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Row 3: Monte Carlo + Factores */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr", gap: 16 }}>

              <Section icon="🎲" title="Monte Carlo — Top Marcadores (10,000 simulaciones)" accent="#7c3aed">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.monte_carlo.top_scores.map((s: any) => ({ score: s.score, pct: s.pct }))} layout="vertical" margin={{ right: 40, left: 36 }}>
                    <XAxis type="number" tick={{ fill: "#606080", fontSize: 10, fontFamily: "'DM Mono',monospace" }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="score" tick={{ fill: "#e0e6f5", fontSize: 14, fontFamily: "'DM Mono',monospace", fontWeight: 500 }} width={34} />
                    <Tooltip {...TT} formatter={(v: any) => [`${v}%`, "Frecuencia"]} />
                    <Bar dataKey="pct" fill="#7c3aed" radius={[0, 5, 5, 0]} opacity={.9} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section icon="💡" title="Factores Clave (SHAP)" accent="#10b981">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.key_factors.map((f: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", background: "#0a0a14", borderRadius: 10, border: "1px solid #1e1e36" }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: accent, fontWeight: 500, flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontSize: 12, color: "#606080", lineHeight: 1.6 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", padding: "16px 0 4px", borderTop: "1px solid #1e1e36" }}>
              <div style={{ fontSize: 11, color: "#2a2a44", fontFamily: "'DM Mono',monospace", letterSpacing: ".06em" }}>
                MATCHPREDICT AI · {comp} · Bayesian Hierarchical Model + Neural Network + Monte Carlo 10K
              </div>
              <div style={{ fontSize: 10, color: "#1e1e30", marginTop: 4 }}>
                Solo fines educativos · No constituye asesoramiento de apuestas
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
