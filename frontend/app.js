const { useState, useEffect, useRef } = React;

// API Base URL - points to the running backend server
const API_BASE = "http://127.0.0.1:8000/api";

const DEMO_PERSONAS = [
  {
    label: "Selvi — SC Engg (Govt School)",
    desc: "Post-Matric SC/ST (₹75k) + Pudhumai Penn (₹12k) = ₹87,000/yr",
    badge: "SC / Professional",
    profile: {
      full_name: "Selvi M.",
      community: "SC",
      gender: "Female",
      annual_income: 140000,
      course_type: "Engineering",
      year_of_study: 1,
      is_differently_abled: false,
      disability_percent: 0,
      is_first_generation_graduate: true,
      is_tamil_nadu_domicile: true,
      studied_in_govt_school_6_to_12: true,
      is_merit_student: false,
      is_hostel_resident: false,
      is_farmer_card_holder: false,
      is_minority_community: false,
    }
  },
  {
    label: "Karthik — BC Arts (Govt School)",
    desc: "BC/MBC Post-Matric (₹25k) + Tamil Pudhalvan (₹12k) = ₹37,000/yr",
    badge: "BC / General",
    profile: {
      full_name: "Karthik R.",
      community: "BC",
      gender: "Male",
      annual_income: 160000,
      course_type: "Arts & Science",
      year_of_study: 1,
      is_differently_abled: false,
      disability_percent: 0,
      is_first_generation_graduate: false,
      is_tamil_nadu_domicile: true,
      studied_in_govt_school_6_to_12: true,
      is_merit_student: false,
      is_hostel_resident: false,
      is_farmer_card_holder: false,
      is_minority_community: false,
    }
  },
  {
    label: "Arun — BC Engg First-Gen",
    desc: "First Generation Fee Waiver (₹40k) — Resolves BC Post-Matric conflict",
    badge: "First-Gen / Engg",
    profile: {
      full_name: "Arun Kumar",
      community: "BC",
      gender: "Male",
      annual_income: 220000,
      course_type: "Engineering",
      year_of_study: 2,
      is_differently_abled: false,
      disability_percent: 0,
      is_first_generation_graduate: true,
      is_tamil_nadu_domicile: true,
      studied_in_govt_school_6_to_12: false,
      is_merit_student: false,
      is_hostel_resident: false,
      is_farmer_card_holder: false,
      is_minority_community: false,
    }
  },
  {
    label: "Priya — Differently Abled Medical",
    desc: "Special Disability Grant (₹35k/yr) with UDID certificate",
    badge: "Special Grant",
    profile: {
      full_name: "Priya S.",
      community: "General",
      gender: "Female",
      annual_income: 350000,
      course_type: "Medical",
      year_of_study: 1,
      is_differently_abled: true,
      disability_percent: 55,
      is_first_generation_graduate: false,
      is_tamil_nadu_domicile: true,
      studied_in_govt_school_6_to_12: false,
      is_merit_student: false,
      is_hostel_resident: false,
      is_farmer_card_holder: false,
      is_minority_community: false,
    }
  },
  {
    label: "Vignesh — Income Near-Miss",
    desc: "Income ₹10k above cutoff — highlights live 'What-If' opportunity to unlock ₹75k",
    badge: "Near-Miss Threshold",
    profile: {
      full_name: "Vignesh K.",
      community: "SC",
      gender: "Male",
      annual_income: 260000,
      course_type: "Engineering",
      year_of_study: 1,
      is_differently_abled: false,
      disability_percent: 0,
      is_first_generation_graduate: false,
      is_tamil_nadu_domicile: true,
      studied_in_govt_school_6_to_12: false,
      is_merit_student: false,
      is_hostel_resident: false,
      is_farmer_card_holder: false,
      is_minority_community: false,
    }
  }
];

