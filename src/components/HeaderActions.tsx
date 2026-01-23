import { Link, useNavigate } from "react-router-dom";
import { Bell, CreditCard, LogOut, Settings, Coins, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useHeaderAnnouncements } from "@/hooks/useHeaderAnnouncements";
import { formatCredits } from "@/lib/pricing";
import { formatDistanceToNow } from "date-fns";

export function HeaderActions() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const { balance } = useCredits();
  const { data: announcements } = useHeaderAnnouncements();
  
  const unreadCount = announcements?.length || 0;
  
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  
  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name;
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || "U";
  };
  
  return (
    <div className="flex items-center gap-3">
      {/* 1. Credit Badge */}
      <Link to="/dashboard/billing">
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 cursor-pointer hover:bg-accent transition-colors">
          <Coins className="h-3.5 w-3.5" />
          {formatCredits(balance)}
        </Badge>
      </Link>
      
      {/* 2. Notification Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
          </div>
          <ScrollArea className="h-72">
            {announcements?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              announcements?.map((a) => (
                <div key={a.id} className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </ScrollArea>
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link to="/dashboard/notifications">View all notifications</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* 3. User Avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{user?.user_metadata?.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
            <User className="mr-2 h-4 w-4" /> Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dashboard/billing")}>
            <CreditCard className="mr-2 h-4 w-4" /> Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
