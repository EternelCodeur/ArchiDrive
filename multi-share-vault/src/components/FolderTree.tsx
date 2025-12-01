import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { Folder as FolderType, Service } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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
  const isActive = currentFolderId === folder.id;
  const { data: apiChildren } = useQuery<FolderType[]>({
    queryKey: ['folders-by-parent', folder.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/folders?parent_id=${folder.id}`);
      if (!res.ok) return [] as FolderType[];
      return res.json();
    },
    staleTime: 30_000,
  });
  const hasChildren = (apiChildren?.length ?? 0) > 0;

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
  const { user } = useAuth();
  const { data: visibleServices } = useQuery<Service[]>({
    queryKey: ["visible-services", user?.id ?? 0],
    queryFn: async () => {
      const res = await apiFetch(`/api/services/visible`);
      if (!res.ok) throw new Error("Erreur chargement services visibles");
      return res.json();
    },
    staleTime: 60_000,
  });

  const ServiceNode = ({ service }: { service: Service }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { data: roots } = useQuery<FolderType[]>({
      queryKey: ['service-root', service.id],
      queryFn: async () => {
        const res = await apiFetch(`/api/folders?service_id=${service.id}`);
        if (!res.ok) return [] as FolderType[];
        return res.json();
      },
      staleTime: 60_000,
    });
    const root = (roots ?? [])[0];
    // Fetch currentFolder to know which service it belongs to
    const { data: currentFolder } = useQuery<FolderType | null>({
      queryKey: ['folder-by-id', currentFolderId ?? 0],
      enabled: typeof currentFolderId === 'number',
      queryFn: async () => {
        const res = await apiFetch(`/api/folders/${currentFolderId}`);
        if (!res.ok) return null;
        return res.json();
      },
      staleTime: 30_000,
    });
    // We don't render children in the sidebar (service-only level)
    const isActive = typeof root?.id === 'number' && currentFolderId === root.id;

    // Auto-sync expansion with current folder's service
    useEffect(() => {
      const belongsToThisService = (currentFolder?.service_id ?? null) === service.id;
      setIsExpanded(belongsToThisService);
    }, [currentFolder?.service_id, service.id]);

    return (
      <div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
            isActive
              ? "bg-blue-100 text-blue-700 font-medium"
              : "text-slate-100 hover:bg-blue-100 hover:text-blue-700"
          }`}
          style={{ paddingLeft: `12px` }}
          onClick={() => {
            if (typeof root?.id !== 'number') return;
            if (isExpanded) {
              // Collapse only, and close the related tab/breadcrumb (prefer current folder)
              setIsExpanded(false);
              if (onCloseTabByFolderId) onCloseTabByFolderId(typeof currentFolderId === 'number' ? currentFolderId : root.id!);
              return;
            }
            // Expand and navigate to service root
            setIsExpanded(true);
            onFolderClick(root.id);
          }}
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm truncate flex-1">{service.name}</span>
        </div>
        {/* No subfolders rendered under services in the sidebar */}
      </div>
    );
  };

  return (
    <div className="space-y-1 py-2">
      {(visibleServices ?? []).map((svc) => (
        <ServiceNode key={svc.id} service={svc} />
      ))}
    </div>
  );
};
