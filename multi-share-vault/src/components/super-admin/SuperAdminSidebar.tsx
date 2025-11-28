import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, LayoutDashboard, Building2, Database, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type SuperAdminTab = "dashboard" | "enterprises" | "storage" | "super_admins";

interface SuperAdminSidebarProps {
  activeTab: SuperAdminTab;
  onChangeTab: (tab: SuperAdminTab) => void;
}

export const SuperAdminSidebar = ({ activeTab, onChangeTab }: SuperAdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-56"} border-r bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900/90 p-4 space-y-4 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto text-slate-100`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {user?.name ?? "Super administrateur"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="h-8 w-8 shrink-0"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Button
          variant={activeTab === "dashboard" ? "default" : "ghost"}
          className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2`}
          size="sm"
          type="button"
          onClick={() => onChangeTab("dashboard")}
        >
          <LayoutDashboard className="w-4 h-4" />
          {!collapsed && <span>Tableau de bord</span>}
        </Button>
        <Button
          variant={activeTab === "enterprises" ? "default" : "ghost"}
          className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2`}
          size="sm"
          type="button"
          onClick={() => onChangeTab("enterprises")}
        >
          <Building2 className="w-4 h-4" />
          {!collapsed && <span>G des entreprises</span>}
        </Button>
        <Button
          variant={activeTab === "storage" ? "default" : "ghost"}
          className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2`}
          size="sm"
          type="button"
          onClick={() => onChangeTab("storage")}
        >
          <Database className="w-4 h-4" />
          {!collapsed && <span>G du stockage</span>}
        </Button>
        <Button
          variant={activeTab === "super_admins" ? "default" : "ghost"}
          className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2`}
          size="sm"
          type="button"
          onClick={() => onChangeTab("super_admins")}
        >
          <Users className="w-4 h-4" />
          {!collapsed && <span>G des super admin</span>}
        </Button>
      </div>
    </aside>
  );
};
