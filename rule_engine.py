"""
Rule Engine for AI Scholarship & Government Scheme Eligibility Matcher
Core Capabilities:
1. Multi-Stage Eligibility Filtering
2. Greedy Conflict Resolution & Benefit Optimization
3. Plain-Language Explainability & AI Advisor Engine
4. Borderline & Match Confidence Scoring
5. "What-If" Threshold & Near-Miss Analyzer
6. Aggregated Document Checklist & Deadline Urgency Tracker
"""

import json
from datetime import datetime, date
from typing import Dict, List, Any, Optional, Tuple

from ai_advisor import generate_ai_explanation


def parse_deadline_status(deadline_str: str) -> Dict[str, Any]:
    """
    Computes days remaining and urgency indicator for application deadlines:
    - Red (<15 days remaining)
    - Yellow (<30 days remaining)
    - Green (>=30 days or future)
    """
    try:
        deadline_date = datetime.strptime(deadline_str, "%Y-%m-%d").date()
        today = date(2026, 9, 9)  # Local reference date
        days_remaining = (deadline_date - today).days
        
        if days_remaining < 0:
            urgency = "EXPIRED"
            badge_color = "red"
            label = "Deadline Passed"
        elif days_remaining <= 15:
            urgency = "HIGH"
            badge_color = "red"
            label = f"Urgent: {days_remaining} days left"
        elif days_remaining <= 30:
            urgency = "MEDIUM"
            badge_color = "amber"
            label = f"Closing Soon: {days_remaining} days left"
        else:
            urgency = "LOW"
            badge_color = "emerald"
            label = f"{days_remaining} days left"

        return {
            "deadline": deadline_str,
            "days_remaining": days_remaining,
            "urgency": urgency,
            "badge_color": badge_color,
            "label": label,
        }
    except Exception:
        return {
            "deadline": deadline_str,
            "days_remaining": 60,
            "urgency": "LOW",
            "badge_color": "emerald",
            "label": f"Deadline: {deadline_str}",
        }


def check_course_match(scheme_courses: Any, student_course: str) -> Tuple[bool, str]:
    if scheme_courses == "any" or not scheme_courses:
        return True, "Course meets general eligibility criteria."

    # Normalization & hierarchy:
    # If student is in Engineering or Medical, they are also pursuing Undergrad/Professional
    c_lower = student_course.lower()
    allowed = [c.lower() for c in scheme_courses]
    
    # Direct match
    if c_lower in allowed:
        return True, f"Course '{student_course}' matches eligible course list."
    
    # Hierarchical mappings
    if "ug" in allowed and c_lower in ["engineering", "medical", "arts & science", "ug"]:
        return True, f"Undergraduate degree level accepted for {student_course}."
    
    return False, f"Course '{student_course}' is not eligible (required: {', '.join(scheme_courses)})."


