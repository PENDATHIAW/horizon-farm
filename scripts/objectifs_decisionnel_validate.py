#!/usr/bin/env python3
"""Validation des formules décisionnelles Objectifs & Croissance (équivalent Python)."""

from __future__ import annotations


def floor_price(unit_cost: float, min_margin_pct: float = 15.0) -> float:
    return round(unit_cost * (1 + min_margin_pct / 100))


def seasonality_coefficient(month_revenue: float, avg_monthly_revenue: float) -> float:
    if avg_monthly_revenue <= 0:
        return 1.0
    raw = month_revenue / avg_monthly_revenue
    return max(0.85, min(1.25, raw))


def recommended_price(
    unit_cost: float,
    market_price: float,
    seasonality: float,
    min_margin_pct: float = 15.0,
) -> dict:
    floor = floor_price(unit_cost, min_margin_pct)
    adjusted_market = round(market_price * seasonality)
    recommended = max(floor, adjusted_market)
    mispricing = floor > adjusted_market
    return {
        "floor_price": floor,
        "adjusted_market_price": adjusted_market,
        "recommended_price": recommended,
        "mispricing_risk": mispricing,
    }


def laying_rate(eggs: int, live_birds: int, days: int) -> float:
    if live_birds <= 0 or days <= 0:
        return 0.0
    return round((eggs / (live_birds * days)) * 100, 1)


def break_even_ca(fixed_monthly: float, variable_monthly: float, gross_margin_pct: float = 0.35) -> float:
    return round((fixed_monthly + variable_monthly) / max(0.01, gross_margin_pct))


if __name__ == "__main__":
    pricing = recommended_price(unit_cost=550, market_price=2800, seasonality=1.1)
    assert pricing["recommended_price"] == max(pricing["floor_price"], pricing["adjusted_market_price"])
    assert laying_rate(7000, 1000, 7) == 100.0
    assert break_even_ca(500_000, 300_000) == round(800_000 / 0.35)
    print("OK — formules Objectifs & Croissance validées")
