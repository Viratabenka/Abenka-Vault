import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clientsApi, invoicesApi, Client, InvoiceLineItem } from '../api/client';
import { Plus, Trash2 } from 'lucide-react';

type LineItemDraft = Omit<InvoiceLineItem, 'id' | 'invoiceId'>;

const EMPTY_LINE: LineItemDraft = {
  description: '',
  company: null,
  quantity: 1,
  periodMonth: null,
  amount: 0,
  sortOrder: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function lastOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

export default function InvoiceForm() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(lastOfMonth());
  const [workingDays, setWorkingDays] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([{ ...EMPTY_LINE }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [cl] = await Promise.all([clientsApi.list()]);
        setClients(cl);
        if (cl.length > 0) setClientId(cl[0].id);

        if (isEdit && id) {
          const inv = await invoicesApi.get(id);
          setClientId(inv.clientId);
          setInvoiceDate(inv.invoiceDate.slice(0, 10));
          setPeriodStart(inv.periodStart.slice(0, 10));
          setPeriodEnd(inv.periodEnd.slice(0, 10));
          setWorkingDays(inv.workingDays != null ? String(inv.workingDays) : '');
          setNotes(inv.notes ?? '');
          setLineItems(
            inv.lineItems.map((li) => ({
              description: li.description,
              company: li.company,
              quantity: li.quantity,
              periodMonth: li.periodMonth,
              amount: Number(li.amount),
              sortOrder: li.sortOrder,
            })),
          );
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const updateLine = (idx: number, field: keyof LineItemDraft, value: string | number | null) => {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)));
  };

  const addLine = () => {
    setLineItems((prev) => [...prev, { ...EMPTY_LINE, sortOrder: prev.length }]);
  };

  const removeLine = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Please select a client.'); return; }
    if (lineItems.length === 0) { setError('Add at least one line item.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        clientId,
        invoiceDate,
        periodStart,
        periodEnd,
        workingDays: workingDays ? parseInt(workingDays) : undefined,
        notes: notes || undefined,
        lineItems: lineItems.map((li, idx) => ({
          description: li.description,
          company: li.company ?? undefined,
          quantity: li.quantity,
          periodMonth: li.periodMonth ?? undefined,
          amount: Number(li.amount),
          sortOrder: idx,
        })),
      };
      if (isEdit && id) {
        await invoicesApi.update(id, payload);
      } else {
        await invoicesApi.create(payload);
      }
      navigate('/invoices');
    } catch (err) {
      setError((err as Error).message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="text-slate-400 p-8">Loading…</div>;

  const inputCls = 'w-full bg-vault-dark border border-vault-border rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/invoices')} className="text-slate-400 hover:text-white text-sm transition-colors">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Invoice number will be auto-generated on save.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <section className="bg-vault-card border border-vault-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className={labelCls}>Bill To (Client) *</label>
              {clients.length === 0 ? (
                <p className="text-amber-400 text-xs mt-1">No clients found. <a href="/invoice-settings" className="underline">Add a client first</a>.</p>
              ) : (
                <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.city ? `, ${c.city}` : ''}{c.country ? `, ${c.country}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Invoice Date *</label>
              <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Period Start *</label>
              <input type="date" className={inputCls} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Period End *</label>
              <input type="date" className={inputCls} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Working Days</label>
              <input type="number" className={inputCls} value={workingDays} onChange={(e) => setWorkingDays(e.target.value)} min={1} max={31} placeholder="e.g. 22" />
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Line Items</h2>
            <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors">
              <Plus size={16} /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vault-dark/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-[30%]">Description / Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-[18%]">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-[10%]">Resources</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-[15%]">Month</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-[18%]">Amount (₹)</th>
                  <th className="px-4 py-3 w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {lineItems.map((li, idx) => (
                  <tr key={idx} className="hover:bg-vault-dark/30">
                    <td className="px-3 py-2">
                      <input
                        className={inputCls}
                        value={li.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        placeholder="Role or service description"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={inputCls}
                        value={li.company ?? ''}
                        onChange={(e) => updateLine(idx, 'company', e.target.value || null)}
                        placeholder="Client company"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className={inputCls}
                        value={li.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                        min={1}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={inputCls}
                        value={li.periodMonth ?? ''}
                        onChange={(e) => updateLine(idx, 'periodMonth', e.target.value || null)}
                        placeholder="e.g. April 2026"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className={`${inputCls} text-right`}
                        value={li.amount}
                        onChange={(e) => updateLine(idx, 'amount', parseFloat(e.target.value) || 0)}
                        min={0}
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => removeLine(idx)} disabled={lineItems.length === 1} className="text-red-400 hover:text-red-300 disabled:opacity-30 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="px-6 py-4 border-t border-vault-border flex justify-end">
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-vault-card border border-vault-border rounded-xl p-6">
          <label className={labelCls}>Notes / Additional Charges</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes or charges to appear on the invoice…"
          />
        </section>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pb-8">
          <button type="button" onClick={() => navigate('/invoices')} className="px-6 py-2.5 bg-vault-dark border border-vault-border text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving || clients.length === 0} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
