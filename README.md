# SchemeMatch AI — AI Scholarship & Government Scheme Eligibility Matcher

A professional full-stack SaaS decision-support system designed for students in Tamil Nadu. SchemeMatch AI automates multi-factor eligibility verification, resolves mutually exclusive scheme conflicts via greedy optimization, maximizes total financial benefits, provides real-time drag-and-drop document upload with client-side validation, and generates natural-language explanations powered by the Google Gemini API.

---

## Key Features

1. **Professional SaaS Dashboard Layout**:
   - Fixed left sidebar navigation: Home / New Check, My Profile, Results, Document Checklist, and Deadlines.
   - Dynamic top bar with breadcrumbs, active student summary chip, and form completion tracking.
   - Modern fintech/edtech aesthetic with soft shadows, generous whitespace, rounded cards, and responsive mobile collapse.

2. **Multi-Factor Student Profile Evaluation**:
   - Community Category (SC, ST, BC, MBC, DNC, General)
   - Annual Family Income (with synced visual slider and threshold alerts)
   - Gender (Female, Male, Other)
   - Course Level (Engineering, Medical, Arts & Science, Diploma, PG, ITI)
   - First Generation Graduate status
   - State Government School (Class 6-12) education for direct benefit transfer schemes
   - Differently Abled Status (UDID certification + percentage slider)
   - Specialized welfare attributes (College hostel resident, Board exam merit topper, Farmer social security card holder, Notified religious minority)
   - One-click **Demo Personas** for instant testing.

3. **Authentic Scheme Database (`backend/schemes.json`)**:
   - 15 realistic higher education welfare programs with department metadata, eligibility parameters, exclusion matrices, deadlines, and required document checklists.

4. **Multi-Stage Greedy Optimization & Conflict Resolution (`backend/rule_engine.py`)**:
   - **Stage A: Eligibility Filter**: Deterministically evaluates student profile against scheme rules.
   - **Stage B: Greedy Conflict Solver**: Sorts eligible schemes by weighted benefit ($\text{benefit} \times \text{priority}$) and greedily selects compatible schemes while strictly respecting bidirectional exclusions.
   - **Stage C: Proactive Conflict Prevention**: Details why lower-value conflicting schemes were excluded (naming the winning scheme and monetary difference).
   - **Stage D: Confidence & Borderline Scoring**: Computes fit score (e.g. 98%) and warns if family income is within 10% of cutoff limits.

5. **AI-Powered Advisory Explanations (Google Gemini API Layer)**:
   - Evaluated results and profile facts are synthesized into a friendly, plain-language advisory explanation under 80 words.
   - Features client-side loading shimmer/skeleton and a distinct **"✨ AI-generated"** badge.
   - Server-side API key protection with automatic, seamless fallback to the deterministic rule engine explanation if no key is configured or if the request times out.

6. **Real-Time Document File Upload & Verification**:
   - Supports drag-and-drop or file picker upload for all required certificates (Income, Community, Bonafide, Passbook, Aadhaar, Disability).
   - Accepted formats: `.pdf`, `.jpg`, `.jpeg`, `.png` (Max 5MB per file).
   - Instant file validation with size and format error alerts.
   - Upload states: *Not uploaded* (grey), *Uploading...* (progress bar), *Uploaded* (green check with thumbnail/icon, filename, file size, Replace, and Delete actions).
   - Overall progress bar tracking document completion.
   - Prominent success banner: *"All documents ready — you can proceed to apply"* when all required certificates are uploaded.

7. **Live "What-If" Eligibility Simulator**:
   - Interactive slider for annual income and toggles for first-generation and government school backgrounds.
   - Real-time simulation API calls showing instantaneous financial impact.
   - Near-miss opportunity detection (e.g., "If income was ₹10,000 lower, you would unlock an additional ₹75,000/yr").

8. **Application Deadlines & Timeline Tracker**:
   - Visual urgency indicators (<15 days RED with pulse, <30 days AMBER, 30+ days GREEN).

---

## Project Structure

```
AI SCALORSHIP/
├── backend/
│   ├── schemes.json            # 15 Verified Tamil Nadu schemes database
│   ├── rule_engine.py          # Core deterministic rule engine & greedy solver
│   ├── ai_advisor.py           # Gemini API integration & fallback explanation
│   ├── server.py               # Zero-dependency Python HTTP server (API + Static)
│   ├── main.py                 # FastAPI application with Pydantic validation
│   ├── test_rule_engine.py     # Automated unit tests for rule engine
│   ├── test_ai_advisor.py      # Automated unit tests for AI explanation layer
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   ├── index.html              # Modern responsive Tailwind CSS container
│   ├── app.js                  # React SPA dashboard with real file upload & AI advisory
│   ├── package.json            # Frontend package configuration
│   ├── vite.config.js          # Vite configuration with API proxy
│   └── src/
│       ├── App.jsx             # React component source
│       ├── main.jsx            # React entrypoint
│       └── index.css           # Tailwind styles
└── README.md                   # Complete documentation
```

---

## Quick Start (Run Locally)

### Option 1: Standalone Server (Zero-Dependency)

1. **Start the Server**:
   ```bash
   python backend/server.py
   ```
   *Runs at `http://127.0.0.1:8000` with both API endpoints and the dashboard served simultaneously.*

2. **Open the Dashboard**:
   Visit in your browser:
   ```
   http://127.0.0.1:8000
   ```

---

### Option 2: Running with FastAPI & Vite

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

2. **Frontend (Vite)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Visit: `http://localhost:5173`

---

## Configuring the Gemini API (Optional)

To enable live Gemini AI-generated explanations, set your API key in your environment before starting the server:

```powershell
$env:GEMINI_API_KEY = "your_google_gemini_api_key_here"
python backend/server.py
```

*Note: If no API key is provided, SchemeMatch AI automatically and gracefully falls back to the deterministic rule-engine explanation without any errors or disruption.*

---

## Automated Test Suites

Run both unit test suites:
```bash
python backend/test_rule_engine.py
python backend/test_ai_advisor.py
```
Both test suites run in under 0.01 seconds and verify:
- Eligibility filtering across all 15 schemes
- Greedy conflict resolution ensuring maximum valid benefits
- Pudhumai Penn / Tamil Pudhalvan multi-scheme stacking
- Borderline income alerts (<10% threshold)
- Fallback explanation generation and API structure
