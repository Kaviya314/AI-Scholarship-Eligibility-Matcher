"""
Unit Tests for Rule Engine (backend/rule_engine.py)
"""

import json
import sys
import unittest
from pathlib import Path

# Ensure script directory is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from rule_engine import (
    evaluate_eligibility,
    resolve_conflicts_greedy,
    find_what_if_opportunities,
    generate_document_checklist,
    run_full_matching,
    parse_deadline_status,
)

SCHEMES_FILE = Path(__file__).parent / "schemes.json"

class TestRuleEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SCHEMES_FILE, "r", encoding="utf-8") as f:
            cls.schemes = json.load(f)

    def test_sc_st_post_matric_selection(self):
        profile = {
            "full_name": "Murugan",
            "community": "SC",
            "gender": "Male",
            "annual_income": 180000,
            "course_type": "Engineering",
            "year_of_study": 2,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": False,
        }
        res = run_full_matching(profile, self.schemes)
        selected_ids = [s["id"] for s in res["selected_schemes"]]
        self.assertIn("tn_adw_post_matric_sc_st", selected_ids)
        self.assertEqual(res["total_benefit_amount"], 75000)

    def test_female_govt_school_pudhumai_penn_stacking(self):
        profile = {
            "full_name": "Kavitha",
            "community": "SC",
            "gender": "Female",
            "annual_income": 150000,
            "course_type": "Engineering",
            "year_of_study": 1,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": True,
        }
        res = run_full_matching(profile, self.schemes)
        selected_ids = [s["id"] for s in res["selected_schemes"]]
        # Must select BOTH Post-Matric SC/ST (75,000) AND Pudhumai Penn (12,000) = 87,000!
        self.assertIn("tn_adw_post_matric_sc_st", selected_ids)
        self.assertIn("tn_pudhumai_penn", selected_ids)
        self.assertEqual(res["total_benefit_amount"], 87000)

    def test_male_govt_school_tamil_pudhalvan_stacking(self):
        profile = {
            "full_name": "Dinesh",
            "community": "BC",
            "gender": "Male",
            "annual_income": 180000,
            "course_type": "Arts & Science",
            "year_of_study": 1,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": True,
        }
        res = run_full_matching(profile, self.schemes)
        selected_ids = [s["id"] for s in res["selected_schemes"]]
        self.assertIn("tn_bcmbc_post_matric", selected_ids)
        self.assertIn("tn_tamil_pudhalvan", selected_ids)
        self.assertEqual(res["total_benefit_amount"], 37000)

    def test_conflict_resolution_higher_benefit_wins(self):
        # When SC student has First Gen in Engineering:
        # Post-Matric SC/ST gives ₹75k, First Gen Waiver gives ₹40k, but they exclude each other
        # The greedy engine must pick Post-Matric SC/ST (₹75k) and reject First Gen waiver with reason
        profile = {
            "full_name": "Ravi",
            "community": "SC",
            "gender": "Male",
            "annual_income": 200000,
            "course_type": "Engineering",
            "year_of_study": 1,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": True,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": False,
        }
        res = run_full_matching(profile, self.schemes)
        selected_ids = [s["id"] for s in res["selected_schemes"]]
        self.assertIn("tn_adw_post_matric_sc_st", selected_ids)
        self.assertNotIn("tn_first_gen_tuition_waiver", selected_ids)
        
        # Check rejection log
        rejected_ids = [r["scheme"]["id"] for r in res["rejected_conflicting_schemes"]]
        self.assertIn("tn_first_gen_tuition_waiver", rejected_ids)
        rejection_item = [r for r in res["rejected_conflicting_schemes"] if r["scheme"]["id"] == "tn_first_gen_tuition_waiver"][0]
        self.assertEqual(rejection_item["winning_benefit"], 75000)

    def test_borderline_income_flag(self):
        profile = {
            "full_name": "Senthil",
            "community": "SC",
            "gender": "Male",
            "annual_income": 245000,  # Just 5k below 250k ceiling
            "course_type": "Engineering",
            "year_of_study": 1,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": False,
        }
        res = run_full_matching(profile, self.schemes)
        sc_scheme = [s for s in res["selected_schemes"] if s["id"] == "tn_adw_post_matric_sc_st"][0]
        self.assertTrue(len(sc_scheme["borderline_flags"]) > 0)
        self.assertIn("Borderline Income", sc_scheme["borderline_flags"][0])

    def test_differently_abled_special_scholarship(self):
        profile = {
            "full_name": "Praveen",
            "community": "General",
            "gender": "Male",
            "annual_income": 400000,
            "course_type": "UG",
            "year_of_study": 2,
            "is_differently_abled": True,
            "disability_percent": 50,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": False,
        }
        res = run_full_matching(profile, self.schemes)
        selected_ids = [s["id"] for s in res["selected_schemes"]]
        self.assertIn("tn_differently_abled_scholarship", selected_ids)
        self.assertEqual(res["total_benefit_amount"], 35000)

    def test_no_eligible_schemes_edge_case(self):
        profile = {
            "full_name": "John Doe",
            "community": "General",
            "gender": "Male",
            "annual_income": 900000,
            "course_type": "UG",
            "year_of_study": 1,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": False,  # Non-domicile, high income, general
            "studied_in_govt_school_6_to_12": False,
        }
        res = run_full_matching(profile, self.schemes)
        self.assertEqual(res["status_type"], "NO_SCHEMES_FOUND")
        self.assertEqual(res["total_benefit_amount"], 0)
        self.assertEqual(len(res["selected_schemes"]), 0)

    def test_what_if_near_miss_opportunity(self):
        # Student has income of 260,000 (just 10,000 over 250,000 limit)
        profile = {
            "full_name": "Anitha",
            "community": "SC",
            "gender": "Female",
            "annual_income": 260000,
            "course_type": "Engineering",
            "year_of_study": 1,
            "is_differently_abled": False,
            "disability_percent": 0,
            "is_first_generation_graduate": False,
            "is_tamil_nadu_domicile": True,
            "studied_in_govt_school_6_to_12": False,
        }
        res = run_full_matching(profile, self.schemes)
        opportunities = res["what_if_opportunities"]
        opp_scheme_ids = [o["scheme_id"] for o in opportunities]
        self.assertIn("tn_adw_post_matric_sc_st", opp_scheme_ids)
        sc_opp = [o for o in opportunities if o["scheme_id"] == "tn_adw_post_matric_sc_st"][0]
        self.assertEqual(sc_opp["blocking_field"], "Annual Income")
        self.assertIn("10,000", sc_opp["insight"])

if __name__ == "__main__":
    unittest.main()
