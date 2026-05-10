import { useEffect, useState } from 'react';
import { FileText, Download, Eye, CheckCircle2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { consentsApi, ConsentRecord, ConsentUserStatus } from '../api/client';

type Doc = {
  key: string;
  title: string;
  description: string;
  filename: string;
};

const DOCS: Doc[] = [
  {
    key: 'founder-guidelines',
    title: 'Founder Contribution & Equity Guidelines',
    description:
      'Guidelines covering how founder contributions are tracked, measured, and converted to equity within Abenka Vault.',
    filename: 'Founder Contribution & Equity Guidelines.pdf',
  },
];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Documents() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [myConsents, setMyConsents] = useState<ConsentRecord[]>([]);
  const [agreeing, setAgreeing] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [trackerData, setTrackerData] = useState<Record<string, ConsentUserStatus[]>>({});
  const [trackerLoading, setTrackerLoading] = useState<Record<string, boolean>>({});

  // Load current user's consents on mount
  useEffect(() => {
    consentsApi.my().then(setMyConsents).catch(() => {});
  }, []);

  const getMyConsent = (key: string) => myConsents.find((c) => c.documentKey === key) ?? null;

  const handleAgree = async (key: string) => {
    setAgreeing((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await consentsApi.agree(key);
      setMyConsents((prev) => {
        const without = prev.filter((c) => c.documentKey !== key);
        return [...without, { documentKey: key, agreedAt: (result as { agreedAt: string }).agreedAt }];
      });
      // Refresh tracker if open
      if (expanded[key]) loadTracker(key);
    } catch {
      // silently ignore
    } finally {
      setAgreeing((prev) => ({ ...prev, [key]: false }));
    }
  };

  const loadTracker = async (key: string) => {
    setTrackerLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const data = await consentsApi.all(key);
      setTrackerData((prev) => ({ ...prev, [key]: data }));
    } catch {
      // silently ignore
    } finally {
      setTrackerLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleTracker = (key: string) => {
    const nowExpanded = !expanded[key];
    setExpanded((prev) => ({ ...prev, [key]: nowExpanded }));
    if (nowExpanded && !trackerData[key]) loadTracker(key);
  };

  const handleDownload = (filename: string) => {
    const a = document.createElement('a');
    a.href = `/docs/${encodeURIComponent(filename)}`;
    a.download = filename;
    a.click();
  };

  const handleView = (filename: string) => {
    window.open(`/docs/${encodeURIComponent(filename)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="text-slate-400 text-sm mt-1">Company guidelines and reference documents.</p>
      </div>

      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-vault-border">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Available Documents</p>
        </div>

        <ul className="divide-y divide-vault-border">
          {DOCS.map((doc) => {
            const consent = getMyConsent(doc.key);
            const isExpanded = expanded[doc.key];
            const tracker = trackerData[doc.key] ?? [];
            const agreedCount = tracker.filter((u) => u.agreedAt).length;

            return (
              <li key={doc.key} className="p-6 space-y-4">
                {/* Document row */}
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 p-2.5 rounded-lg bg-teal-900/40 border border-teal-700/40 shrink-0">
                    <FileText size={20} className="text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{doc.title}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{doc.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleView(doc.filename)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-dark border border-vault-border text-slate-300 hover:text-white text-sm transition-colors"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => handleDownload(doc.filename)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>

                {/* Consent section */}
                <div className="ml-14 space-y-3">
                  {consent ? (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                      <CheckCircle2 size={16} />
                      <span>You agreed on {fmtDate(consent.agreedAt)}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAgree(doc.key)}
                      disabled={agreeing[doc.key]}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-600 text-teal-400 hover:bg-teal-900/30 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {agreeing[doc.key] ? 'Recording…' : 'I have read and agree to this document'}
                    </button>
                  )}

                  {/* Admin consent tracker toggle */}
                  {isAdmin && (
                    <div>
                      <button
                        onClick={() => toggleTracker(doc.key)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        <Users size={13} />
                        {isExpanded ? 'Hide' : 'Show'} consent tracker
                        {tracker.length > 0 && (
                          <span className="ml-1 text-teal-400 font-medium">
                            ({agreedCount}/{tracker.length} agreed)
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 rounded-lg border border-vault-border overflow-hidden">
                          {trackerLoading[doc.key] ? (
                            <p className="text-slate-400 text-xs p-4">Loading…</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="bg-vault-dark/60">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-vault-border">
                                {tracker.map((u) => (
                                  <tr key={u.userId} className="hover:bg-vault-dark/30 transition-colors">
                                    <td className="px-4 py-2.5 text-white font-medium">{u.name}</td>
                                    <td className="px-4 py-2.5 text-slate-300">{u.email}</td>
                                    <td className="px-4 py-2.5 text-slate-400 capitalize text-xs">{u.role.toLowerCase()}</td>
                                    <td className="px-4 py-2.5">
                                      {u.agreedAt ? (
                                        <span className="inline-flex items-center gap-1 text-green-400 font-medium text-xs">
                                          <CheckCircle2 size={12} /> Agreed
                                        </span>
                                      ) : (
                                        <span className="text-amber-400 text-xs font-medium">Not yet</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                                      {u.agreedAt ? fmtDate(u.agreedAt) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
