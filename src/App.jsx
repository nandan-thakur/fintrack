import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Save, 
  LayoutDashboard, 
  PieChart, 
  ArrowLeft,
  Calendar,
  IndianRupee,
  LogOut,
  Loader2,
  Pencil,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell
} from 'recharts';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithCustomToken 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  onSnapshot,
  query
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Constants & Initial State ---

const INCOME_CATEGORIES = ['Salary', 'Investments', 'Others'];
const EXPENSE_CATEGORIES = ['EMI', 'Rent', 'Maintenance', 'Credit Card Bill', 'Utilities', 'Bill', 'SIP', 'Others'];

// Clean, Professional Palette
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

const initialCategoryState = (categories) => {
  const state = {};
  categories.forEach(cat => {
    state[cat] = [{ id: Date.now() + Math.random(), value: '', label: '' }];
  });
  return state;
};

// Helper to get default dates
const getMonthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

// --- Helper Functions for Data Compatibility ---
// Handles both old format (number) and new format (object {amount, label})
const getAmount = (item) => (typeof item === 'object' && item !== null ? item.amount : Number(item));
const getLabel = (item, defaultLabel) => (typeof item === 'object' && item?.label ? item.label : defaultLabel);

// --- Components ---

const SummaryCard = ({ title, amount, type, icon: Icon }) => {
  const iconColor = type === 'income' ? 'text-emerald-600' : type === 'expense' ? 'text-red-600' : 'text-blue-600';
  const bgIcon = type === 'income' ? 'bg-emerald-50' : type === 'expense' ? 'bg-red-50' : 'bg-blue-50';
  const amountColor = type === 'income' ? 'text-emerald-700' : type === 'expense' ? 'text-red-700' : 'text-gray-900';

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className={`text-2xl font-semibold flex items-center ${amountColor}`}>
          <IndianRupee size={20} className="mr-0.5" strokeWidth={2.5} />
          {amount.toLocaleString('en-IN')}
        </h3>
      </div>
      <div className={`p-2 rounded-md ${bgIcon}`}>
        <Icon size={20} className={iconColor} />
      </div>
    </div>
  );
};

