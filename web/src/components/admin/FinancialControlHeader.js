import { DollarSign, AlertCircle, Package, CheckCircle2, TrendingUp } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

const KPICard = ({ icon: Icon, label, amount, count, variant = 'default', subtext }) => {
  const { tByEn } = useLang();
  const variants = {
    default: 'bg-surface border-border',
    success: 'bg-surface border-primary/30',
    warning: 'bg-surface border-warning/30',
    danger: 'bg-surface border-danger/30',
    info: 'bg-surface border-border'
  };

  return (
    <div className={`rounded-xl border ${variants[variant]} p-6 transition-all hover:border-opacity-60`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-surface-2">
          <Icon className="w-5 h-5 text-text-secondary" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{label}</p>
        <p className="text-3xl font-semibold tracking-tight text-text-primary">
          ${amount?.toLocaleString() || '0'}
        </p>
        <p className="text-sm text-text-secondary">{count || 0} earning{count !== 1 ? 's' : ''}</p>
        {subtext && (
          <p className="text-xs text-text-muted mt-2">{subtext}</p>
        )}
      </div>
    </div>
  );
};

const FinancialControlHeader = ({ overview }) => {
  const { tByEn } = useLang();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        icon={CheckCircle2}
        label={tByEn('Approved Earnings')}
        amount={overview?.approved_amount || 0}
        count={overview?.approved_count || 0}
        variant="success"
        subtext="Ready for batching"
      />
      <KPICard
        icon={AlertCircle}
        label={tByEn('Held Earnings')}
        amount={overview?.held_amount || 0}
        count={overview?.held_count || 0}
        variant="warning"
        subtext="Blocked by QA"
      />
      <KPICard
        icon={AlertCircle}
        label={tByEn('Flagged Earnings')}
        amount={overview?.flagged_amount || 0}
        count={overview?.flagged_count || 0}
        variant="danger"
        subtext="Needs trust review"
      />
      <KPICard
        icon={Package}
        label={tByEn('Draft Batches')}
        amount={overview?.draft_batches_amount || 0}
        count={overview?.draft_batches_count || 0}
        variant="info"
        subtext="Awaiting approval"
      />
      <KPICard
        icon={TrendingUp}
        label={tByEn('Paid This Period')}
        amount={overview?.paid_this_period_amount || 0}
        count={overview?.paid_this_period_count || 0}
        variant="default"
        subtext="Cash already out"
      />
    </div>
  );
};

export default FinancialControlHeader;