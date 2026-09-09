"""
AI Advisor Module for SchemeMatch AI
Uses Google Gemini API to generate warm, plain-language advisory explanations
based solely on deterministic rule-engine outputs and student profile data.
Includes automatic zero-breakage fallback to rule-based explanation.
"""

import os
import json
import urllib.request
import urllib.error
from typing import Dict, List, Any


def get_gemini_api_key() -> str:
    """Retrieves Gemini API key from environment variables or returns empty string."""
    return os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()


def generate_fallback_explanation(selected_schemes: List[Dict[str, Any]], 
                                  rejected_conflicts: List[Dict[str, Any]], 
                                  profile: Dict[str, Any]) -> str:
    """
    Deterministic rule-based explanation used as an immediate fallback
    when Gemini API is not configured or unavailable.
    """
    if not selected_schemes:
        return (
            f"Hello {profile.get('full_name', 'Student')}, based on your current community category "
            f"({profile.get('community', 'General')}) and annual family income "
            f"(₹{profile.get('annual_income', 0):,}), no direct state welfare schemes matched. "
            f"We recommend checking national schemes or testing alternative criteria in the What-If Simulator."
        )

    selected_names = [s["name"] for s in selected_schemes]
    total_benefit = sum(s.get("benefit_amount", 0) for s in selected_schemes)
    
    explanation = (
        f"Congratulations {profile.get('full_name', 'Student')}! Based on your {profile.get('community', 'General')} community status, "
        f"verified annual family income of ₹{profile.get('annual_income', 0):,}, and {profile.get('course_type', 'UG')} course enrollment, "
        f"you are matched to {', '.join(selected_names)} for an annual benefit of ₹{total_benefit:,}."
    )

    if rejected_conflicts:
        winning = rejected_conflicts[0]
        explanation += (
            f" To ensure your application succeeds without conflicting rejections, our optimizer selected "
            f"'{winning['conflicts_with']}' over '{winning['scheme']['name']}' to give you the highest valid financial support."
        )

    return explanation


def generate_ai_explanation(selected_schemes: List[Dict[str, Any]], 
                            rejected_conflicts: List[Dict[str, Any]], 
                            profile: Dict[str, Any],
                            api_key: str = None) -> Dict[str, Any]:
    """
    Calls Google Gemini API to generate a warm, friendly explanation under 80 words.
    Strictly constrained to the facts from the rule engine and student profile.
    Never alters eligibility, schemes, or benefit calculations.
    """
    active_key = api_key or get_gemini_api_key()

    # If no key is set, immediately use fallback with clear metadata
    if not active_key:
        return {
            "explanation": generate_fallback_explanation(selected_schemes, rejected_conflicts, profile),
            "is_ai_generated": False,
            "provider": "Rule-Based Deterministic Engine"
        }

    # Prepare structured prompt using ONLY facts from the rule engine and profile
    selected_summary = ", ".join([f"{s['name']} (₹{s['benefit_amount']:,})" for s in selected_schemes]) or "No schemes"
    conflicts_summary = ", ".join([f"{c['scheme']['name']} (excluded in favor of {c['conflicts_with']})" for c in rejected_conflicts]) or "None"
    
    prompt = (
        "You are a friendly scholarship advisor for higher education students. "
        "Explain in simple, encouraging language why this student was matched to their recommended scholarship package, "
        "based on their verified profile and conflict resolution facts below.\n\n"
        f"Student Name: {profile.get('full_name', 'Student')}\n"
        f"Community: {profile.get('community')}\n"
        f"Annual Family Income: ₹{profile.get('annual_income', 0):,}\n"
        f"Course: {profile.get('course_type')}\n"
        f"First Generation Graduate: {'Yes' if profile.get('is_first_generation_graduate') else 'No'}\n"
        f"TN Govt School (Class 6-12): {'Yes' if profile.get('studied_in_govt_school_6_to_12') else 'No'}\n"
        f"Selected Schemes: {selected_summary}\n"
        f"Conflicting Schemes Resolved: {conflicts_summary}\n\n"
        "Guidelines:\n"
        "- Keep it under 80 words.\n"
        "- Tone: warm, encouraging, crystal-clear.\n"
        "- Avoid jargon or acronyms.\n"
        "- Mention why the selected scheme benefits them most and why any conflicting scheme was skipped.\n"
        "- Do NOT invent new schemes, dates, or amounts not listed above."
    )

    # Call Gemini REST API directly using Python standard library
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={active_key}"
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 160
        }
    }

    try:
        req = urllib.request.Request(
            api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
            generated_text = (
                result.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            )

            if generated_text:
                return {
                    "explanation": generated_text,
                    "is_ai_generated": True,
                    "provider": "Gemini 1.5 Flash"
                }
    except Exception as err:
        # Graceful fallback on any network error, timeout, or invalid key
        print(f"[AI Advisor] Gemini API call failed: {err}. Using deterministic fallback.")

    return {
        "explanation": generate_fallback_explanation(selected_schemes, rejected_conflicts, profile),
        "is_ai_generated": False,
        "provider": "Rule-Based Deterministic Engine (Fallback)"
    }