const TransactionRow = ({ t, onDelete, onEdit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const net = t.totalIncome - t.totalExpense;

  const renderBreakdown = (data) => {
    if (!data || Object.keys(data).length === 0) return null;
    return (
      <div className="mt-2 text-xs">
        {Object.entries(data).map(([cat, values]) => {
          const items = Array.isArray(values) ? values : [values];
          return items.map((val, idx) => {
            const amount = getAmount(val);
            const label = getLabel(val, cat);
            const displayLabel = cat === 'Others' ? label : cat;
            
            return (
              <div key={`${cat}-${idx}`} className="flex justify-between py-1 border-b border-gray-100 last:border-0 text-gray-600">
                <span>{displayLabel} {items.length > 1 && cat !== 'Others' && `(${idx + 1})`}</span>
                <span className="font-mono font-medium">₹{amount.toLocaleString('en-IN')}</span>
              </div>
            );
          });
        })}
      </div>
    );
  };

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm ${isOpen ? 'bg-gray-50' : ''}`}>
        <td className="px-4 py-3 text-gray-900 font-medium">
          {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>
        <td className="px-4 py-3 text-emerald-600 font-mono">
          {t.totalIncome > 0 ? `₹${t.totalIncome.toLocaleString('en-IN')}` : '-'}
        </td>
        <td className="px-4 py-3 text-red-600 font-mono">
          {t.totalExpense > 0 ? `₹${t.totalExpense.toLocaleString('en-IN')}` : '-'}
        </td>
        <td className="px-4 py-3 font-mono font-medium text-gray-900">
           {net >= 0 ? '+' : '-'} ₹{Math.abs(net).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
             <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200"
            >
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button 
              onClick={() => onEdit(t)}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
            >
              <Pencil size={16} />
            </button>
            <button 
              onClick={() => onDelete(t.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-gray-50/80">
          <td colSpan="5" className="px-4 py-3 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pl-2">
              {t.totalIncome > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-emerald-700 uppercase mb-1">Income Details</h5>
                  {renderBreakdown(t.incomes)}
                </div>
              )}
              {t.totalExpense > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-red-700 uppercase mb-1">Expense Details</h5>
                  {renderBreakdown(t.expenses)}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// --- Helper Component: Input Section ---
const InputSection = ({ title, cats, state, type, onAdd, onRemove, onChange }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
    <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
      {title}
    </h3>
    <div className="space-y-4">
      {cats.map(cat => (
        <div key={cat} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
          <label className="text-sm font-medium text-gray-700 pt-2">{cat}</label>
          <div className="sm:col-span-3 space-y-2">
            {state[cat].map((item, idx) => (
              <div key={item.id} className="flex gap-2">
                
                {/* Custom Label Input for "Others" */}
                {cat === 'Others' && (
                  <div className="flex-1">
                     <input
                      type="text"
                      placeholder="Description"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 text-sm"
                      value={item.label || ''}
                      onChange={(e) => onChange(cat, item.id, 'label', e.target.value, type)}
                    />
                  </div>
                )}

                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 text-sm"
                    value={item.value}
                    onChange={(e) => onChange(cat, item.id, 'value', e.target.value, type)}
                  />
                </div>
                {idx === state[cat].length - 1 && (
                  <button 
                    onClick={() => onAdd(cat, type)} 
                    className="p-2 bg-gray-50 text-blue-600 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors"
                    title="Add another row"
                  >
                    <Plus size={16} />
                  </button>
                )}
                {state[cat].length > 1 && (
                  <button 
                    onClick={() => onRemove(cat, item.id, type)} 
                    className="p-2 bg-gray-50 text-red-500 border border-gray-200 rounded-md hover:bg-red-50 transition-colors"
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- Auth Component ---
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-sm w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 p-2 rounded-md mb-3">
            <Wallet size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">FinTrack</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to manage your finances</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded text-xs mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-100">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // --- State ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState(getMonthBounds());
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeInputs, setIncomeInputs] = useState(initialCategoryState(INCOME_CATEGORIES));
  const [expenseInputs, setExpenseInputs] = useState(initialCategoryState(EXPENSE_CATEGORIES));
  const [isSaving, setIsSaving] = useState(false);

  // --- Firebase Effects ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- Logic Helpers ---
  const handleAddField = (category, type) => {
    const newItem = { id: Date.now() + Math.random(), value: '', label: '' };
    (type === 'income' ? setIncomeInputs : setExpenseInputs)(prev => ({
      ...prev, [category]: [...prev[category], newItem]
    }));
  };

  const handleRemoveField = (category, id, type) => {
    (type === 'income' ? setIncomeInputs : setExpenseInputs)(prev => ({
      ...prev, [category]: prev[category].length > 1 ? prev[category].filter(i => i.id !== id) : prev[category]
    }));
  };

  const handleFieldChange = (category, id, field, value, type) => {
    (type === 'income' ? setIncomeInputs : setExpenseInputs)(prev => ({
      ...prev, [category]: prev[category].map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setDate(transaction.date);
    
    // Reconstruct state from stored Objects (new format) or Numbers (old format)
    const reconstruct = (cats, data) => {
      const state = {};
      cats.forEach(cat => {
        const vals = data[cat];
        
        if (Array.isArray(vals) && vals.length) {
          state[cat] = vals.map(v => ({
            id: Math.random(),
            value: getAmount(v),
            label: getLabel(v, '')
          }));
        } else {
          state[cat] = [{ id: Math.random(), value: '', label: '' }];
        }
      });
      return state;
    };

    setIncomeInputs(reconstruct(INCOME_CATEGORIES, transaction.incomes || {}));
    setExpenseInputs(reconstruct(EXPENSE_CATEGORIES, transaction.expenses || {}));
    setView('add');
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const tData = { 
      date, incomes: {}, expenses: {}, totalIncome: 0, totalExpense: 0, 
      updatedAt: new Date().toISOString() 
    };
    if (!editingId) tData.createdAt = new Date().toISOString();

    const process = (inputs, target) => {
      let total = 0;
      Object.entries(inputs).forEach(([cat, items]) => {
        const processedItems = items.map(i => {
          const amt = parseFloat(i.value);
          if (!isNaN(amt) && amt > 0) {
            // New Format: Always save as object { amount, label }
            return { amount: amt, label: i.label };
          }
          return null;
        }).filter(Boolean);

        if (processedItems.length) { 
          target[cat] = processedItems; 
          total += processedItems.reduce((a, b) => a + b.amount, 0); 
        }
      });
      return total;
    };

    tData.totalIncome = process(incomeInputs, tData.incomes);
    tData.totalExpense = process(expenseInputs, tData.expenses);

    if (tData.totalIncome === 0 && tData.totalExpense === 0) {
      alert("Please enter at least one amount."); setIsSaving(false); return;
    }

    try {
      const ref = editingId 
        ? doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', editingId)
        : doc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'));
      
      editingId ? await updateDoc(ref, tData) : await setDoc(ref, tData);
      
      setEditingId(null);
      setIncomeInputs(initialCategoryState(INCOME_CATEGORIES));
      setExpenseInputs(initialCategoryState(EXPENSE_CATEGORIES));
      setView('dashboard');
    } catch (e) { console.error(e); alert("Failed to save."); } 
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this transaction?")) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id)); }
      catch(e) { console.error(e); }
    }
  };

  // --- Dashboard Data ---
  const filtered = transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const totInc = filtered.reduce((s, t) => s + t.totalIncome, 0);
  const totExp = filtered.reduce((s, t) => s + t.totalExpense, 0);
  const bal = totInc - totExp;
  
  const chartData = filtered.slice(0, 10).reverse().map(t => ({
    name: new Date(t.date).getDate(),
    Income: t.totalIncome,
    Expense: t.totalExpense
  }));

  const pieData = Object.entries(filtered.reduce((acc, t) => {
    Object.entries(t.expenses || {}).forEach(([c, v]) => {
      // Handle both old (number) and new (object) formats for Charts
      const sum = Array.isArray(v) 
        ? v.reduce((a, b) => a + getAmount(b), 0) 
        : getAmount(v); // legacy fallback (unlikely path if strict array used)
      
      acc[c] = (acc[c] || 0) + sum;
    });
    return acc;
  }, {})).map(([name, value]) => ({ name, value })).filter(i => i.value > 0);

  if (authLoading) return <div className="min-h-screen grid place-items-center bg-gray-50 text-blue-600"><Loader2 className="animate-spin w-8 h-8"/></div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-900">
            <div className="bg-blue-600 p-1.5 rounded text-white">
              <Wallet size={20} />
            </div>
            <span className="text-lg font-semibold tracking-tight">FinTrack</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 hidden sm:block">
              {user.email}
            </span>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            {view === 'dashboard' ? (
              <button 
                onClick={() => { setEditingId(null); setView('add'); }} 
                className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Add Transaction
              </button>
            ) : (
              <button 
                onClick={() => setView('dashboard')} 
                className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-1"
              >
                <ArrowLeft size={16} /> Dashboard
              </button>
            )}
            <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-red-600 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'dashboard' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
              <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-md border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 px-2">PERIOD:</span>
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={e=>setDateRange(p=>({...p,start:e.target.value}))} 
                  className="bg-transparent text-sm text-gray-700 outline-none border-r border-gray-200 pr-2"
                />
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={e=>setDateRange(p=>({...p,end:e.target.value}))} 
                  className="bg-transparent text-sm text-gray-700 outline-none pl-2"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard title="Total Income" amount={totInc} type="income" icon={TrendingUp} />
              <SummaryCard title="Total Expenses" amount={totExp} type="expense" icon={TrendingDown} />
              <SummaryCard title="Net Balance" amount={bal} type="balance" icon={Wallet} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Income vs Expense Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{top:5, right:5, left:-20, bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:11}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:11}} />
                      <Tooltip 
                        contentStyle={{borderRadius:'4px', border:'1px solid #e5e7eb', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}} 
                      />
                      <Bar dataKey="Income" fill="#2563eb" radius={[2,2,0,0]} barSize={32} />
                      <Bar dataKey="Expense" fill="#dc2626" radius={[2,2,0,0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense Breakdown</h3>
                <div className="h-64 relative">
                  <ResponsiveContainer>
                    <RePieChart>
                      <Pie
                        data={pieData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize:'11px'}} />
                    </RePieChart>
                  </ResponsiveContainer>
                  {pieData.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No Data</div>
                  )}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-800">Recent Transactions</h3>
                <span className="text-xs text-gray-500">{filtered.length} records found</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Income</th>
                      <th className="px-4 py-3 font-semibold">Expense</th>
                      <th className="px-4 py-3 font-semibold">Balance</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                          No transactions found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      filtered.map(t => (
                        <TransactionRow key={t.id} t={t} onDelete={handleDelete} onEdit={handleEdit} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto animate-slide-up">
            <div className="flex items-center gap-2 mb-6 text-sm">
              <button onClick={() => setView('dashboard')} className="text-gray-500 hover:text-gray-900">Dashboard</button>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-gray-900">{editingId ? 'Edit Transaction' : 'New Entry'}</span>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              />
            </div>

            <InputSection 
              title="Income Sources" 
              cats={INCOME_CATEGORIES} 
              state={incomeInputs} 
              type="income" 
              onAdd={handleAddField}
              onRemove={handleRemoveField}
              onChange={handleFieldChange}
            />
            <InputSection 
              title="Expenses" 
              cats={EXPENSE_CATEGORIES} 
              state={expenseInputs} 
              type="expense"
              onAdd={handleAddField}
              onRemove={handleRemoveField}
              onChange={handleFieldChange}
            />

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
              <button 
                onClick={() => setView('dashboard')}
                className="px-6 py-2 rounded-md font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}