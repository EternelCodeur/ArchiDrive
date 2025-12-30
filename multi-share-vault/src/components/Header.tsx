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
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type RecentUpload = {
  id: number;
  name: string;
  created_at?: string;
  created_by_name?: string | null;
};

export const Header = ({
  onOpenMobileSidebar,
  currentFolderId,
}: {
  onOpenMobileSidebar?: () => void;
  currentFolderId?: number | null;
}) => {
  const { user, logout, booting } = useAuth();
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

  const { data: recentUploads = [], isLoading: isRecentLoading } = useQuery<RecentUpload[]>({
    queryKey: ["recent-uploads", user?.id ?? 0, currentFolderId ?? null],
    enabled: !!user && !booting,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('limit', '5');
      if (typeof currentFolderId === 'number') qs.set('folder_id', String(currentFolderId));
      const res = await apiFetch(`/api/documents/recent?${qs.toString()}`, { toast: { error: { enabled: false } } });
      if (!res.ok) return [] as RecentUpload[];
      return res.json();
    },
    staleTime: 15_000,
  });

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
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  {recentUploads.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Derniers téléversements</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isRecentLoading && (
                  <DropdownMenuItem disabled>Chargement…</DropdownMenuItem>
                )}

                {!isRecentLoading && recentUploads.length === 0 && (
                  <DropdownMenuItem disabled>Aucun téléversement récent</DropdownMenuItem>
                )}

                {!isRecentLoading && recentUploads.map((doc) => (
                  <DropdownMenuItem
                    key={doc.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      navigate(`/documents/${doc.id}`);
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium truncate w-full">{doc.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {(doc.created_by_name ? `Par ${doc.created_by_name}` : 'Par —')}
                      {doc.created_at ? ` • ${new Date(doc.created_at).toLocaleString('fr-FR')}` : ''}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
