"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, Users, GitBranch, Clock, CalendarDays, BarChart3, 
  ShieldAlert, Compass, PlayCircle, Bot, Wallet, ClipboardList, 
  Settings, LogOut, Bell, Search, Terminal, AlertTriangle, Info, CheckCircle
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "CRITICAL" | "AI_INSIGHT";
  is_read: boolean;
  created_at: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, apiFetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [searchEmployees, setSearchEmployees] = useState<any[]>([]);

  // Navigation config matching Stitch
  const navItems = [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Workforce", icon: Users, path: "/workforce" },
    { name: "Digital Twin", icon: GitBranch, path: "/digital-twin" },
    { name: "Attendance", icon: Clock, path: "/attendance" },
    { name: "Leave", icon: CalendarDays, path: "/leave" },
    { name: "Workload", icon: BarChart3, path: "/workload" },
    { name: "Risk Intelligence", icon: ShieldAlert, path: "/risk-intelligence" },
    { name: "Predictions", icon: Compass, path: "/predictions" },
    { name: "Simulation Lab", icon: PlayCircle, path: "/simulation" },
    { name: "AI Copilot", icon: Bot, path: "/ai-copilot" },
    { name: "Payroll", icon: Wallet, path: "/payroll" },
    { name: "Reports", icon: ClipboardList, path: "/reports" },
    { name: "Audit Center", icon: Terminal, path: "/audit" },
  ];

  // Load notifications
  useEffect(() => {
    if (user) {
      apiFetch("/api/notifications")
        .then((data) => setNotifications(data))
        .catch((err) => console.error("Error loading notifications:", err));
    }
  }, [user]);

  // WebSocket Live Sync
  useEffect(() => {
    let ws: WebSocket;
    
    const connectWS = () => {
      ws = new WebSocket("ws://localhost:8000/api/ws");
      
      ws.onopen = () => {
        setWsStatus("online");
        logger("WebSocket online");
      };
      
      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const payload = JSON.parse(event.data);
          // Prepend new notification or alert
          const newNotif: NotificationItem = {
            id: Math.random().toString(),
            title: payload.event === "attendance.updated" ? "Attendance Alert" : 
                   payload.event === "simulation.completed" ? "Simulation Lab Alert" : "Live Alert",
            message: payload.data.message || `${payload.event}: ${JSON.stringify(payload.data)}`,
            type: payload.data.anomaly ? "CRITICAL" : "INFO",
            is_read: false,
            created_at: new Date().toISOString()
          };
          
          setNotifications(prev => [newNotif, ...prev]);
        } catch (e) {
          console.error("WS parse error", e);
        }
      };
      
      ws.onclose = () => {
        setWsStatus("offline");
        setTimeout(connectWS, 5000); // retry reconnect in 5s
      };
      
      ws.onerror = () => {
        setWsStatus("offline");
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Keyboard Ctrl+K Command Palette trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCmdPalette(prev => !prev);
      }
      if (e.key === "Escape") {
        setShowCmdPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Command palette employee search
  useEffect(() => {
    if (cmdSearch.trim().length > 1) {
      apiFetch(`/api/employees?search=${cmdSearch}&limit=5`)
        .then(res => setSearchEmployees(res.data || []))
        .catch(() => {});
    } else {
      setSearchEmployees([]);
    }
  }, [cmdSearch]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      // Mock update if local mock UUID
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen bg-dark-bg text-foreground overflow-hidden font-sans relative">
      
      {/* Background radial neon glows */}
      <div className="bg-glow top-[-250px] left-[-100px]"></div>
      <div className="bg-glow bottom-[-200px] right-[-100px] bg-cyan-500/5"></div>

      {/* Sidebar Navigation */}
      <aside className={`glass-panel border-r border-zinc-800/80 flex flex-col justify-between transition-all duration-300 z-30 ${sidebarOpen ? "w-64" : "w-16"}`}>
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-4 border-b border-zinc-800/40 gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-purple-500/25">
              N
            </div>
            {sidebarOpen && (
              <span className="font-bold text-xl tracking-wider bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                NEXORA
              </span>
            )}
          </div>

          {/* Navigation Tree */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active 
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 border border-transparent"
                  }`}
                  title={item.name}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-zinc-800/40 space-y-3 bg-zinc-950/20">
          {/* AI Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${wsStatus === "online" ? "bg-purple-500 animate-pulse-ai" : "bg-zinc-500"}`}></span>
            {sidebarOpen && (
              <span className="text-zinc-500 font-semibold uppercase tracking-wider">
                NEXORA AI Online
              </span>
            )}
          </div>
          
          {/* Executive Demo button */}
          {sidebarOpen && (
            <button 
              onClick={() => router.push("/executive-demo")}
              className="w-full text-xs py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/30 rounded text-center font-bold tracking-wide text-cyan-300 transition"
            >
              Start Executive Demo
            </button>
          )}

          {/* User profile widget */}
          {sidebarOpen && user && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {user.email.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-zinc-200 truncate w-28">{user.email}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{user.role}</div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800/30 transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-zinc-800/40 flex items-center justify-between px-6 z-20 bg-zinc-950/20 backdrop-blur-md">
          {/* Left search */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-zinc-500 hover:text-zinc-200 text-sm font-semibold focus:outline-none"
            >
              ☰
            </button>
            
            {/* Ctrl+K search triggers command palette */}
            <div 
              onClick={() => setShowCmdPalette(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 cursor-pointer w-64 transition"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-auto text-[9px] font-mono bg-zinc-800 border border-zinc-700 px-1 rounded text-zinc-400">Ctrl+K</kbd>
            </div>
          </div>

          {/* Right widgets */}
          <div className="flex items-center gap-4">
            {/* Live WS Status Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-950/40 text-[10px] font-mono text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === "online" ? "bg-green-500" : "bg-red-500"}`}></span>
              WS: {wsStatus}
            </div>

            {/* Notification bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/30 relative transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-purple-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {showNotifDrawer && (
                <div className="absolute right-0 mt-2 w-80 glass-panel rounded-xl shadow-2xl overflow-hidden z-50 border border-zinc-800">
                  <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950/40">
                    <span className="font-bold text-xs tracking-wide">NOTIFICATIONS</span>
                    <button 
                      onClick={() => setShowNotifDrawer(false)}
                      className="text-zinc-500 hover:text-zinc-200 text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/40">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500">No new notifications.</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => markRead(n.id)}
                          className={`p-3 text-xs transition cursor-pointer hover:bg-zinc-800/20 ${n.is_read ? "opacity-60" : "bg-purple-500/5"}`}
                        >
                          <div className="flex items-center gap-1.5 font-bold mb-0.5">
                            {n.type === "CRITICAL" && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                            {n.type === "WARNING" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                            {n.type === "AI_INSIGHT" && <Bot className="w-3.5 h-3.5 text-purple-400" />}
                            {n.type === "INFO" && <Info className="w-3.5 h-3.5 text-cyan-400" />}
                            <span className="text-zinc-200">{n.title}</span>
                          </div>
                          <div className="text-zinc-400 leading-relaxed">{n.message}</div>
                          <div className="text-[9px] text-zinc-500 mt-1">{new Date(n.created_at).toLocaleTimeString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 border-l border-zinc-800/60 pl-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 border border-purple-500/40 flex items-center justify-center font-bold text-xs text-purple-300">
                {user?.email?.substring(0, 1).toUpperCase() || "N"}
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-6 z-10">
          {children}
        </main>
      </div>

      {/* Ctrl+K Command Palette Modal */}
      {showCmdPalette && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
          <div className="w-full max-w-lg glass-panel rounded-xl shadow-2xl overflow-hidden border border-zinc-800">
            <div className="p-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/40">
              <Search className="w-4 h-4 text-zinc-500" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search employees or jump to dashboard..." 
                className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-500"
                value={cmdSearch}
                onChange={e => setCmdSearch(e.target.value)}
              />
              <button 
                onClick={() => setShowCmdPalette(false)}
                className="text-xs text-zinc-500 hover:text-zinc-200"
              >
                ESC
              </button>
            </div>
            
            <div className="p-2 max-h-80 overflow-y-auto divide-y divide-zinc-800/40">
              {/* Employee search results */}
              {searchEmployees.length > 0 && (
                <div className="py-2">
                  <div className="text-[10px] font-bold text-purple-400 px-2 uppercase tracking-wide mb-1">Employees</div>
                  {searchEmployees.map(emp => (
                    <div 
                      key={emp.id}
                      onClick={() => {
                        setShowCmdPalette(false);
                        router.push(`/workforce/${emp.id}`);
                      }}
                      className="px-2 py-1.5 hover:bg-zinc-800/40 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-zinc-200">{emp.name}</span>
                      <span className="text-zinc-500 font-mono">{emp.designation}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation short cuts */}
              <div className="py-2">
                <div className="text-[10px] font-bold text-cyan-400 px-2 uppercase tracking-wide mb-1">Quick Links</div>
                {navItems.slice(0, 7).map(item => (
                  <div 
                    key={item.name}
                    onClick={() => {
                      setShowCmdPalette(false);
                      router.push(item.path);
                    }}
                    className="px-2 py-1.5 hover:bg-zinc-800/40 rounded-lg cursor-pointer flex items-center gap-3 text-xs"
                  >
                    <item.icon className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-200">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function logger(msg: string) {
  console.log(`[NexoraApp] ${msg}`);
}
