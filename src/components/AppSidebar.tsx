import { LogOut, Home, FolderOpen, MoreVertical, User, CreditCard, Bell, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarSearch } from "@/components/SidebarSearch";


const menuItems = [{
  title: "Home",
  url: "/dashboard",
  icon: Home
}, {
  title: "Projects",
  url: "/dashboard/projects",
  icon: FolderOpen
}];

export function AppSidebar() {
  const { user, signOut } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to sign out"
      });
    } else {
      toast({
        title: "Signed out",
        description: "See you soon!"
      });
      navigate("/login");
    }
  };

  const getUserInitials = () => {
    const email = user?.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-5 pb-2">
        <img alt="SerpAISEO" src="/lovable-uploads/54bfa7c0-e6ff-4948-8585-699df801d3cf.webp" className="h-10 object-contain" />
      </SidebarHeader>

      <SidebarContent>
        {/* Search Command */}
        <div className="px-3 pt-2 pb-1">
          <SidebarSearch />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"} 
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                          isActive 
                            ? "bg-accent text-accent-foreground font-medium" 
                            : "text-sidebar-foreground/70 hover:bg-accent/50"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || "User"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {user?.email}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-accent/50">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                <User className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/notifications")}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
