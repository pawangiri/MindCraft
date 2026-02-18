import { create } from "zustand";
import api, { type User } from "../api/client";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  isLoading: false,

  login: async (username: string, password: string) => {
    const { data } = await api.post("/auth/login/", { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout/");
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get("/auth/me/");
      localStorage.setItem("user", JSON.stringify(data));
      set({ user: data, token, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
