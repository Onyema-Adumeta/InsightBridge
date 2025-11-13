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

  const baseClasses = "flex items-center justify-between gap-2 px-3 py-3 rounded-lg transition-all duration-200 group touch-target";
  
  const activeClasses = isActive
    ? "bg-primary/10 text-primary border border-primary/30"
    : "hover:bg-muted/60 text-foreground/80 hover:text-foreground active:bg-muted";

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-80 group-hover:opacity-100 flex-shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge && (
        <span className="badge badge-success flex-shrink-0">
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
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition touch-target"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isOpen && (
        <div className="space-y-1 animate-slide-in-bottom">{children}</div>
      )}
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
          className="md:hidden mobile-menu-overlay fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen 
          w-[280px] sm:w-72 md:w-64
          overflow-hidden
          bg-card/95 border-r border-border 
          backdrop-blur 
          z-50 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          shadow-2xl md:shadow-none
        `}
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="h-16 md:h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 md:w-8 md:h-8 bg-gradient-to-br from-[var(--ring)] to-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 md:w-4 md:h-4 text-primary-foreground" />
            </div>
            <span className="text-base md:text-sm font-bold tracking-wide text-foreground">
              InsightBridge
            </span>
          </div>
          
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden touch-target p-2 hover:bg-muted/50 active:bg-muted rounded-lg transition flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>

          {/* Desktop Version Tag */}
          <span className="hidden md:block text-xs text-muted-foreground font-mono">v1.0</span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 md:p-3 space-y-6 overflow-y-auto touch-scroll overscroll-contain scrollbar-hide">
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
        <div className="p-4 md:p-3 border-t border-border flex-shrink-0">
          <div className="card-mobile border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 md:w-4 md:h-4 text-primary" />
              <span className="text-sm md:text-xs font-semibold text-foreground">Pro Features</span>
            </div>
            <p className="text-sm md:text-xs text-muted-foreground mb-3">
              Advanced forecasting, unlimited uploads, and team collaboration
            </p>
            <button className="btn-primary w-full touch-target">
              Upgrade Now
            </button>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} InsightBridge
          </div>
        </div>
      </aside>
    </>
  );
}