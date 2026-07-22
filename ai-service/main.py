"""
FinPilot AI microservice — FastAPI + scikit-learn.
Run: uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml_engine import build_predictions

app = FastAPI(title="FinPilot AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MonthlyPoint(BaseModel):
    month: str
    income: float = 0.0
    expense: float = 0.0


class GoalIn(BaseModel):
    id: str
    title: str
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0)
    deadline: str


class PredictRequest(BaseModel):
    monthly: list[MonthlyPoint] = []
    goals: list[GoalIn] = []
    category_expenses_90d: list[dict] = []
    income_volatility: float = 0.0
    currency_code: str = 'USD'


@app.get("/health")
def health():
    return {"ok": True, "service": "finpilot-ai"}


@app.post("/predict")
def predict(req: PredictRequest):
    payload = {
        "monthly": [m.model_dump() for m in req.monthly],
        "goals": [g.model_dump() for g in req.goals],
        "category_expenses_90d": req.category_expenses_90d,
        "income_volatility": req.income_volatility,
        "currency_code": req.currency_code,
    }
    return build_predictions(payload)