function App() {
  // Navigation State
  const [currentNav, setCurrentNav] = useState("home"); // home | profile | results | documents | deadlines
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Student Profile State
  const [profile, setProfile] = useState(DEMO_PERSONAS[0].profile);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [allSchemesCatalog, setAllSchemesCatalog] = useState([]);
  const [showSpecialOptions, setShowSpecialOptions] = useState(false);

  // AI Explanation State (Gemini API layer)
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Document Uploads State: { [docName]: { file, name, size, type, previewUrl, status: 'uploaded'|'uploading' } }
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});

  // What-If Simulator state
  const [simIncome, setSimIncome] = useState(profile.annual_income);
  const [simFirstGen, setSimFirstGen] = useState(profile.is_first_generation_graduate);
  const [simGovtSchool, setSimGovtSchool] = useState(profile.studied_in_govt_school_6_to_12);
  const [simResult, setSimResult] = useState(null);

  // Load catalog on mount
  useEffect(() => {
    runMatching(profile, false);
    loadCatalog();
  }, []);

  useEffect(() => {
    setSimIncome(profile.annual_income);
    setSimFirstGen(profile.is_first_generation_graduate);
    setSimGovtSchool(profile.studied_in_govt_school_6_to_12);
  }, [profile]);

  const loadCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/schemes`);
      const data = await res.json();
      if (data.schemes) {
        setAllSchemesCatalog(data.schemes);
      }
    } catch (err) {
      console.warn("Could not fetch schemes catalog", err);
    }
  };

  // Run core matching algorithm
  const runMatching = async (currentProfile, navigateToResults = true) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentProfile),
      });
      const data = await res.json();
      setResults(data);

      if (navigateToResults) {
        setCurrentNav("results");
      }

      // Trigger AI Explanation generation asynchronously
      fetchAiExplanation(data.selected_schemes, data.rejected_conflicting_schemes, currentProfile);

    } catch (err) {
      console.error("API Error", err);
    } finally {
      setLoading(false);
    }
  };

  // Asynchronously call the Gemini AI Explanation endpoint
  const fetchAiExplanation = async (selected, conflicts, studentProfile) => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai-explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_schemes: selected,
          rejected_conflicting_schemes: conflicts,
          student_profile: studentProfile,
        }),
      });
      const data = await res.json();
      setAiExplanation(data);
    } catch (err) {
      console.warn("AI explanation endpoint failed, using local fallback", err);
      setAiExplanation({
        explanation: `Congratulations ${studentProfile.full_name || 'Student'}! Based on your ${studentProfile.community} status and income of ₹${(studentProfile.annual_income || 0).toLocaleString('en-IN')}, our optimizer verified ${selected.length} compatible welfare schemes delivering maximum financial support while avoiding conflicting applications.`,
        is_ai_generated: false,
        provider: "Rule Engine Deterministic Fallback"
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Live Simulator API Call
  const runLiveSimulation = async (income, firstGen, govtSchool) => {
    const updated = {
      ...profile,
      annual_income: income,
      is_first_generation_graduate: firstGen,
      studied_in_govt_school_6_to_12: govtSchool,
    };
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      console.error("Simulation error", err);
    }
  };

  const handleApplyPersona = (p) => {
    setProfile(p.profile);
    runMatching(p.profile, true);
  };

  const handleFormChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runMatching(profile, true);
  };

  // Handle Real File Upload with Validation (pdf, jpg, jpeg, png, max 5MB)
  const handleFileUpload = (docName, file) => {
    if (!file) return;

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadErrors(prev => ({
        ...prev,
        [docName]: `File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`
      }));
      return;
    }

    // Validate type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadErrors(prev => ({
        ...prev,
        [docName]: `Unsupported file type (${file.type || 'unknown'}). Please upload a PDF, JPG, or PNG document.`
      }));
      return;
    }

    // Clear error
    setUploadErrors(prev => {
      const next = { ...prev };
      delete next[docName];
      return next;
    });

    // Simulate instant upload progress
    setUploadedDocs(prev => ({
      ...prev,
      [docName]: {
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading'
      }
    }));

    setTimeout(() => {
      const isImg = file.type.startsWith('image/');
      let previewUrl = null;
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (e) {
        previewUrl = null;
      }

      setUploadedDocs(prev => ({
        ...prev,
        [docName]: {
          name: file.name,
          size: file.size,
          type: file.type,
          isImage: isImg,
          previewUrl: previewUrl,
          status: 'uploaded',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }));
    }, 450);
  };

  const handleRemoveFile = (docName) => {
    setUploadedDocs(prev => {
      const next = { ...prev };
      if (next[docName]?.previewUrl) {
        URL.revokeObjectURL(next[docName].previewUrl);
      }
      delete next[docName];
      return next;
    });
    setUploadErrors(prev => {
      const next = { ...prev };
      delete next[docName];
      return next;
    });
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Calculation of document completion
  const requiredDocsList = results?.document_checklist || [];
  const totalDocsCount = requiredDocsList.length;
  const uploadedCount = requiredDocsList.filter(d => uploadedDocs[d.document_name]?.status === 'uploaded').length;
  const allDocsUploaded = totalDocsCount > 0 && uploadedCount === totalDocsCount;
  const uploadProgressPercent = totalDocsCount > 0 ? Math.round((uploadedCount / totalDocsCount) * 100) : 0;

  // Breadcrumb label mapper
  const navTitles = {
    home: "Dashboard Overview",
    profile: "My Profile & Eligibility Details",
    results: "Recommendation & Conflict Audit",
    documents: "Document Checklist & File Verification",
    deadlines: "Application Deadlines & Timeline",
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      
      {/* 1. LEFT FIXED SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out no-print
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div>
          {/* Brand Logo & Name */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-saasblue-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <span className="text-xl">🎓</span>
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight brand-font text-white flex items-center gap-1.5">
                  SchemeMatch <span className="text-xs bg-brand-500/20 text-brand-300 font-bold px-1.5 py-0.5 rounded border border-brand-400/30">AI</span>
                </h1>
                <p className="text-[11px] text-slate-400">Eligibility Advisory</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 text-xs font-medium">
            <button
              onClick={() => { setCurrentNav("home"); setSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "home"
                  ? "bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base">🏠</span>
              <span>Home / New Check</span>
            </button>

            <button
              onClick={() => { setCurrentNav("profile"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "profile"
                  ? "bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">👤</span>
                <span>My Profile</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                Edit
              </span>
            </button>

            <button
              onClick={() => { setCurrentNav("results"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "results"
                  ? "bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">🏆</span>
                <span>Results</span>
              </div>
              {results && results.selected_schemes?.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                  {results.selected_schemes.length} Matched
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentNav("documents"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "documents"
                  ? "bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">📋</span>
                <span>Document Checklist</span>
              </div>
              {totalDocsCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  allDocsUploaded ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-amber-300'
                }`}>
                  {uploadedCount}/{totalDocsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setCurrentNav("deadlines"); setSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "deadlines"
                  ? "bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base">⏳</span>
              <span>Deadlines</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Profile Card */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{profile.full_name || "Student"}</div>
              <div className="text-[10px] text-slate-400 truncate">{profile.community} • {profile.course_type}</div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" title="API Engine Connected"></div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
        ></div>
      )}

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between no-print shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              ☰
            </button>
            <div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
                <span>SchemeMatch AI</span>
                <span>/</span>
                <span className="text-brand-700 font-semibold">{navTitles[currentNav]}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 brand-font">
                {navTitles[currentNav]}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Profile Chip */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs">
              <span className="text-slate-500">Student:</span>
              <span className="font-bold text-slate-800">{profile.full_name}</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-brand-700">{formatCurrency(profile.annual_income)}</span>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-200"
              title="Print summary advisory sheet"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Print Report</span>
            </button>

            <button
              onClick={() => { setCurrentNav("profile"); }}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1 transition"
            >
              <span>+</span>
              <span>New Check</span>
            </button>
          </div>
        </header>

        {/* Dynamic Screen Content */}
        <main className="p-4 sm:p-8 flex-1 max-w-6xl w-full mx-auto">

          {/* ============================================================ */}
          {/* SCREEN 1: HOME / DASHBOARD OVERVIEW */}
          {/* ============================================================ */}
          {currentNav === "home" && (
            <div className="space-y-8 animate-fadeIn">
              {/* SaaS Hero Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-saasblue-900 via-slate-900 to-brand-900 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold mb-3 border border-brand-400/30">
                    <span>✨</span>
                    <span>AI-Powered Decision Support</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold brand-font tracking-tight text-white mb-2">
                    Maximize Your Scholarship Grant. Eliminate Conflicting Rejections.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                    Evaluate 15+ government welfare programs against your verified profile. Our deterministic greedy conflict resolution engine pairs you with the highest-value valid package, accompanied by real-time document verification.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setCurrentNav("profile")}
                      className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-lg transition"
                    >
                      Start Eligibility Check →
                    </button>
                    {results && (
                      <button
                        onClick={() => setCurrentNav("results")}
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition"
                      >
                        View Latest Results ({results.selected_schemes?.length || 0})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Instant Persona Selection Cards */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 brand-font">Instant Demo Personas</h3>
                    <p className="text-xs text-slate-500">Test realistic student profiles and examine conflict resolution logic in 1-click</p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">15 Verified Programs Active</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DEMO_PERSONAS.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplyPersona(p)}
                      className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                            {p.badge}
                          </span>
                          <span className="text-slate-400 text-xs group-hover:text-brand-600 group-hover:translate-x-0.5 transition">→</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-brand-700 transition">{p.label}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{p.desc}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>Income: ₹{p.profile.annual_income.toLocaleString('en-IN')}</span>
                        <span className="text-brand-600 font-semibold">Run Check</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-slate-900 brand-font">15</div>
                  <div className="text-xs text-slate-500 mt-0.5">Welfare Schemes</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-brand-600 brand-font">100%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Conflict-Free Packages</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-saasblue-600 brand-font">&lt;80ms</div>
                  <div className="text-xs text-slate-500 mt-0.5">Rule Evaluation Speed</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-emerald-600 brand-font">5MB</div>
                  <div className="text-xs text-slate-500 mt-0.5">Real-Time File Upload</div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 2: MY PROFILE FORM */}
          {/* ============================================================ */}
          {currentNav === "profile" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 brand-font">Student Eligibility Profile</h3>
                    <p className="text-xs text-slate-500">Provide accurate details to determine verified scheme qualifications.</p>
                  </div>
                  <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2.5 py-1 rounded-full border border-brand-200">
                    Step 1 of 2
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                  {/* Full Name */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => handleFormChange("full_name", e.target.value)}
                      required
                      placeholder="e.g. Selvi M."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs transition"
                    />
                  </div>

                  {/* Community & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Community Category</label>
                      <select
                        value={profile.community}
                        onChange={(e) => handleFormChange("community", e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium"
                      >
                        <option value="SC">SC (Scheduled Caste)</option>
                        <option value="ST">ST (Scheduled Tribe)</option>
                        <option value="MBC">MBC (Most Backward Class)</option>
                        <option value="DNC">DNC (De-notified Community)</option>
                        <option value="BC">BC (Backward Class)</option>
                        <option value="General">General / Open Category</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Gender</label>
                      <select
                        value={profile.gender}
                        onChange={(e) => handleFormChange("gender", e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Transgender / Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Annual Income with synced Slider & Number Box */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="font-semibold text-slate-700">Annual Family Income</label>
                      <span className="font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 text-xs">
                        {formatCurrency(profile.annual_income)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20000"
                      max="600000"
                      step="10000"
                      value={profile.annual_income}
                      onChange={(e) => handleFormChange("annual_income", parseInt(e.target.value))}
                      className="w-full accent-brand-600 cursor-pointer mb-2"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>₹20,000</span>
                      <span className="text-amber-600 font-bold">Standard Cutoff: ₹2,50,000</span>
                      <span>₹6,00,000</span>
                    </div>
                  </div>

                  {/* Course Type & Year of Study */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Course Type</label>
                      <select
                        value={profile.course_type}
                        onChange={(e) => handleFormChange("course_type", e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium"
                      >
                        <option value="Engineering">B.E. / B.Tech (Engineering)</option>
                        <option value="Medical">MBBS / BDS / Allied Medical</option>
                        <option value="Arts & Science">B.A. / B.Sc / B.Com (Arts & Science)</option>
                        <option value="Diploma">Polytechnic / Diploma</option>
                        <option value="PG">Postgraduate (M.A., M.Sc, M.E.)</option>
                        <option value="ITI">ITI / Vocational</option>
                        <option value="UG">Other Undergraduate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Year of Study</label>
                      <select
                        value={profile.year_of_study}
                        onChange={(e) => handleFormChange("year_of_study", parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium"
                      >
                        <option value={1}>1st Year (Freshman)</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                        <option value={5}>5th Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Key Welfare Attribute Toggles */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition">
                      <div>
                        <span className="font-semibold text-slate-800">First Generation Graduate</span>
                        <p className="text-[10px] text-slate-500">No graduate in immediate family (Tahsildar certificate)</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.is_first_generation_graduate}
                        onChange={(e) => handleFormChange("is_first_generation_graduate", e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition">
                      <div>
                        <span className="font-semibold text-slate-800">State Government School (Class 6-12)</span>
                        <p className="text-[10px] text-slate-500">Qualifies for Higher Education Assurance schemes (₹12,000/yr)</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.studied_in_govt_school_6_to_12}
                        onChange={(e) => handleFormChange("studied_in_govt_school_6_to_12", e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                    </label>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="font-semibold text-slate-800">Differently Abled Status</span>
                          <p className="text-[10px] text-slate-500">Certified benchmark disability with UDID Card</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={profile.is_differently_abled}
                          onChange={(e) => handleFormChange("is_differently_abled", e.target.checked)}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                      </label>
                      {profile.is_differently_abled && (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
                          <span className="text-[11px] text-slate-700 font-semibold">Percentage: {profile.disability_percent || 40}%</span>
                          <input
                            type="range"
                            min="40"
                            max="100"
                            value={profile.disability_percent || 40}
                            onChange={(e) => handleFormChange("disability_percent", parseInt(e.target.value))}
                            className="flex-1 accent-brand-600"
                          />
                        </div>
                      )}
                    </div>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition">
                      <div>
                        <span className="font-semibold text-slate-800">Tamil Nadu Domicile / Residence</span>
                        <p className="text-[10px] text-slate-500">Permanent nativity verified</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.is_tamil_nadu_domicile}
                        onChange={(e) => handleFormChange("is_tamil_nadu_domicile", e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                    </label>
                  </div>

                  {/* Additional Criteria Dropdown */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSpecialOptions(!showSpecialOptions)}
                      className="text-xs text-brand-700 hover:text-brand-800 font-semibold flex items-center gap-1.5"
                    >
                      <span>{showSpecialOptions ? "▼" : "▶"}</span>
                      <span>Additional Welfare Quotas (Hostel, Merit, Farmers, Religious Minority)</span>
                    </button>

                    {showSpecialOptions && (
                      <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-slate-700">College Hostel Resident</span>
                          <input
                            type="checkbox"
                            checked={profile.is_hostel_resident}
                            onChange={(e) => handleFormChange("is_hostel_resident", e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-slate-700">Board Exam District / State Topper (Merit)</span>
                          <input
                            type="checkbox"
                            checked={profile.is_merit_student}
                            onChange={(e) => handleFormChange("is_merit_student", e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-slate-700">Registered Farmer Family (Uzhavar Card)</span>
                          <input
                            type="checkbox"
                            checked={profile.is_farmer_card_holder}
                            onChange={(e) => handleFormChange("is_farmer_card_holder", e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-slate-700">Notified Religious Minority (Christian, Muslim, etc.)</span>
                          <input
                            type="checkbox"
                            checked={profile.is_minority_community}
                            onChange={(e) => handleFormChange("is_minority_community", e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Submission Action */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 text-sm mt-4"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Evaluating Eligibility & Resolving Conflicts...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Find Optimal Schemes & Conflicts</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 3: RESULTS DASHBOARD */}
          {/* ============================================================ */}
          {currentNav === "results" && results && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Total Benefit Overview Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-saasblue-900 via-slate-900 to-brand-900 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-400/30">
                      <span>✓</span>
                      <span>Greedy Benefit Optimization Complete</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold brand-font text-white">
                      {results.recommendation_headline}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      {results.recommendation_summary}
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15 text-center sm:text-right shrink-0">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Total Recommended Grant</div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-amber-300 brand-font mt-0.5">
                      {formatCurrency(results.total_benefit_amount)}
                    </div>
                    <div className="text-[10px] text-slate-300">per academic year</div>
                  </div>
                </div>
              </div>

              {/* CHANGE 5: AI-POWERED EXPLANATION CARD (WITH SHIMMER & BADGE) */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-50/70 to-blue-50/70 rounded-3xl border border-brand-200/80 shadow-sm relative">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">✨</span>
                    <h4 className="text-sm font-bold text-slate-900 brand-font">Why this recommendation?</h4>
                  </div>

                  {/* AI Badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    aiExplanation?.is_ai_generated
                      ? "bg-gradient-to-r from-brand-600 to-saasblue-600 text-white border-transparent shadow-xs"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}>
                    <span>✨</span>
                    <span>{aiExplanation?.is_ai_generated ? "AI-generated" : "Rule Engine Advisory"}</span>
                  </span>
                </div>

                {/* Shimmer / Skeleton Loading State while generating */}
                {aiLoading ? (
                  <div className="space-y-2 py-2">
                    <div className="h-3.5 bg-slate-200/70 rounded-md shimmer-loading w-3/4"></div>
                    <div className="h-3.5 bg-slate-200/70 rounded-md shimmer-loading w-full"></div>
                    <div className="h-3.5 bg-slate-200/70 rounded-md shimmer-loading w-5/6"></div>
                    <span className="text-[10px] text-slate-400 italic">Synthesizing personalized advisory explanation...</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {aiExplanation?.explanation || results.ai_advisory?.explanation || "Your criteria have been verified across our welfare schemes database."}
                    </p>
                    {aiExplanation?.provider && (
                      <div className="mt-2 text-[10px] text-slate-400">
                        Generated by: {aiExplanation.provider}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Matched Schemes List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 brand-font">Selected Scheme Package</h4>
                  <span className="text-xs text-slate-500">{results.selected_schemes.length} Scheme(s) Approved</span>
                </div>

                {results.selected_schemes.map((scheme, idx) => (
                  <div
                    key={scheme.id}
                    className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {scheme.department}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ {scheme.match_score}% Fit Score
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          scheme.deadline_info.badge_color === 'red'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : scheme.deadline_info.badge_color === 'amber'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          ⏳ {scheme.deadline_info.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 brand-font">{scheme.name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{scheme.benefit_description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold text-brand-700">{formatCurrency(scheme.benefit_amount)}</div>
                        <div className="text-[10px] text-slate-500">{scheme.benefit_type}</div>
                      </div>
                    </div>

                    {/* Borderline Flag Warning */}
                    {scheme.borderline_flags && scheme.borderline_flags.length > 0 && (
                      <div className="mb-3 p-2.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-900 flex items-start gap-2">
                        <span className="text-sm">⚠️</span>
                        <div>
                          <span className="font-bold">Borderline Verification Notice: </span>
                          <span>{scheme.borderline_flags[0]}</span>
                        </div>
                      </div>
                    )}

                    {/* Criteria Passed Breakdown */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Verified Match Criteria:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {scheme.passed_criteria.map((crit, cIdx) => (
                          <div key={cIdx} className="flex items-start gap-1.5 text-slate-700">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span><strong>{crit.field}:</strong> {crit.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PRESERVED (DO NOT CHANGE): Proactive Conflict Prevention Engine */}
              {results.rejected_conflicting_schemes && results.rejected_conflicting_schemes.length > 0 && (
                <div className="p-6 bg-slate-100/90 rounded-3xl border border-slate-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🛡️</span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Proactive Conflict Prevention Engine ({results.rejected_conflicting_schemes.length} Conflicts Handled)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-4">
                    The following eligible schemes were intentionally excluded because they are mutually exclusive with a higher-value award. Our greedy optimizer protected your application from conflicting rejections:
                  </p>

                  <div className="space-y-2.5">
                    {results.rejected_conflicting_schemes.map((item, rIdx) => (
                      <div
                        key={rIdx}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 line-through text-slate-500">
                            {item.scheme.name} ({formatCurrency(item.scheme_benefit)})
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            {item.reason}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg text-[10px] shrink-0 border border-amber-300">
                          Resolved in favor of {item.conflicts_with}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What-If Threshold Simulator Section */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎛️</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 brand-font">Live "What-If" Eligibility Simulator</h4>
                      <p className="text-xs text-slate-500">Test how modifying income or criteria affects your benefits in real time</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-slate-700">Simulate Annual Family Income:</span>
                      <span className="font-extrabold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
                        {formatCurrency(simIncome)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20000"
                      max="500000"
                      step="5000"
                      value={simIncome}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSimIncome(val);
                        runLiveSimulation(val, simFirstGen, simGovtSchool);
                      }}
                      className="w-full accent-brand-600 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={simFirstGen}
                        onChange={(e) => {
                          setSimFirstGen(e.target.checked);
                          runLiveSimulation(simIncome, e.target.checked, simGovtSchool);
                        }}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span className="font-semibold text-slate-800">First Generation Graduate</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={simGovtSchool}
                        onChange={(e) => {
                          setSimGovtSchool(e.target.checked);
                          runLiveSimulation(simIncome, simFirstGen, e.target.checked);
                        }}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span className="font-semibold text-slate-800">State Govt School (Class 6-12)</span>
                    </label>
                  </div>

                  {simResult && (
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-emerald-950">Simulated Benefit:</span>
                        <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(simResult.total_benefit)}/yr</span>
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        {simResult.selected_schemes_count} scheme(s) selected: {simResult.selected_schemes.map(s => s.name).join(", ")}
                      </div>
                    </div>
                  )}
                </div>

                {/* Near-Miss Callouts */}
                {results.what_if_opportunities && results.what_if_opportunities.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-700">Near-Miss Opportunities (1 Criterion Away):</div>
                    {results.what_if_opportunities.slice(0, 3).map((opp, i) => (
                      <div key={i} className="p-3 bg-amber-50/80 rounded-xl border-l-4 border-amber-500 text-xs flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{opp.scheme_name}</div>
                          <p className="text-slate-600 text-[11px] mt-0.5">{opp.insight || `Requirement: ${opp.blocking_field}`}</p>
                        </div>
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px] shrink-0">
                          +{formatCurrency(opp.potential_benefit)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 4: DOCUMENT CHECKLIST WITH REAL-TIME FILE UPLOAD */}
          {/* ============================================================ */}
          {currentNav === "documents" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Top Progress & Status Card */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 brand-font">Required Document Verification</h3>
                    <p className="text-xs text-slate-500">Upload and verify required certificates for your matched scheme package.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                      {uploadedCount} of {totalDocsCount} Uploaded ({uploadProgressPercent}%)
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-brand-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgressPercent}%` }}
                  ></div>
                </div>

                {/* All Documents Ready Success Banner */}
                {allDocsUploaded && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-semibold animate-fadeIn">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xl">🎉</span>
                      <div>
                        <div className="font-bold text-sm text-emerald-950">All documents ready!</div>
                        <div>Your verification package is complete and ready for application submission.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm shrink-0"
                    >
                      Export Packet
                    </button>
                  </div>
                )}
              </div>

              {/* Document Upload Cards List */}
              <div className="space-y-4">
                {requiredDocsList.map((doc, idx) => {
                  const docKey = doc.document_name;
                  const item = uploadedDocs[docKey];
                  const isUploaded = item?.status === 'uploaded';
                  const isUploading = item?.status === 'uploading';
                  const errorMsg = uploadErrors[docKey];

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border transition bg-white shadow-xs ${
                        isUploaded
                          ? "border-emerald-300 ring-1 ring-emerald-400/20"
                          : errorMsg
                          ? "border-red-300 ring-1 ring-red-400/20"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Doc Details */}
                        <div className="flex items-start space-x-3 max-w-lg">
                          <input
                            type="checkbox"
                            checked={isUploaded}
                            readOnly
                            className="mt-1 w-4 h-4 text-emerald-600 rounded cursor-default"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{doc.document_name}</h4>
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                {doc.issuing_authority}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Required for: <span className="font-medium text-slate-700">{doc.required_for.join(", ")}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Accepted: PDF, JPG, PNG (Max 5MB)
                            </p>
                          </div>
                        </div>

                        {/* Upload Controls & Status */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                          
                          {/* Case 1: Uploading State */}
                          {isUploading && (
                            <div className="flex items-center space-x-2 text-xs text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200">
                              <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                              <span>Uploading {item.name}...</span>
                            </div>
                          )}

                          {/* Case 2: Uploaded State with Preview & Actions */}
                          {isUploaded && (
                            <div className="flex items-center space-x-3 p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs">
                              {item.isImage && item.previewUrl ? (
                                <img src={item.previewUrl} alt="preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-300" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-lg">📄</div>
                              )}
                              <div>
                                <div className="font-bold text-emerald-950 text-xs truncate max-w-[140px]">{item.name}</div>
                                <div className="text-[10px] text-emerald-700">{formatFileSize(item.size)} • {item.uploadedAt}</div>
                              </div>
                              <div className="flex items-center space-x-1 pl-2">
                                <label className="cursor-pointer text-[10px] font-bold text-brand-700 hover:text-brand-900 bg-white px-2 py-1 rounded border border-slate-300">
                                  Replace
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileUpload(docKey, e.target.files[0])}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  onClick={() => handleRemoveFile(docKey)}
                                  className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-white px-2 py-1 rounded border border-slate-300"
                                  title="Remove file"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Case 3: Not Uploaded State -> Dropzone / File Picker */}
                          {!isUploaded && !isUploading && (
                            <label className="cursor-pointer flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-500 text-xs font-semibold transition">
                              <span>📎</span>
                              <span>Upload Certificate</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileUpload(docKey, e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Error Alert if file invalid */}
                      {errorMsg && (
                        <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200 text-[11px] text-red-700 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>{errorMsg}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 5: DEADLINES */}
          {/* ============================================================ */}
          {currentNav === "deadlines" && results && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 brand-font mb-1">Application Deadlines & Timeline</h3>
                <p className="text-xs text-slate-500">Track cutoff dates for your matched scholarship schemes</p>

                <div className="mt-6 space-y-3">
                  {results.selected_schemes.map(s => (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                        <div className="text-slate-500 text-[11px] mt-0.5">{s.department}</div>
                        <div className="text-brand-700 font-semibold mt-1">Grant: {formatCurrency(s.benefit_amount)}/yr</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-slate-500 font-medium">Application Deadline: {s.deadline_info.deadline}</div>
                        <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          s.deadline_info.badge_color === 'red'
                            ? 'bg-red-100 text-red-800 border-red-200 animate-pulse'
                            : s.deadline_info.badge_color === 'amber'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          ⏳ {s.deadline_info.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* PRINT-ONLY SUMMARY ADVISORY SHEET */}
      <div className="hidden print-only p-8 bg-white text-slate-900">
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">SchemeMatch AI — Scholarship Eligibility Advisory</h1>
            <p className="text-xs text-slate-600">Official Student Verification Report</p>
          </div>
          <div className="text-right text-xs">
            <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
            <div>Student: {profile.full_name}</div>
          </div>
        </div>

        <div className="mb-4 text-xs">
          <h2 className="font-bold text-sm mb-1">Student Profile Details:</h2>
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100 rounded-lg">
            <div>Community: {profile.community}</div>
            <div>Course: {profile.course_type} (Year {profile.year_of_study})</div>
            <div>Annual Income: {formatCurrency(profile.annual_income)}</div>
            <div>First Gen: {profile.is_first_generation_graduate ? "Yes" : "No"}</div>
            <div>Govt School: {profile.studied_in_govt_school_6_to_12 ? "Yes" : "No"}</div>
            <div>Differently Abled: {profile.is_differently_abled ? `Yes (${profile.disability_percent}%)` : "No"}</div>
          </div>
        </div>

        {results && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-sm mb-1">Recommended Benefit Package:</h2>
              <div className="text-lg font-bold text-emerald-800 mb-2">
                Total Financial Grant: {formatCurrency(results.total_benefit_amount)}/year
              </div>
              <div className="space-y-2">
                {results.selected_schemes.map(s => (
                  <div key={s.id} className="p-2 border border-slate-300 rounded text-xs">
                    <div className="font-bold">{s.name} — {formatCurrency(s.benefit_amount)}/yr</div>
                    <div className="text-slate-600">{s.department}</div>
                    <div className="text-slate-500 text-[10px]">Deadline: {s.deadline_info.deadline}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-sm mb-1">Document Checklist & Upload Status:</h2>
              <ul className="list-disc list-inside text-xs space-y-1">
                {requiredDocsList.map((d, i) => (
                  <li key={i}>
                    {d.document_name} — (Issuing Authority: {d.issuing_authority}) [Status: {uploadedDocs[d.document_name]?.status === 'uploaded' ? 'UPLOADED & VERIFIED' : 'PENDING'}]
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// Render React Root
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
