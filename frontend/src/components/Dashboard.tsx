
import { 
  TrendingUp, 
  IndianRupee, 
  Smartphone, 
  MessageCircleOff, 
  Calculator, 
  Bot
} from 'lucide-react';
import MetricCard from './MetricCard';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-split animate-fade-in delay-2">
      {/* Opportunity Panel */}
      <section className="panel panel-opp">
        <div className="panel-title">
          <span className="badge-opp">The Opportunity</span>
          <h2>Why It Could Work</h2>
        </div>
        
        <div className="metric-cards">
          <MetricCard
            variant="opp"
            icon={<TrendingUp size={24} />}
            title="Tap into India's $30B+ Poultry Market"
            highlight="8% Annual Growth"
            description="The market is growing rapidly, with most farms still operating manually. This presents a massive opportunity for tech disruption."
          />

          <MetricCard
            variant="opp"
            icon={<IndianRupee size={24} />}
            title="Massive Profit Margins"
            highlight="~₹3.8L Savings"
            description="For a typical 10,000-bird farm, small AI-driven improvements in feed efficiency and mortality rates yield significant return on investment."
          />

          <MetricCard
            variant="opp"
            icon={<Smartphone size={24} />}
            title="Accessible Tech via WhatsApp"
            description="Using images and voice commands overcomes literacy and infrastructure barriers for farmers, eliminating the need for complex standalone apps."
          />
        </div>
      </section>

      {/* Risks Panel */}
      <section className="panel panel-risk">
        <div className="panel-title">
          <span className="badge-risk">The Risks</span>
          <h2>What to Fix Before Launch</h2>
        </div>

        <div className="metric-cards">
          <MetricCard
            variant="risk"
            icon={<MessageCircleOff size={24} />}
            title="Shifting WhatsApp Policies"
            description="Meta frequently changes WhatsApp Business APIs."
            badge={{ text: 'Blocker Risk', type: 'warning' }}
            fix={{ 
              title: 'Fix:', 
              content: 'Design the bot as a "utility" tool to comply with new messaging rules.' 
            }}
          />

          <MetricCard
            variant="risk"
            icon={<Calculator size={24} />}
            title="Flawed Financial Projections"
            description="Initial Year 1 goal of 500+ farms is largely overstated and unachievable given current sales cycles."
            badge={{ text: 'Overstated', type: 'warning' }}
            fix={{ 
              title: 'Fix:', 
              content: 'Revise Year 1 projections to a realistic target of 250 active farms.' 
            }}
          />

          <MetricCard
            variant="risk"
            icon={<Bot size={24} />}
            title="Overstated AI Capabilities"
            description="Complex unproven tech like disease diagnosis will reduce trust if inaccurate."
            badge={{ text: 'Tech Risk', type: 'warning' }}
            fix={{ 
              title: 'Fix:', 
              content: 'Focus on proven metrics like crowding analysis instead of unproven disease diagnosis.' 
            }}
          />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
