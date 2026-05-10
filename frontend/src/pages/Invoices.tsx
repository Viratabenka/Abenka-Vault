import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoicesApi, Invoice, InvoiceStatus } from '../api/client';
import { Plus, Eye, Pencil, Trash2, Settings } from 'lucide-react';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-700/60 text-slate-300 border border-slate-600',
  SENT: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  PAID: 'bg-green-900/50 text-green-300 border border-green-700',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const NEXT_STATUS: Partial<Record<InvoiceStatus, InvoiceStatus>> = {
  DRAFT: 'SENT',
  SENT: 'PAID',
};

export default function Invoices() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    invoicesApi.list()
      .then(setInvoices)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) return;
    try {
      await invoicesApi.delete(id);
      load();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete invoice.');
    }
  };

  const handleStatusChange = async (id: string, nextStatus: InvoiceStatus) => {
    try {
      const updated = await invoicesApi.updateStatus(id, nextStatus);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    } catch (err) {
      setError((err as Error).message || 'Failed to update status.');
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 text-sm mt-1">Manage client invoices and generate PDFs.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/invoice-settings')}
            className="flex items-center gap-2 px-4 py-2 bg-vault-dark border border-vault-border text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Settings size={15} /> Settings
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Invoice list */}
      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-slate-400 text-sm p-8">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm mb-3">No invoices yet.</p>
            <button
              onClick={() => navigate('/invoices/new')}
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} /> Create your first invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vault-dark/60 border-b border-vault-border">
                <tr>
                  {['Invoice #', 'Client', 'Date', 'Period', 'Total', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-vault-dark/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-teal-400 font-medium">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{inv.client.name}</td>
                    <td className="px-4 py-3 text-slate-300">{fmtDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {fmtDate(inv.periodStart)}<br />→ {fmtDate(inv.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{fmtAmount(Number(inv.totalAmount))}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[inv.status]}`}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                        {NEXT_STATUS[inv.status] && (
                          <button
                            onClick={() => handleStatusChange(inv.id, NEXT_STATUS[inv.status]!)}
                            className="text-xs text-slate-400 hover:text-teal-400 transition-colors text-left"
                          >
                            Mark as {STATUS_LABELS[NEXT_STATUS[inv.status]!]} →
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          title="View / Download PDF"
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                          title="Edit"
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                          title="Delete"
                          className="p-1.5 rounded bg-red-900/60 hover:bg-red-800 text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Summary footer */}
      {invoices.length > 0 && (
        <div className="flex gap-6 text-sm text-slate-400">
          <span>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
          <span>
            Total billed:{' '}
            <span className="text-white font-semibold">
              {fmtAmount(invoices.reduce((s, i) => s + Number(i.totalAmount), 0))}
            </span>
          </span>
          <span>
            Paid:{' '}
            <span className="text-green-400 font-semibold">
              {fmtAmount(invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount), 0))}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
