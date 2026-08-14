import { Home, ListOrdered, IndianRupee, HeartPulse, LineChart, Store } from 'lucide-react';

export type TabId = 'home' | 'batch' | 'expense' | 'health' | 'analytics' | 'market';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'batch', label: 'Batch', icon: ListOrdered },
    { id: 'expense', label: 'Expense', icon: IndianRupee },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'market', label: 'Market', icon: Store },
  ] as const;

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id as TabId)}
          >
            <Icon size={24} className="nav-icon" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
