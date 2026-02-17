import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, companyApi } from '../api/client';
import type { CompanyDashboardFounder } from '../api/client';
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardApi.get>> | null>(null);
  const [companyData, setCompanyData] = useState<CompanyDashboardFounder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      dashboardApi.get(user.id),
      companyApi.dashboard().catch(() => null),
    ]).then(([dashboard, company]) => {
      setData(dashboard);
      setCompanyData(company?.view === 'founder' ? (company as CompanyDashboardFounder) : null);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <div className="text-slate-400">Loading your dashboard…</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data) return null;

  const { contributions, totalHours, summaryByProject, equityAllocations, payouts } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="font-display text-2xl font-semibold text-white">
        Welcome, {data.user.name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-vault-card border border-vault-border rounded-xl p-5">
          <p className="text-slate-400 text-sm">Hours contributed</p>
          <p className="text-2xl font-semibold text-white">{totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-vault-card border border-vault-border rounded-xl p-5">
          <p className="text-slate-400 text-sm">Total points</p>
          <p className="text-2xl font-semibold text-white">{(data as { totalPoints?: number }).totalPoints?.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className="bg-vault-card border border-vault-border rounded-xl p-5">
          <p className="text-slate-400 text-sm">Equity (units)</p>
          <p className="text-2xl font-semibold text-white">
            {(companyData?.allocatedEquity ?? data.allocatedEquityUnits ?? 0).toFixed(2)}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">Same as Company page · {equityAllocations?.length ?? 0} vesting allocation(s)</p>
        </div>
      </div>

      {summaryByProject && summaryByProject.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Summary by project</h2>
          <div className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border">
                  <th className="p-3 text-slate-400 font-medium">Project</th>
                  <th className="p-3 text-slate-400 font-medium">Hours</th>
                  <th className="p-3 text-slate-400 font-medium">Points</th>
                  <th className="p-3 text-slate-400 font-medium">Entries</th>
                </tr>
              </thead>
              <tbody>
                {summaryByProject.map((s) => (
                  <tr key={s.projectId} className="border-b border-vault-border/50">
                    <td className="p-3 text-white">{s.projectName}</td>
                    <td className="p-3 text-slate-300">{s.totalHours.toFixed(1)}</td>
                    <td className="p-3 text-slate-300">{(s as { totalPoints?: number }).totalPoints?.toFixed(2) ?? '0.00'}</td>
                    <td className="p-3 text-slate-300">{s.contributionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {equityAllocations && equityAllocations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Equity allocation</h2>
          <div className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border">
                  <th className="p-3 text-slate-400 font-medium">Equity Qty</th>
                  <th className="p-3 text-slate-400 font-medium">Equity %</th>
                  <th className="p-3 text-slate-400 font-medium">Vesting start</th>
                  <th className="p-3 text-slate-400 font-medium">Cliff</th>
                  <th className="p-3 text-slate-400 font-medium">Vesting</th>
                </tr>
              </thead>
              <tbody>
                {equityAllocations.map((a: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-vault-border/50">
                    <td className="p-3 text-white font-medium">
                      {Number((a.equityQty as number) ?? 0).toFixed(2)} units
                    </td>
                    <td className="p-3 text-slate-300">{Number(a.sharesAllocated).toFixed(2)}%</td>
                    <td className="p-3 text-slate-300">
                      {typeof a.vestingStart === 'string'
                        ? new Date(a.vestingStart).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-3 text-slate-300">{String(a.cliffMonths)} mo</td>
                    <td className="p-3 text-slate-300">{String(a.vestingMonths)} mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {payouts && payouts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Payouts</h2>
          <div className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-vault-border">
                  <th className="p-3 text-slate-400 font-medium">Type</th>
                  <th className="p-3 text-slate-400 font-medium">Amount</th>
                  <th className="p-3 text-slate-400 font-medium">Status</th>
                  <th className="p-3 text-slate-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.slice(0, 10).map((p: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-vault-border/50">
                    <td className="p-3 text-white">{String(p.type)}</td>
                    <td className="p-3 text-slate-300">{Number(p.amount).toFixed(2)}</td>
                    <td className="p-3 text-slate-300">{String(p.status)}</td>
                    <td className="p-3 text-slate-300">
                      {typeof p.date === 'string' ? new Date(p.date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Recent contributions</h2>
        <div className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-vault-border">
                <th className="p-3 text-slate-400 font-medium">Date</th>
                <th className="p-3 text-slate-400 font-medium">Project</th>
                <th className="p-3 text-slate-400 font-medium">Type</th>
                <th className="p-3 text-slate-400 font-medium">Hours / Amount</th>
              </tr>
            </thead>
            <tbody>
              {contributions.slice(0, 15).map((c: Record<string, unknown>, i: number) => (
                <tr key={i} className="border-b border-vault-border/50">
                  <td className="p-3 text-slate-300">
                    {typeof c.date === 'string' ? new Date(c.date).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-white">
                    {(c.project as { name?: string })?.name ?? '-'}
                  </td>
                  <td className="p-3 text-slate-300">{String(c.type)}</td>
                  <td className="p-3 text-slate-300">
                    {c.type === 'TIME' ? Number(c.hours ?? 0).toFixed(1) : Number(c.amount ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
