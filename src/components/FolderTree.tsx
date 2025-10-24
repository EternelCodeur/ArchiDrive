import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { Folder as FolderType } from "@/types";
import { getFoldersByParent } from "@/data/mockData";

interface FolderTreeProps {
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
}

interface TreeNodeProps {
  folder: FolderType;
  level: number;
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
}

const TreeNode = ({ folder, level, onFolderClick, currentFolderId }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const subfolders = getFoldersByParent(folder.id);
  const hasChildren = subfolders.length > 0;
  const isActive = currentFolderId === folder.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
        }`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          onFolderClick(folder.id);
        }}
      >
        {hasChildren && (
          <div className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        )}
        {!hasChildren && <div className="w-4" />}
        
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0 text-sidebar-primary" />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0 text-sidebar-primary" />
        )}
        
        <span className="text-sm truncate flex-1">{folder.name}</span>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-1">
          {subfolders.map((subfolder) => (
            <TreeNode
              key={subfolder.id}
              folder={subfolder}
              level={level + 1}
              onFolderClick={onFolderClick}
              currentFolderId={currentFolderId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderTree = ({ onFolderClick, currentFolderId }: FolderTreeProps) => {
  const rootFolders = getFoldersByParent(null);

  return (
    <div className="space-y-1 py-2">
      {rootFolders.map((folder) => (
        <TreeNode
          key={folder.id}
          folder={folder}
          level={0}
          onFolderClick={onFolderClick}
          currentFolderId={currentFolderId}
        />
      ))}
    </div>
  );
};
