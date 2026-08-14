import { useEffect, useState } from 'react';
import { Plus, BarChart2, TrendingDown } from 'lucide-react';

interface ExpenseData {
  _id: string;
  category: string;
  amount: number;
  date: string;
}

interface DashboardStats {
  totalCost: number;
  costPerBird: number;
}

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Quick log states
  const [feedExp, setFeedExp] = useState('');
  const [medExp, setMedExp] = useState('');
  const [laborExp, setLaborExp] = useState('');

  const loadData = () => {
    fetch('http://localhost:5000/api/expenses')
      .then(res => res.json())
      .then(data => setExpenses(data));

    fetch('http://localhost:5000/api/dashboard')
      .then(res => res.json())
      .then(data => setStats(data));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogAll = async () => {
    try {
      if (feedExp && parseInt(feedExp) > 0) {
        await fetch('http://localhost:5000/api/expenses', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'Feed', amount: parseInt(feedExp) })
        });
      }
      if (medExp && parseInt(medExp) > 0) {
        await fetch('http://localhost:5000/api/expenses', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'Medicine', amount: parseInt(medExp) })
        });
      }
      if (laborExp && parseInt(laborExp) > 0) {
        await fetch('http://localhost:5000/api/expenses', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'Labor', amount: parseInt(laborExp) })
        });
      }

      // Reset
      setFeedExp('');
      setMedExp('');
      setLaborExp('');
      
      // Refresh
      loadData();
    } catch (error) {
       console.error(error);
    }
  };

  const calculateBarHeight = (cat: string) => {
    if (expenses.length === 0) return '0%';
    const catTotal = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    const max = Math.max(...expenses.map(e => e.amount));
    if (max === 0) return '0%';
    return `${Math.max((catTotal / stats?.totalCost!) * 100, 5)}%`;
  };

  const inputStyle = {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-card)',
    borderRadius: '8px',
    padding: '0.5rem',
    color: 'var(--text-main)',
    outline: 'none'
  };

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{marginBottom: '1rem'}}>Expenses</h2>

      <div className="grid-2">
         <div className="card" style={{ marginBottom: 0 }}>
           <div className="card-title text-muted">Total Cost</div>
           <div className="card-value">₹{stats?.totalCost.toLocaleString() || '...'}</div>
         </div>
         <div className="card" style={{ marginBottom: 0 }}>
           <div className="card-title text-muted">Cost/Bird</div>
           <div className="card-value">₹{stats?.costPerBird || '...'}</div>
         </div>
      </div>

      <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <h3 className="card-title text-success"><Plus size={16}/> Quick Log (₹)</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
             <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Feed:</span>
             <input type="number" placeholder="Amt..." value={feedExp} onChange={e => setFeedExp(e.target.value)} style={inputStyle} />
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
             <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Med:</span>
             <input type="number" placeholder="Amt..." value={medExp} onChange={e => setMedExp(e.target.value)} style={inputStyle} />
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
             <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Labor:</span>
             <input type="number" placeholder="Amt..." value={laborExp} onChange={e => setLaborExp(e.target.value)} style={inputStyle} />
           </div>
           <button 
             onClick={handleLogAll}
             style={{ 
             background: 'var(--accent-primary)', color: '#fff', border: 'none', 
             borderRadius: '8px', padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
           }}>
             Save Expenses
           </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem', height: '200px', display: 'flex', flexDirection: 'column' }}>
        <h3 className="card-title text-muted"><BarChart2 size={16}/> API Cost Breakdown</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '1rem' }}>
          <div style={{ background: 'var(--accent-primary)', width: '30%', height: stats ? calculateBarHeight('Feed') : '50%', borderRadius: '4px', position: 'relative', transition: 'height 0.3s' }}>
             <span style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', width: '100%', textAlign: 'center'}}>Feed</span>
          </div>
          <div style={{ background: 'var(--accent-danger)', width: '30%', height: stats ? calculateBarHeight('Medicine') : '30%', borderRadius: '4px', position: 'relative', transition: 'height 0.3s' }}>
             <span style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', width: '100%', textAlign: 'center'}}>Med</span>
          </div>
          <div style={{ background: 'var(--accent-warning)', width: '30%', height: stats ? calculateBarHeight('Labor') : '50%', borderRadius: '4px', position: 'relative', transition: 'height 0.3s' }}>
             <span style={{ position: 'absolute', bottom: '-20px', fontSize: '0.75rem', width: '100%', textAlign: 'center'}}>Lab</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title"><TrendingDown size={16}/> Live Ledger Logs</h3>
        <ul style={{ listStyle: 'none', marginTop: '1rem', fontSize: '0.875rem' }}>
           {expenses.map((e) => (
             <li key={e._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
               <span>{e.category} </span>
               <span className="text-danger">-₹{e.amount.toLocaleString()}</span>
             </li>
           ))}
        </ul>
      </div>
    </div>
  );
}
