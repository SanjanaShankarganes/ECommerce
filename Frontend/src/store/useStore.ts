import { create } from 'zustand';

interface GlobalState {
  isLoading: boolean;
  loadingMessage: string | null;
  setLoading: (loading: boolean, message?: string | null) => void;
}

export const useStore = create<GlobalState>((set) => ({
  isLoading: false,
  loadingMessage: null,
  setLoading: (loading: boolean, message: string | null = null) =>
    set({ isLoading: loading, loadingMessage: message }),
}));

