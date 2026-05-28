import { create } from 'zustand';

type User = { id: string; email?: string };
type Session = { access_token: string; user: User };

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  setSession: (s: Session | null) => void;
  setLoading: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
}));
