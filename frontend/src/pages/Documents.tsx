import { FileText, Download, Eye } from 'lucide-react';

type Doc = {
  title: string;
  description: string;
  filename: string;
};

const DOCS: Doc[] = [
  {
    title: 'Founder Contribution & Equity Guidelines',
    description: 'Guidelines covering how founder contributions are tracked, measured, and converted to equity within Abenka Vault.',
    filename: 'Founder Contribution & Equity Guidelines.pdf',
  },
];

export default function Documents() {
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
          {DOCS.map((doc) => (
            <li key={doc.filename} className="flex items-start gap-4 px-6 py-5 hover:bg-vault-dark/40 transition-colors">
              <div className="mt-0.5 p-2.5 rounded-lg bg-teal-900/40 border border-teal-700/40">
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
                  title="View in browser"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  onClick={() => handleDownload(doc.filename)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm transition-colors"
                  title="Download PDF"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
