"""
FastAPI Application for SchemeMatch AI — AI Scholarship & Government Scheme Eligibility Matcher
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rule_engine import run_full_matching
from ai_advisor import generate_ai_explanation

app = FastAPI(
    title="SchemeMatch AI",
    description="AI Scholarship & Government Scheme Eligibility Matcher API for Tamil Nadu students",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMES_FILE = Path(__file__).parent / "schemes.json"

def load_schemes():
    if not SCHEMES_FILE.exists():
        raise FileNotFoundError(f"Schemes database not found at {SCHEMES_FILE}")
    with open(SCHEMES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Request Models
class StudentProfileInput(BaseModel):
    full_name: str = Field(default="Student", description="Full Name of the student")
    community: str = Field(..., description="Community: SC, ST, BC, MBC, DNC, General")
    gender: str = Field(..., description="Gender: Male, Female, Other")
    annual_income: int = Field(..., ge=0, description="Annual Family Income in INR")
    course_type: str = Field(..., description="UG, PG, Engineering, Medical, Diploma, Arts & Science, ITI")
    year_of_study: int = Field(default=1, ge=1, le=6, description="Year of study (1 to 6)")
    is_differently_abled: bool = Field(default=False, description="Whether student is differently abled")
    disability_percent: Optional[int] = Field(default=0, ge=0, le=100, description="Disability percentage if applicable")
    is_first_generation_graduate: bool = Field(default=False, description="First generation graduate in family")
    is_tamil_nadu_domicile: bool = Field(default=True, description="Tamil Nadu domicile status")
    studied_in_govt_school_6_to_12: bool = Field(default=False, description="Studied 6th to 12th in TN Govt school")
    is_merit_student: bool = Field(default=False, description="Top ranker or state/district board exam merit achiever")
    is_hostel_resident: bool = Field(default=False, description="Residing in recognized college hostel")
    is_farmer_card_holder: bool = Field(default=False, description="Registered under Tamil Nadu Farmers Social Security Scheme")
    is_minority_community: bool = Field(default=False, description="Belongs to notified religious minority community")

class AIExplainInput(BaseModel):
    selected_schemes: List[Dict[str, Any]] = Field(default_factory=list)
    rejected_conflicting_schemes: List[Dict[str, Any]] = Field(default_factory=list)
    student_profile: Dict[str, Any] = Field(default_factory=dict)


@app.get("/")
def root():
    return {
        "name": "SchemeMatch AI",
        "service": "AI Scholarship & Government Scheme Eligibility Matcher API",
        "status": "online",
        "endpoints": {
            "match": "/api/match [POST]",
            "simulate": "/api/simulate [POST]",
            "ai_explain": "/api/ai-explain [POST]",
            "schemes": "/api/schemes [GET]",
            "health": "/api/health [GET]"
        }
    }


@app.get("/api/health")
def health_check():
    schemes = load_schemes()
    return {
        "status": "healthy",
        "schemes_loaded": len(schemes),
        "service": "SchemeMatch AI Backend"
    }


@app.post("/api/ai-explain")
def get_ai_explanation(payload: AIExplainInput):
    """
    Generates AI-powered explanation via Gemini API with deterministic fallback.
    """
    ai_res = generate_ai_explanation(
        payload.selected_schemes,
        payload.rejected_conflicting_schemes,
        payload.student_profile
    )
    return ai_res


@app.get("/api/schemes")
def get_all_schemes():
    """Returns full catalog of Tamil Nadu government schemes"""
    schemes = load_schemes()
    return {
        "total_schemes": len(schemes),
        "schemes": schemes
    }


@app.post("/api/match")
def match_scholarships(profile: StudentProfileInput):
    """
    Core Recommendation Engine:
    1. Evaluates all eligibility conditions
    2. Runs greedy conflict resolution across mutual exclusions
    3. Provides plain-language explainability and confidence scoring
    4. Auto-generates unified document checklist and deadline indicators
    5. Identifies near-miss what-if opportunities
    """
    schemes = load_schemes()
    profile_dict = profile.model_dump()
    result = run_full_matching(profile_dict, schemes)
    return result


@app.post("/api/simulate")
def simulate_what_if(profile: StudentProfileInput):
    """
    High-speed simulation endpoint for live What-If sliders & toggles
    """
    schemes = load_schemes()
    profile_dict = profile.model_dump()
    result = run_full_matching(profile_dict, schemes)
    return {
        "total_benefit": result["total_benefit_amount"],
        "selected_schemes_count": len(result["selected_schemes"]),
        "selected_schemes": [
            {
                "id": s["id"],
                "name": s["name"],
                "benefit_amount": s["benefit_amount"],
                "department": s["department"],
                "match_score": s["match_score"],
            }
            for s in result["selected_schemes"]
        ],
        "rejected_conflicts_count": len(result["rejected_conflicting_schemes"]),
        "what_if_opportunities": result["what_if_opportunities"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
