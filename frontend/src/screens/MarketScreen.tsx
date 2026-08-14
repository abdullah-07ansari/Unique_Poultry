import { Search, ShoppingBag, Truck, CheckCircle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketScreen() {
  // Mock 7-day Commodity Prices Data (Maize, Soy, Live Broiler)
  const data = [
    { name: 'Mon', Maize: 20.5, Soy: 41.2, Broiler: 98 },
    { name: 'Tue', Maize: 20.8, Soy: 41.0, Broiler: 98 },
    { name: 'Wed', Maize: 21.1, Soy: 41.5, Broiler: 99 },
    { name: 'Thu', Maize: 20.9, Soy: 42.1, Broiler: 101 },
    { name: 'Fri', Maize: 21.4, Soy: 42.8, Broiler: 102 },
    { name: 'Sat', Maize: 21.8, Soy: 42.6, Broiler: 102 },
    { name: 'Sun', Maize: 22.1, Soy: 43.0, Broiler: 104 },
  ];

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title">Marketplace & Live API</h2>

      {/* Advanced Market API Graph */}
      <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid var(--accent-secondary)' }}>
         <h3 className="card-title text-secondary"><TrendingUp size={18}/> Live Commodity Market Trends (7-Day API)</h3>
         <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Automated price scraping: Nashik Poultry Mandi</p>
         
         <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBroiler" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSoy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMaize" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <Tooltip 
                 contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }}
                 itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="Broiler" stroke="#ef4444" fillOpacity={1} fill="url(#colorBroiler)" name="Broiler (₹/kg)" />
              <Area type="monotone" dataKey="Soy" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSoy)" name="Soybean (₹/kg)" />
              <Area type="monotone" dataKey="Maize" stroke="#10b981" fillOpacity={1} fill="url(#colorMaize)" name="Maize (₹/kg)" />
            </AreaChart>
          </ResponsiveContainer>
         </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-card)' }}>
        <Search size={18} className="text-muted" />
        <input 
          type="text" 
          placeholder="Search feed, buyers, equipment..."
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-main)', outline: 'none' }}
        />
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: '1rem', borderTop: '4px solid var(--accent-success)' }}>
           <h3 className="card-title text-success"><ShoppingBag size={18}/> Sell Birds</h3>
           <p style={{fontSize: '0.875rem', marginBottom: '1rem'}} className="text-muted">Today's Live Rate: <strong>₹104/kg</strong> <span className="text-success">▲ +₹2</span></p>
           <button style={{ width: '100%', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem', fontWeight: 600 }}>
             List Batch for Sale
           </button>
        </div>

        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Orders</h3>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Truck size={24} className="text-primary" stroke="#3b82f6"/>
            </div>
            <div style={{ flex: 1 }}>
               <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Star Finisher Feed</h4>
               <p className="text-muted" style={{ fontSize: '0.875rem' }}>In Transit • ETA: Tomorrow</p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7, marginBottom: 0 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <CheckCircle size={24} className="text-success"/>
            </div>
            <div style={{ flex: 1 }}>
               <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Day-Old Chicks (5k)</h4>
               <p className="text-muted" style={{ fontSize: '0.875rem' }}>Delivered • 2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
