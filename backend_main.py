# backend_main.py — con datos reales de football-data.org
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import httpx
from datetime import datetime, timedelta
import os

app = FastAPI(title="MatchPredict AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FD_KEY = "a0fe1fb3de014e468d321c045d2915b6"
FD_BASE = "https://api.football-data.org/v4"
HEADERS = {"X-Auth-Token": FD_KEY}

# IDs de competiciones en football-data.org
COMP_IDS = {
    "PL":  "Premier League",
    "PD":  "La Liga",
    "BL1": "Bundesliga",
    "SA":  "Serie A",
    "FL1": "Ligue 1",
    "CL":  "Champions League",
    "EL":  "Europa League",
    "MLS": "MLS",
    "DED": "Eredivisie",
}

# Cache simple en memoria para no exceder límite de requests
_cache: dict = {}
CACHE_TTL = 3600  # 1 hora


def cache_get(key: str):
    if key in _cache:
        val, ts = _cache[key]
        if (datetime.now() - ts).seconds < CACHE_TTL:
            return val
    return None


def cache_set(key: str, val):
    _cache[key] = (val, datetime.now())


async def fetch_team_stats(team_name: str) -> dict:
    """
    Busca estadísticas reales del equipo en los últimos partidos.
    Retorna promedios de goles, córners estimados y forma reciente.
    """
    cache_key = f"team_{team_name}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    stats = {
        "goals_scored_avg": 1.35,
        "goals_conceded_avg": 1.10,
        "form": 0.50,
        "wins": 0, "draws": 0, "losses": 0,
        "matches_played": 0,
        "found": False,
        "team_id": None,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            # Buscar equipo
            r = await client.get(f"{FD_BASE}/teams", headers=HEADERS,
                                  params={"limit": 100})
            if r.status_code != 200:
                return stats

            NAME_MAP = {
                "barcelona": "FC Barcelona",
                "real madrid": "Real Madrid CF",
                "manchester city": "Manchester City FC",
                "manchester united": "Manchester United FC",
                "liverpool": "Liverpool FC",
                "arsenal": "Arsenal FC",
                "chelsea": "Chelsea FC",
                "tottenham": "Tottenham Hotspur FC",
                "tottenham hotspur": "Tottenham Hotspur FC",
                "bayern munich": "FC Bayern München",
                "psg": "Paris Saint-Germain FC",
                "paris saint-germain": "Paris Saint-Germain FC",
                "juventus": "Juventus FC",
                "inter milan": "FC Internazionale Milano",
                "ac milan": "AC Milan",
                "napoli": "SSC Napoli",
                "atletico madrid": "Club Atlético de Madrid",
                "atlético madrid": "Club Atlético de Madrid",
                "borussia dortmund": "Borussia Dortmund",
                "ajax": "AFC Ajax",
                "porto": "FC Porto",
                "benfica": "SL Benfica",
                "sevilla": "Sevilla FC",
                "newcastle": "Newcastle United FC",
                "aston villa": "Aston Villa FC",
                "west ham": "West Ham United FC",
                "roma": "AS Roma",
                "lazio": "SS Lazio",
                "atalanta": "Atalanta BC",
                "feyenoord": "Feyenoord Rotterdam",
                "atletico de madrid": "Club Atlético de Madrid",
            }
            search_name = NAME_MAP.get(team_name.lower(), team_name)
            all_teams = r.json().get("teams", [])

            # 1. Coincidencia exacta con mapa
            team = next((t for t in all_teams if t["name"].lower() == search_name.lower()), None)
            # 2. Por shortName exacto
            if not team:
                team = next((t for t in all_teams if t.get("shortName","").lower() == team_name.lower()), None)
            # 3. Parcial pero el nombre más corto para evitar "Espanyol" en vez de "Barcelona"
            if not team:
                candidates = [t for t in all_teams if search_name.lower() in t["name"].lower()]
                team = min(candidates, key=lambda t: len(t["name"])) if candidates else None

            if not team:
                return stats

            team_id = team["id"]
            stats["team_id"] = team_id
            stats["found"] = True

            # Últimos 10 partidos del equipo (solo ligas y copas oficiales)
            r2 = await client.get(
                f"{FD_BASE}/teams/{team_id}/matches",
                headers=HEADERS,
                params={"status": "FINISHED", "limit": 15, "competitions": "PL,PD,BL1,SA,FL1,CL,EL,DED,PPL,BSA"}
            )
            if r2.status_code != 200:
                return stats

            matches = r2.json().get("matches", [])
            if not matches:
                return stats

            goles_favor = []
            goles_contra = []
            puntos = []

            for m in matches:
                score = m.get("score", {}).get("fullTime", {})
                is_home = m["homeTeam"]["id"] == team_id

                gf = score.get("home") if is_home else score.get("away")
                gc = score.get("away") if is_home else score.get("home")

                if gf is None or gc is None:
                    continue

                goles_favor.append(gf)
                goles_contra.append(gc)

                if gf > gc:
                    puntos.append(3)
                    stats["wins"] += 1
                elif gf == gc:
                    puntos.append(1)
                    stats["draws"] += 1
                else:
                    puntos.append(0)
                    stats["losses"] += 1

            if goles_favor:
                stats["goals_scored_avg"] = round(np.mean(goles_favor), 2)
                stats["goals_conceded_avg"] = round(np.mean(goles_contra), 2)
                stats["form"] = round(np.mean(puntos) / 3, 2)
                stats["matches_played"] = len(goles_favor)

        except Exception as e:
            print(f"Error fetching {team_name}: {e}")

    cache_set(cache_key, stats)
    return stats


def monte_carlo(lambda_h, lambda_a, mu_c, mu_k, N=10_000):
    from collections import Counter
    rng = np.random.default_rng(42)

    # Usar Negative Binomial para manejar sobredispersión real
    phi = 5.0
    def nb(mu, size):
        p = phi / (phi + mu)
        return rng.negative_binomial(phi, p, size)

    gh = nb(lambda_h, N)
    ga = nb(lambda_a, N)
    co = nb(mu_c, N)
    ca = nb(mu_k, N)

    def dist(arr, rng_vals):
        c = Counter(arr.tolist())
        return [{"n": int(v), "p": round(c.get(v, 0) / N * 100, 1)} for v in rng_vals]

    scores = Counter([f"{h}-{a}" for h, a in zip(gh, ga)])
    top = scores.most_common(6)

    return {
        "home_win": round(float((gh > ga).mean() * 100), 1),
        "draw":     round(float((gh == ga).mean() * 100), 1),
        "away_win": round(float((gh < ga).mean() * 100), 1),
        "over25":   round(float(((gh + ga) > 2.5).mean() * 100), 1),
        "btts":     round(float(((gh > 0) & (ga > 0)).mean() * 100), 1),
        "corn_o85":  round(float((co > 8.5).mean() * 100), 1),
        "corn_o95":  round(float((co > 9.5).mean() * 100), 1),
        "corn_o105": round(float((co > 10.5).mean() * 100), 1),
        "corn_ci":  [int(np.percentile(co, 5)), int(np.percentile(co, 95))],
        "corn_dist": dist(co, range(4, 17)),
        "card_o35":  round(float((ca > 3.5).mean() * 100), 1),
        "card_o45":  round(float((ca > 4.5).mean() * 100), 1),
        "card_o55":  round(float((ca > 5.5).mean() * 100), 1),
        "card_ci":  [int(np.percentile(ca, 5)), int(np.percentile(ca, 95))],
        "card_dist": dist(ca, range(0, 10)),
        "top_scores": [{"score": s, "pct": round(c / N * 100, 1)} for s, c in top],
        "most_likely": top[0][0] if top else "1-1",
        "goals_dist": dist(gh + ga, range(0, 8)),
    }


@app.get("/")
def root():
    return {"status": "ok", "system": "MatchPredict AI", "data": "football-data.org"}


@app.get("/predict")
async def predict(
    home: str = Query(...),
    away: str = Query(...)
):
    if home == away:
        raise HTTPException(400, "Los equipos deben ser diferentes")

    # Obtener estadísticas reales de ambos equipos
    home_stats, away_stats = await asyncio.gather(
        fetch_team_stats(home),
        fetch_team_stats(away)
    )

    # Modelo Dixon-Coles simplificado con datos reales
    # Promedio de liga europeo: ~1.35 goles/partido como local
    LEAGUE_AVG = 1.35
    HOME_ADV = 1.15

    lambda_h = (home_stats["goals_scored_avg"] / LEAGUE_AVG) * (away_stats["goals_conceded_avg"] / LEAGUE_AVG) * LEAGUE_AVG * HOME_ADV
    lambda_a = (away_stats["goals_scored_avg"] / LEAGUE_AVG) * (home_stats["goals_conceded_avg"] / LEAGUE_AVG) * LEAGUE_AVG

    # Calibrar córners — promedio europeo real ≈ 9.8/partido
    corner_base = 9.8
    pace = np.clip((lambda_h + lambda_a) / 2.7, 0.7, 1.3)
    mu_c = corner_base * pace
    mu_c = float(np.clip(mu_c, 7.0, 13.0))

    # Calibrar tarjetas (correlación con intensidad del partido)
    card_base = 4.5
    form_diff = abs(home_stats["form"] - away_stats["form"])
    mu_k = card_base + form_diff * 1.5
    mu_k = float(np.clip(mu_k, 2.0, 8.0))

    lambda_h = float(np.clip(lambda_h, 0.5, 2.8))
    lambda_a = float(np.clip(lambda_a, 0.4, 2.5))

    mc = monte_carlo(lambda_h, lambda_a, mu_c, mu_k)

    # Nivel de confianza basado en datos disponibles
    confidence = 74.0
    if home_stats["found"] and away_stats["found"]:
        confidence = min(88.0, 74.0 + home_stats["matches_played"] * 0.7)

    # Factores clave basados en datos reales
    factors = []
    if home_stats["found"]:
        factors.append(f"{home}: {home_stats['goals_scored_avg']} goles/partido (últimos {home_stats['matches_played']} partidos)")
        factors.append(f"{home} forma reciente: {home_stats['wins']}V {home_stats['draws']}E {home_stats['losses']}D")
    if away_stats["found"]:
        factors.append(f"{away}: {away_stats['goals_scored_avg']} goles/partido (últimos {away_stats['matches_played']} partidos)")
        factors.append(f"{away} forma reciente: {away_stats['wins']}V {away_stats['draws']}E {away_stats['losses']}D")
    factors.append(f"Ventaja local aplicada: ×{HOME_ADV} (histórico europeo)")

    data_source = "football-data.org (datos reales)" if (home_stats["found"] or away_stats["found"]) else "modelo calibrado (equipo no encontrado en BD)"

    return {
        "home_team": home,
        "away_team": away,
        "data_source": data_source,
        "result_probs": {
            "home_win": mc["home_win"],
            "draw":     mc["draw"],
            "away_win": mc["away_win"],
        },
        "expected_goals": {
            "xg_home": round(lambda_h, 2),
            "xg_away": round(lambda_a, 2),
            "over_25": mc["over25"],
            "btts":    mc["btts"],
            "goals_dist": mc["goals_dist"],
        },
        "corners": {
            "expected":  round(mu_c, 1),
            "over_85":   mc["corn_o85"],
            "over_95":   mc["corn_o95"],
            "over_105":  mc["corn_o105"],
            "ci_low":    mc["corn_ci"][0],
            "ci_high":   mc["corn_ci"][1],
            "distribution": mc["corn_dist"],
        },
        "yellow_cards": {
            "expected": round(mu_k, 1),
            "over_35":  mc["card_o35"],
            "over_45":  mc["card_o45"],
            "over_55":  mc["card_o55"],
            "ci_low":   mc["card_ci"][0],
            "ci_high":  mc["card_ci"][1],
            "distribution": mc["card_dist"],
        },
        "monte_carlo": {
            "n_simulations": 10000,
            "most_likely":   mc["most_likely"],
            "top_scores":    mc["top_scores"],
        },
        "key_factors": factors,
        "model_confidence": round(confidence, 1),
        "home_stats": home_stats,
        "away_stats": away_stats,
    }


@app.get("/health")
def health():
    return {"status": "healthy", "api": "football-data.org"}


import asyncio
