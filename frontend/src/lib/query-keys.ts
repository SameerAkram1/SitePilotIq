export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (filters: Record<string, any>) => ['users', filters] as const,
    detail: (id: string) => ['users', id] as const,
    invitations: (tenantId: string) => ['invitations', tenantId] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  tenants: {
    all: ['tenants'] as const,
    detail: (id: string) => ['tenants', id] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  partners: {
    all: ['partners'] as const,
    list: (filters: Record<string, any>) => ['partners', 'list', filters] as const,
    detail: (id: string) => ['partners', 'detail', id] as const,
    ledger: (id: string) => ['partners', 'ledger', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (filters: Record<string, any>) => ['clients', 'list', filters] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    list: (date: string) => ['assignments', 'list', date] as const,
    stats: (date: string) => ['assignments', 'stats', date] as const,
    sites: (date: string) => ['assignments', 'sites', date] as const,
    available: (date: string, siteId?: string) => ['assignments', 'available', date, siteId] as const,
  },
};
