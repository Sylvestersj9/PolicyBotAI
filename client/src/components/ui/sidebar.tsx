import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { 
  LayoutDashboard, 
  FileText, 
  Search, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, closeSidebar } = useSidebar();
  
  // Close sidebar on navigation for mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  }, [location, closeSidebar]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if it's mobile view and the sidebar is open
      if (window.innerWidth < 1024 && isOpen) {
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          closeSidebar();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeSidebar]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const NavItem = ({ 
    href, 
    icon: Icon, 
    label 
  }: { 
    href: string; 
    icon: React.ElementType; 
    label: string;
  }) => {
    const isActive = location === href;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-blue-50 text-primary border-l-4 border-primary" 
                    : "hover:bg-neutral-100"
                } rounded-none px-4 py-3 h-auto`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {!collapsed && <span>{label}</span>}
              </Button>
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mt-6">
      {!collapsed && (
        <div className="px-4 mb-1">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{title}</p>
        </div>
      )}
      {children}
    </div>
  );

  // The sidebar overlay for mobile
  const SidebarOverlay = () => (
    <div 
      className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out lg:hidden z-20 ${
        isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
      }`}
      onClick={closeSidebar}
    />
  );

  return (
    <>
      <SidebarOverlay />
      <aside 
        id="main-sidebar"
        className={`fixed lg:relative bg-white border-r border-neutral-200 flex flex-col shadow-sm h-screen z-30
          ${collapsed ? "w-16" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          transition-all duration-300 ease-in-out`}
      >
        {/* Logo section */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            {!collapsed && <span className="ml-3 font-semibold text-xl text-primary">Pro Policy AI</span>}
          </div>
          
          {/* Close button for mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/policies" icon={FileText} label="Policies" />
          <NavItem href="/ai-search" icon={Search} label="AI Search" />
          
          <NavSection title="Settings">
            <NavItem href="/settings" icon={Settings} label="Settings" />
            <NavItem href="/help" icon={HelpCircle} label="Help & Support" />
          </NavSection>
        </nav>
        
        {/* User profile section */}
        <div className="border-t border-neutral-200 p-4">
          <div className="flex items-center">
            <Avatar className="h-9 w-9 bg-primary text-white">
              <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
            </Avatar>
            
            {!collapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="font-medium text-sm truncate">{user?.name}</p>
                <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
              </div>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto text-neutral-400 hover:text-neutral-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>
    </>
  );
}
