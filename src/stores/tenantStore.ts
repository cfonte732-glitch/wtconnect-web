import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TenantState = {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: null,
      setTenantId: (tenantId) => set({ tenantId }),
    }),
    { name: 'wtconnect-tenant' }
  )
);
