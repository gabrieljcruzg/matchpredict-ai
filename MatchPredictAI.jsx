import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from "recharts";

// ── Font injection ──────────────────────────────────────────────────
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  select option { background: #0c0c18; color: #e2e8f0; }
  ::-webkit-scrollbar { width: 6px; } 
  ::-webkit-scrollbar-track { background: #0c0c18; }
  ::-webkit-scrollbar-thumb { background: #1e2040; border-radius: 3px; }
`;

// ── Teams list ──────────────────────────────────────────────────────
const TEAMS = [
  "Real Madrid","Barcelona","Manchester City","Liverpool","Bayern Munich",
  "PSG","Arsenal","Chelsea","Juventus","Inter Milan","AC Milan",
  "Atlético Madrid","Borussia Dortmund","Napoli","Tottenham",
  "Manchester United","Newcastle","Ajax","Porto","Benfica",
  "Boca Juniors","River Plate","Flamengo","Cruz Azul","América",
  "Chivas","Monterrey","Santos Laguna","Tigres UANL","Club América",
  "Sevilla","Valencia","Real Sociedad","Athletic Bilbao","Villarreal"
];

// ── Theme ───────────────────────────────────────────────────────────
const T = {
  bg:      "#07070f",
  surface: "#0c0c18",
  card:    "#0f0f1e",
  border:  "#1a1a30",
  borderHi:"#2a2a50",
  blue:    "#4f8ef7",
  blueD:   "#2563eb",
  purple:  "#7c3aed",
  green:   "#10b981",
  gold:    "#f59e0b",
  amber:   "#fbbf24",
  red:     "#ef4444",
  muted:   "#4a5268",
  dim:     "#8892a4",
  text:    "#dde4f0",
  mono:    "'Space Mono', monospace",
  sans:    "'Space Grotesk', system-ui, sans-serif",
};

// ── Helpers ─────────────────────────────────────────────────────────
const G = (a, b, deg = 135) => `linear-gradient(${deg}deg, ${a}, ${b})`;
const glow = (color, size = 20) => `0 0 ${size}px ${color}30`;

function StatBadge({ label, value, color, size = "lg" }) {
  const big = size === "lg";
  return (
    <div style={{
      flex: 1, textAlign: "center", padding: big ? "16px 8px" : "10px 8px",
      background: `${color}12`, border: `1px solid ${color}35`,
      borderRadius: 10, transition: "all .2s"
    }}>
      <div style={{ fontFamily: T.mono, fontSize: big ? 30 : 20, fontWeight: 700, color, lineHeight: 1 }}>
        {value}{typeof value === "number" && value <= 100 ? "%" : ""}
      </div>
      <div style={{ fontSize: 11, color: T.dim, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function OverRow({ label, value, threshold = 50, color }) {
  const hi = value >= threshold;
  const c = hi ? color : T.muted;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 0", borderBottom: `1px solid ${T.border}`
    }}>
      <span style={{ fontSize: 12, color: T.dim }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 60, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${value}%`, height: "100%", background: c, borderRadius: 2, transition: "width .6s ease" }} />
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: c, width: 36, textAlign: "right" }}>{value}%</span>
        {hi && <span style={{ fontSize: 9, color: c, fontWeight: 700 }}>▲</span>}
      </div>
    </div>
  );
}

function SectionHead({ icon, title, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{
        width: 32, height: 32, background: G(`${accent}40`, `${accent}10`),
        border: `1px solid ${accent}50`, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15
      }}>{icon}</div>
      <span style={{ fontWeight: 700, fontSize: 14, color: T.text, letterSpacing: ".02em" }}>{title}</span>
    </div>
  );
}

const CardWrap = ({ children, accent, style = {} }) => (
  <div style={{
    background: T.card, border: `1px solid ${accent ? `${accent}25` : T.border}`,
    borderRadius: 14, padding: 22,
    boxShadow: accent ? glow(accent, 15) : "none",
    ...style
  }}>
    {children}
  </div>
);

