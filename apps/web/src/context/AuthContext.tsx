"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  employee_id: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    // Load auth from localStorage on boot
    const storedToken = localStorage.getItem("nexora_token");
    const storedUser = localStorage.getItem("nexora_user");
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Handle route protection client-side
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/verify-email"];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!token && !isPublicRoute) {
      router.push("/login");
    } else if (token && isPublicRoute) {
      router.push("/dashboard");
    }
  }, [token, pathname, loading, router]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      
      // Store token and user payload
      localStorage.setItem("nexora_token", data.access_token);
      localStorage.setItem("nexora_refresh", data.refresh_token);
      
      // Fetch user profile info
      const profileResponse = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      
      const profileData = await profileResponse.json();
      localStorage.setItem("nexora_user", JSON.stringify(profileData));
      
      setToken(data.access_token);
      setUser(profileData);
      
      router.push("/dashboard");
      return true;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_refresh");
    localStorage.removeItem("nexora_user");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const currentToken = localStorage.getItem("nexora_token");
    
    const headers = {
      "Content-Type": "application/json",
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    let response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle token expiration / refresh
    if (response.status === 401) {
      const refresh = localStorage.getItem("nexora_refresh");
      if (refresh) {
        try {
          const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refresh }),
          });
          
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            localStorage.setItem("nexora_token", refreshData.access_token);
            setToken(refreshData.access_token);
            
            // Retry request with new token
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${refreshData.access_token}`,
            };
            response = await fetch(`${API_URL}${endpoint}`, config);
          } else {
            logout();
            throw new Error("Session expired");
          }
        } catch (err) {
          logout();
          throw err;
        }
      } else {
        logout();
        throw new Error("No refresh token");
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.detail || "Request failed");
    }

    return response.json();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
