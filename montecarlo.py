# backend/montecarlo/simulator.py
"""
Módulo Monte Carlo para MatchPredict AI.

Ejecuta N simulaciones completas de un partido usando las distribuciones
del modelo ensamblado (Bayesiano + Red Neuronal) para generar:

  - Distribución completa de resultados (home win / draw / away win)
  - Distribución de marcadores exactos
  - Distribución de goles totales
  - Distribución de córners con intervalos de credibilidad
  - Distribución de tarjetas amarillas con intervalos de credibilidad
  - Probabilidades over/under para mercados estándar
  - BTTS (Both Teams To Score)
"""

import numpy as np
from scipy import stats
from collections import Counter
from typing import Dict, Any, List


class MonteCarloSimulator:
    """
    Simulador Monte Carlo para partidos de fútbol.

    Utiliza las tasas estimadas del ensamble para muestrear
    distribuciones Negative Binomial (maneja sobredispersión real
    del fútbol, que excede la Poisson simple).
    """

    def __init__(self, n_simulations: int = 10_000, seed: int = 42):
        self.n_simulations = n_simulations
        self.rng = np.random.default_rng(seed)

    def _nb_sample(self, mu: float, phi: float, size: int) -> np.ndarray:
        """
        Muestrea de una distribución Negative Binomial parametrizada
        por media (mu) y sobredispersión (phi).

        NB(mu, phi): Var = mu + mu²/phi
        Equivalente a Gamma-Poisson mixture.
        """
        # Convertir a parametrización (n, p) de scipy
        p = phi / (phi + mu)
        n = phi
        return self.rng.negative_binomial(n, p, size=size)

    def run(self, ensemble_params: Dict, n_sims: int = None) -> Dict[str, Any]:
        """
        Ejecuta la simulación Monte Carlo completa.

        Args:
            ensemble_params: {
                lambda_home, lambda_away,  # tasas de goles
                mu_corners, phi_corners,   # parámetros córners
                mu_cards,   phi_cards      # parámetros tarjetas
            }
            n_sims: override del número de simulaciones

        Returns:
            dict con todas las distribuciones y probabilidades calculadas
        """
        N = n_sims or self.n_simulations

        λh = ensemble_params["lambda_home"]
        λa = ensemble_params["lambda_away"]
        μc = ensemble_params["mu_corners"]
        φc = ensemble_params.get("phi_corners", 5.0)
        μk = ensemble_params["mu_cards"]
        φk = ensemble_params.get("phi_cards", 3.0)

        # ── Simulación principal ─────────────────────────────────────
        goals_home = self._nb_sample(λh, φc, N)     # sobredispersión similar
        goals_away = self._nb_sample(λa, φc, N)
        corners    = self._nb_sample(μc, φc, N)
        cards      = self._nb_sample(μk, φk, N)

        total_goals = goals_home + goals_away

        # ── Resultados ───────────────────────────────────────────────
        home_wins = goals_home > goals_away
        away_wins = goals_away > goals_home
        draws     = goals_home == goals_away

        home_win_pct = float(home_wins.mean() * 100)
        away_win_pct = float(away_wins.mean() * 100)
        draw_pct     = float(draws.mean() * 100)

        # ── Goles ────────────────────────────────────────────────────
        over25_pct = float((total_goals > 2.5).mean() * 100)
        btts_pct   = float(((goals_home > 0) & (goals_away > 0)).mean() * 100)

        # ── Córners over/under ────────────────────────────────────────
        corners_over_85  = float((corners > 8.5).mean() * 100)
        corners_over_95  = float((corners > 9.5).mean() * 100)
        corners_over_105 = float((corners > 10.5).mean() * 100)
        corners_ci = (
            int(np.percentile(corners, 5)),
            int(np.percentile(corners, 95))
        )

        # ── Tarjetas over/under ───────────────────────────────────────
        cards_over_35 = float((cards > 3.5).mean() * 100)
        cards_over_45 = float((cards > 4.5).mean() * 100)
        cards_over_55 = float((cards > 5.5).mean() * 100)
        cards_ci = (
            int(np.percentile(cards, 5)),
            int(np.percentile(cards, 95))
        )

        # ── Distribuciones ────────────────────────────────────────────
        goals_dist  = self._build_distribution(total_goals, range_vals=range(0, 8))
        corners_dist = self._build_distribution(corners, range_vals=range(4, 18))
        cards_dist   = self._build_distribution(cards,   range_vals=range(0, 10))

        # ── Marcadores más frecuentes ─────────────────────────────────
        score_strings = [f"{h}-{a}" for h, a in zip(goals_home, goals_away)]
        score_counter = Counter(score_strings)
        most_common   = score_counter.most_common(10)
        most_likely   = most_common[0][0] if most_common else "1-1"

        top_scores = [
            {"score": sc, "pct": round(cnt / N * 100, 1)}
            for sc, cnt in most_common[:6]
        ]

        # Distribución simplificada de marcadores (para visualización)
        score_dist = [
            {"score": sc, "pct": round(cnt / N * 100, 1)}
            for sc, cnt in score_counter.most_common(20)
        ]

        return {
            "n_simulations": N,
            # Resultados
            "home_win_pct": round(home_win_pct, 1),
            "draw_pct":     round(draw_pct, 1),
            "away_win_pct": round(away_win_pct, 1),
            # Goles
            "over25_pct": round(over25_pct, 1),
            "btts_pct":   round(btts_pct, 1),
            "goals_dist": goals_dist,
            # Córners
            "corners_over_85":  round(corners_over_85, 1),
            "corners_over_95":  round(corners_over_95, 1),
            "corners_over_105": round(corners_over_105, 1),
            "corners_ci":   corners_ci,
            "corners_dist": corners_dist,
            # Tarjetas
            "cards_over_35": round(cards_over_35, 1),
            "cards_over_45": round(cards_over_45, 1),
            "cards_over_55": round(cards_over_55, 1),
            "cards_ci":   cards_ci,
            "cards_dist": cards_dist,
            # Marcadores
            "top_scores":       top_scores,
            "most_likely_score": most_likely,
            "score_dist":       score_dist,
        }

    def _build_distribution(
        self, samples: np.ndarray, range_vals
    ) -> List[Dict]:
        """
        Construye una distribución de frecuencias para visualización.

        Returns:
            Lista de {"n": valor, "p": porcentaje}
        """
        N = len(samples)
        counter = Counter(samples.tolist())
        return [
            {"n": int(v), "p": round(counter.get(v, 0) / N * 100, 1)}
            for v in range_vals
        ]

    def sensitivity_analysis(
        self, base_params: Dict, n_scenarios: int = 100
    ) -> Dict:
        """
        Análisis de sensibilidad: varía parámetros ±15% para
        calcular rangos de incertidumbre en las predicciones.
        """
        results = []
        for _ in range(n_scenarios):
            perturbed = {
                k: v * (1 + self.rng.normal(0, 0.08))
                if isinstance(v, float) else v
                for k, v in base_params.items()
            }
            r = self.run(perturbed, n_sims=1000)
            results.append(r)

        # Intervalos de sensibilidad
        hw = [r["home_win_pct"] for r in results]
        return {
            "home_win_sensitivity": {
                "mean": round(np.mean(hw), 1),
                "std":  round(np.std(hw), 1),
                "ci90": [round(np.percentile(hw, 5), 1), round(np.percentile(hw, 95), 1)]
            }
        }