def evaluate_eligibility(scheme: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates profile against a single scheme.
    Returns:
      eligible: bool
      passed_criteria: list of dicts
      failed_criteria: list of dicts
      match_score: int (0 to 100)
      borderline_flags: list of str
    """
    passed = []
    failed = []
    borderline_flags = []
    total_criteria = 0
    passed_count = 0

    elig = scheme.get("eligibility", {})

    # 1. State Domicile
    if elig.get("state_domicile_required"):
        total_criteria += 1
        if profile.get("is_tamil_nadu_domicile", False):
            passed_count += 1
            passed.append({
                "field": "Domicile",
                "detail": "Verified Tamil Nadu domicile status."
            })
        else:
            failed.append({
                "field": "Domicile",
                "detail": "Requires permanent Tamil Nadu domicile/residence."
            })

    # 2. Community
    req_comm = elig.get("community")
    if req_comm and req_comm != "any":
        total_criteria += 1
        student_comm = profile.get("community", "").upper()
        if student_comm in [c.upper() for c in req_comm]:
            passed_count += 1
            passed.append({
                "field": "Community",
                "detail": f"Community '{student_comm}' matches target group ({', '.join(req_comm)})."
            })
        else:
            failed.append({
                "field": "Community",
                "detail": f"Reserved for {', '.join(req_comm)} (Your category: {student_comm or 'Not Specified'})."
            })

    # 3. Income Limit
    max_income = elig.get("max_income")
    if max_income is not None:
        total_criteria += 1
        student_income = profile.get("annual_income", 0)
        if student_income <= max_income:
            passed_count += 1
            passed.append({
                "field": "Annual Income",
                "detail": f"Income of ₹{student_income:,} is within the ₹{max_income:,} ceiling."
            })
            # Check borderline (within 10% or ₹25,000 of cutoff)
            margin = max_income - student_income
            threshold_margin = min(max_income * 0.10, 25000)
            if margin <= threshold_margin:
                borderline_flags.append(
                    f"Borderline Income: Your annual income (₹{student_income:,}) is close to the ₹{max_income:,} cutoff. Ensure your latest Revenue Tahsildar income certificate is verified."
                )
        else:
            diff = student_income - max_income
            failed.append({
                "field": "Annual Income",
                "detail": f"Annual income of ₹{student_income:,} exceeds the ₹{max_income:,} ceiling by ₹{diff:,}."
            })

    # 4. Gender
    req_gender = elig.get("gender")
    if req_gender and req_gender != "any":
        total_criteria += 1
        student_gender = profile.get("gender", "").capitalize()
        if student_gender in req_gender:
            passed_count += 1
            passed.append({
                "field": "Gender",
                "detail": f"Gender '{student_gender}' fulfills scheme criteria."
            })
        else:
            failed.append({
                "field": "Gender",
                "detail": f"Restricted to {', '.join(req_gender)} applicants."
            })

    # 5. Course Type
    req_courses = elig.get("course_type")
    if req_courses and req_courses != "any":
        total_criteria += 1
        student_course = profile.get("course_type", "")
        c_match, c_desc = check_course_match(req_courses, student_course)
        if c_match:
            passed_count += 1
            passed.append({
                "field": "Course Level",
                "detail": c_desc
            })
        else:
            failed.append({
                "field": "Course Level",
                "detail": c_desc
            })

    # 6. Disability
    min_dis = elig.get("min_disability_percent")
    if min_dis is not None:
        total_criteria += 1
        student_is_dis = profile.get("is_differently_abled", False)
        student_dis_pct = profile.get("disability_percent", 0) if student_is_dis else 0
        if student_is_dis and student_dis_pct >= min_dis:
            passed_count += 1
            passed.append({
                "field": "Disability Benchmark",
                "detail": f"Disability percentage ({student_dis_pct}%) meets minimum requirement of {min_dis}%."
            })
        else:
            if not student_is_dis:
                failed.append({
                    "field": "Disability Status",
                    "detail": "Requires certified differently-abled status (UDID/National ID)."
                })
            else:
                failed.append({
                    "field": "Disability Percentage",
                    "detail": f"Certified at {student_dis_pct}%, but scheme requires minimum {min_dis}%."
                })

    # 7. First Generation Graduate
    fg_req = elig.get("first_generation_graduate")
    if fg_req is not None:
        total_criteria += 1
        student_fg = profile.get("is_first_generation_graduate", False)
        if student_fg == fg_req:
            passed_count += 1
            passed.append({
                "field": "First Generation Graduate",
                "detail": "Verified First Generation Graduate in family."
            })
        else:
            failed.append({
                "field": "First Generation Graduate",
                "detail": "Requires certified First Generation Graduate status."
            })

    # 8. Govt School Studied (Class 6-12)
    govt_school_req = elig.get("govt_school_studied")
    if govt_school_req is not None:
        total_criteria += 1
        student_govt_school = profile.get("studied_in_govt_school_6_to_12", False)
        if student_govt_school == govt_school_req:
            passed_count += 1
            passed.append({
                "field": "Tamil Nadu Govt School",
                "detail": "Studied in Tamil Nadu Government School from Class 6 to 12."
            })
        else:
            failed.append({
                "field": "Tamil Nadu Govt School",
                "detail": "Requires completion of Class 6 through 12 in Tamil Nadu Government Schools."
            })

    # 9. Merit Student / Board Exam Topper
    if elig.get("merit_student_required"):
        total_criteria += 1
        if profile.get("is_merit_student", False):
            passed_count += 1
            passed.append({
                "field": "Merit / Rank Qualification",
                "detail": "Verified qualifying top rank / merit candidate."
            })
        else:
            failed.append({
                "field": "Merit / Rank Qualification",
                "detail": "Requires certified district/state topper rank or high percentile merit standing."
            })

    # 10. Hostel Resident
    if elig.get("hostel_resident_required"):
        total_criteria += 1
        if profile.get("is_hostel_resident", False):
            passed_count += 1
            passed.append({
                "field": "College Hostel Resident",
                "detail": "Verified recognized collegiate hostel resident."
            })
        else:
            failed.append({
                "field": "College Hostel Resident",
                "detail": "Requires recognized college hostel residency certificate."
            })

    # 11. Farmer Social Security Card Holder
    if elig.get("farmer_card_holder_required"):
        total_criteria += 1
        if profile.get("is_farmer_card_holder", False):
            passed_count += 1
            passed.append({
                "field": "Farmers Welfare Card",
                "detail": "Verified active Uzhavar Pathukappu Thittam cardholder family."
            })
        else:
            failed.append({
                "field": "Farmers Welfare Card",
                "detail": "Requires Uzhavar Pathukappu Thittam (Farmers Social Security) card membership."
            })

    # 12. Religious Minority Community
    if elig.get("minority_community_required"):
        total_criteria += 1
        if profile.get("is_minority_community", False):
            passed_count += 1
            passed.append({
                "field": "Religious Minority",
                "detail": "Verified member of notified religious minority community."
            })
        else:
            failed.append({
                "field": "Religious Minority",
                "detail": "Requires membership in notified religious minority community (Muslim, Christian, Jain, Buddhist, Sikh, Parsi)."
            })

    is_eligible = len(failed) == 0

    # Calculate Confidence / Match Score
    if is_eligible:
        # Base score 95-99% based on safety margin from income threshold
        max_inc = elig.get("max_income")
        if max_inc and profile.get("annual_income"):
            ratio = profile.get("annual_income", 0) / max_inc
            if ratio < 0.7:
                match_score = 98
            elif ratio < 0.9:
                match_score = 95
            else:
                match_score = 90
        else:
            match_score = 98
    else:
        # Partial match percentage
        match_score = int((passed_count / max(1, total_criteria)) * 75)

    return {
        "eligible": is_eligible,
        "passed_criteria": passed,
        "failed_criteria": failed,
        "match_score": match_score,
        "borderline_flags": borderline_flags,
        "failed_count": len(failed),
    }


def resolve_conflicts_greedy(eligible_schemes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Greedy Optimization Algorithm:
    - Sort eligible schemes descending by (benefit_amount * priority_weight).
    - Select non-conflicting schemes greedily.
    - Track pairwise mutual exclusions in 'excludes'.
    - Output selected combination and detailed conflict rejection logs.
    """
    # Sort schemes by weighted benefit
    sorted_schemes = sorted(
        eligible_schemes,
        key=lambda s: s["benefit_amount"] * s.get("priority_weight", 1),
        reverse=True
    )

    selected: List[Dict[str, Any]] = []
    rejected_due_to_conflict: List[Dict[str, Any]] = []
    selected_ids = set()
    all_excluded_ids = set()

    for scheme in sorted_schemes:
        sid = scheme["id"]
        scheme_excludes = set(scheme.get("excludes", []))

        # Check if this scheme is excluded by any previously selected scheme,
        # or if this scheme excludes any previously selected scheme
        conflicts_with = []
        for sel in selected:
            sel_id = sel["id"]
            sel_excludes = set(sel.get("excludes", []))
            if sid in sel_excludes or sel_id in scheme_excludes:
                conflicts_with.append(sel)

        if not conflicts_with:
            selected.append(scheme)
            selected_ids.add(sid)
            all_excluded_ids.update(scheme_excludes)
        else:
            # Conflicted out by higher-value winning scheme
            winning_scheme = conflicts_with[0]
            rejected_due_to_conflict.append({
                "scheme": scheme,
                "conflicts_with": winning_scheme["name"],
                "conflicts_with_id": winning_scheme["id"],
                "winning_benefit": winning_scheme["benefit_amount"],
                "scheme_benefit": scheme["benefit_amount"],
                "reason": (
                    f"Mutually exclusive with higher-priority '{winning_scheme['name']}'. "
                    f"Our optimizer selected '{winning_scheme['name']}' (₹{winning_scheme['benefit_amount']:,}) "
                    f"over this scheme (₹{scheme['benefit_amount']:,}) to maximize your net benefit."
                )
            })

    total_benefit = sum(s["benefit_amount"] for s in selected)

    return {
        "selected": selected,
        "rejected_due_to_conflict": rejected_due_to_conflict,
        "total_benefit": total_benefit,
    }


def find_what_if_opportunities(all_schemes: List[Dict[str, Any]], profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Analyzes 'near-miss' schemes: schemes where exactly ONE criteria failed.
    Computes precise delta (e.g. Income reduction, obtaining First-Gen certificate).
    """
    opportunities = []

    for scheme in all_schemes:
        eval_result = evaluate_eligibility(scheme, profile)
        if eval_result["failed_count"] == 1:
            failed_item = eval_result["failed_criteria"][0]
            field = failed_item["field"]
            
            opportunity = {
                "scheme_id": scheme["id"],
                "scheme_name": scheme["name"],
                "department": scheme["department"],
                "potential_benefit": scheme["benefit_amount"],
                "blocking_field": field,
                "insight": "",
                "actionable_suggestion": ""
            }

            if field == "Annual Income":
                max_income = scheme["eligibility"]["max_income"]
                current_inc = profile.get("annual_income", 0)
                diff = current_inc - max_income
                opportunity["insight"] = (
                    f"If your family income was ₹{diff:,} lower (≤ ₹{max_income:,}), "
                    f"you would unlock '{scheme['name']}' granting an additional ₹{scheme['benefit_amount']:,}/year."
                )
                opportunity["actionable_suggestion"] = "Review family gross vs net deductions on revenue certificate."

            elif field == "First Generation Graduate":
                opportunity["insight"] = (
                    f"By obtaining a certified First Generation Graduate certificate from the Tahsildar, "
                    f"you could qualify for '{scheme['name']}' with ₹{scheme['benefit_amount']:,} benefit."
                )
                opportunity["actionable_suggestion"] = "Apply for First Graduate Certificate via Tamil Nadu e-Sevai portal."

            elif field == "Tamil Nadu Govt School":
                opportunity["insight"] = (
                    f"Requires having studied Classes 6 to 12 in a Tamil Nadu Government school."
                )
                opportunity["actionable_suggestion"] = "Applicable for students who completed schooling in state govt institutions."

            elif field == "Course Level":
                opportunity["insight"] = (
                    f"This scheme is tailored specifically for {', '.join(scheme['eligibility'].get('course_type', []))}."
                )
                opportunity["actionable_suggestion"] = "Keep in mind if considering lateral entry or postgraduate studies."

            opportunities.append(opportunity)

    return opportunities


def generate_document_checklist(selected_schemes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates unified, deduplicated document checklist for all selected schemes.
    """
    doc_map: Dict[str, List[str]] = {}

    for scheme in selected_schemes:
        for doc in scheme.get("required_documents", []):
            if doc not in doc_map:
                doc_map[doc] = []
            doc_map[doc].append(scheme["name"])

    checklist = []
    for doc, schemes in doc_map.items():
        checklist.append({
            "document_name": doc,
            "required_for": schemes,
            "mandatory": True,
            "issuing_authority": (
                "Revenue Department / e-Sevai" if "Income" in doc or "Community" in doc or "First" in doc or "Nativity" in doc
                else "College Head / Registrar" if "Bonafide" in doc or "Allotment" in doc
                else "National Portal / Hospital Board" if "UDID" in doc or "Medical" in doc
                else "Bank / UIDAI"
            )
        })

    return checklist


def run_full_matching(profile: Dict[str, Any], schemes_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main orchestration function for rule engine:
    1. Stage A: Filter all eligible schemes with criteria evaluation & match scores.
    2. Stage B: Greedy conflict resolution to build optimal non-conflicting package.
    3. Stage C: Explainability breakdown for selected and rejected schemes.
    4. Stage D: What-if opportunity identification.
    5. Stage E: Unified document checklist and deadline urgency calculation.
    """
    eligible_schemes = []
    ineligible_schemes = []

    for scheme in schemes_data:
        eval_res = evaluate_eligibility(scheme, profile)
        scheme_copy = dict(scheme)
        scheme_copy["match_score"] = eval_res["match_score"]
        scheme_copy["passed_criteria"] = eval_res["passed_criteria"]
        scheme_copy["failed_criteria"] = eval_res["failed_criteria"]
        scheme_copy["borderline_flags"] = eval_res["borderline_flags"]
        scheme_copy["deadline_info"] = parse_deadline_status(scheme.get("application_deadline", "2026-11-30"))

        if eval_res["eligible"]:
            eligible_schemes.append(scheme_copy)
        else:
            ineligible_schemes.append(scheme_copy)

    # Stage B: Greedy Conflict Resolution
    if not eligible_schemes:
        # Edge Case 1: No eligible schemes
        conflict_result = {
            "selected": [],
            "rejected_due_to_conflict": [],
            "total_benefit": 0,
        }
        status_type = "NO_SCHEMES_FOUND"
        recommendation_headline = "No Direct Matches Found in Current Scheme Database"
        recommendation_summary = (
            "Based on your profile, you do not currently meet the eligibility criteria for standard state welfare quotas. "
            "Consider exploring general education loan subsidies or testing alternative criteria in the What-If Simulator below."
        )
    elif len(eligible_schemes) == 1:
        # Edge Case 2: Only one scheme
        conflict_result = {
            "selected": eligible_schemes,
            "rejected_due_to_conflict": [],
            "total_benefit": eligible_schemes[0]["benefit_amount"],
        }
        status_type = "SINGLE_OPTIMAL_SCHEME"
        recommendation_headline = f"1 Best-Fit Scheme Recommended: ₹{eligible_schemes[0]['benefit_amount']:,}/yr"
        recommendation_summary = (
            f"You qualify cleanly for {eligible_schemes[0]['name']} without any mutual exclusivity conflicts."
        )
    else:
        # Stage B: Greedy multi-scheme resolution
        conflict_result = resolve_conflicts_greedy(eligible_schemes)
        selected_count = len(conflict_result["selected"])
        status_type = "OPTIMAL_MULTI_SCHEME_PACKAGE"
        recommendation_headline = (
            f"Optimal Combination: {selected_count} Schemes Selected — Total Benefit: ₹{conflict_result['total_benefit']:,}/year"
        )
        recommendation_summary = (
            f"Our optimization engine selected {selected_count} compatible schemes, "
            f"maximizing your total financial grant while eliminating rejection risk from conflicting applications."
        )

    # Unified Document Checklist & Deadlines
    doc_checklist = generate_document_checklist(conflict_result["selected"])
    
    # Near-miss What-If opportunities
    what_if_opportunities = find_what_if_opportunities(schemes_data, profile)

    # Generate AI explanation advisory (with automatic rule-based fallback)
    ai_advisory = generate_ai_explanation(
        conflict_result["selected"],
        conflict_result["rejected_due_to_conflict"],
        profile
    )

    return {
        "status_type": status_type,
        "recommendation_headline": recommendation_headline,
        "recommendation_summary": recommendation_summary,
        "total_benefit_amount": conflict_result["total_benefit"],
        "selected_schemes": conflict_result["selected"],
        "rejected_conflicting_schemes": conflict_result["rejected_due_to_conflict"],
        "ineligible_schemes": ineligible_schemes,
        "document_checklist": doc_checklist,
        "what_if_opportunities": what_if_opportunities,
        "ai_advisory": ai_advisory,
        "student_profile": profile,
        "evaluated_at": datetime.now().isoformat(),
    }
