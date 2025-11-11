"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Settings,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Brain,
  Target,
  BarChart3,
  FileText,
  Zap,
  ChevronDown,
  ChevronRight,
  Award,
  Activity,
  Users,
  CheckCircle,
  X
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ 
  href, 
  icon: Icon, 
  label, 
  badge,
  isActive = false,
  onClick 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    onClick?.();
  };

  const baseClasses = "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 group";
  
  const activeClasses = isActive
    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
    : "hover:bg-slate-800/60 text-slate-300 hover:text-white";

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 opacity-80 group-hover:opacity-100" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-600/30 text-indigo-400 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const NavSection: React.FC<NavSectionProps> = ({ 
  title, 
  children, 
  defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
};

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  // Hide sidebar on auth pages
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 overflow-auto 
          bg-slate-950/95 border-r border-slate-800 
          backdrop-blur supports-[backdrop-filter]:bg-slate-950/80 
          z-50 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide text-white">
              InsightBridge
            </span>
          </div>
          
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden p-1 hover:bg-slate-800 rounded-lg transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          {/* Desktop Version Tag */}
          <span className="hidden md:block text-xs text-slate-500 font-mono">v1.0</span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Core Features */}
          <NavSection title="Core">
            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              isActive={pathname === "/dashboard"}
              onClick={onClose}
            />
            <NavItem
              href="/upload"
              icon={Upload}
              label="Upload Data"
              badge="NEW"
              onClick={onClose}
            />
            <NavItem
              href="/reconciliation"
              icon={CheckCircle}
              label="Reconciliation"
              badge="NEW"
              isActive={pathname === "/reconciliation"}
              onClick={onClose}
            />
            <NavItem
              href="#kpis"
              icon={Activity}
              label="KPI Overview"
              onClick={onClose}
            />
          </NavSection>

          {/* Analytics */}
          <NavSection title="Analytics">
            <NavItem
              href="/trend-analysis"
              icon={TrendingUp}
              label="Trend Analysis"
              isActive={pathname === "/trend-analysis"}
              onClick={onClose}
            />
            <NavItem
              href="#forecast"
              icon={Zap}
              label="Forecasting"
              badge="AI"
              onClick={onClose}
            />
            <NavItem
              href="/actions-hub"
              icon={Zap}
              label="Simulations"
              isActive={pathname === "/actions-hub"}
              onClick={onClose}
            />
            <NavItem
              href="/workflows"  
              icon={Zap}
              label="Workflows"
              isActive={pathname === "/workflows"}
              onClick={onClose}
            />
            <NavItem
              href="#benchmarks"
              icon={Target}
              label="Benchmarks"
              onClick={onClose}
            />
            <NavItem
              href="#health-score"
              icon={Award}
              label="Health Score"
              onClick={onClose}
            />
          </NavSection>

          {/* Insights & Learning */}
          <NavSection title="Insights">
            <NavItem
              href="#predictive-insights"
              icon={Brain}
              label="AI Insights"
              onClick={onClose}
            />
            <NavItem
              href="#executive-summary"
              icon={FileText}
              label="Summary"
              onClick={onClose}
            />
            <NavItem
              href="/learn-finance"
              icon={BookOpen}
              label="Learn Finance"
              isActive={pathname === "/learn-finance"}
              onClick={onClose}
            />
          </NavSection>

          {/* Collaboration */}
          <NavSection title="Collaboration">
            <NavItem
              href="/comments"
              icon={MessageSquare}
              label="Comments"
              isActive={pathname === "/comments"}
              onClick={onClose}
            />
          </NavSection>

          {/* Settings */}
          <NavSection title="Settings" defaultOpen={false}>
            <NavItem
              href="/team"
              icon={Users}
              label="Team Management"
              isActive={pathname === "/team"}
              onClick={onClose}
            />
            <NavItem
              href="/settings"
              icon={Settings}
              label="Preferences"
              isActive={pathname === "/settings"}
              onClick={onClose}
            />
          </NavSection>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="p-3 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white">Pro Features</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Advanced forecasting, unlimited uploads, and team collaboration
            </p>
            <button className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition">
              Upgrade Now
            </button>
          </div>
          
          <div className="mt-3 text-xs text-slate-500 text-center">
            © {new Date().getFullYear()} InsightBridge
          </div>
        </div>

        {/* Custom Scrollbar Styles */}
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>
      </aside>
    </>
  );
}