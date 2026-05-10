import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoicesApi, companySettingsApi, Invoice, CompanySettings } from '../api/client';
import { Printer, ArrowLeft, Pencil } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusColor(s: string) {
  if (s === 'PAID') return '#22c55e';
  if (s === 'SENT') return '#3b82f6';
  return '#94a3b8';
}

export default function InvoicePreview() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([invoicesApi.get(id), companySettingsApi.get()])
      .then(([inv, s]) => { setInvoice(inv); setSettings(s); })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="text-slate-400 p-8">Loading…</div>;
  if (error || !invoice) return <div className="text-red-400 p-8">{error || 'Invoice not found.'}</div>;

  const subtotal = invoice.lineItems.reduce((s, li) => s + Number(li.amount), 0);

  const co = settings;

  return (
    <>
      {/* Action bar — hidden when printing */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => navigate(`/invoices/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer size={14} /> Download PDF
        </button>
      </div>

      {/* Invoice document */}
      <div id="invoice-doc" className="max-w-4xl mx-auto bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Top header bar */}
        <div style={{ background: '#1e293b', color: '#fff', padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.02em' }}>
              {co?.companyName || 'Abenka Infotech'}
            </div>
            {co?.address && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>{co.address}</div>}
            {(co?.city || co?.state || co?.zip) && (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {[co?.city, co?.state, co?.zip].filter(Boolean).join(', ')}
              </div>
            )}
            {co?.email && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 2 }}>{co.email}</div>}
            {co?.phone && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{co.phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#14b8a6', letterSpacing: '0.05em' }}>INVOICE</div>
            <div style={{ fontSize: '14px', marginTop: 6, color: '#cbd5e1' }}>{invoice.invoiceNumber}</div>
            <div style={{ marginTop: 8 }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 99,
                fontSize: '11px',
                fontWeight: 700,
                background: statusColor(invoice.status) + '22',
                color: statusColor(invoice.status),
                border: `1px solid ${statusColor(invoice.status)}55`,
              }}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px 36px', display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invoice Date</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{fmtDate(invoice.invoiceDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invoice Period</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
              {fmtDate(invoice.periodStart)} — {fmtDate(invoice.periodEnd)}
            </div>
          </div>
          {invoice.workingDays != null && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Working Days</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{invoice.workingDays}</div>
            </div>
          )}
        </div>

        {/* Bill To */}
        <div style={{ padding: '20px 36px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Bill To</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{invoice.client.name}</div>
          {invoice.client.address && <div style={{ fontSize: '12px', color: '#475569', marginTop: 2 }}>{invoice.client.address}</div>}
          {(invoice.client.city || invoice.client.state || invoice.client.zip) && (
            <div style={{ fontSize: '12px', color: '#475569' }}>
              {[invoice.client.city, invoice.client.state, invoice.client.zip].filter(Boolean).join(', ')}
            </div>
          )}
          {invoice.client.country && <div style={{ fontSize: '12px', color: '#475569' }}>{invoice.client.country}</div>}
          {invoice.client.email && <div style={{ fontSize: '12px', color: '#475569', marginTop: 2 }}>{invoice.client.email}</div>}
          {invoice.client.phone && <div style={{ fontSize: '12px', color: '#475569' }}>{invoice.client.phone}</div>}
        </div>

        {/* Line items table */}
        <div style={{ padding: '0 0 0 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#fff' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description / Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resources</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Month</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li, idx) => (
                <tr key={li.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '13px 20px', color: '#1e293b', fontWeight: 500 }}>{li.description}</td>
                  <td style={{ padding: '13px 16px', color: '#475569' }}>{li.company ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: '#475569', textAlign: 'center' }}>{li.quantity}</td>
                  <td style={{ padding: '13px 16px', color: '#475569' }}>{li.periodMonth ?? '—'}</td>
                  <td style={{ padding: '13px 20px', color: '#1e293b', textAlign: 'right', fontWeight: 600 }}>
                    {fmt(Number(li.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total section */}
        <div style={{ padding: '16px 36px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Subtotal</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>₹{fmt(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '2px solid #1e293b' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Total</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>₹{fmt(Number(invoice.totalAmount))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ padding: '16px 36px', borderTop: '1px solid #e2e8f0', background: '#fffbeb' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: '13px', color: '#78350f', whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
          </div>
        )}

        {/* Bank / Payment details */}
        {co && (co.bankName || co.accountNumber) && (
          <div style={{ padding: '20px 36px', borderTop: '1px solid #e2e8f0', background: '#f1f5f9' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Payment Details</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 40px' }}>
              {co.bankName && (
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Bank</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{co.bankName}</div>
                </div>
              )}
              {co.accountName && (
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Account Name</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{co.accountName}</div>
                </div>
              )}
              {co.accountNumber && (
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Account Number</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{co.accountNumber}</div>
                </div>
              )}
              {co.ifscCode && (
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>IFSC</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{co.ifscCode}</div>
                </div>
              )}
              {co.bankAddress && (
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Bank Address</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{co.bankAddress}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '16px 36px', background: '#1e293b', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Thank you for your business · {co?.companyName || 'Abenka Infotech'}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .print\\:hidden { display: none !important; }
          #invoice-doc { max-width: 100%; box-shadow: none; border-radius: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
