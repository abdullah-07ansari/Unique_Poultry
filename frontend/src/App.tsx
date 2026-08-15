import { useState, useEffect, useRef } from 'react';
import {
  Leaf, Home, ListOrdered, IndianRupee, HeartPulse, LineChart,
  Store, Cpu, Bell, Wheat, TrendingUp, Mic, Settings, ChevronDown
} from 'lucide-react';

import HomeScreen from './screens/HomeScreen';
import BatchScreen from './screens/BatchScreen';
import ExpenseScreen from './screens/ExpenseScreen';
import HealthScreen from './screens/HealthScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import MarketScreen from './screens/MarketScreen';
import IoTPipelineScreen from './screens/IoTPipelineScreen';
import AlertsScreen from './screens/AlertsScreen';
import NutritionScreen from './screens/NutritionScreen';
import GrowthScreen from './screens/GrowthScreen';
import VoiceScreen from './screens/VoiceScreen';
import SettingsScreen from './screens/SettingsScreen';
import './index.css';

export type TabId =
  | 'home' | 'alerts' | 'iot' | 'batch' | 'expense' | 'health'
  | 'analytics' | 'growth' | 'nutrition' | 'market' | 'voice' | 'settings';

const ALL_FARMS = [
  'Nashik Unit — Shed A/B/C/D',
  'Pune Unit — Green Valley',
  'Aurangabad — Agro Star'
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showMore, setShowMore] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [activeFarm, setActiveFarm] = useState(ALL_FARMS[0]);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then(r => r.json())
      .then(d => setAlertCount(d.unacknowledgedAlerts || 0))
      .catch(() => setAlertCount(7));
  }, [activeTab]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node))
        setShowMore(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = (tab: TabId) => { setActiveTab(tab); setShowMore(false); };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':       return <HomeScreen activeFarm={activeFarm} onNavigate={navigate} />;
      case 'alerts':     return <AlertsScreen />;
      case 'batch':      return <BatchScreen />;
      case 'expense':    return <ExpenseScreen />;
      case 'health':     return <HealthScreen />;
      case 'analytics':  return <AnalyticsScreen />;
      case 'growth':     return <GrowthScreen />;
      case 'nutrition':  return <NutritionScreen />;
      case 'market':     return <MarketScreen />;
      case 'iot':        return <IoTPipelineScreen />;
      case 'voice':      return <VoiceScreen />;
      case 'settings':   return <SettingsScreen />;
      default:           return <HomeScreen activeFarm={activeFarm} />;
    }
  };

  type NavItem = { id: TabId; label: string; icon: React.FC<any> };

  const primaryNav: NavItem[] = [
    { id: 'home',      label: 'Dashboard', icon: Home },
    { id: 'alerts',    label: 'Alerts',    icon: Bell },
    { id: 'health',    label: 'Health',    icon: HeartPulse },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'growth',    label: 'Growth AI', icon: TrendingUp },
    { id: 'nutrition', label: 'Nutrition', icon: Wheat },
    { id: 'batch',     label: 'Flocks',    icon: ListOrdered },
  ];

  const moreNav: NavItem[] = [
    { id: 'expense',  label: 'Financials', icon: IndianRupee },
    { id: 'market',   label: 'Market',     icon: Store },
    { id: 'iot',      label: 'IoT & Data', icon: Cpu },
    { id: 'voice',    label: 'Voice AI',   icon: Mic },
    { id: 'settings', label: 'Settings',   icon: Settings },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <Leaf color="#10b981" size={24} />
          <h1 className="app-title">Unique Poultry AI</h1>
        </div>

        <nav className="top-nav">
          {primaryNav.map(link => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            const isAlertsTab = link.id === 'alerts';
            return (
              <button
                key={link.id}
                id={`nav-${link.id}`}
                onClick={() => navigate(link.id)}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} />
                {link.label}
                {isAlertsTab && alertCount > 0 && (
                  <span className="nav-badge">{alertCount > 9 ? '9+' : alertCount}</span>
                )}
              </button>
            );
          })}

          {/* More ▾ Dropdown */}
          <div className="more-menu" ref={moreRef}>
            <button
              className={`nav-link ${moreNav.some(n => n.id === activeTab) ? 'active' : ''}`}
              onClick={() => setShowMore(s => !s)}
              id="nav-more"
            >
              More <ChevronDown size={14} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showMore && (
              <div className="more-dropdown">
                {moreNav.map(link => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.id}
                      id={`nav-more-${link.id}`}
                      onClick={() => navigate(link.id)}
                      className={`nav-link ${activeTab === link.id ? 'active' : ''}`}
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      <Icon size={15} />
                      {link.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="profile-area">
          <select
            className="farm-selector"
            value={activeFarm}
            onChange={e => setActiveFarm(e.target.value)}
            id="farm-selector"
          >
            {ALL_FARMS.map(f => <option key={f}>{f}</option>)}
          </select>
          <div className="profile-icon" title="Farm Manager">
            <span>👨‍🌾</span>
          </div>
        </div>
      </header>

      <main className="app-content">
        {renderScreen()}
      </main>
    </div>
  );
}

export default App;
