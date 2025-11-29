import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Upload, 
  FileText, 
  PoundSterling, 
  BarChart3, 
  Shield, 
  Settings, 
  ScrollText,
  LogOut,
  Eye,
  User,
  Users,
  Receipt,
  Database,
  FileCog,
  Palette,
  Mail
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import dentaradLogo from "@/assets/dentarad-logo-white.jpg";

export function AppSidebar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: sidebarState } = useSidebar();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserRole(data?.role || null);
      }
    }
    fetchUserRole();
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = (path: string) =>
    isActive(path) ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const clinicItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Upload Case", url: "/upload-case", icon: Upload },
    { title: "Invoices", url: "/invoices", icon: Receipt },
  ];

  const reporterItems = [
    { title: "Dashboard", url: "/reporter", icon: BarChart3 },
    { title: "Cases", url: "/reporter", icon: FileText },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/reporter", icon: BarChart3 },
    { title: "Cases", url: "/reporter", icon: FileText },
    { title: "Invoicing", url: "/admin/invoicing", icon: Receipt },
    { title: "Invoice History", url: "/admin/invoice-history", icon: ScrollText },
    { title: "Invoice Settings", url: "/admin/invoice-settings", icon: Settings },
    { title: "User Management", url: "/admin/users", icon: Users },
    { title: "Data Retention", url: "/admin/data-retention", icon: Database },
    { title: "PDF Template", url: "/admin/pdf-template", icon: FileCog },
    { title: "Template Editor", url: "/admin/template-editor", icon: Palette },
    { title: "Email Templates", url: "/admin/email-templates", icon: Mail },
    { title: "Security", url: "/admin/security-dashboard", icon: Shield },
    { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
  ];

  const items = userRole === 'admin' ? adminItems : (userRole === 'reporter' ? reporterItems : clinicItems);
  const collapsed = sidebarState === "collapsed";

  return (
    <Sidebar collapsible="icon" className="bg-white border-r">
      <SidebarContent className="bg-white">
        {/* Logo Section */}
        <div className="p-4 border-b">
          {!collapsed ? (
            <img src={dentaradLogo} alt="DentaRad" className="w-full h-auto" />
          ) : (
            <img src={dentaradLogo} alt="DentaRad" className="w-full h-auto" />
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 p-2">
              {!collapsed && (
                <div className="text-xs text-muted-foreground px-2">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  {userRole && (
                    <div className="text-xs font-medium text-primary">
                      {userRole === 'admin' ? 'Administrator' : (userRole === 'reporter' ? 'Reporter' : 'Clinic User')}
                    </div>
                  )}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4" />
                {!collapsed && <span className="ml-2">Logout</span>}
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
