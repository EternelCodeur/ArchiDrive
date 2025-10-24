import { FolderTree } from "./FolderTree";
import { FileText, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
}

export const Sidebar = ({ onFolderClick, currentFolderId }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-72"
      } bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300`}
    >
      {/* Header */}
      <div className="h-16 border-b border-sidebar-border flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">DocShare</h1>
              <p className="text-xs text-sidebar-foreground/60">Gestion documentaire</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Folder Tree */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          <div className="py-4">
            <div className="px-3 mb-2">
              <h2 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                Mes dossiers
              </h2>
            </div>
            <FolderTree onFolderClick={onFolderClick} currentFolderId={currentFolderId} />
          </div>
        </div>
      )}
    </aside>
  );
};
