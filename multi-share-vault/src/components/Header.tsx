import { Search, Bell, LogOut, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { mockEnterprises } from "@/data/mockData";

export const Header = ({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const currentEnterpriseName =
    user && user.role !== "super_admin"
      ? (user.enterprise_name ?? (user.enterprise_id ? (mockEnterprises.find((e) => e.id === user.enterprise_id)?.name ?? null) : null))
      : null;

  const getRoleBadge = (role: string) => {
    const badges = {
      agent: { label: "Agent", color: "bg-muted text-muted-foreground" },
      admin: { label: "Administrateur", color: "bg-blue-500/10 text-blue-600" },
      super_admin: { label: "Super admin", color: "bg-primary/10 text-primary" },
    };
    return badges[role as keyof typeof badges] || badges.agent;
  };

  const badge = user ? getRoleBadge(user.role) : null;

  return (
    <header className="h-16 border-b bg-card/70 backdrop-blur-sm sticky top-0 z-20">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileSidebar} aria-label="Ouvrir le menu">
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <img src="/logo-archi.png" alt="ArchiDrive" className="h-16 w-16 object-contain" />
          {currentEnterpriseName && (
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold truncate max-w-[180px]">
                {currentEnterpriseName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "agent" && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{user?.name}</p>
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-md mt-2 text-black">{user?.service_name}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  navigate("/profile");
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => { e.preventDefault(); void handleLogout(); }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
