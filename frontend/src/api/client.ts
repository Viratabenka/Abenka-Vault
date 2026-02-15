const API = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = (err as { message?: string | string[] }).message;
    const text = Array.isArray(msg) ? msg.join(' ') : (msg || 'Request failed');
    throw new Error(text);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ access_token: string; user: { id: string; email: string; name: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  signUp: (email: string, name: string, password: string) =>
    api<{ id: string; email: string; name: string; role: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),
  invite: (email: string, name: string, role: string) =>
    api<{ id: string; email: string; name: string; role: string; tempPassword?: string }>(
      '/auth/invite',
      { method: 'POST', body: JSON.stringify({ email, name, role }) },
    ),
};

export const usersApi = {
  me: (id: string) => api<{ id: string; name: string; email: string; role: string }>(`/users/${id}`),
  list: () => api<{ id: string; name: string; email: string; role: string }[]>('/users'),
};

export const dashboardApi = {
  get: (userId: string) =>
    api<{
      user: { id: string; name: string; email: string; role: string; hourlyRate?: number };
      contributions: Array<Record<string, unknown>>;
      totalPoints: number;
      totalHours: number;
      summaryByProject?: Array<{
        projectId: string;
        projectName: string;
        totalHours: number;
        totalPoints: number;
        contributionCount: number;
      }>;
      equityAllocations: Array<Record<string, unknown>>;
      payouts: Array<Record<string, unknown>>;
    }>(`/users/${userId}/dashboard`),
};

export const projectsApi = {
  list: () =>
    api<
      Array<{
        id: string;
        name: string;
        monthlyRevenuePipeline?: number | null;
        owner?: { id: string; name: string };
        members?: Array<{ user: { id: string; name: string; email: string } }>;
      }>
    >('/projects'),
  get: (id: string) =>
    api<{
      id: string;
      name: string;
      monthlyRevenuePipeline?: number | null;
      contributions: Array<Record<string, unknown>>;
      owner: { id: string; name: string };
      members?: Array<{ user: { id: string; name: string; email: string } }>;
    }>(`/projects/${id}`),
  create: (dto: { name: string; startDate: string; endDate?: string; budget?: number }) =>
    api<{ id: string; name: string }>('/projects', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: { name?: string; endDate?: string; budget?: number; monthlyRevenuePipeline?: number }) =>
    api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  getMembers: (projectId: string) =>
    api<Array<{ userId: string; user: { id: string; name: string; email: string; role: string } }>>(
      `/members-of-project/${projectId}`,
    ),
  getAssignableUsers: (projectId: string) =>
    api<Array<{ id: string; name: string; email: string; role: string }>>(
      `/members-of-project/${projectId}/assignable-users`,
    ),
  addMember: (projectId: string, userId: string) =>
    api(`/members-of-project/${projectId}`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeMember: (projectId: string, memberUserId: string) =>
    api(`/members-of-project/${projectId}/${memberUserId}`, { method: 'DELETE' }),
};

export const contributionsApi = {
  list: (projectId: string) =>
    api<Array<Record<string, unknown>>>(`/projects/${projectId}/contributions`),
  create: (projectId: string, dto: Record<string, unknown>) =>
    api(`/projects/${projectId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: Record<string, unknown>) =>
    api(`/projects/contributions/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) =>
    api(`/projects/contributions/${id}`, { method: 'DELETE' }),
};

export type CompanyPhase = {
  id: string;
  name: string;
  equityPoolPercent: number | null;
  equityPoolQty: number;
  monthlySalesTargetLabel: string;
  salesWeightageMultiplier: number | null;
  notionalSalaryNotes: string | null;
};

export type FounderSummaryRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalHours: number;
  totalPoints: number;
  contributionCount: number;
  allocatedEquity: number;
  equityPercent: number;
  notionalIncome: number;
  withdrawnIncome: number;
  balanceAbenka: number;
};

export type RevenueSummary = {
  totalMonthlyRevenue: number;
  totalOneTimeRevenue: number;
  totalRevenue: number;
  totalExpense: number;
  netRevenue: number;
  /** Current calendar month total (MONTHLY_REVENUE entries for this month). */
  currentMonthRevenue?: number;
  /** Amount left to reach Sprout target (15 lakh) this month. */
  remainingToReach15Lakh?: number;
  /** Sprout phase target in rupees (15,00,000). */
  sproutTargetAmount?: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    monthlyRevenue: number;
    oneTimeRevenue: number;
    expense: number;
  }>;
};

export type CompanyDashboardAdmin = {
  view: 'admin';
  users: number;
  projects: number;
  capTable: Array<Record<string, unknown>>;
  founderSummary: FounderSummaryRow[];
  topContributors: Array<Record<string, unknown>>;
  pendingPayouts: Array<Record<string, unknown>>;
  revenueSummary?: RevenueSummary;
  phases?: CompanyPhase[];
};

export type CompanyDashboardFounder = {
  view: 'founder';
  phases: CompanyPhase[];
  currentPhaseName: string;
  totalEquityInPool: number;
  totalCompanyHours: number;
  myContribution: {
    totalHours: number;
    totalPoints: number;
    contributionCount: number;
    recentContributions: Array<{
      date: string;
      projectName: string;
      type: string;
      hours: number | null;
      amount: number | null;
      points: number | null;
    }>;
  };
  allocatedEquity: number;
  equityPercent: number;
  notionalIncome: number;
  withdrawnIncome: number;
  balanceAbenka: number;
  revenueSummary?: RevenueSummary;
};

export const companyApi = {
  dashboard: () =>
    api<CompanyDashboardAdmin | CompanyDashboardFounder>('/company/dashboard'),
};

export type RevenueEntryType = 'MONTHLY_REVENUE' | 'ONE_TIME_REVENUE' | 'EXPENSE';

export type RevenueEntry = {
  id: string;
  projectId: string;
  type: RevenueEntryType;
  amount: number;
  periodMonth: string | null;
  entryDate: string;
  notes: string | null;
  project?: { id: string; name: string };
};

export const revenueApi = {
  list: () =>
    api<{ projects: Array<{ id: string; name: string }>; entries: RevenueEntry[] }>('/revenue'),
  listByProject: (projectId: string) =>
    api<RevenueEntry[]>(`/revenue/project/${projectId}`),
  summary: () => api<RevenueSummary>('/revenue/summary'),
  create: (dto: { projectId: string; type: RevenueEntryType; amount: number; periodMonth?: string; entryDate: string; notes?: string }) =>
    api<RevenueEntry>('/revenue', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<{ type: RevenueEntryType; amount: number; periodMonth?: string; entryDate: string; notes?: string }>) =>
    api<RevenueEntry>(`/revenue/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) => api(`/revenue/${id}`, { method: 'DELETE' }),
};

async function downloadExport(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportsApi = {
  contributions: (projectId?: string) =>
    downloadExport(
      `/api/exports/contributions${projectId ? `?projectId=${projectId}` : ''}`,
      'contributions.csv',
    ),
  capTable: (projectId?: string) =>
    downloadExport(
      `/api/exports/cap-table${projectId ? `?projectId=${projectId}` : ''}`,
      'cap-table.csv',
    ),
};
