import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clientsApi, companySettingsApi, Client, CompanySettings } from '../api/client';

type Tab = 'company' | 'clients';

const EMPTY_SETTINGS: Omit<CompanySettings, 'id'> = {
  companyName: '',
  address: null,
  city: null,
  state: null,
  zip: null,
  email: null,
  phone: null,
  bankName: null,
  accountName: null,
  accountNumber: null,
  ifscCode: null,
  bankAddress: null,
};

const EMPTY_CLIENT: Omit<Client, 'id'> = {
  name: '',
  address: null,
  city: null,
  state: null,
  zip: null,
  country: null,
  email: null,
  phone: null,
};

export default function InvoiceSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('company');

  // ── Company settings ──────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Omit<CompanySettings, 'id'>>(EMPTY_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    companySettingsApi.get().then((s) => {
      if (s) setSettings({ ...EMPTY_SETTINGS, ...s });
    }).catch(() => {}).finally(() => setSettingsLoading(false));
  }, []);

  const handleSettingsChange = (field: keyof typeof settings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMsg('');
    try {
      await companySettingsApi.upsert(settings);
      setSettingsMsg('Company settings saved successfully.');
    } catch (err) {
      setSettingsMsg((err as Error).message || 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Clients ───────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientForm, setClientForm] = useState<Omit<Client, 'id'>>(EMPTY_CLIENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientMsg, setClientMsg] = useState('');
  const [clientSaving, setClientSaving] = useState(false);

  const loadClients = () => {
    setClientsLoading(true);
    clientsApi.list().then(setClients).catch(() => {}).finally(() => setClientsLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  const handleClientChange = (field: keyof typeof clientForm, value: string) => {
    setClientForm((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;
    setClientSaving(true);
    setClientMsg('');
    try {
      if (editingId) {
        await clientsApi.update(editingId, clientForm);
        setClientMsg('Client updated.');
      } else {
        await clientsApi.create(clientForm);
        setClientMsg('Client added.');
      }
      setClientForm(EMPTY_CLIENT);
      setEditingId(null);
      loadClients();
    } catch (err) {
      setClientMsg((err as Error).message || 'Failed to save client.');
    } finally {
      setClientSaving(false);
    }
  };

  const handleClientEdit = (c: Client) => {
    setEditingId(c.id);
    setClientForm({
      name: c.name,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      country: c.country,
      email: c.email,
      phone: c.phone,
    });
    setClientMsg('');
  };

  const handleClientDelete = async (id: string) => {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    try {
      await clientsApi.delete(id);
      loadClients();
    } catch (err) {
      setClientMsg((err as Error).message || 'Failed to delete client.');
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const inputCls = 'w-full bg-vault-dark border border-vault-border rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoice Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage company information and clients for invoice generation.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-vault-border">
        {(['company', 'clients'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t === 'company' ? 'Company Settings' : 'Clients'}
          </button>
        ))}
      </div>

      {/* ── Company Settings Tab ── */}
      {tab === 'company' && (
        <section className="bg-vault-card border border-vault-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Company / Contractor Information</h2>
          {settingsLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : (
            <form onSubmit={handleSettingsSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Company Name *</label>
                  <input className={inputCls} value={settings.companyName} onChange={(e) => handleSettingsChange('companyName', e.target.value)} required placeholder="Abenka Infotech" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={settings.address ?? ''} onChange={(e) => handleSettingsChange('address', e.target.value)} placeholder="Street address" />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input className={inputCls} value={settings.city ?? ''} onChange={(e) => handleSettingsChange('city', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={settings.state ?? ''} onChange={(e) => handleSettingsChange('state', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>ZIP / PIN</label>
                  <input className={inputCls} value={settings.zip ?? ''} onChange={(e) => handleSettingsChange('zip', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={settings.phone ?? ''} onChange={(e) => handleSettingsChange('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" value={settings.email ?? ''} onChange={(e) => handleSettingsChange('email', e.target.value)} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 pt-2 border-t border-vault-border">Bank / Payment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input className={inputCls} value={settings.bankName ?? ''} onChange={(e) => handleSettingsChange('bankName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Name</label>
                    <input className={inputCls} value={settings.accountName ?? ''} onChange={(e) => handleSettingsChange('accountName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input className={inputCls} value={settings.accountNumber ?? ''} onChange={(e) => handleSettingsChange('accountNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>IFSC Code</label>
                    <input className={inputCls} value={settings.ifscCode ?? ''} onChange={(e) => handleSettingsChange('ifscCode', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Bank Address</label>
                    <input className={inputCls} value={settings.bankAddress ?? ''} onChange={(e) => handleSettingsChange('bankAddress', e.target.value)} />
                  </div>
                </div>
              </div>

              {settingsMsg && (
                <p className={`text-sm ${settingsMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{settingsMsg}</p>
              )}
              <button type="submit" disabled={settingsSaving} className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {settingsSaving ? 'Saving…' : 'Save Company Settings'}
              </button>
            </form>
          )}
        </section>
      )}

      {/* ── Clients Tab ── */}
      {tab === 'clients' && (
        <div className="space-y-6">
          {/* Add / Edit Client Form */}
          <section className="bg-vault-card border border-vault-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{editingId ? 'Edit Client' : 'Add New Client'}</h2>
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Client Name *</label>
                  <input className={inputCls} value={clientForm.name} onChange={(e) => handleClientChange('name', e.target.value)} required placeholder="Client company name" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={clientForm.address ?? ''} onChange={(e) => handleClientChange('address', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input className={inputCls} value={clientForm.city ?? ''} onChange={(e) => handleClientChange('city', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={clientForm.state ?? ''} onChange={(e) => handleClientChange('state', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>ZIP</label>
                  <input className={inputCls} value={clientForm.zip ?? ''} onChange={(e) => handleClientChange('zip', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input className={inputCls} value={clientForm.country ?? ''} onChange={(e) => handleClientChange('country', e.target.value)} placeholder="e.g. India, Switzerland" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" value={clientForm.email ?? ''} onChange={(e) => handleClientChange('email', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={clientForm.phone ?? ''} onChange={(e) => handleClientChange('phone', e.target.value)} />
                </div>
              </div>
              {clientMsg && (
                <p className={`text-sm ${clientMsg.includes('added') || clientMsg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{clientMsg}</p>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={clientSaving} className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {clientSaving ? 'Saving…' : editingId ? 'Update Client' : 'Add Client'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setClientForm(EMPTY_CLIENT); setClientMsg(''); }} className="px-5 py-2 bg-vault-dark border border-vault-border text-slate-300 hover:text-white rounded-lg text-sm transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Client List */}
          <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-vault-border">
              <h2 className="text-lg font-semibold text-white">All Clients</h2>
            </div>
            {clientsLoading ? (
              <p className="text-slate-400 text-sm p-6">Loading clients…</p>
            ) : clients.length === 0 ? (
              <p className="text-slate-500 text-sm p-6">No clients yet. Add your first client above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-vault-dark/60">
                    <tr>
                      {['Name', 'City', 'Country', 'Email', 'Phone', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vault-border">
                    {clients.map((c) => (
                      <tr key={c.id} className="hover:bg-vault-dark/40 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-slate-300">{c.city ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{c.country ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{c.email ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{c.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleClientEdit(c)} className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors">Edit</button>
                            <button onClick={() => handleClientDelete(c.id)} className="text-xs px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300 transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
