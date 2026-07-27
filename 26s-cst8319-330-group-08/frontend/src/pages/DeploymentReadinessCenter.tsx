import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

 type QaStatus = "not_tested" | "in_progress" | "passed" | "failed" | "blocked" | "not_applicable";
 type QaPriority = "critical" | "high" | "medium" | "low";
 type QaTab = "overview" | "requirements" | "blockers" | "system";

 type QaTestCase = {
   id: number;
   test_key: string;
   category: string;
   title: string;
   description?: string | null;
   requirement_reference?: string | null;
   user_role: string;
   priority: QaPriority;
   test_type: "manual" | "automated" | "hybrid";
   route_path?: string | null;
   is_launch_blocker: boolean;
   status: QaStatus;
   latest_run_id?: number | null;
   release_version?: string | null;
   environment?: string | null;
   actual_result?: string | null;
   notes?: string | null;
   tested_at?: string | null;
   tester_name?: string | null;
   evidence_count: number;
 };

 type CoverageItem = { name: string; passed: number; total: number; score: number };

 type QaSummary = {
   readiness: "ready" | "ready_with_warnings" | "not_ready";
   score: number;
   total: number;
   counts: Record<QaStatus, number>;
   critical_blocker_count: number;
   critical_blockers: QaTestCase[];
   category_coverage: CoverageItem[];
   role_coverage: CoverageItem[];
   last_tested_at?: string | null;
   generated_at?: string;
 };

 type SystemCheck = {
   key: string;
   label: string;
   passed: boolean;
   severity: string;
   status: "pass" | "warn" | "fail";
   detail?: string;
 };

 type SystemPayload = {
   readiness: string;
   score: number;
   passed: number;
   warnings: number;
   failed: number;
   checks: SystemCheck[];
   generated_at: string;
 };

 type DeploymentReadinessCenterProps = { embedded?: boolean };

 const statusLabels: Record<QaStatus, string> = {
   not_tested: "Not tested",
   in_progress: "In progress",
   passed: "Passed",
   failed: "Failed",
   blocked: "Blocked",
   not_applicable: "Not applicable",
 };

 const statusTone = (status: QaStatus | SystemCheck["status"]) => {
   if (status === "passed" || status === "pass") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
   if (status === "in_progress" || status === "warn") return "bg-amber-100 text-amber-700 ring-amber-200";
   if (status === "failed" || status === "fail" || status === "blocked") return "bg-red-100 text-red-700 ring-red-200";
   if (status === "not_applicable") return "bg-slate-100 text-slate-500 ring-slate-200";
   return "bg-blue-100 text-blue-700 ring-blue-200";
 };

 const priorityTone = (priority: QaPriority) => {
   if (priority === "critical") return "bg-red-50 text-red-700 ring-red-200";
   if (priority === "high") return "bg-orange-50 text-orange-700 ring-orange-200";
   if (priority === "medium") return "bg-blue-50 text-blue-700 ring-blue-200";
   return "bg-slate-50 text-slate-600 ring-slate-200";
 };

 const readinessLabel = (readiness?: QaSummary["readiness"]) => {
   if (readiness === "ready") return "Ready";
   if (readiness === "ready_with_warnings") return "Ready with warnings";
   return "Not ready";
 };

 const formatDate = (value?: string | null) => {
   if (!value) return "Never tested";
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
 };

 function DeploymentReadinessCenter({ embedded = false }: DeploymentReadinessCenterProps) {
   const [summary, setSummary] = useState<QaSummary | null>(null);
   const [testCases, setTestCases] = useState<QaTestCase[]>([]);
   const [systemPayload, setSystemPayload] = useState<SystemPayload | null>(null);
   const [securityChecklist, setSecurityChecklist] = useState<string[]>([]);
   const [activeTab, setActiveTab] = useState<QaTab>("overview");
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [notice, setNotice] = useState("");
   const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
   const [filters, setFilters] = useState({ search: "", category: "", role: "", priority: "", status: "" });
   const [runForm, setRunForm] = useState({
     status: "in_progress" as QaStatus,
     release_version: "current",
     environment: "preview",
     actual_result: "",
     notes: "",
     evidence_url: "",
     evidence_name: "",
     evidence_type: "screenshot",
   });

   const token = localStorage.getItem("token");
   const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

   const loadQa = async () => {
     setLoading(true);
     setNotice("");
     try {
       const [summaryResponse, casesResponse, systemResponse, checklistResponse] = await Promise.all([
         fetch(`${API_BASE_URL}/qa/summary`, { headers }),
         fetch(`${API_BASE_URL}/qa/test-cases`, { headers }),
         fetch(`${API_BASE_URL}/qa/system-checks`, { headers }),
         fetch(`${API_BASE_URL}/qa/security-checklist`, { headers }),
       ]);
       const [summaryData, casesData, systemData, checklistData] = await Promise.all([
         summaryResponse.json(),
         casesResponse.json(),
         systemResponse.json(),
         checklistResponse.json(),
       ]);

       if (!summaryResponse.ok || summaryData.status !== "success") throw new Error(summaryData.message || "Could not load QA summary.");
       if (!casesResponse.ok || casesData.status !== "success") throw new Error(casesData.message || "Could not load QA requirements.");

       setSummary(summaryData);
       setTestCases(Array.isArray(casesData.test_cases) ? casesData.test_cases : []);
       setSystemPayload(systemResponse.ok && systemData.status === "success" ? systemData : null);
       setSecurityChecklist(Array.isArray(checklistData.checklist) ? checklistData.checklist : []);
     } catch (error) {
       setSummary(null);
       setTestCases([]);
       setSystemPayload(null);
       setSecurityChecklist([]);
       setNotice(error instanceof Error ? error.message : "Could not load QA readiness data.");
     } finally {
       setLoading(false);
     }
   };

   useEffect(() => {
     loadQa();
   }, []);

   const categories = useMemo(() => Array.from(new Set(testCases.map((item) => item.category))).sort(), [testCases]);
   const roles = useMemo(() => Array.from(new Set(testCases.map((item) => item.user_role))).sort(), [testCases]);
   const selectedCase = useMemo(() => testCases.find((item) => item.id === selectedCaseId) || null, [selectedCaseId, testCases]);

   const filteredCases = useMemo(() => {
     const search = filters.search.trim().toLowerCase();
     return testCases.filter((item) => {
       if (filters.category && item.category !== filters.category) return false;
       if (filters.role && item.user_role !== filters.role) return false;
       if (filters.priority && item.priority !== filters.priority) return false;
       if (filters.status && item.status !== filters.status) return false;
       if (!search) return true;
       return [item.title, item.description, item.test_key, item.requirement_reference, item.category]
         .filter(Boolean)
         .some((value) => String(value).toLowerCase().includes(search));
     });
   }, [filters, testCases]);

   const openResultForm = (testCase: QaTestCase) => {
     setSelectedCaseId(testCase.id);
     setRunForm({
       status: testCase.status === "not_tested" ? "in_progress" : testCase.status,
       release_version: testCase.release_version || "current",
       environment: testCase.environment || "preview",
       actual_result: testCase.actual_result || "",
       notes: testCase.notes || "",
       evidence_url: "",
       evidence_name: "",
       evidence_type: "screenshot",
     });
     window.requestAnimationFrame(() => document.getElementById("qa-result-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
   };

   const recordResult = async () => {
     if (!selectedCase) return;
     if (["failed", "blocked"].includes(runForm.status) && !runForm.actual_result.trim()) {
       setNotice("Add the actual failure or blocker before saving this result.");
       return;
     }

     setSaving(true);
     setNotice("");
     try {
       const response = await fetch(`${API_BASE_URL}/qa/test-cases/${selectedCase.id}/runs`, {
         method: "POST",
         headers: { ...headers, "Content-Type": "application/json" },
         body: JSON.stringify(runForm),
       });
       const data = await response.json();
       if (!response.ok || data.status !== "success") throw new Error(data.message || "Could not save QA result.");

       setSummary(data.summary);
       setTestCases((current) => current.map((item) => (item.id === selectedCase.id ? data.test_case : item)));
       setSelectedCaseId(null);
       setNotice(`Saved ${statusLabels[runForm.status]} result for “${selectedCase.title}”.`);
     } catch (error) {
       setNotice(error instanceof Error ? error.message : "Could not save QA result.");
     } finally {
       setSaving(false);
     }
   };

   const tabs: Array<{ key: QaTab; label: string; count?: number }> = [
     { key: "overview", label: "Overview" },
     { key: "requirements", label: "Client Requirements", count: testCases.length },
     { key: "blockers", label: "Critical Blockers", count: summary?.critical_blocker_count || 0 },
     { key: "system", label: "System Health" },
   ];

   const metricCards = [
     { label: "Readiness score", value: loading ? "..." : `${summary?.score || 0}%`, tone: "text-blue-700" },
     { label: "Passed", value: summary?.counts.passed || 0, tone: "text-emerald-700" },
     { label: "Failed", value: summary?.counts.failed || 0, tone: "text-red-700" },
     { label: "Blocked", value: summary?.counts.blocked || 0, tone: "text-red-700" },
     { label: "Not tested", value: summary?.counts.not_tested || 0, tone: "text-slate-700" },
   ];

   const requirementsPanel = (
     <>
       <section className="premium-card">
         <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
           <input
             className="form-field xl:col-span-2"
             placeholder="Search requirement, route, or reference"
             value={filters.search}
             onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
           />
           <select className="form-field" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
             <option value="">All categories</option>
             {categories.map((category) => <option key={category} value={category}>{category}</option>)}
           </select>
           <select className="form-field" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
             <option value="">All roles</option>
             {roles.map((role) => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}
           </select>
           <select className="form-field" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
             <option value="">All statuses</option>
             {(Object.keys(statusLabels) as QaStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
           </select>
         </div>
         <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
           <select className="form-field max-w-[220px]" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
             <option value="">All priorities</option>
             <option value="critical">Critical</option>
             <option value="high">High</option>
             <option value="medium">Medium</option>
             <option value="low">Low</option>
           </select>
           <p className="text-sm font-bold text-slate-500">Showing {filteredCases.length} of {testCases.length} client tests</p>
         </div>
       </section>

       {selectedCase && (
         <section id="qa-result-editor" className="premium-card border-2 border-blue-200">
           <div className="flex flex-wrap items-start justify-between gap-4">
             <div>
               <p className="eyebrow">Record QA result</p>
               <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedCase.title}</h2>
               <p className="mt-2 max-w-4xl text-sm font-semibold text-slate-500">{selectedCase.description}</p>
             </div>
             <button type="button" className="btn-secondary" onClick={() => setSelectedCaseId(null)}>Close</button>
           </div>

           <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Status</span>
               <select className="form-field" value={runForm.status} onChange={(event) => setRunForm((current) => ({ ...current, status: event.target.value as QaStatus }))}>
                 {(Object.keys(statusLabels) as QaStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
               </select>
             </label>
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Release</span>
               <input className="form-field" value={runForm.release_version} onChange={(event) => setRunForm((current) => ({ ...current, release_version: event.target.value }))} placeholder="RC-1" />
             </label>
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Environment</span>
               <select className="form-field" value={runForm.environment} onChange={(event) => setRunForm((current) => ({ ...current, environment: event.target.value }))}>
                 <option value="local">Local</option>
                 <option value="preview">Preview</option>
                 <option value="staging">Staging</option>
                 <option value="production">Production</option>
               </select>
             </label>
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Evidence type</span>
               <select className="form-field" value={runForm.evidence_type} onChange={(event) => setRunForm((current) => ({ ...current, evidence_type: event.target.value }))}>
                 <option value="screenshot">Screenshot</option>
                 <option value="video">Video</option>
                 <option value="document">Document</option>
                 <option value="link">Link</option>
                 <option value="log">Log</option>
               </select>
             </label>
           </div>

           <div className="mt-4 grid gap-4 lg:grid-cols-2">
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Actual result</span>
               <textarea className="form-field min-h-[130px]" value={runForm.actual_result} onChange={(event) => setRunForm((current) => ({ ...current, actual_result: event.target.value }))} placeholder="What happened during the test?" />
             </label>
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Notes and follow-up</span>
               <textarea className="form-field min-h-[130px]" value={runForm.notes} onChange={(event) => setRunForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Bug reference, owner, retest instructions, or blocker dependency" />
             </label>
           </div>

           <div className="mt-4 grid gap-4 md:grid-cols-2">
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Evidence URL</span>
               <input className="form-field" type="url" value={runForm.evidence_url} onChange={(event) => setRunForm((current) => ({ ...current, evidence_url: event.target.value }))} placeholder="https://..." />
             </label>
             <label className="block">
               <span className="mb-2 block text-sm font-black text-slate-700">Evidence name</span>
               <input className="form-field" value={runForm.evidence_name} onChange={(event) => setRunForm((current) => ({ ...current, evidence_name: event.target.value }))} placeholder="Employee onboarding screenshot" />
             </label>
           </div>

           <div className="mt-5 flex justify-end">
             <button type="button" className="btn-primary" disabled={saving} onClick={recordResult}>{saving ? "Saving..." : "Save QA result"}</button>
           </div>
         </section>
       )}

       <section className="space-y-3">
         {filteredCases.map((testCase) => (
           <article key={testCase.id} className={`premium-card ${testCase.is_launch_blocker && testCase.status !== "passed" ? "border-red-200" : ""}`}>
             <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
               <div className="min-w-0 flex-1">
                 <div className="flex flex-wrap items-center gap-2">
                   <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ring-1 ${statusTone(testCase.status)}`}>{statusLabels[testCase.status]}</span>
                   <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ring-1 ${priorityTone(testCase.priority)}`}>{testCase.priority}</span>
                   <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">{testCase.test_type}</span>
                   {testCase.is_launch_blocker && <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-black uppercase text-white">Launch blocker</span>}
                 </div>
                 <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-blue-600">{testCase.category} · {testCase.user_role.replace(/_/g, " ")}</p>
                 <h3 className="mt-1 text-xl font-black text-slate-950">{testCase.title}</h3>
                 <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{testCase.description}</p>
                 <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
                   <span>{testCase.requirement_reference || "Internal release requirement"}</span>
                   {testCase.route_path && <span>Route: {testCase.route_path}</span>}
                   <span>Last tested: {formatDate(testCase.tested_at)}</span>
                   {testCase.tester_name && <span>Tester: {testCase.tester_name}</span>}
                   {testCase.evidence_count > 0 && <span>{testCase.evidence_count} evidence item(s)</span>}
                 </div>
                 {testCase.actual_result && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><strong>Actual result:</strong> {testCase.actual_result}</div>}
               </div>
               <button type="button" className="btn-secondary shrink-0" onClick={() => openResultForm(testCase)}>Record result</button>
             </div>
           </article>
         ))}
         {!loading && filteredCases.length === 0 && <div className="empty-state">No QA requirements match these filters.</div>}
       </section>
     </>
   );

   const pageContent = (
     <div className="space-y-6">
       <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-6 text-white shadow-xl md:p-8">
         <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
           <div>
             <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Client acceptance and launch control</p>
             <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">QA Readiness Center</h1>
             <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-blue-100 md:text-base">
               Validate the client-requested registration, payment, course, employer, onboarding, journey, resource, branding, messaging, and security flows with evidence and release history.
             </p>
           </div>
           <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
             <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Launch decision</p>
             <p className="mt-1 text-2xl font-black">{loading ? "Checking..." : readinessLabel(summary?.readiness)}</p>
             <p className="mt-1 text-sm font-bold text-blue-100">{summary?.critical_blocker_count || 0} unresolved critical blocker(s)</p>
           </div>
         </div>
       </section>

       {notice && <div className={`rounded-2xl p-4 text-sm font-bold ring-1 ${notice.startsWith("Saved") ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-red-50 text-red-700 ring-red-100"}`}>{notice}</div>}

       <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
         {metricCards.map((card) => (
           <div key={card.label} className="metric-card">
             <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
             <h2 className={`mt-2 text-3xl font-black ${card.tone}`}>{card.value}</h2>
           </div>
         ))}
       </section>

       <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
         {tabs.map((tab) => (
           <button
             key={tab.key}
             type="button"
             onClick={() => setActiveTab(tab.key)}
             className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${activeTab === tab.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
           >
             {tab.label}{typeof tab.count === "number" ? ` (${tab.count})` : ""}
           </button>
         ))}
         <button type="button" className="ml-auto rounded-xl px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-50" onClick={loadQa}>Refresh</button>
       </nav>

       {activeTab === "overview" && (
         <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
           <section className="premium-card">
             <div className="flex items-start justify-between gap-4">
               <div>
                 <p className="eyebrow">Requirement coverage</p>
                 <h2 className="mt-1 text-2xl font-black text-slate-950">Readiness by client feature</h2>
               </div>
               <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${summary?.critical_blocker_count ? "bg-red-100 text-red-700 ring-red-200" : "bg-emerald-100 text-emerald-700 ring-emerald-200"}`}>
                 {summary?.critical_blocker_count || 0} blockers
               </span>
             </div>
             <div className="mt-5 space-y-4">
               {(summary?.category_coverage || []).map((category) => (
                 <div key={category.name}>
                   <div className="mb-2 flex items-center justify-between gap-3 text-sm font-black">
                     <span className="text-slate-700">{category.name}</span>
                     <span className="text-slate-500">{category.score}%</span>
                   </div>
                   <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${category.score}%` }} /></div>
                 </div>
               ))}
               {!loading && (summary?.category_coverage.length || 0) === 0 && <div className="empty-state">No category data available.</div>}
             </div>
           </section>

           <aside className="space-y-6">
             <section className="premium-card">
               <p className="eyebrow text-red-600">Launch blockers</p>
               <h2 className="mt-1 text-2xl font-black text-slate-950">Needs immediate attention</h2>
               <div className="mt-4 space-y-3">
                 {(summary?.critical_blockers || []).slice(0, 6).map((item) => (
                   <button key={item.id} type="button" onClick={() => { setActiveTab("requirements"); openResultForm(item); }} className="w-full rounded-xl border border-red-100 bg-red-50 p-3 text-left transition hover:border-red-200">
                     <p className="text-xs font-black uppercase text-red-600">{statusLabels[item.status]} · {item.category}</p>
                     <p className="mt-1 text-sm font-black text-slate-900">{item.title}</p>
                   </button>
                 ))}
                 {!loading && (summary?.critical_blockers.length || 0) === 0 && <div className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">No unresolved critical blockers.</div>}
               </div>
             </section>
             <section className="premium-card">
               <p className="eyebrow">Testing activity</p>
               <h2 className="mt-1 text-xl font-black text-slate-950">Last recorded result</h2>
               <p className="mt-3 text-sm font-bold text-slate-500">{formatDate(summary?.last_tested_at)}</p>
               <p className="mt-2 text-xs font-semibold text-slate-400">A new run is saved for every result so previous release evidence is retained.</p>
             </section>
           </aside>
         </div>
       )}

       {activeTab === "requirements" && requirementsPanel}

       {activeTab === "blockers" && (
         <section className="space-y-3">
           {(summary?.critical_blockers || []).map((testCase) => (
             <article key={testCase.id} className="premium-card border-2 border-red-200">
               <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                 <div>
                   <div className="flex flex-wrap gap-2">
                     <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${statusTone(testCase.status)}`}>{statusLabels[testCase.status]}</span>
                     <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">Launch blocker</span>
                   </div>
                   <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-red-600">{testCase.category}</p>
                   <h2 className="mt-1 text-xl font-black text-slate-950">{testCase.title}</h2>
                   <p className="mt-2 text-sm font-semibold text-slate-500">{testCase.description}</p>
                 </div>
                 <button type="button" className="btn-primary" onClick={() => { setActiveTab("requirements"); openResultForm(testCase); }}>Record result</button>
               </div>
             </article>
           ))}
           {!loading && (summary?.critical_blockers.length || 0) === 0 && <div className="empty-state">All critical launch requirements have passed or are not applicable.</div>}
         </section>
       )}

       {activeTab === "system" && (
         <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
           <section className="premium-card">
             <div className="flex flex-wrap items-start justify-between gap-4">
               <div>
                 <p className="eyebrow">Automated infrastructure checks</p>
                 <h2 className="mt-1 text-2xl font-black text-slate-950">System and deployment health</h2>
                 <p className="mt-2 text-sm font-semibold text-slate-500">These checks support launch readiness but do not replace client acceptance testing.</p>
               </div>
               <div className="text-right"><p className="text-3xl font-black text-blue-700">{systemPayload?.score || 0}%</p><p className="text-xs font-bold text-slate-400">System score</p></div>
             </div>
             <div className="mt-5 space-y-3">
               {(systemPayload?.checks || []).map((check) => (
                 <div key={check.key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                   <div className="flex flex-wrap items-start justify-between gap-3">
                     <div><h3 className="font-black text-slate-950">{check.label}</h3>{check.detail && <p className="mt-1 text-sm font-semibold text-slate-500">{check.detail}</p>}</div>
                     <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${statusTone(check.status)}`}>{check.status}</span>
                   </div>
                 </div>
               ))}
               {!loading && !systemPayload && <div className="empty-state">System checks could not be loaded.</div>}
             </div>
           </section>

           <aside className="premium-card">
             <p className="eyebrow">Release checklist</p>
             <h2 className="mt-1 text-2xl font-black text-slate-950">Before production launch</h2>
             <div className="mt-4 space-y-3">
               {securityChecklist.map((item, index) => (
                 <div key={item} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
                   <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">{index + 1}</span>
                   <span>{item}</span>
                 </div>
               ))}
             </div>
           </aside>
         </div>
       )}
     </div>
   );

   if (embedded) return pageContent;

   return (
     <main className="theme-page min-h-screen text-slate-950">
       <Navbar />
       <section className="px-4 py-8 md:px-6 lg:py-12">
         <div className="section-container">{pageContent}</div>
       </section>
     </main>
   );
 }

 export default DeploymentReadinessCenter;
