

interface MetricCardProps {
  title: string;
  description: string | React.ReactNode;
  icon: React.ReactNode;
  variant: 'opp' | 'risk';
  highlight?: string;
  fix?: { title: string; content: string };
  badge?: { text: string; type: 'success' | 'warning' };
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  description, 
  icon, 
  variant, 
  highlight, 
  fix,
  badge
}) => {
  return (
    <div className={`card card-${variant}`}>
      <div className={`card-icon icon-${variant}`}>
        {icon}
      </div>
      
      {badge && (
        <div className={`tag tag-${badge.type}`}>
          {badge.text}
        </div>
      )}

      <h3 className="card-title">{title}</h3>
      
      {highlight && (
        <div className={`highlight-value highlight-${variant}`}>
          {highlight}
        </div>
      )}

      <div className="card-text">{description}</div>

      {fix && (
        <div className="fix-box">
          <div className="fix-box-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}>
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            {fix.title}
          </div>
          <div style={{color: 'var(--color-text-main)'}}>{fix.content}</div>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
