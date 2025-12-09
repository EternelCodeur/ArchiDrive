import { FolderTree } from "./FolderTree";
import { FileText, Menu, Folder as FolderIcon, FolderOpen as FolderOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { mockEnterprises } from "@/data/mockData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Service } from "@/types";
type SharedFolderSummary = { id: number; name: string; folder_id: number; visibility: 'enterprise'|'services' };

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
  const { data: sharedFolders = [] } = useQuery<SharedFolderSummary[]>({
    queryKey: ["shared-folders", user?.id ?? 0],
    queryFn: async () => {
      const res = await apiFetch(`/api/shared-folders/visible`);
      if (!res.ok) return [] as SharedFolderSummary[];
      return res.json();
    },
    staleTime: 30_000,
  });
  // Track expanded/open state for shared folders by shared id
  const [expandedShared, setExpandedShared] = useState<Record<number, boolean>>({});
  // When navigating to a shared folder, mark it open
  useEffect(() => {
    if (typeof currentFolderId !== 'number') return;
    const match = (sharedFolders || []).find(sf => sf.folder_id === currentFolderId);
    if (match) setExpandedShared(prev => ({ ...prev, [match.id]: true }));
  }, [currentFolderId, sharedFolders]);
  // When an external collapse targets a shared folder, close it
  useEffect(() => {
    if (typeof collapseFolderId !== 'number') return;
    const match = (sharedFolders || []).find(sf => sf.folder_id === collapseFolderId);
    if (match) setExpandedShared(prev => ({ ...prev, [match.id]: false }));
  }, [collapseFolderId, sharedFolders]);
  // Resolve current folder to detect which service is open in compact view
  const { data: currentFolder } = useQuery<{ id: number; service_id: number | null } | null>({
    queryKey: ["sidebar-current-folder", currentFolderId ?? 0],
    enabled: typeof currentFolderId === 'number',
    queryFn: async () => {
      const res = await apiFetch(`/api/folders/${currentFolderId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
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
      } border-r bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900/90 text-slate-100 flex flex-col transition-all duration-300 sticky top-0 self-start h-screen`}
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

      {/* Shared folders (expanded) + Folder Tree */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          <div className="py-2">
            {sharedFolders.length > 0 && (
              <div className="mb-0">
                <div className="mt-2 space-y-1">
                  {sharedFolders.map((sf) => {
                    const isOpen = Boolean(expandedShared[sf.id]) || currentFolderId === sf.folder_id;
                    return (
                      <div
                        key={sf.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                          isOpen ? "bg-blue-100 text-blue-700 font-medium" : "text-slate-100 hover:bg-blue-100 hover:text-blue-700"
                        }`}
                        onClick={() => {
                          if (isOpen) {
                            setExpandedShared(prev => ({ ...prev, [sf.id]: false }));
                            if (onCloseTabByFolderId) onCloseTabByFolderId(sf.folder_id);
                          } else {
                            setExpandedShared(prev => ({ ...prev, [sf.id]: true }));
                            onFolderClick(sf.folder_id);
                          }
                        }}
                        title={sf.name}
                      >
                        {isOpen ? (
                          <FolderOpenIcon className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <FolderIcon className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{sf.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <FolderTree onFolderClick={onFolderClick} currentFolderId={currentFolderId} externalCollapseId={collapseFolderId} onCloseTabByFolderId={onCloseTabByFolderId} />
          </div>
        </div>
      )}
      {isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          <div className="py-4 flex flex-col items-center gap-3">
            {sharedFolders.map((sf) => {
              const isOpen = Boolean(expandedShared[sf.id]) || currentFolderId === sf.folder_id;
              return (
                <Tooltip key={`sf-${sf.id}`}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (isOpen) {
                          setExpandedShared(prev => ({ ...prev, [sf.id]: false }));
                          if (onCloseTabByFolderId) onCloseTabByFolderId(sf.folder_id);
                        } else {
                          setExpandedShared(prev => ({ ...prev, [sf.id]: true }));
                          onFolderClick(sf.folder_id);
                        }
                      }}
                      className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold shadow-sm border transition-colors ${
                        isOpen ? "bg-blue-600/20 text-white border-blue-500" : "bg-black text-white border-black/60 hover:bg-blue-600 hover:border-blue-500"
                      }`}
                      aria-label={sf.name}
                      title={sf.name}
                    >
                      {isOpen ? <FolderOpenIcon className="w-4 h-4" /> : <FolderIcon className="w-4 h-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{sf.name}</TooltipContent>
                </Tooltip>
              );
            })}
            {collapsedServices.map((svc) => {
              const letter = (svc.name || "?").trim().charAt(0).toUpperCase();
              const isServiceOpen = (currentFolder?.service_id ?? null) === svc.id;
              return (
                <Tooltip key={svc.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        if (isServiceOpen) {
                          if (onCloseTabByFolderId && typeof currentFolderId === 'number') {
                            onCloseTabByFolderId(currentFolderId);
                          }
                          return;
                        }
                        const res = await apiFetch(`/api/folders?service_id=${svc.id}`);
                        if (res.ok) {
                          const roots: Array<{ id: number }> = await res.json();
                          const root = Array.isArray(roots) ? roots[0] : null;
                          if (root && typeof root.id === 'number') onFolderClick(root.id);
                        }
                      }}
                      className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold shadow-sm border transition-colors ${
                        isServiceOpen ? "bg-blue-600/20 text-white border-blue-500" : "bg-black text-white border-black/60 hover:bg-blue-600 hover:text-white hover:border-blue-500"
                      }`}
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
    </aside>
  );
};
