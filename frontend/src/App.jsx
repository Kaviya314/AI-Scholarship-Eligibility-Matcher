import React, { useState, useEffect } from 'react';

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

export default function App() {
  const [currentNav, setCurrentNav] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(DEMO_PERSONAS[0].profile);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showSpecialOptions, setShowSpecialOptions] = useState(false);

  // AI Explanation State
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Document Uploads State
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});

  // What-If Simulator state
  const [simIncome, setSimIncome] = useState(profile.annual_income);
  const [simFirstGen, setSimFirstGen] = useState(profile.is_first_generation_graduate);
  const [simGovtSchool, setSimGovtSchool] = useState(profile.studied_in_govt_school_6_to_12);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    runMatching(profile, false);
  }, []);

  useEffect(() => {
    setSimIncome(profile.annual_income);
    setSimFirstGen(profile.is_first_generation_graduate);
    setSimGovtSchool(profile.studied_in_govt_school_6_to_12);
  }, [profile]);

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

      fetchAiExplanation(data.selected_schemes, data.rejected_conflicting_schemes, currentProfile);
    } catch (err) {
      console.error("API Error", err);
    } finally {
      setLoading(false);
    }
  };

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
      setAiExplanation({
        explanation: `Congratulations ${studentProfile.full_name || 'Student'}! Based on your ${studentProfile.community} status and verified income of ₹${(studentProfile.annual_income || 0).toLocaleString('en-IN')}, our engine matched ${selected.length} compatible schemes maximizing your financial grant.`,
        is_ai_generated: false,
        provider: "Rule Engine Deterministic Fallback"
      });
    } finally {
      setAiLoading(false);
    }
  };

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

  const handleFileUpload = (docName, file) => {
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadErrors(prev => ({
        ...prev,
        [docName]: `File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`
      }));
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadErrors(prev => ({
        ...prev,
        [docName]: `Unsupported file type (${file.type || 'unknown'}). Please upload a PDF, JPG, or PNG document.`
      }));
      return;
    }

    setUploadErrors(prev => {
      const next = { ...prev };
      delete next[docName];
      return next;
    });

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

  const requiredDocsList = results?.document_checklist || [];
  const totalDocsCount = requiredDocsList.length;
  const uploadedCount = requiredDocsList.filter(d => uploadedDocs[d.document_name]?.status === 'uploaded').length;
  const allDocsUploaded = totalDocsCount > 0 && uploadedCount === totalDocsCount;
  const uploadProgressPercent = totalDocsCount > 0 ? Math.round((uploadedCount / totalDocsCount) * 100) : 0;

  const navTitles = {
    home: "Dashboard Overview",
    profile: "My Profile & Eligibility Details",
    results: "Recommendation & Conflict Audit",
    documents: "Document Checklist & File Verification",
    deadlines: "Application Deadlines & Timeline",
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out no-print
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md">
                <span className="text-xl">🎓</span>
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight brand-font text-white flex items-center gap-1.5">
                  SchemeMatch <span className="text-xs bg-teal-500/20 text-teal-300 font-bold px-1.5 py-0.5 rounded border border-teal-400/30">AI</span>
                </h1>
                <p className="text-[11px] text-slate-400">Eligibility Advisory</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">✕</button>
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-medium">
            <button
              onClick={() => { setCurrentNav("home"); setSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "home" ? "bg-teal-600 text-white font-semibold shadow-md" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>🏠</span>
              <span>Home / New Check</span>
            </button>
            <button
              onClick={() => { setCurrentNav("profile"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "profile" ? "bg-teal-600 text-white font-semibold shadow-md" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span>👤</span>
                <span>My Profile</span>
              </div>
            </button>
            <button
              onClick={() => { setCurrentNav("results"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "results" ? "bg-teal-600 text-white font-semibold shadow-md" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span>🏆</span>
                <span>Results</span>
              </div>
              {results?.selected_schemes?.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                  {results.selected_schemes.length} Matched
                </span>
              )}
            </button>
            <button
              onClick={() => { setCurrentNav("documents"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                currentNav === "documents" ? "bg-teal-600 text-white font-semibold shadow-md" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span>📋</span>
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
                currentNav === "deadlines" ? "bg-teal-600 text-white font-semibold shadow-md" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>⏳</span>
              <span>Deadlines</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{profile.full_name || "Student"}</div>
              <div className="text-[10px] text-slate-400 truncate">{profile.community} • {profile.course_type}</div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20"></div>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between no-print shadow-sm">
          <div className="flex items-center space-x-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-700">☰</button>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">SchemeMatch AI / <span className="text-teal-700 font-semibold">{navTitles[currentNav]}</span></div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 brand-font">{navTitles[currentNav]}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-200">
              <span>🖨️</span>
              <span className="hidden sm:inline">Print Report</span>
            </button>
            <button onClick={() => setCurrentNav("profile")} className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm">+ New Check</button>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1 max-w-6xl w-full mx-auto">
          {currentNav === "home" && (
            <div className="space-y-8">
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-teal-900 text-white shadow-xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold brand-font text-white mb-2">Maximize Your Scholarship Grant. Eliminate Conflicting Rejections.</h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-6">Evaluate 15+ government welfare programs against your verified profile with real-time greedy conflict resolution and document verification.</p>
                <button onClick={() => setCurrentNav("profile")} className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg">Start Eligibility Check →</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEMO_PERSONAS.map((p, idx) => (
                  <div key={idx} onClick={() => handleApplyPersona(p)} className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition cursor-pointer">
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{p.label}</h4>
                    <p className="text-xs text-slate-500">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentNav === "profile" && (
            <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 brand-font mb-4">Student Eligibility Profile</h3>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input type="text" value={profile.full_name} onChange={(e) => handleFormChange("full_name", e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Community</label>
                    <select value={profile.community} onChange={(e) => handleFormChange("community", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                      <option value="SC">SC</option><option value="ST">ST</option><option value="MBC">MBC</option><option value="DNC">DNC</option><option value="BC">BC</option><option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                    <select value={profile.gender} onChange={(e) => handleFormChange("gender", e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                      <option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl">{loading ? "Evaluating..." : "Run AI Matching"}</button>
              </form>
            </div>
          )}

          {currentNav === "results" && results && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold brand-font">{results.recommendation_headline}</h3>
                  <p className="text-xs text-slate-300">{results.recommendation_summary}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-amber-300">{formatCurrency(results.total_benefit_amount)}</div>
                </div>
              </div>

              {/* AI Explanation with ✨ Badge */}
              <div className="p-5 bg-teal-50/70 rounded-3xl border border-teal-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><span>✨</span> Why this recommendation?</h4>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-600 text-white">✨ {aiExplanation?.is_ai_generated ? "AI-generated" : "Advisory"}</span>
                </div>
                <p className="text-xs text-slate-700">{aiExplanation?.explanation || results.ai_advisory?.explanation}</p>
              </div>

              {/* Matched Schemes */}
              <div className="space-y-3">
                {results.selected_schemes.map(s => (
                  <div key={s.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{s.name}</h4>
                      <p className="text-xs text-slate-500">{s.department}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-700">{formatCurrency(s.benefit_amount)}</div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✓ {s.match_score}% Match</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conflict Prevention */}
              {results.rejected_conflicting_schemes?.length > 0 && (
                <div className="p-5 bg-slate-100 rounded-3xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 mb-2">🛡️ Proactive Conflict Prevention Engine</h4>
                  <div className="space-y-2">
                    {results.rejected_conflicting_schemes.map((r, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl text-xs flex justify-between items-center">
                        <span className="line-through text-slate-500">{r.scheme.name}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">Resolved in favor of {r.conflicts_with}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentNav === "documents" && (
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900">Required Document Verification</h3>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">{uploadedCount} of {totalDocsCount} Uploaded ({uploadProgressPercent}%)</span>
                </div>
                {allDocsUploaded && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-semibold text-emerald-900">
                    🎉 All documents ready — you can proceed to apply.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {requiredDocsList.map((doc, idx) => {
                  const item = uploadedDocs[doc.document_name];
                  const isUploaded = item?.status === 'uploaded';
                  return (
                    <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{doc.document_name}</div>
                        <div className="text-[10px] text-slate-500">{doc.issuing_authority}</div>
                      </div>
                      <div>
                        {isUploaded ? (
                          <div className="flex items-center space-x-2 text-emerald-700 font-bold">
                            <span>✓ Uploaded ({formatFileSize(item.size)})</span>
                            <button onClick={() => handleRemoveFile(doc.document_name)} className="text-red-500 text-[10px]">✕</button>
                          </div>
                        ) : (
                          <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 font-semibold">
                            Upload File
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(doc.document_name, e.target.files[0])} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentNav === "deadlines" && results && (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
              <h3 className="text-base font-bold text-slate-900 mb-4">Application Deadlines</h3>
              {results.selected_schemes.map(s => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-slate-500">{s.department}</div>
                  </div>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">⏳ {s.deadline_info.label}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
