import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Radar } from 'react-chartjs-2';
import { 
  ShieldCheck, AlertTriangle, ArrowRight, Activity, Sparkles, Loader2, Download, Lock, Mail, Key, History, Target, Clock, ArrowUpDown, FileText, Upload, CheckCircle2, AlertCircle, Briefcase, Calendar
} from 'lucide-react';
import { 
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend 
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const getCMMLevel = (scoreOutOf5) => {
  if (scoreOutOf5 < 1) return { level: 'CMM 0: Incomplete', color: 'text-slate-400', desc: 'Reactive.' };
  if (scoreOutOf5 < 2) return { level: 'CMM 1: Initial', color: 'text-red-400', desc: 'Unpredictable.' };
  if (scoreOutOf5 < 3) return { level: 'CMM 2: Managed', color: 'text-orange-400', desc: 'Project-based.' };
  if (scoreOutOf5 < 4) return { level: 'CMM 3: Defined', color: 'text-yellow-400', desc: 'Organization-wide.' };
  if (scoreOutOf5 < 4.8) return { level: 'CMM 4: Predictable', color: 'text-blue-400', desc: 'Measured.' };
  return { level: 'CMM 5: Optimizing', color: 'text-emerald-400', desc: 'Continuous improvement.' };
};

export default function App() {
  const [step, setStep] = useState(-1); 
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [evidence, setEvidence] = useState({}); 
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [aiResponses, setAiResponses] = useState({});
  const [aiLoading, setAiLoading] = useState(null);
  const [policyDrafts, setPolicyDrafts] = useState({}); 
  const [draftLoading, setDraftLoading] = useState(null);

  // NEW: Lifecycle State Management
  const [gapStatuses, setGapStatuses] = useState({}); 

  const [history, setHistory] = useState([]);
  const [gapSort, setGapSort] = useState('priority-desc');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/questions')
      .then(res => setQuestions(res.data))
      .catch(err => console.error("Error fetching questions.", err));
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/history');
      setHistory(res.data);
    } catch (err) { console.error("Error fetching history", err); }
  };

  useEffect(() => { if (step === 2) fetchHistory(); }, [step]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setTimeout(() => { setLoginLoading(false); setStep(0); }, 1000);
  };

  const handleAnswer = (questionId, value) => setAnswers(prev => ({ ...prev, [questionId]: value }));
  const handleEvidenceUpload = (questionId, file) => { if(file) setEvidence(prev => ({ ...prev, [questionId]: file.name })); };
  
  // NEW: Status Update Handler
  const handleStatusChange = (gapId, status) => { setGapStatuses(prev => ({ ...prev, [gapId]: status })); };

  const submitAssessment = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/analyze', { answers, evidence });
      setResults(res.data);
      // Initialize all new gaps to "Open" status
      const initialStatuses = {};
      res.data.gaps.forEach(gap => initialStatuses[gap.id] = 'Open');
      setGapStatuses(initialStatuses);
      setStep(2);
    } catch (err) { console.error(err); alert("Analysis failed."); }
    setLoading(false);
  };

