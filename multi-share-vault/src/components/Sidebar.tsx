import { FolderTree } from "./FolderTree";
import { FileText, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getFoldersByParent, mockEnterprises } from "@/data/mockData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
  collapseFolderId?: number | null;
  onCloseTabByFolderId?: (folderId: number) => void;
}

export const Sidebar = ({ onFolderClick, currentFolderId, collapseFolderId, onCloseTabByFolderId }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const currentEnterprise =
    user && user.enterprise_id
      ? mockEnterprises.find((e) => e.id === user.enterprise_id)
      : null;
  const allRoot = getFoldersByParent(null);
  const sharedRoot = allRoot.find((f) => f.is_shared_folder);
  const rootFolders = [
    ...(sharedRoot ? [sharedRoot] : []),
    ...allRoot.filter((f) => !f.is_shared_folder),
  ];

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
              {currentEnterprise?.name ?? "Mon entreprise"}
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
            {rootFolders.map((folder) => {
              const active = currentFolderId === folder.id;
              const letter = (folder.name || "?").trim().charAt(0).toUpperCase();
              return (
                <Tooltip key={folder.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onFolderClick(folder.id)}
                      className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold shadow-sm border transition-colors ${
                        active
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-transparent text-white hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 border-slate-500"
                      }`}
                      aria-label={folder.name}
                      title={folder.name}
                    >
                      {letter}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{folder.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
