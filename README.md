# MatchPredict AI ⚽🤖

Sistema profesional de predicción de partidos de fútbol con:
- **Modelo Bayesiano Jerárquico** (PyMC) con efectos por equipo, localía y árbitro
- **Red Neuronal Tabular** (PyTorch) con embeddings para equipos, ligas y árbitros
- **Simulación Monte Carlo** (10,000 simulaciones) para distribuciones completas
- **Frontend dashboard** profesional (React + Recharts, dark mode)
- **API REST** (FastAPI)

---

## 🗂 Estructura del Proyecto

```
matchpredict-ai/
│
├── backend/
│   ├── app/
│   │   └── main.py                  # FastAPI app
│   ├── models/
│   │   ├── bayesian_model.py        # Modelo Bayesiano (PyMC)
│   │   └── neural_network.py        # Red Neuronal (PyTorch)
│   ├── montecarlo/
│   │   └── simulator.py             # Simulación Monte Carlo
│   ├── utils/
│   │   └── feature_engineering.py  # Feature engineering
│   ├── data/
│   │   └── sample_matches.csv       # Datos de ejemplo
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── components/
│   │   ├── MatchHeader.jsx
│   │   ├── ResultCard.jsx
│   │   ├── CornersCard.jsx
│   │   ├── CardsCard.jsx
│   │   └── MonteCarloCard.jsx
│   ├── pages/
│   │   └── index.jsx                # Dashboard principal
│   ├── services/
│   │   └── api.js                   # Cliente API
│   ├── styles/
│   │   └── globals.css
│   ├── package.json
│   └── next.config.js
│
└── README.md
```

---

## 🚀 Instalación Local

### 1. Backend

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Instalar dependencias
cd backend
pip install -r requirements.txt

# Levantar servidor
uvicorn app.main:app --reload --port 8000
```

**requirements.txt:**
```
fastapi==0.110.0
uvicorn[standard]==0.27.0
pymc==5.10.0
pytensor==2.18.0
torch==2.2.0
scikit-learn==1.4.0
numpy==1.26.4
scipy==1.12.0
pandas==2.2.0
shap==0.45.0
pydantic==2.6.0
python-dotenv==1.0.0
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
# Abre http://localhost:3000
```

**package.json (dependencias clave):**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "recharts": "^2.10.0",
    "tailwindcss": "^3.4.0",
    "axios": "^1.6.0"
  }
}
```

---

## 🌐 Deploy en Producción

### Backend → Railway

```bash
# 1. Crear Dockerfile en /backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# 2. Deploy en Railway
# railway login
# railway init
# railway up
```

### Frontend → Vercel

```bash
cd frontend
vercel --prod
# Configurar variable de entorno:
# NEXT_PUBLIC_API_URL=https://tu-api.railway.app
```

---

## 📡 API Reference

### `GET /predict`

```http
GET /predict?home=Real+Madrid&away=Barcelona&n_sims=10000
```

**Response:**
```json
{
  "home_team": "Real Madrid",
  "away_team": "Barcelona",
  "result_probs": {
    "home_win": 46.2,
    "draw": 26.8,
    "away_win": 27.0
  },
  "expected_goals": {
    "xg_home": 1.52,
    "xg_away": 1.18,
    "total": 2.70,
    "over_25": 62.3,
    "btts": 54.1
  },
  "corners": {
    "expected": 10.2,
    "over_85": 74.3,
    "over_95": 58.1,
    "over_105": 38.2,
    "ci_low": 7,
    "ci_high": 14,
    "distribution": [...]
  },
  "yellow_cards": {
    "expected": 4.8,
    "over_35": 72.1,
    "over_45": 51.3,
    "over_55": 28.9,
    "ci_low": 2,
    "ci_high": 8
  },
  "monte_carlo": {
    "n_simulations": 10000,
    "most_likely": "1-1",
    "top_scores": [
      {"score": "1-1", "pct": 12.4},
      {"score": "2-1", "pct": 9.8}
    ]
  }
}
```

---

## 🧠 Arquitectura de Modelos

### Modelo Bayesiano Jerárquico

```
α_i  ~ Normal(μ_α, σ_α)       ← ataque del equipo i
δ_i  ~ Normal(μ_δ, σ_δ)       ← defensa del equipo i
η    ~ HalfNormal(0.35)         ← ventaja local

log(λ_home) = α_home - δ_away + η
log(λ_away) = α_away - δ_home

goles ~ NegativeBinomial(λ, φ)  ← maneja sobredispersión

Para córners:
log(μ_corn) = base + γ_home + γ_away + β_local
córners ~ NegativeBinomial(μ_corn, φ_corn)

Para tarjetas:
log(μ_card) = base + θ_home + θ_away + ρ_árbitro
amarillas ~ NegativeBinomial(μ_card, φ_card)
```

### Red Neuronal Tabular

```
Inputs:
  - Embedding(team_home, 16)
  - Embedding(team_away, 16)
  - Embedding(league, 8)
  - Embedding(referee, 6)
  - Numerical features (14): forma, xG, ELO, córners avg, etc.

Backbone: Dense(256) → BN → GELU → Dropout(0.3) → ...

Outputs (Softplus):
  - lambda_home  (goles esperados local)
  - lambda_away  (goles esperados visitante)
  - mu_corners   (córners esperados)
  - mu_cards     (amarillas esperadas)
```

### Ensamble

```
Predicción final = 0.60 × Bayesiano + 0.40 × Red Neuronal
```

La ponderación favorece al bayesiano porque:
1. Provee intervalos de credibilidad formales
2. Regularización natural con priores
3. Mejor calibrado con pocos datos

---

## 📊 Feature Engineering

| Feature | Descripción |
|---------|-------------|
| `home_goals_avg` | Promedio goles marcados (últimos 5 partidos) |
| `away_goals_avg` | Promedio goles marcados visitando |
| `home_goals_conceded` | Goles recibidos en casa |
| `home_form` | Puntos/partido últimos 5 juegos (0-1) |
| `elo_diff` | Diferencia ELO entre equipos |
| `home_xg_avg` | Expected Goals promedio como local |
| `home_corners_avg` | Córners promedio en casa |
| `home_cards_avg` | Amarillas promedio como local |
| `referee_yellow_rate` | Tendencia del árbitro (amarillas/partido) |
| `days_rest_diff` | Diferencia de días de descanso |

---

## 🎯 Roadmap

- [ ] Integración con API de datos reales (football-data.org / StatsBomb)
- [ ] Entrenamiento con datos históricos (5+ temporadas)
- [ ] Dashboard de backtesting y calibración
- [ ] Alertas automáticas pre-partido
- [ ] Soporte multi-liga (La Liga, Premier, Bundesliga, etc.)
- [ ] Sistema de tracking de predicciones vs resultados reales

---

## 📝 Notas

> Este sistema es un proyecto de portafolio educativo.
> No constituye asesoramiento de apuestas.
> Los modelos requieren datos históricos reales para producción.

---

**Stack:** Python · FastAPI · PyMC · PyTorch · NumPy · React · Next.js · Recharts · Tailwind CSS
