"""
Unit Tests for AI Advisor Module (backend/ai_advisor.py)
"""

import sys
import unittest
from pathlib import Path

# Ensure script directory is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from ai_advisor import generate_ai_explanation, generate_fallback_explanation

class TestAIAdvisor(unittest.TestCase):
    def setUp(self):
        self.sample_profile = {
            "full_name": "Selvi M.",
            "community": "SC",
            "gender": "Female",
            "annual_income": 140000,
            "course_type": "Engineering",
            "year_of_study": 1,
            "is_first_generation_graduate": True,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": True,
        }
        self.selected_schemes = [
            {
                "id": "tn_adw_post_matric_sc_st",
                "name": "Post-Matric Scholarship for SC/ST Students",
                "benefit_amount": 75000,
            },
            {
                "id": "tn_pudhumai_penn",
                "name": "Moovalur Ramamirtham Ammaiyar Higher Education Assurance Scheme (Pudhumai Penn)",
                "benefit_amount": 12000,
            }
        ]
        self.rejected_conflicts = [
            {
                "scheme": {
                    "id": "tn_first_gen_tuition_waiver",
                    "name": "First Generation Graduate Tuition Fee Concession Scheme",
                    "benefit_amount": 40000,
                },
                "conflicts_with": "Post-Matric Scholarship for SC/ST Students",
                "winning_benefit": 75000,
                "scheme_benefit": 40000,
                "reason": "Mutually exclusive with higher-benefit Post-Matric Scholarship"
            }
        ]

    def test_fallback_explanation_generation(self):
        text = generate_fallback_explanation(
            self.selected_schemes,
            self.rejected_conflicts,
            self.sample_profile
        )
        self.assertIn("Selvi M.", text)
        self.assertIn("Post-Matric Scholarship for SC/ST Students", text)
        self.assertIn("87,000", text)
        self.assertIn("First Generation Graduate Tuition Fee Concession Scheme", text)

    def test_graceful_fallback_when_no_api_key(self):
        # Empty API key should return valid dictionary without error
        res = generate_ai_explanation(
            self.selected_schemes,
            self.rejected_conflicts,
            self.sample_profile,
            api_key=""
        )
        self.assertIsInstance(res, dict)
        self.assertIn("explanation", res)
        self.assertFalse(res["is_ai_generated"])
        self.assertIn("Rule-Based", res["provider"])
        self.assertTrue(len(res["explanation"]) > 20)

    def test_no_selected_schemes_fallback(self):
        text = generate_fallback_explanation([], [], self.sample_profile)
        self.assertIn("Selvi M.", text)
        self.assertIn("no direct state welfare schemes matched", text)

if __name__ == "__main__":
    unittest.main()
