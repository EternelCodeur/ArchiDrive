import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { Folder as FolderType } from "@/types";
import { getFoldersByParent } from "@/data/mockData";

interface FolderTreeProps {
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
  externalCollapseId?: number | null;
  onCloseTabByFolderId?: (folderId: number) => void;
}

interface TreeNodeProps {
  folder: FolderType;
  level: number;
  onFolderClick: (folderId: number) => void;
  currentFolderId: number | null;
  externalCollapseId?: number | null;
  onCloseTabByFolderId?: (folderId: number) => void;
}

const TreeNode = ({ folder, level, onFolderClick, currentFolderId, externalCollapseId, onCloseTabByFolderId }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const subfolders = getFoldersByParent(folder.id);
  const hasChildren = subfolders.length > 0;
  const isActive = currentFolderId === folder.id;

  useEffect(() => {
    if (externalCollapseId === folder.id) {
      setIsExpanded(false);
    }
  }, [externalCollapseId, folder.id]);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
          isActive
            ? "bg-blue-100 text-blue-700 font-medium"
            : "text-slate-100 hover:bg-blue-100 hover:text-blue-700"
        }`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => {
          if (hasChildren) {
            if (isExpanded) {
              if (onCloseTabByFolderId) {
                onCloseTabByFolderId(folder.id);
              }
              setIsExpanded(false);
              return;
            } else {
              setIsExpanded(true);
              onFolderClick(folder.id);
              return;
            }
          }
          onFolderClick(folder.id);
        }}
      >
        {!hasChildren && <div className="w-4" />}

        {isExpanded ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0" />
        )}

        <span className="text-sm truncate flex-1">{folder.name}</span>
      </div>
    </div>
  );
};

export const FolderTree = ({ onFolderClick, currentFolderId, externalCollapseId, onCloseTabByFolderId }: FolderTreeProps) => {
  const allRoot = getFoldersByParent(null);
  const sharedRoot = allRoot.find((f) => f.is_shared_folder);
  const rootFolders = allRoot.filter((f) => !f.is_shared_folder);

  return (
    <div className="space-y-1 py-2">
      {sharedRoot && (
        <TreeNode
          key={sharedRoot.id}
          folder={sharedRoot}
          level={0}
          onFolderClick={onFolderClick}
          currentFolderId={currentFolderId}
          externalCollapseId={externalCollapseId}
          onCloseTabByFolderId={onCloseTabByFolderId}
        />
      )}
      {rootFolders.map((folder) => (
        <TreeNode
          key={folder.id}
          folder={folder}
          level={0}
          onFolderClick={onFolderClick}
          currentFolderId={currentFolderId}
          externalCollapseId={externalCollapseId}
          onCloseTabByFolderId={onCloseTabByFolderId}
        />
      ))}
    </div>
  );
};