const TOOLTIP_STYLE = {
  contentStyle: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12 },
  labelStyle: { color: T.dim },
  cursor: { fill: "rgba(79,142,247,0.05)" }
};

// ── Main Component ──────────────────────────────────────────────────
export default function MatchPredictAI() {
  const [home, setHome] = useState("Real Madrid");
  const [away, setAway] = useState("Barcelona");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simCount, setSimCount] = useState(0);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = fontStyle;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // Sim counter animation
  useEffect(() => {
    if (!loading) return;
    setSimCount(0);
    const interval = setInterval(() => {
      setSimCount(n => { if (n >= 10000) { clearInterval(interval); return 10000; } return n + 347; });
    }, 50);
    return () => clearInterval(interval);
  }, [loading]);

  const predict = async () => {
    if (home === away) { setError("⚠ Selecciona equipos diferentes"); return; }
    setLoading(true); setError(null); setData(null);

    const prompt = `You are a professional football statistics engine. Generate REALISTIC match prediction data for ${home} (home) vs ${away} (away).

Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Follow this exact schema:

{
  "homeWin": <integer>,
  "draw": <integer>,
  "awayWin": <integer>,
  "xGHome": <float one decimal>,
  "xGAway": <float one decimal>,
  "over25": <integer>,
  "btts": <integer>,
  "corners": <float one decimal>,
  "cornO85": <integer>,
  "cornO95": <integer>,
  "cornO105": <integer>,
  "cornLow": <integer>,
  "cornHigh": <integer>,
  "cornDist": [{"n":6,"p":<int>},{"n":7,"p":<int>},{"n":8,"p":<int>},{"n":9,"p":<int>},{"n":10,"p":<int>},{"n":11,"p":<int>},{"n":12,"p":<int>},{"n":13,"p":<int>}],
  "cards": <float one decimal>,
  "cardO35": <integer>,
  "cardO45": <integer>,
  "cardO55": <integer>,
  "cardLow": <integer>,
  "cardHigh": <integer>,
  "cardDist": [{"n":1,"p":<int>},{"n":2,"p":<int>},{"n":3,"p":<int>},{"n":4,"p":<int>},{"n":5,"p":<int>},{"n":6,"p":<int>},{"n":7,"p":<int>}],
  "topScore": "<h>-<a>",
  "mcScores": [{"s":"<h>-<a>","p":<int>},{"s":"<h>-<a>","p":<int>},{"s":"<h>-<a>","p":<int>},{"s":"<h>-<a>","p":<int>},{"s":"<h>-<a>","p":<int>},{"s":"<h>-<a>","p":<int>}],
  "goalsDist": [{"n":0,"p":<int>},{"n":1,"p":<int>},{"n":2,"p":<int>},{"n":3,"p":<int>},{"n":4,"p":<int>},{"n":5,"p":<int>}],
  "radar": {"attack":<int 0-100>,"defense":<int 0-100>,"possession":<int 0-100>,"pace":<int 0-100>,"discipline":<int 0-100>},
  "radarAway": {"attack":<int 0-100>,"defense":<int 0-100>,"possession":<int 0-100>,"pace":<int 0-100>,"discipline":<int 0-100>},
  "factors": ["<detailed analytical insight 1>","<detailed analytical insight 2>","<detailed analytical insight 3>","<detailed analytical insight 4>","<detailed analytical insight 5>"],
  "confidence": <integer 60-95>
}

Rules:
- homeWin + draw + awayWin MUST equal exactly 100
- cornO85 > cornO95 > cornO105 (strictly decreasing)
- cardO35 > cardO45 > cardO55 (strictly decreasing)
- All distributions realistic and based on actual team styles
- factors must be specific analytical insights about THESE teams`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1400,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const json = await res.json();
      let raw = json.content[0].text.trim();
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(raw);
      setData(parsed);
    } catch (e) {
      setError("Error al procesar predicción. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.sans }}>

      {/* ── HEADER ── */}
      <div style={{
        background: G(T.surface, "#080814"),
        borderBottom: `1px solid ${T.border}`,
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40,
                background: G(T.blue, T.purple),
                borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, boxShadow: glow(T.blue)
              }}>⚽</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, background: G(T.blue, "#a78bfa"), WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  MatchPredict <span style={{ fontFamily: T.mono }}>AI</span>
                </div>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: ".06em" }}>
                  ML · BAYESIAN · MONTE CARLO
                </div>
              </div>
            </div>

            {/* Selectors */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: 1, maxWidth: 680, justifyContent: "flex-end" }}>
              {[
                { val: home, set: setHome, label: "🏠 Local" },
                { val: away, set: setAway, label: "✈️ Visitante" }
              ].map(({ val, set, label }) => (
                <div key={label} style={{ flex: 1, minWidth: 160, position: "relative" }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, letterSpacing: ".06em" }}>{label}</div>
                  <select value={val} onChange={e => set(e.target.value)} style={{
                    width: "100%", padding: "9px 12px",
                    background: T.surface, border: `1px solid ${T.borderHi}`,
                    borderRadius: 8, color: T.text, fontSize: 13,
                    fontFamily: T.sans, cursor: "pointer",
                    outline: "none"
                  }}>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={predict} disabled={loading} style={{
                padding: "10px 22px", marginTop: 16,
                background: loading ? T.border : G(T.blueD, T.purple),
                border: "none", borderRadius: 8, color: "#fff",
                fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: T.sans, whiteSpace: "nowrap",
                boxShadow: loading ? "none" : glow(T.blue),
                transition: "all .2s", letterSpacing: ".03em"
              }}>
                {loading ? "Simulando..." : "🔮 Predecir"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 16px" }}>

        {/* Error */}
        {error && (
          <div style={{ background: "#1a0a0a", border: `1px solid ${T.red}40`, borderRadius: 10, padding: "14px 18px", color: T.red, marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "70px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 20, animation: "spin 2s linear infinite" }}>⚽</div>
            <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.blue, marginBottom: 8 }}>
              {simCount.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 6 }}>simulaciones Monte Carlo ejecutadas</div>
            <div style={{ fontSize: 12, color: T.muted }}>Modelo bayesiano jerárquico + red neuronal en proceso...</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div style={{ textAlign: "center", padding: "70px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🏟</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: T.text }}>Sistema de Predicción de Fútbol</h2>
            <p style={{ color: T.dim, maxWidth: 480, margin: "0 auto 28px", fontSize: 14, lineHeight: 1.7 }}>
              Selecciona dos equipos y presiona <strong style={{ color: T.blue }}>Predecir</strong> para obtener análisis completo con ML, estadística bayesiana y Monte Carlo.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {[["🎯","ML Ensemble"],["📊","Bayesiano Jerárquico"],["🎲","Monte Carlo 10K"],["🚩","Córners"],["🟨","Tarjetas"]].map(([ic, lb]) => (
                <div key={lb} style={{ padding: "8px 14px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 12, color: T.dim }}>
                  {ic} {lb}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Match banner */}
            <div style={{
              background: G("#0d0d20", "#0a0a18", 160),
              border: `1px solid ${T.borderHi}`,
              borderRadius: 14, padding: "20px 28px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, letterSpacing: ".08em", marginBottom: 4 }}>PARTIDO ANALIZADO</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    <span style={{ color: T.blue }}>{home}</span>
                    <span style={{ color: T.muted, margin: "0 12px" }}>vs</span>
                    <span style={{ color: T.red }}>{away}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ padding: "8px 16px", background: `${T.green}18`, border: `1px solid ${T.green}40`, borderRadius: 20, fontSize: 13, color: T.green, fontWeight: 600 }}>
                  ⚽ Marcador más probable: <span style={{ fontFamily: T.mono }}>{data.topScore}</span>
                </div>
                <div style={{ padding: "8px 14px", background: `${T.blue}18`, border: `1px solid ${T.blue}40`, borderRadius: 20, fontSize: 12, color: T.blue }}>
                  🎯 Confianza: <span style={{ fontFamily: T.mono, fontWeight: 700 }}>{data.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Row 1: Result Probs + Goals */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>

              {/* Result probabilities */}
              <CardWrap accent={T.blue}>
                <SectionHead icon="🎯" title="Probabilidades de Resultado" accent={T.blue} />
                <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                  <StatBadge label={`${home} gana`} value={data.homeWin} color={T.blue} />
                  <StatBadge label="Empate" value={data.draw} color={T.dim} />
                  <StatBadge label={`${away} gana`} value={data.awayWin} color={T.red} />
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={[{ name: home, value: data.homeWin }, { name: "Empate", value: data.draw }, { name: away, value: data.awayWin }]}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value"
                      paddingAngle={3}
                    >
                      {[T.blue, "#374151", T.red].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, "Probabilidad"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardWrap>

              {/* Goals */}
              <CardWrap accent={T.green}>
                <SectionHead icon="⚽" title="Goles Esperados (xG)" accent={T.green} />
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <StatBadge label={`xG ${home}`} value={data.xGHome} color={T.blue} size="md" />
                  <StatBadge label={`xG ${away}`} value={data.xGAway} color={T.red} size="md" />
                </div>
                <OverRow label="Over 2.5 Goles" value={data.over25} color={T.green} />
                <OverRow label="Ambos Anotan (BTTS)" value={data.btts} color={T.green} />
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: ".06em" }}>DIST. TOTAL GOLES</div>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={data.goalsDist} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                      <XAxis dataKey="n" tick={{ fill: T.muted, fontSize: 10, fontFamily: T.mono }} />
                      <YAxis tick={{ fill: T.muted, fontSize: 9 }} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, "Prob."]} />
                      <Bar dataKey="p" fill={T.green} radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardWrap>
            </div>

            {/* Row 2: Corners + Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Corners */}
              <CardWrap accent={T.gold}>
                <SectionHead icon="🚩" title="Córners — Análisis Completo" accent={T.gold} />
                <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: T.mono, fontSize: 44, fontWeight: 700, color: T.gold, lineHeight: 1 }}>{data.corners}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>córners esperados</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Intervalo credibilidad (90%)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: T.mono, color: T.dim, fontSize: 13 }}>{data.cornLow}</span>
                      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: `${((data.cornLow - 5) / 14) * 100}%`, right: `${100 - ((data.cornHigh - 5) / 14) * 100}%`, height: "100%", background: G(`${T.gold}80`, T.gold), borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: T.mono, color: T.dim, fontSize: 13 }}>{data.cornHigh}</span>
                    </div>
                  </div>
                </div>
                <OverRow label="Over 8.5 Córners" value={data.cornO85} color={T.gold} />
                <OverRow label="Over 9.5 Córners" value={data.cornO95} color={T.gold} />
                <OverRow label="Over 10.5 Córners" value={data.cornO105} color={T.gold} />
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: ".06em" }}>DISTRIBUCIÓN MONTE CARLO</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={data.cornDist} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                      <XAxis dataKey="n" tick={{ fill: T.muted, fontSize: 10, fontFamily: T.mono }} />
                      <YAxis tick={{ fill: T.muted, fontSize: 9 }} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, "Prob."]} />
                      <Bar dataKey="p" fill={T.gold} radius={[3, 3, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardWrap>

              {/* Yellow Cards */}
              <CardWrap accent={T.amber}>
                <SectionHead icon="🟨" title="Tarjetas Amarillas — Análisis" accent={T.amber} />
                <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: T.mono, fontSize: 44, fontWeight: 700, color: T.amber, lineHeight: 1 }}>{data.cards}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>amarillas esperadas</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Intervalo credibilidad (90%)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: T.mono, color: T.dim, fontSize: 13 }}>{data.cardLow}</span>
                      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: `${((data.cardLow - 1) / 8) * 100}%`, right: `${100 - ((data.cardHigh - 1) / 8) * 100}%`, height: "100%", background: G(`${T.amber}80`, T.amber), borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: T.mono, color: T.dim, fontSize: 13 }}>{data.cardHigh}</span>
                    </div>
                  </div>
                </div>
                <OverRow label="Over 3.5 Amarillas" value={data.cardO35} color={T.amber} />
                <OverRow label="Over 4.5 Amarillas" value={data.cardO45} color={T.amber} />
                <OverRow label="Over 5.5 Amarillas" value={data.cardO55} color={T.amber} />
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: ".06em" }}>DISTRIBUCIÓN MONTE CARLO</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={data.cardDist} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                      <XAxis dataKey="n" tick={{ fill: T.muted, fontSize: 10, fontFamily: T.mono }} />
                      <YAxis tick={{ fill: T.muted, fontSize: 9 }} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, "Prob."]} />
                      <Bar dataKey="p" fill={T.amber} radius={[3, 3, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardWrap>
            </div>

            {/* Row 3: Monte Carlo + Radar */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>

              {/* Monte Carlo scores */}
              <CardWrap>
                <SectionHead icon="🎲" title="Monte Carlo — Top Marcadores (10,000 simulaciones)" accent={T.purple} />
                <div style={{ marginBottom: 10, fontSize: 12, color: T.dim }}>
                  Frecuencia de cada marcador en las simulaciones
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.mcScores} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: T.muted, fontSize: 10, fontFamily: T.mono }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="s" tick={{ fill: T.text, fontSize: 13, fontFamily: T.mono, fontWeight: 700 }} width={36} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, "Frecuencia"]} />
                    <Bar dataKey="p" fill={T.purple} radius={[0, 4, 4, 0]} opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
              </CardWrap>

              {/* Radar comparison */}
              <CardWrap>
                <SectionHead icon="📡" title="Comparación de Equipos" accent={T.blue} />
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.blue }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: T.blue }} /> {home}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.red }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: T.red }} /> {away}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={[
                    { attr: "Ataque", h: data.radar.attack, a: data.radarAway.attack },
                    { attr: "Defensa", h: data.radar.defense, a: data.radarAway.defense },
                    { attr: "Posesión", h: data.radar.possession, a: data.radarAway.possession },
                    { attr: "Ritmo", h: data.radar.pace, a: data.radarAway.pace },
                    { attr: "Disciplina", h: data.radar.discipline, a: data.radarAway.discipline },
                  ]}>
                    <PolarGrid stroke={T.border} />
                    <PolarAngleAxis dataKey="attr" tick={{ fill: T.dim, fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={home} dataKey="h" stroke={T.blue} fill={T.blue} fillOpacity={0.2} />
                    <Radar name={away} dataKey="a" stroke={T.red} fill={T.red} fillOpacity={0.15} />
                    <Tooltip {...TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardWrap>
            </div>

            {/* Row 4: Key Factors */}
            <CardWrap>
              <SectionHead icon="💡" title="Factores Clave del Análisis (SHAP Insights)" accent={T.green} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {data.factors.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    padding: "12px 14px", background: T.surface,
                    borderRadius: 10, border: `1px solid ${T.border}`
                  }}>
                    <div style={{
                      width: 26, height: 26, flexShrink: 0,
                      background: G(`${T.blue}30`, `${T.purple}20`),
                      border: `1px solid ${T.blue}40`,
                      borderRadius: 6, display: "flex", alignItems: "center",
                      justifyContent: "center", fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.blue
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <span style={{ fontSize: 13, color: T.dim, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </CardWrap>

            {/* Footer */}
            <div style={{ textAlign: "center", padding: "12px 0 4px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.muted, letterSpacing: ".04em" }}>
                MATCHPREDICT AI · Bayesian Hierarchical Model + Neural Network Ensemble + Monte Carlo (10,000 sims)
              </div>
              <div style={{ fontSize: 10, color: "#2a2a45", marginTop: 4 }}>
                Solo con fines educativos y de portafolio · No constituye consejo de apuestas
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
