import { FolderTree } from "./FolderTree";
import { FileText, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { mockEnterprises } from "@/data/mockData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Service } from "@/types";

interface SidebarProps {
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
  collapseFolderId?: number | null;
  onCloseTabByFolderId?: (folderId: number) => void;
}

export const Sidebar = ({ onFolderClick, currentFolderId, collapseFolderId, onCloseTabByFolderId }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const currentEnterpriseName =
    user && user.role !== 'super_admin'
      ? (user.enterprise_name ?? (user.enterprise_id ? (mockEnterprises.find((e) => e.id === user.enterprise_id)?.name ?? null) : null))
      : null;
  const canViewAll = user?.role === 'admin' || user?.role === 'super_admin';
  const { data: visibleServices } = useQuery<Service[]>({
    queryKey: ["visible-services", user?.id ?? 0],
    queryFn: async () => {
      const res = await apiFetch(`/api/services/visible`);
      if (!res.ok) throw new Error("Erreur chargement services visibles");
      return res.json();
    },
    staleTime: 60_000,
  });
  const collapsedServices = (visibleServices ?? []);
  const userService = (visibleServices ?? []).find(s => s.id === (user?.service_id ?? -1)) || null;

  const openServiceRoot = async (serviceId: number) => {
    const res = await apiFetch(`/api/folders?service_id=${serviceId}`);
    if (res.ok) {
      const roots: Array<{ id: number }> = await res.json();
      const root = Array.isArray(roots) ? roots[0] : null;
      if (root && typeof root.id === 'number') onFolderClick(root.id);
    }
  };

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-60"
      } border-r bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900/90 text-slate-100 flex flex-col transition-all duration-300 sticky top-16 self-start h-[calc(100vh-4rem)]`}
    >
      {/* Header */}
      <div className="h-16 border-b border-slate-700/60 flex items-center px-4 gap-2">
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">
              {currentEnterpriseName ?? "Mon entreprise"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 ml-auto shrink-0"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Folder Tree */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          <div className="py-4">
            <FolderTree onFolderClick={onFolderClick} currentFolderId={currentFolderId} externalCollapseId={collapseFolderId} onCloseTabByFolderId={onCloseTabByFolderId} />
          </div>
        </div>
      )}
      {isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          <div className="py-4 flex flex-col items-center gap-3">
            {collapsedServices.map((svc) => {
              const letter = (svc.name || "?").trim().charAt(0).toUpperCase();
              return (
                <Tooltip key={svc.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        const res = await apiFetch(`/api/folders?service_id=${svc.id}`);
                        if (res.ok) {
                          const roots: Array<{ id: number }> = await res.json();
                          const root = Array.isArray(roots) ? roots[0] : null;
                          if (root && typeof root.id === 'number') onFolderClick(root.id);
                        }
                      }}
                      className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold shadow-sm border transition-colors bg-black text-white border-black/60 hover:bg-blue-600 hover:text-white hover:border-blue-500`}
                      aria-label={svc.name}
                      title={svc.name}
                    >
                      {letter}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{svc.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer: shortcut to user's own service root */}
      <div className="border-t border-slate-700/60 p-2">
        {userService ? (
          isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openServiceRoot(userService.id)}
                  className="w-10 h-10 rounded-md flex items-center justify-center font-semibold shadow-sm border transition-colors bg-black text-white border-black/60 hover:bg-blue-600 hover:border-blue-500"
                  aria-label={userService.name}
                  title={userService.name}
                >
                  {(userService.name || '?').trim().charAt(0).toUpperCase()}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Mon service: {userService.name}</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => openServiceRoot(userService.id)}
              className="w-full text-left px-3 py-2 rounded-md bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/40 text-blue-100"
            >
              Mon service: <span className="font-semibold">{userService.name}</span>
            </button>
          )
        ) : (
          <div className="text-xs text-slate-400 px-1">Aucun service</div>
        )}
      </div>
    </aside>
  );
};