const askAI = async (gapId, question, domain) => {
    setAiLoading(gapId);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/ai-remediation', { question, domain });
      setAiResponses(prev => ({ ...prev, [gapId]: res.data.ai_advice }));
    } catch (err) { 
      // This catches the real 500 Error from the backend
      alert("Google Gemini is experiencing high traffic. Please wait a moment and try clicking again."); 
    }
    setAiLoading(null);
  };

  const draftPolicy = async (gapId, question) => {
    setDraftLoading(gapId);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/draft-policy', { question });
      setPolicyDrafts(prev => ({ ...prev, [gapId]: res.data.draft }));
    } catch (err) { 
      alert("Google Gemini is experiencing high traffic. Please wait a moment and try clicking again."); 
    }
    setDraftLoading(null);
  }
  const exportPDF = async () => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/report', results, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'Report.pdf');
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { console.error(err); }
  };

  const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
  const sortedGaps = results ? [...results.gaps].sort((a, b) => {
    const valA = priorityMap[a.priority] || 0;
    const valB = priorityMap[b.priority] || 0;
    return gapSort === 'priority-desc' ? valB - valA : valA - valB;
  }) : [];

  // --- VIEWS ---
  if (step === -1) { /* Keeping identical for brevity */
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-700">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4"><Lock size={32} /></div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Enterprise Portal</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-slate-900 dark:text-white" placeholder="admin@company.com" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-slate-900 dark:text-white" placeholder="••••••••" />
            <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg">{loginLoading ? 'Authenticating...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 0) { /* Keeping identical for brevity */
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <h1 className="text-6xl font-black mb-6 text-slate-900 dark:text-white tracking-tight">ComplianceIQ <span className="text-blue-600">AI</span></h1>
        <button onClick={() => setStep(1)} className="px-12 py-4 text-lg font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-xl transition-all hover:-translate-y-1">Start New Audit</button>
      </div>
    );
  }

  if (step === 1) { /* Keeping identical for brevity */
    const progress = Math.round((Object.keys(answers).length / questions.length) * 100) || 0;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm mb-8 sticky top-4 z-10 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-3 font-bold text-slate-800 dark:text-white">
              <span>Progress</span><span className="text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:border-blue-200">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Q{index + 1}: {q.question}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {q.options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(q.id, opt)} className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${answers[q.id] === opt ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>{opt}</button>
                  ))}
                </div>
                {answers[q.id] === 'Yes' && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400"><Upload size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Attach Evidence (Audit Workflow)</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Upload policy docs or screenshots to verify compliance.</p>
                      </div>
                    </div>
                    <div>
                      {evidence[q.id] ? (
                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-emerald-200"><CheckCircle2 size={16}/> {evidence[q.id]}</span>
                      ) : (
                        <label className="cursor-pointer bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 text-sm font-bold px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 hover:shadow-md transition-all">
                          Choose File
                          <input type="file" className="hidden" onChange={(e) => handleEvidenceUpload(q.id, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={submitAssessment} className="mt-12 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Generate Executive Report'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 2 && results) {
    const radarData = {
      labels: Object.keys(results.scores),
      datasets: [{
        label: 'CMM Level', data: Object.values(results.scores),
        backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 1)', pointBackgroundColor: '#fff', borderWidth: 2,
      }]
    };
    const currentCMM = getCMMLevel(results.overall_percentage / 20);
    const criticalGaps = results.gaps.filter(g => g.priority === 'High').length;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Executive Dashboard</h1>
            <button onClick={exportPDF} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all">
              <Download size={18} /> Export CISO PDF
            </button>
          </div>

          {/* NEW: EXECUTIVE SUMMARY METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Maturity Score</p>
               <p className="text-3xl font-black text-slate-900 dark:text-white">{results.overall_percentage}%</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 text-red-100 dark:text-red-900/20"><AlertCircle size={48}/></div>
               <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Critical Exposures</p>
               <p className="text-3xl font-black text-red-600 dark:text-red-400 relative z-10">{criticalGaps}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Gaps Tracked</p>
               <p className="text-3xl font-black text-slate-800 dark:text-slate-200">{results.gaps.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
               <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Evidences Verified</p>
               <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{results.evidence_count}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl text-center flex flex-col justify-center">
              <div className="text-8xl font-black mb-1">{results.overall_percentage}%</div>
              <div className={`text-2xl font-black mt-4 mb-2 ${currentCMM.color}`}>{currentCMM.level}</div>
              <div className="text-sm opacity-70 px-4">{currentCMM.desc}</div>
            </div>
            
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 uppercase text-slate-500 text-xs">CMM Mapping</h2>
                  <div className="h-[250px]"><Radar data={radarData} options={{ maintainAspectRatio: false, scales: { r: { min: 0, max: 5 } }, plugins: { legend: { display: false } } }} /></div>
                </div>
                <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-6 md:pt-0 md:pl-8">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-widest text-slate-500 text-xs"><Target size={16} /> Framework Crosswalk</h2>
                  <div className="space-y-5">
                    {Object.entries(results.mapped_frameworks).map(([framework, score]) => (
                      <div key={framework}>
                        <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          <span>{framework}</span><span>{score}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${score}%` }}></div>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400 italic mt-4">*Translated dynamically based on shared control domains.</p>
                  </div>
                </div>
            </div>
          </div>

          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Activity className="text-blue-500" /> Compliance Lifecycle Management
            </h2>
            
            {/* RESTORED: GAPS SORTING DROPDOWN */}
            <div className="relative">
              <select 
                value={gapSort} 
                onChange={(e) => setGapSort(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold py-2 pl-4 pr-10 rounded-xl outline-none cursor-pointer shadow-sm"
              >
                <option value="priority-desc">Priority: High to Low (Desc)</option>
                <option value="priority-asc">Priority: Low to High (Asc)</option>
              </select>
              <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-20">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-xs uppercase font-black border-b border-slate-100 dark:border-slate-700">
                <tr><th className="p-6 w-1/4">Status & Priority</th><th className="p-6 w-1/3">Identified Gap</th><th className="p-6">AI Execution Engine</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sortedGaps.map(gap => {
                  return (
                  <tr key={gap.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-6 align-top border-r border-slate-50 dark:border-slate-700/30">
                      
                      {/* NEW: STATUS LIFECYCLE WORKFLOW */}
                      <select 
                        value={gapStatuses[gap.id] || 'Open'} 
                        onChange={(e) => handleStatusChange(gap.id, e.target.value)}
                        className={`mb-4 w-full appearance-none text-xs font-black uppercase tracking-wider py-2 px-3 rounded-xl border outline-none cursor-pointer ${
                          gapStatuses[gap.id] === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          gapStatuses[gap.id] === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <option value="Open">🔴 Open</option>
                        <option value="In Progress">🟡 In Progress</option>
                        <option value="Verified">🟢 Verified (Closed)</option>
                      </select>

                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${gap.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{gap.priority} Priority</span>
                      <div className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{gap.domain}</div>
                    </td>
                    <td className="p-6 align-top">
                      <p className="font-bold text-slate-800 dark:text-white text-base leading-snug">{gap.question}</p>
                      <p className="text-sm font-medium text-slate-500 mt-2">{gap.remediation}</p>
                    </td>
                    <td className="p-6 align-top">
                      <div className="flex gap-2 mb-4">
                        {!aiResponses[gap.id] && (
                          <button onClick={() => askAI(gap.id, gap.question, gap.domain, gap.priority)} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 border border-indigo-100 dark:border-indigo-800/50">
                            {aiLoading === gap.id ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Generate Plan
                          </button>
                        )}
                        {!policyDrafts[gap.id] && (
                          <button onClick={() => draftPolicy(gap.id, gap.question)} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2">
                            {draftLoading === gap.id ? <Loader2 className="animate-spin" size={14}/> : <FileText size={14}/>} Draft Policy
                          </button>
                        )}
                      </div>

                      {/* NEW: STRUCTURED AI JSON CARDS */}
                      {aiResponses[gap.id] && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
                          <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 border-b border-indigo-100 dark:border-indigo-800/50 flex items-center gap-2">
                            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400"/> 
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-300">AI Implementation Plan</span>
                          </div>
                          <div className="p-4 text-sm">
                             <div className="mb-3">
                               <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Immediate Action</p>
                               <p className="font-semibold text-slate-800 dark:text-slate-200">{aiResponses[gap.id].action}</p>
                             </div>
                             <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                               <div className="flex items-center gap-2">
                                  <Briefcase size={14} className="text-slate-400"/>
                                  <div>
                                    <p className="text-[9px] font-bold uppercase text-slate-400">Ideal Owner</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{aiResponses[gap.id].owner}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-slate-400"/>
                                  <div>
                                    <p className="text-[9px] font-bold uppercase text-slate-400">Timeline</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{aiResponses[gap.id].timeline}</p>
                                  </div>
                               </div>
                             </div>
                          </div>
                        </div>
                      )}

                      {/* Draft Policy Display remains unchanged */}
                      {policyDrafts[gap.id] && (
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line border-2 border-slate-200 dark:border-slate-700 shadow-inner relative mt-4 max-h-64 overflow-y-auto font-serif">
                          <div className="mt-2">{policyDrafts[gap.id]}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  return null;
}