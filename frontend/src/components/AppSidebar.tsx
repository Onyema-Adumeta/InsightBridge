"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser, useAuth } from '@clerk/nextjs';
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
  X,
  LogOut,
  User,
  Bell,
  HelpCircle,
  DollarSign
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
  const currentPath = usePathname();
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      
      const sectionId = href.substring(1);
      
      // If already on dashboard, just scroll
      if (currentPath === '/dashboard') {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        // Navigate to dashboard first, then scroll
        router.push(`/dashboard#${sectionId}`);
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
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
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
        suppressHydrationWarning
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
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Hide sidebar on auth pages
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')) {
    return null;
  }

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    
    try {
      const token = await getToken();
      
      if (token) {
        console.log('[AppSidebar] Clearing user data before sign-out...');
        
        await fetch(`/api/v1/main/clear_storage`, {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        console.log('[AppSidebar] ✓ User data cleared successfully');
      }
      
      await signOut();
      
    } catch (error) {
      console.error('[AppSidebar] Error during sign-out:', error);
    } finally {
      window.location.href = '/sign-in';
    }
  };

  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname, onClose]);

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
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-9 h-9 md:w-8 md:h-8 bg-gradient-to-br from-[var(--ring)] to-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 md:w-4 md:h-4 text-primary-foreground" />
            </div>
            <span className="text-base md:text-sm font-bold tracking-wide text-foreground">
              InsightBridge
            </span>
          </Link>
          
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
              isActive={pathname === "/upload"}
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
            {/* ✅ NEW: Cash Flow Forecasting */}
            <NavItem
              href="/cash-flow"
              icon={DollarSign}
              label="Cash Flow"
              badge="HOT"
              isActive={pathname === "/cash-flow"}
              onClick={onClose}
            />
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
          <NavSection title="Insights" defaultOpen={false}>
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
              href="/micro-learning"
              icon={BookOpen}
              label="Micro-Learning"
              badge="NEW"
              isActive={pathname === "/micro-learning"}
              onClick={onClose}
            />
          </NavSection>

          {/* Collaboration */}
          <NavSection title="Collaboration" defaultOpen={false}>
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

        {/* User Profile & Sign Out Section */}
        <div className="border-t border-border flex-shrink-0">
          {/* User Info Card */}
          {isLoaded && user && (
            <Link 
              href="/settings"
              className="block px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center flex-shrink-0 border-2 border-primary/30 ring-2 ring-primary/10">
                  {user.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.firstName || 'User'} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary-foreground" />
                  )}
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.firstName || user.username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.emailAddresses[0]?.emailAddress}
                  </p>
                </div>

                {/* Settings indicator */}
                <Settings className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          )}

          {/* Action Buttons */}
          <div className="p-3 space-y-2">
            {/* Help/Support Button */}
            <button
              className="w-full px-3 py-2 flex items-center gap-3 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-lg group"
              onClick={() => window.open('/help', '_blank')}
              suppressHydrationWarning
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0 opacity-80 group-hover:opacity-100" />
              <span>Help & Support</span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all rounded-lg group border border-transparent hover:border-red-200 dark:hover:border-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
              suppressHydrationWarning
            >
              <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Copyright Footer */}
          <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border/50">
            © {new Date().getFullYear()} InsightBridge
          </div>
        </div>
      </aside>
    </>
  );
}