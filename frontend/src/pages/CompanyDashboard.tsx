import { useEffect, useState } from 'react';
import { companyApi, exportsApi } from '../api/client';
import type { CompanyDashboardAdmin, CompanyDashboardFounder, CompanyPhase, RevenueSummary } from '../api/client';

type Dashboard = Awaited<ReturnType<typeof companyApi.dashboard>>;

function RevenueSummaryBlock({ summary }: { summary: RevenueSummary }) {
  return (
    <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-vault-border">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Revenue</p>
        <h2 className="text-lg font-semibold text-white mt-0.5">Company revenue summary</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total revenue</p>
            <p className="text-xl font-semibold text-green-400 mt-1">₹{summary.totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-slate-500 text-xs mt-1">Monthly + One-time</p>
          </div>
          <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total expense</p>
            <p className="text-xl font-semibold text-red-400 mt-1">₹{summary.totalExpense.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Net revenue</p>
            <p className="text-xl font-semibold text-white mt-1">₹{summary.netRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
        {summary.byProject.length > 0 && (
          <div className="mt-5 pt-5 border-t border-vault-border">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">By project</p>
            <div className="flex flex-wrap gap-2">
              {summary.byProject.map((p) => (
                <div key={p.projectId} className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-sm">
                  <span className="text-white font-medium">{p.projectName}</span>
                  <span className="text-slate-500 mx-2">·</span>
                  <span className="text-green-400">₹{(p.monthlyRevenue + p.oneTimeRevenue).toLocaleString('en-IN')}</span>
                  <span className="text-slate-500 mx-1">rev</span>
                  <span className="text-red-400">₹{p.expense.toLocaleString('en-IN')}</span>
                  <span className="text-slate-500">exp</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PhaseBanner({
  phases,
  currentPhaseName,
  totalEquityInPool,
  revenueSummary,
}: {
  phases: CompanyPhase[];
  currentPhaseName: string;
  totalEquityInPool: number;
  revenueSummary?: RevenueSummary | null;
}) {
  const phaseList = phases?.length
    ? phases
    : [
        { id: '1', name: 'Sprout', monthlySalesTargetLabel: 'Upto 15 Lakh/Month' },
        { id: '2', name: 'Survival', monthlySalesTargetLabel: 'Upto 50 Lakh/Month' },
        { id: '3', name: 'Growth', monthlySalesTargetLabel: 'Upto 2 Crore/Month' },
        { id: '4', name: 'Mature', monthlySalesTargetLabel: 'Upto 10 Cr/Month' },
        { id: '5', name: 'Giant', monthlySalesTargetLabel: 'Above 10 Cr/Month' },
      ];
  const currentPhase = phases?.find((p) => p.name === currentPhaseName) ?? phaseList[0];
  const revenueLimitCurrent = currentPhase?.monthlySalesTargetLabel ?? 'Upto 15 Lakh/Month';
  const showSproutProgress = currentPhaseName === 'Sprout' && revenueSummary != null;
  const currentMonthRevenue = revenueSummary?.currentMonthRevenue ?? 0;
  const remainingToReach15Lakh = revenueSummary?.remainingToReach15Lakh ?? 15_00_000;

  return (
    <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-vault-border">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overview</p>
        <h2 className="text-lg font-semibold text-white mt-0.5">Phase & equity</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total equity in pool</p>
            <p className="text-xl font-semibold text-white mt-1">{Number(totalEquityInPool).toLocaleString()} units</p>
          </div>
          <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 flex-shrink-0" title="Current phase" />
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Current phase</p>
              <p className="text-lg font-semibold text-green-400 mt-0.5">{currentPhaseName}</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Revenue limit</p>
            <p className="text-lg font-semibold text-white mt-1">{revenueLimitCurrent}</p>
          </div>
        </div>
        {showSproutProgress && (
          <div className="mt-5 p-4 rounded-xl border border-green-500/40 bg-green-500/10">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Sprout — monthly target ₹15,00,000</p>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-slate-400 text-xs">Phase monthly revenue</p>
                <p className="text-xl font-semibold text-green-400 mt-0.5">₹{currentMonthRevenue.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Remaining to 15 Lakh</p>
                <p className="text-xl font-semibold text-amber-400 mt-0.5">₹{remainingToReach15Lakh.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-5 pt-5 border-t border-vault-border">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Revenue limit by phase</p>
          <div className="flex flex-wrap gap-2">
            {phaseList.map((p) => {
              const isCurrent = p.name === currentPhaseName;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    isCurrent ? 'border-green-500/60 bg-green-500/10' : 'border-vault-border bg-vault-dark/40'
                  }`}
                >
                  {isCurrent && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Current phase" />
                  )}
                  <span className={`font-medium ${isCurrent ? 'text-green-400' : 'text-slate-300'}`}>{p.name}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{p.monthlySalesTargetLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FounderView({ data }: { data: CompanyDashboardFounder }) {
  const { phases, currentPhaseName, totalEquityInPool, myContribution, allocatedEquity, equityPercent, notionalIncome, withdrawnIncome, balanceAbenka, revenueSummary } = data;
  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="pb-6 border-b border-vault-border">
        <h1 className="font-display text-2xl font-semibold text-white">Company dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your contribution, equity, and income</p>
      </header>

      <PhaseBanner phases={phases} currentPhaseName={currentPhaseName} totalEquityInPool={totalEquityInPool} revenueSummary={revenueSummary} />

      {revenueSummary && <RevenueSummaryBlock summary={revenueSummary} />}

      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-vault-border">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Contributions</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">My contribution & equity</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">My hours</p>
              <p className="text-xl font-semibold text-white mt-1">{myContribution.totalHours.toFixed(1)}</p>
              <p className="text-slate-500 text-xs mt-1">of {data.totalCompanyHours.toFixed(0)} total company hrs</p>
            </div>
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Allocated equity</p>
              <p className="text-xl font-semibold text-white mt-1">{allocatedEquity.toFixed(2)} units</p>
              <p className="text-slate-500 text-xs mt-1">{equityPercent.toFixed(2)}% of pool</p>
            </div>
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total points</p>
              <p className="text-xl font-semibold text-white mt-1">{myContribution.totalPoints.toFixed(2)}</p>
              <p className="text-slate-500 text-xs mt-1">{myContribution.contributionCount} contributions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-vault-border">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Income</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">Income & balance (₹)</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Notional income</p>
              <p className="text-xl font-semibold text-white mt-1">₹{notionalIncome.toLocaleString('en-IN')}</p>
              <p className="text-slate-500 text-xs mt-1">Hours × ₹1,500/hr</p>
            </div>
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Withdrawn income</p>
              <p className="text-xl font-semibold text-white mt-1">₹{withdrawnIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Balance (Abenka)</p>
              <p className="text-xl font-semibold text-brand-400 mt-1">₹{balanceAbenka.toLocaleString('en-IN')}</p>
              <p className="text-slate-500 text-xs mt-1">Notional − Withdrawn</p>
            </div>
          </div>
        </div>
      </section>

      {myContribution.recentContributions.length > 0 && (
        <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Activity</p>
            <h2 className="text-lg font-semibold text-white mt-0.5">Recent contributions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border bg-vault-dark/40">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Hours / Amount</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Points</th>
                </tr>
              </thead>
              <tbody>
                {myContribution.recentContributions.map((c, i) => (
                  <tr key={i} className="border-b border-vault-border/50 hover:bg-vault-dark/20 transition-colors">
                    <td className="px-6 py-3 text-slate-300 text-sm">{new Date(c.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-white font-medium">{c.projectName}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{c.type}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">
                      {c.type === 'TIME' ? (c.hours ?? 0).toFixed(1) : (c.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{(c.points ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function CompanyDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = () => {
    companyApi.dashboard().then(setData).catch((e) => setError(e.message));
  };

  useEffect(() => {
    companyApi.dashboard().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">Loading company dashboard…</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data) return null;

  if (data.view === 'founder') {
    return <FounderView data={data} />;
  }

  const adminData = data as CompanyDashboardAdmin;
  const { topContributors, pendingPayouts, phases } = adminData;
  const currentPhaseName = 'Sprout';
  const currentPhase = phases?.find((p) => p.name === currentPhaseName);
  const totalEquityInPool = currentPhase ? currentPhase.equityPoolQty : (phases?.[0]?.equityPoolQty ?? 1500);

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex items-start justify-between gap-4 pb-6 border-b border-vault-border">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Company dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Overview, founders, and company phases</p>
        </div>
        <button
          type="button"
          onClick={() => exportsApi.contributions()}
          className="px-4 py-2 rounded-lg bg-vault-card border border-vault-border text-slate-300 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors shrink-0"
        >
          Export contributions CSV
        </button>
      </header>

      <PhaseBanner phases={phases ?? []} currentPhaseName={currentPhaseName} totalEquityInPool={totalEquityInPool} revenueSummary={adminData.revenueSummary} />

      {adminData.revenueSummary && <RevenueSummaryBlock summary={adminData.revenueSummary} />}

      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-vault-border">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Metrics</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">Key counts</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Founders / users</p>
              <p className="text-xl font-semibold text-white mt-1">{adminData.users}</p>
            </div>
            <div className="p-4 rounded-lg bg-vault-dark/60 border border-vault-border">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Projects</p>
              <p className="text-xl font-semibold text-white mt-1">{adminData.projects}</p>
            </div>
          </div>
        </div>
      </section>

      {adminData.founderSummary && adminData.founderSummary.length > 0 && (
        <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">People</p>
            <h2 className="text-lg font-semibold text-white mt-0.5">Founders: contributions, equity & balance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-vault-border bg-vault-dark/40">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Hours</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Points</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Contributions</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Equity</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Equity %</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Notional (₹)</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Withdrawn (₹)</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {adminData.founderSummary.map((row) => (
                  <tr key={row.userId} className="border-b border-vault-border/50 hover:bg-vault-dark/20 transition-colors">
                    <td className="px-6 py-3 text-white font-medium">{row.name}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{row.role}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{row.totalHours.toFixed(1)}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{row.totalPoints.toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{row.contributionCount}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{row.allocatedEquity.toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{row.equityPercent.toFixed(2)}%</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">₹{row.notionalIncome.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">₹{row.withdrawnIncome.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3 text-brand-400 font-medium text-sm">₹{row.balanceAbenka.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {phases && phases.length > 0 && (
        <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Company</p>
            <h2 className="text-lg font-semibold text-white mt-0.5">Phases</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border bg-vault-dark/40">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Phase</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Equity pool</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Monthly target</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Weightage</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Notional salary</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.id} className="border-b border-vault-border/50 hover:bg-vault-dark/20 transition-colors">
                    <td className="px-6 py-3 text-white font-medium">{p.name}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">
                      {p.equityPoolPercent != null ? `${p.equityPoolPercent}%` : ''} ({p.equityPoolQty} qty)
                    </td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{p.monthlySalesTargetLabel}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">
                      {p.salesWeightageMultiplier != null ? String(p.salesWeightageMultiplier) : 'Big4'}
                    </td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{p.notionalSalaryNotes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {topContributors && topContributors.length > 0 && (
        <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Activity</p>
            <h2 className="text-lg font-semibold text-white mt-0.5">Top contributors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border bg-vault-dark/40">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Total points</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Contributions</th>
                </tr>
              </thead>
              <tbody>
                {topContributors.map((t: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-vault-border/50 hover:bg-vault-dark/20 transition-colors">
                    <td className="px-6 py-3 text-white font-medium">{String(t.name)}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{Number(t.totalPoints).toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{Number(t.contributionCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pendingPayouts && pendingPayouts.length > 0 && (
        <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Payouts</p>
            <h2 className="text-lg font-semibold text-white mt-0.5">Pending payouts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border bg-vault-dark/40">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">User</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((p: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-vault-border/50 hover:bg-vault-dark/20 transition-colors">
                    <td className="px-6 py-3 text-white font-medium">{(p.user as { name?: string })?.name ?? '-'}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{Number(p.amount).toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-300 text-sm">{String(p.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
