import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../utils/cn";
import {
  Brain, BookOpen, MessageCircle, PenTool, Trophy,
  LayoutDashboard, LogOut, Palette, ClipboardList, Settings,
  Sparkles, Search, FileCheck, GraduationCap, Menu, X, Calculator,
} from "lucide-react";

const kidNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/lessons", icon: BookOpen, label: "Lessons" },
  { to: "/chat", icon: MessageCircle, label: "AI Tutor" },
  { to: "/quizzes", icon: ClipboardList, label: "Quizzes" },
  { to: "/journal", icon: PenTool, label: "Journal" },
  { to: "/canvas", icon: Palette, label: "Canvas" },
  { to: "/math-practice", icon: Calculator, label: "Math Practice" },
  { to: "/progress", icon: Trophy, label: "Progress" },
];

const adminNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/generate", icon: Sparkles, label: "AI Generator" },
  { to: "/admin/research", icon: Search, label: "Research Lab" },
  { to: "/admin/review", icon: FileCheck, label: "Content Review" },
  { to: "/admin/curriculum", icon: GraduationCap, label: "Curriculum" },
  { to: "/lessons", icon: BookOpen, label: "Lessons" },
  { to: "/chat", icon: MessageCircle, label: "Chat Logs" },
  { to: "/quizzes", icon: ClipboardList, label: "Quizzes" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.is_staff;
  const isFullWidth = location.pathname.startsWith("/chat");
  const navItems = isAdmin ? adminNavItems : kidNavItems;
  const profile = user?.kid_profile;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-surface-dark text-white flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Learning Monk
            </span>
          </div>
          <button onClick={closeSidebar} className="md:hidden p-1 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">
              {profile?.avatar || (isAdmin ? "👨‍💼" : "👤")}
            </div>
            <div>
              <div className="font-semibold text-sm">
                {profile?.display_name || user?.first_name || user?.username}
              </div>
              <div className="text-xs text-white/50">
                {isAdmin ? "Parent / Admin" : `Grade ${profile?.grade_level}`}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={closeSidebar}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header with hamburger */}
        <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm md:hidden px-4 py-3 flex items-center gap-3 border-b border-gray-200/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-400 to-accent-500 rounded-lg flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Learning Monk
            </span>
          </div>
        </div>
        <div className={cn("p-4 md:p-6", isFullWidth ? "" : "max-w-6xl mx-auto")}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
