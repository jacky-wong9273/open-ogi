import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "../api/client";

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; username: string; email: string; role: string } | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("ogi_token");
    return { isAuthenticated: !!token, user: null, token, loading: !!token };
  });

  // Rehydrate user on mount if token exists
  useEffect(() => {
    if (state.token && !state.user) {
      api.auth
        .me()
        .then((user) => {
          setState((s) => ({ ...s, user, loading: false }));
        })
        .catch(() => {
          localStorage.removeItem("ogi_token");
          setState({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
          });
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username: string, password: string) => {
    const session = await api.auth.login(username, password);
    localStorage.setItem("ogi_token", session.token);
    const user = await api.auth.me();
    setState({
      isAuthenticated: true,
      user,
      token: session.token,
      loading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ogi_token");
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
