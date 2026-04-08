# backend/models/bayesian_model.py
"""
Modelo Bayesiano Jerárquico para predicción de partidos de fútbol.

Arquitectura:
- Distribución Negative Binomial para goles (maneja sobredispersión)
- Efectos aleatorios por equipo: ataque, defensa, localía
- Efectos por árbitro para tarjetas amarillas
- Priori débiles informativos (regularización bayesiana)
- Inferencia: MCMC (NUTS) o Variacional (ADVI)
"""

import numpy as np
import pymc as pm
import pytensor.tensor as pt
from scipy import stats
from typing import Dict, Any


class BayesianMatchModel:
    """
    Modelo Bayesiano Jerárquico tipo Dixon-Coles extendido.

    Parámetros latentes por equipo:
        α_i  = fuerza atacante del equipo i  ~ N(μ_α, σ_α)
        δ_i  = debilidad defensiva equipo i  ~ N(μ_δ, σ_δ)
        η    = ventaja de localía            ~ HalfNormal(0.5)

    Para goles (Negative Binomial):
        log(λ_home) = α_home - δ_away + η
        log(λ_away) = α_away - δ_home

    Para córners (Negative Binomial):
        log(μ_corners) = γ_home + γ_away + β_local

    Para amarillas (Negative Binomial):
        log(μ_cards) = θ_home + θ_away + ρ_arbitro
    """

    def __init__(self):
        self.is_fitted = False
        self.trace = None
        self.team_indices = {}
        self.referee_indices = {}
        # Parámetros simulados (se reemplazan al entrenar con datos reales)
        self._prior_params = {
            "home_advantage": 0.25,
            "attack_std": 0.35,
            "defense_std": 0.25,
            "corners_base": 2.25,   # log-escala → exp ≈ 9.5
            "cards_base": 1.55,     # log-escala → exp ≈ 4.7
        }

    def build_model(self, data: Dict) -> pm.Model:
        """Construye el grafo probabilístico con PyMC."""
        teams = data["teams"]
        n_teams = len(teams)
        n_refs = len(data.get("referees", ["default"]))
        home_idx = data["home_idx"]
        away_idx = data["away_idx"]
        ref_idx  = data.get("ref_idx", [0] * len(home_idx))
        goals_h  = data["goals_home"]
        goals_a  = data["goals_away"]
        corners  = data["corners"]
        cards    = data["cards"]

        with pm.Model() as model:
            # ── Priores Hiperparámetros ──────────────────────────────
            mu_attack  = pm.Normal("mu_attack",  mu=0, sigma=0.5)
            mu_defense = pm.Normal("mu_defense", mu=0, sigma=0.5)
            sigma_attack  = pm.HalfNormal("sigma_attack",  sigma=0.5)
            sigma_defense = pm.HalfNormal("sigma_defense", sigma=0.5)

            # ── Efectos por Equipo ───────────────────────────────────
            attack  = pm.Normal("attack",  mu=mu_attack,  sigma=sigma_attack,  shape=n_teams)
            defense = pm.Normal("defense", mu=mu_defense, sigma=sigma_defense, shape=n_teams)

            # ── Ventaja Local ────────────────────────────────────────
            home_adv = pm.HalfNormal("home_adv", sigma=0.35)

            # ── Tasas de Goles ────────────────────────────────────────
            log_lambda_h = attack[home_idx] - defense[away_idx] + home_adv
            log_lambda_a = attack[away_idx] - defense[home_idx]
            lambda_h = pm.math.exp(log_lambda_h)
            lambda_a = pm.math.exp(log_lambda_a)

            # Sobredispersión (Negative Binomial)
            alpha_goals = pm.HalfNormal("alpha_goals", sigma=2.0)

            # ── Likelihood Goles ────────────────────────────────────
            goals_home_obs = pm.NegativeBinomial(
                "goals_home", mu=lambda_h, alpha=alpha_goals,
                observed=goals_h
            )
            goals_away_obs = pm.NegativeBinomial(
                "goals_away", mu=lambda_a, alpha=alpha_goals,
                observed=goals_a
            )

            # ── Modelo de Córners ────────────────────────────────────
            gamma_attack  = pm.Normal("gamma_attack",  mu=0, sigma=0.4, shape=n_teams)
            gamma_defense = pm.Normal("gamma_defense", mu=0, sigma=0.3, shape=n_teams)
            beta_corner_home = pm.Normal("beta_corner_home", mu=0.1, sigma=0.2)
            mu_corners_base  = pm.Normal("mu_corners_base", mu=2.2, sigma=0.3)

            log_mu_corners = (mu_corners_base
                              + gamma_attack[home_idx] + gamma_attack[away_idx]
                              - gamma_defense[home_idx] - gamma_defense[away_idx]
                              + beta_corner_home)
            mu_corners_ = pm.math.exp(log_mu_corners)
            alpha_corners = pm.HalfNormal("alpha_corners", sigma=3.0)

            corners_obs = pm.NegativeBinomial(
                "corners_obs", mu=mu_corners_, alpha=alpha_corners,
                observed=corners
            )

            # ── Modelo de Tarjetas (con efecto árbitro) ───────────────
            theta_home = pm.Normal("theta_home", mu=0, sigma=0.4, shape=n_teams)
            theta_away = pm.Normal("theta_away", mu=0, sigma=0.4, shape=n_teams)
            rho_ref    = pm.Normal("rho_ref", mu=0, sigma=0.5, shape=n_refs)
            mu_cards_base = pm.Normal("mu_cards_base", mu=1.5, sigma=0.3)

            log_mu_cards = (mu_cards_base
                            + theta_home[home_idx] + theta_away[away_idx]
                            + rho_ref[ref_idx])
            mu_cards_ = pm.math.exp(log_mu_cards)
            alpha_cards = pm.HalfNormal("alpha_cards", sigma=2.0)

            cards_obs = pm.NegativeBinomial(
                "cards_obs", mu=mu_cards_, alpha=alpha_cards,
                observed=cards
            )

        return model

    def fit(self, data: Dict, method: str = "advi", draws: int = 1000):
        """
        Ajusta el modelo con datos históricos.

        Args:
            data: diccionario con arrays de partidos históricos
            method: "advi" (rápido) o "mcmc" (más preciso)
            draws: número de muestras posteriores
        """
        model = self.build_model(data)
        self.team_indices = data["team_map"]
        self.referee_indices = data.get("ref_map", {})

        with model:
            if method == "advi":
                approx = pm.fit(n=20_000, method="advi")
                self.trace = approx.sample(draws)
            else:
                self.trace = pm.sample(
                    draws=draws, tune=1000,
                    target_accept=0.92,
                    return_inferencedata=True,
                    progressbar=True
                )

        self.is_fitted = True

    def predict(self, features: Dict) -> Dict[str, Any]:
        """
        Genera predicciones para un partido específico.
        Si el modelo no está entrenado, usa valores sintéticos calibrados.
        """
        home = features.get("home_team", "unknown")
        away = features.get("away_team", "unknown")

        if not self.is_fitted:
            return self._synthetic_predict(features)

        # Extraer índices
        h_idx = self.team_indices.get(home, 0)
        a_idx = self.team_indices.get(away, 0)
        r_idx = self.referee_indices.get(features.get("referee", ""), 0)

        with self.trace.posterior as p:
            home_adv = float(p["home_adv"].mean())
            atk = p["attack"].mean(dim=["chain", "draw"]).values
            dfs = p["defense"].mean(dim=["chain", "draw"]).values
            gam = p["gamma_attack"].mean(dim=["chain", "draw"]).values
            tht_h = p["theta_home"].mean(dim=["chain", "draw"]).values
            tht_a = p["theta_away"].mean(dim=["chain", "draw"]).values
            rho   = p["rho_ref"].mean(dim=["chain", "draw"]).values
            mu_c_base = float(p["mu_corners_base"].mean())
            mu_k_base = float(p["mu_cards_base"].mean())
            phi_corn  = float(p["alpha_corners"].mean())
            phi_card  = float(p["alpha_cards"].mean())

        lambda_home = np.exp(atk[h_idx] - dfs[a_idx] + home_adv)
        lambda_away = np.exp(atk[a_idx] - dfs[h_idx])
        mu_corners  = np.exp(mu_c_base + gam[h_idx] + gam[a_idx])
        mu_cards    = np.exp(mu_k_base + tht_h[h_idx] + tht_a[a_idx] + rho[r_idx])

        return {
            "lambda_home": float(lambda_home),
            "lambda_away": float(lambda_away),
            "mu_corners":  float(mu_corners),
            "mu_cards":    float(mu_cards),
            "phi_corners": float(phi_corn),
            "phi_cards":   float(phi_card),
            "confidence":  0.78,
        }

    def _synthetic_predict(self, features: Dict) -> Dict[str, Any]:
        """
        Predicciones calibradas para MVP sin datos históricos.
        Usa estadísticas a priori razonables del fútbol europeo.
        """
        p = self._prior_params
        rng = np.random.default_rng(
            hash(f"{features.get('home_team','')}{features.get('away_team','')}") % (2**32)
        )
        noise = rng.normal(0, 0.12, 4)

        elo_diff = features.get("elo_diff", 0)
        home_form = features.get("home_form", 0.5)
        away_form = features.get("away_form", 0.5)

        lambda_home = np.exp(p["home_advantage"] + elo_diff * 0.001 + home_form * 0.3 + noise[0])
        lambda_away = np.exp(-p["home_advantage"] * 0.3 + away_form * 0.3 + noise[1])
        mu_corners  = np.exp(p["corners_base"] + noise[2])
        mu_cards    = np.exp(p["cards_base"]   + noise[3])

        # Clipping a rangos razonables
        lambda_home = float(np.clip(lambda_home, 0.6, 3.5))
        lambda_away = float(np.clip(lambda_away, 0.4, 2.8))
        mu_corners  = float(np.clip(mu_corners,  6.0, 15.0))
        mu_cards    = float(np.clip(mu_cards,    2.0, 8.0))

        return {
            "lambda_home": lambda_home,
            "lambda_away": lambda_away,
            "mu_corners":  mu_corners,
            "mu_cards":    mu_cards,
            "phi_corners": 5.0,
            "phi_cards":   3.0,
            "confidence":  0.70,
        }
