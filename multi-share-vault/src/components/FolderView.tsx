import { useState, useRef, useEffect, useMemo } from "react";
import { Upload, FolderPlus, Search, CheckSquare, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FolderItem } from "./FolderItem";
import { FileItem } from "./FileItem";
import { Breadcrumb } from "./Breadcrumb";
import { ShareModal } from "./ShareModal";
import { getFoldersByParent, getDocumentsByFolder, getFolderPath, getFolderById, isRuntimeFolder } from "@/data/mockData";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Service, Folder as FolderDto } from "@/types";

type BackendDocument = {
  id: number;
  name: string;
  folder_id: number | null;
  service_id: number | null;
  enterprise_id?: number | null;
  file_path: string;
  mime_type: string | null;
  size_bytes: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

interface FolderViewProps {
  folderId: number | null;
  onFolderClick: (folderId: number) => void;
}

export const FolderView = ({ folderId, onFolderClick }: FolderViewProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingName, setCurrentUploadingName] = useState<string>("");
  const [shareDocumentId, setShareDocumentId] = useState<number | null>(null);
  const [shareDocumentName, setShareDocumentName] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ id: number; name: string } | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [renamedDocuments, setRenamedDocuments] = useState<Record<number, string>>({});
  const [renamedFolders, setRenamedFolders] = useState<Record<number, string>>({});
  const [isRenameDocModalOpen, setIsRenameDocModalOpen] = useState(false);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [currentDocToRename, setCurrentDocToRename] = useState<{ id: number; name: string } | null>(null);
  const [currentFolderToRename, setCurrentFolderToRename] = useState<{ id: number; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");
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
  
  const selectedFolder = folderId ? getFolderById(folderId) : null;
  const { data: serverFolder } = useQuery<FolderDto | null>({
    queryKey: ['folder-by-id', folderId ?? 0, user?.id ?? 0],
    enabled: !!folderId && !selectedFolder,
    queryFn: async () => {
      const res = await apiFetch(`/api/folders/${folderId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
  });
  const effectiveSelected: (FolderDto | null) = selectedFolder ?? serverFolder ?? null;
  const mockPath = folderId ? getFolderPath(folderId) : [];
  const { data: resolvedDbFolder } = useQuery<FolderDto | null>({
    queryKey: ['resolve-db-folder', folderId ?? 0, user?.id ?? 0],
    enabled: !!selectedFolder && !!selectedFolder.service_id && selectedFolder.parent_id !== null,
    queryFn: async () => {
      const serviceId = selectedFolder!.service_id as number;
      // get DB root(s) for this service
      const resRoots = await apiFetch(`/api/folders?service_id=${serviceId}`);
      if (!resRoots.ok) return null;
      const roots: FolderDto[] = await resRoots.json();
      if (!Array.isArray(roots) || roots.length === 0) return null;
      // choose root by name match if possible
      const mockRoot = mockPath.find(p => p.parent_id === null) || mockPath[0];
      let current = (mockRoot ? roots.find(r => r.name === mockRoot.name) : null) || roots[0];
      // Walk down the mock path after root
      const segments = mockPath.filter(p => p.parent_id !== null);
      for (const seg of segments) {
        const resChildren = await apiFetch(`/api/folders?parent_id=${current.id}`);
        if (!resChildren.ok) return null;
        const children: FolderDto[] = await resChildren.json();
        const match = children.find(c => c.name === seg.name);
        if (!match) return null;
        current = match;
      }
      return current || null;
    },
    staleTime: 30_000,
  });
  const { data: dbRootFolders } = useQuery<FolderDto[]>({
    queryKey: ['db-root-for-service', selectedFolder?.service_id ?? 0, user?.id ?? 0],
    enabled: !!selectedFolder && selectedFolder.parent_id === null && typeof selectedFolder.service_id === 'number',
    queryFn: async () => {
      const res = await apiFetch(`/api/folders?service_id=${selectedFolder!.service_id}`);
      if (!res.ok) throw new Error('Erreur chargement dossier racine');
      return res.json();
    },
    staleTime: 30_000,
  });
  const isMockRootSelected = !!selectedFolder && selectedFolder.parent_id === null;
  const rootIds = (dbRootFolders ?? []).map(r => r.id).filter((id): id is number => typeof id === 'number');
  const { data: serverSubfoldersForRoots } = useQuery<FolderDto[]>({
    queryKey: ['folders-by-parents', rootIds.join(','), user?.id ?? 0],
    enabled: isMockRootSelected && rootIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        rootIds.map(async (rid) => {
          const res = await apiFetch(`/api/folders?parent_id=${rid}`);
          if (!res.ok) return [] as FolderDto[];
          return res.json();
        })
      );
      const merged = results.flat();
      const unique = new Map<number, FolderDto>();
      for (const f of merged) { if (typeof f.id === 'number') unique.set(f.id, f); }
      return Array.from(unique.values());
    },
    staleTime: 10_000,
  });
  const parentIdForServer = effectiveSelected
    ? (!isMockRootSelected
        ? (resolvedDbFolder?.id ?? effectiveSelected.id)
        : null)
    : null;
  const { data: serverSubfolders } = useQuery<FolderDto[]>({
    queryKey: ['folders-by-parent', parentIdForServer ?? 0, user?.id ?? 0],
    enabled: typeof parentIdForServer === 'number',
    queryFn: async () => {
      const res = await apiFetch(`/api/folders?parent_id=${parentIdForServer}`);
      if (!res.ok) throw new Error('Erreur chargement dossiers');
      return res.json();
    },
    staleTime: 10_000,
  });
  const subfolders = isMockRootSelected ? (serverSubfoldersForRoots ?? []) : (typeof parentIdForServer === 'number' ? (serverSubfolders ?? []) : []);
  // Resolve selected DB folder id for documents listing
  const selectedDbFolderId = effectiveSelected
    ? (!isMockRootSelected ? (resolvedDbFolder?.id ?? effectiveSelected.id) : (dbRootFolders && dbRootFolders[0]?.id) ?? null)
    : null;
  const { data: serverDocuments = [] } = useQuery<Array<BackendDocument>>({
    queryKey: ['documents-by-folder', selectedDbFolderId ?? 0, user?.id ?? 0],
    enabled: typeof selectedDbFolderId === 'number',
    queryFn: async () => {
      const res = await apiFetch(`/api/documents?folder_id=${selectedDbFolderId}`);
      if (!res.ok) return [] as Array<BackendDocument>;
      return res.json();
    },
    staleTime: 10_000,
  });
  // Map backend fields to UI fields (size human-readable, type from mime)
  const uiDocuments = serverDocuments.map((doc) => {
    const sizeBytes = Number(doc.size_bytes ?? 0);
    const kb = sizeBytes / 1024;
    const mb = kb / 1024;
    const size = sizeBytes >= 1024 * 1024 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.ceil(kb))} Ko`;
    const type = (doc.mime_type || '').split('/')[1] || '';
    return {
      id: doc.id as number,
      name: renamedDocuments[doc.id] ?? (doc.name as string),
      folder_id: doc.folder_id ?? (selectedDbFolderId ?? 0),
      size,
      created_at: doc.created_at || new Date().toISOString(),
      author: user?.name || '',
      type,
    };
  });

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    const cleanup = () => {
      if (createdUrl) {
        try { URL.revokeObjectURL(createdUrl); } catch (e) { void e; }
        createdUrl = null;
      }
    };
    const run = async () => {
      if (!isPreviewOpen || !previewDoc) return;
      setPreviewLoading(true);
      setPreviewMime(null);
      setPreviewText(null);
      cleanup();
      try {
        const res = await apiFetch(`/api/documents/${previewDoc.id}`);
        if (res.ok) {
          const meta = await res.json();
          const mime = meta?.mime_type as string | null;
          setPreviewMime(mime);
          const fileRes = await fetch(`/api/documents/${previewDoc.id}/download?ts=${Date.now()}` as RequestInfo, { credentials: 'include', cache: 'no-store' as RequestCache });
          if (fileRes.ok) {
            if (mime && mime.startsWith('text/')) {
              const txt = await fileRes.text();
              setPreviewText(txt);
            } else {
              const blob = await fileRes.blob();
              createdUrl = URL.createObjectURL(blob);
              if (!cancelled) setPreviewUrl(createdUrl);
            }
          }
        }
      } catch { /* ignore */ }
      finally { setPreviewLoading(false); }
    };
    run();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [isPreviewOpen, previewDoc]);
  const path = folderId ? getFolderPath(folderId) : [];
  const svcNameById = new Map((visibleServices ?? []).map((s) => [s.id, s.name]));
  const mapRootName = (f: { parent_id: number | null; service_id: number | null; name: string }) =>
    f.parent_id === null ? (typeof f.service_id === 'number' ? (svcNameById.get(f.service_id) ?? f.name) : f.name) : f.name;
  const displaySubfolders = subfolders.map((f) => ({ ...f, name: renamedFolders[f.id] ?? mapRootName(f) }));
  const pathLike: FolderDto[] = (path.length === 0 && effectiveSelected)
    ? [effectiveSelected]
    : (path as unknown as FolderDto[]);
  const displayPath = pathLike.map((f) => ({ ...f, name: mapRootName(f) }));
  const infoServiceId = (effectiveSelected?.service_id ?? (dbRootFolders && dbRootFolders[0]?.service_id)) ?? null;

  // Search filtering
  const hasSearch = (searchQuery || '').trim().length > 0;
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const q = norm((searchQuery || '').trim());
  const [deepFolders, setDeepFolders] = useState<Array<FolderDto>>([]);
  const [deepFoldersLoading, setDeepFoldersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadAllDescendants = async (rootId: number) => {
      setDeepFoldersLoading(true);
      try {
        const result: FolderDto[] = [];
        const queue: number[] = [rootId];
        const visited = new Set<number>();
        const LIMIT = 2000;
        while (queue.length && result.length < LIMIT && !cancelled) {
          const pid = queue.shift()!;
          if (visited.has(pid)) continue;
          visited.add(pid);
          const res = await apiFetch(`/api/folders?parent_id=${pid}`);
          if (!res.ok) break;
          const children: FolderDto[] = await res.json();
          for (const child of children) {
            result.push(child);
            if (typeof child.id === 'number') queue.push(child.id);
            if (result.length >= LIMIT) break;
          }
        }
        if (!cancelled) setDeepFolders(result);
      } catch {
        if (!cancelled) setDeepFolders([]);
      } finally {
        if (!cancelled) setDeepFoldersLoading(false);
      }
    };
    if (hasSearch && typeof selectedDbFolderId === 'number') {
      loadAllDescendants(selectedDbFolderId);
    } else {
      setDeepFolders([]);
      setDeepFoldersLoading(false);
    }
    return () => { cancelled = true; };
  }, [hasSearch, selectedDbFolderId]);
  const searchFolderSource = hasSearch ? deepFolders : displaySubfolders;
  const filteredSubfolders = useMemo(() => {
    if (!hasSearch) return searchFolderSource;
    return searchFolderSource.filter(f => norm(f.name).includes(q));
  }, [hasSearch, q, searchFolderSource]);
  const filteredDocuments = useMemo(() => {
    if (!hasSearch) return uiDocuments;
    return uiDocuments.filter(d => norm(d.name).includes(q));
  }, [hasSearch, q, uiDocuments]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-primary", "bg-primary/5");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
    
    const files = Array.from(e.dataTransfer.files);
    toast.success(`${files.length} fichier(s) téléversé(s)`, {
      description: "Les fichiers ont été ajoutés au dossier.",
    });
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    // Determine parent and service linkage
    let parentId = folderId ?? null;
    let serviceId: number | null = null;
    if (parentId !== null) {
      const parent = getFolderById(parentId);
      serviceId = parent?.service_id ?? null;
    } else {
      // Fallbacks for root creation
      // 1) user's service
      serviceId = user?.service_id ?? null;
      // 2) visible services (single)
      if (!serviceId && (visibleServices?.length === 1)) {
        serviceId = visibleServices[0].id;
      }
      // If we resolved a service, create inside its DB root folder
      if (serviceId) {
        try {
          const resRoots = await apiFetch(`/api/folders?service_id=${serviceId}`, { toast: { error: { enabled: false }, success: { enabled: false } } });
          if (resRoots.ok) {
            const roots: Array<{ id: number }> = await resRoots.json();
            const root = Array.isArray(roots) ? roots[0] : null;
            if (root && typeof root.id === 'number') parentId = root.id;
          }
        } catch { void 0 }
      }
    }

    // If serviceId is still not resolved, try fetching visible services on-demand
    if (!serviceId) {
      try {
        const res = await apiFetch('/api/services/visible', { toast: { error: { enabled: false }, success: { enabled: false } } });
        if (res.ok) {
          const list: Service[] = await res.json();
          if (Array.isArray(list) && list.length === 1) {
            serviceId = list[0].id;
            const rootFolders = getFoldersByParent(null);
            const serviceRoot = rootFolders.find((f) => f.service_id === serviceId) ?? null;
            if (serviceRoot) {
              parentId = serviceRoot.id;
            }
          }
        }
      } catch { void 0 }
    }

    if (!serviceId) {
      toast.error("Création impossible: votre compte n'est pas assigné à un service. Contactez l'administrateur.");
      return;
    }

    // If parentId points to a mock root (not a DB folder), resolve the corresponding DB root folder id
    if (parentId !== null) {
      const parent = getFolderById(parentId);
      if (parent && parent.parent_id === null && !isRuntimeFolder(parentId) && parent.service_id) {
        const originalMockParentId = parentId;
        try {
          const resRoot = await apiFetch(`/api/folders?service_id=${parent.service_id}`, { toast: { error: { enabled: false }, success: { enabled: false } } });
          if (resRoot.ok) {
            const roots: Array<{ id: number } & Record<string, unknown>> = await resRoot.json();
            const dbRoot = Array.isArray(roots) ? roots.find((r) => typeof r.id === 'number') : null;
            if (dbRoot) parentId = dbRoot.id;
          }
        } catch { void 0 }
        // If mapping failed, fallback to root creation
        if (parentId === originalMockParentId) {
          parentId = null;
        }
      }
    }

    // Persist to backend
    try {
      const res = await apiFetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: parentId, service_id: serviceId }),
        toast: { success: { message: 'Dossier créé' } },
      });
      if (!res.ok) {
        throw new Error('Erreur lors de la création du dossier');
      }
      const saved = await res.json();
      setNewFolderName("");
      setIsCreateModalOpen(false);
      if (parentId !== null) {
        await queryClient.invalidateQueries({ queryKey: ['folders-by-parent', parentId, user?.id ?? 0] });
      }
      onFolderClick(saved.id);
    } catch (err) {
      toast.error('Création du dossier échouée');
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    let targetFolderId: number | null = typeof selectedDbFolderId === 'number' ? selectedDbFolderId : null;
    // Fallback: if no DB folder resolved yet (e.g., root just opened), resolve root by service
    if (targetFolderId === null && effectiveSelected && effectiveSelected.parent_id === null && typeof effectiveSelected.service_id === 'number') {
      try {
        const resRoots = await apiFetch(`/api/folders?service_id=${effectiveSelected.service_id}`);
        if (resRoots.ok) {
          const roots: FolderDto[] = await resRoots.json();
          if (Array.isArray(roots) && roots.length > 0) targetFolderId = roots[0].id as number;
        }
      } catch { /* ignore */ }
    }
    if (typeof targetFolderId !== 'number') {
      toast.error("Veuillez sélectionner un dossier avant de téléverser");
      e.target.value = "";
      return;
    }
    try {
      setIsUploading(true);
      setUploadProgress(0);
      const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0) || 1;
      const loadedMap = new Map<string, number>();

      const recomputeProgress = () => {
        const loadedSum = Array.from(loadedMap.values()).reduce((a, b) => a + b, 0);
        const pct = Math.min(100, Math.max(0, Math.round((loadedSum / totalBytes) * 100)));
        setUploadProgress(pct);
      };

      const uploadFile = (file: File) => new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/documents');
        xhr.withCredentials = true;
        xhr.responseType = 'json';
        xhr.upload.onprogress = (ev: ProgressEvent) => {
          const loaded = ev.lengthComputable ? ev.loaded : 0;
          loadedMap.set(file.name + '|' + file.size, loaded);
          setCurrentUploadingName(file.name);
          recomputeProgress();
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            loadedMap.set(file.name + '|' + file.size, file.size || 0);
            recomputeProgress();
            resolve();
          } else {
            reject(new Error('upload_failed'));
          }
        };
        xhr.onerror = () => reject(new Error('network_error'));
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder_id', String(targetFolderId!));
        fd.append('name', file.name);
        xhr.send(fd);
      });

      const results = await Promise.allSettled(files.map((f) => uploadFile(f)));
      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      if (succeeded > 0) {
        await queryClient.invalidateQueries({ queryKey: ['documents-by-folder', targetFolderId, user?.id ?? 0] });
        await queryClient.refetchQueries({ queryKey: ['documents-by-folder', targetFolderId, user?.id ?? 0] });
      }
      const failed = files.length - succeeded;
      if (failed === 0) {
        toast.success(`${succeeded} fichier(s) téléversé(s)`);
      } else if (succeeded > 0) {
        toast.info(`${succeeded} téléversé(s), ${failed} échec(s)`);
      } else {
        toast.error(`Échec du téléversement (${failed})`);
      }
    } catch {
      toast.error('Échec du téléversement');
    } finally {
      e.target.value = "";
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); setCurrentUploadingName(""); }, 400);
    }
  };

  const toggleDocumentSelection = (id: number) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const toggleFolderSelection = (id: number) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const handleViewDocument = (id: number, name: string) => {
    setPreviewDoc({ id, name });
    setIsPreviewOpen(true);
    setPreviewZoom(1);
  };

  const handleDownloadDocument = (id: number, name: string) => {
    const a = document.createElement('a');
    a.href = `/api/documents/${id}/download`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteDocument = async (id: number) => {
    try {
      const res = await apiFetch(`/api/documents/${id}`, {
        method: 'DELETE',
        toast: { success: { enabled: true, message: 'Document supprimé' }, error: { enabled: true, message: 'Échec de la suppression' } },
      });
      if (!res.ok) throw new Error('delete_failed');
      if (typeof selectedDbFolderId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['documents-by-folder', selectedDbFolderId, user?.id ?? 0] });
      }
    } catch {
      // toast already shown by apiFetch
    }
  };

  const handleShareDocument = (id: number, name: string) => {
    setShareDocumentId(id);
    setShareDocumentName(name);
    setIsShareModalOpen(true);
  };

  const openRenameDocument = (id: number, name: string) => {
    setCurrentDocToRename({ id, name });
    const currentName = renamedDocuments[id] ?? name;
    const base = currentName.replace(/\.[^.]+$/, '');
    setRenameInput(base);
    setIsRenameDocModalOpen(true);
  };

  const openRenameFolder = (id: number, name: string) => {
    setCurrentFolderToRename({ id, name });
    setRenameInput(renamedFolders[id] ?? name);
    setIsRenameFolderModalOpen(true);
  };

  const handleConfirmRenameDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDocToRename) return;
    const value = renameInput.trim();
    if (!value) return;

    (async () => {
      try {
        const res = await apiFetch(`/api/documents/${currentDocToRename.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: value }),
          toast: { success: { enabled: true, message: 'Document renommé' }, error: { enabled: true, message: "Échec du renommage" } },
        });
        if (!res.ok) throw new Error('rename_failed');
        if (typeof selectedDbFolderId === 'number') {
          await queryClient.invalidateQueries({ queryKey: ['documents-by-folder', selectedDbFolderId, user?.id ?? 0] });
        }
      } catch {
        return;
      } finally {
        setIsRenameDocModalOpen(false);
        setCurrentDocToRename(null);
      }
    })();
  };

  const handleConfirmRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFolderToRename) return;
    const value = renameInput.trim();
    if (!value) return;

    (async () => {
      try {
        const res = await apiFetch(`/api/folders/${currentFolderToRename.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: value }),
          toast: { success: { enabled: true, message: 'Dossier renommé' }, error: { enabled: true, message: "Échec du renommage" } },
        });
        if (!res.ok) throw new Error('rename_failed');

        // Clear any local temporary rename
        setRenamedFolders((prev) => ({ ...prev, [currentFolderToRename.id]: undefined as unknown as string }));

        // Invalidate folder lists
        const parentKey = typeof parentIdForServer === 'number' ? parentIdForServer : undefined;
        if (typeof parentKey === 'number') {
          await queryClient.invalidateQueries({ queryKey: ['folders-by-parent', parentKey, user?.id ?? 0] });
        }
        if (isMockRootSelected) {
          await queryClient.invalidateQueries({ queryKey: ['folders-by-parents'] });
        }
      } catch {
        return;
      } finally {
        setIsRenameFolderModalOpen(false);
        setCurrentFolderToRename(null);
      }
    })();
  };

  const handleDeleteFolder = async (id: number, name: string) => {
    try {
      const res = await apiFetch(`/api/folders/${id}`, {
        method: 'DELETE',
        toast: { success: { enabled: true, message: 'Dossier supprimé' }, error: { enabled: true, message: "Échec de la suppression" } },
      });
      if (!res.ok) {
        if (res.status === 405) {
          const alt = await apiFetch(`/api/folders/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
            toast: { success: { enabled: true, message: 'Dossier supprimé' }, error: { enabled: true, message: "Échec de la suppression" } },
          });
          if (!alt.ok) throw new Error('delete_failed');
        } else {
          throw new Error('delete_failed');
        }
      }

      // Invalidate folder lists
      const parentKey = typeof parentIdForServer === 'number' ? parentIdForServer : undefined;
      if (typeof parentKey === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['folders-by-parent', parentKey, user?.id ?? 0] });
      }
      if (isMockRootSelected) {
        await queryClient.invalidateQueries({ queryKey: ['folders-by-parents'] });
      }
    } catch {
      // handled by apiFetch toast
    }
  };

  const handleShareSelectedDocuments = () => {
    if (selectedDocumentIds.length === 0) return;

    setShareDocumentId(selectedDocumentIds[0]);
    setShareDocumentName(
      selectedDocumentIds.length === 1
        ? uiDocuments.find((d) => d.id === selectedDocumentIds[0])?.name || "Document"
        : `${selectedDocumentIds.length} documents sélectionnés`
    );
    setIsShareModalOpen(true);
  };

  const handleDeleteSelectedItems = async () => {
    if (selectedDocumentIds.length === 0 && selectedFolderIds.length === 0) {
      toast.info('Sélectionnez des dossiers ou documents à supprimer');
      return;
    }
    const parts: string[] = [];
    if (selectedFolderIds.length > 0) parts.push(`${selectedFolderIds.length} dossier(s)`);
    if (selectedDocumentIds.length > 0) parts.push(`${selectedDocumentIds.length} document(s)`);
    const label = parts.join(' et ');
    const ok = window.confirm(`Voulez-vous supprimer définitivement ${label} ?`);
    if (!ok) return;
    try {
      // Delete documents first, excluding those inside selected folders
      const selectedFolderSet = new Set(selectedFolderIds);
      const docIdsOutsideSelectedFolders = selectedDocumentIds.filter((did) => {
        const doc = uiDocuments.find((d) => d.id === did);
        return doc ? !selectedFolderSet.has(doc.folder_id ?? -1) : true;
      });
      for (const did of docIdsOutsideSelectedFolders) {
        const resD = await apiFetch(`/api/documents/${did}`, { method: 'DELETE' });
        if (!resD.ok) throw new Error('delete_doc_failed');
      }
      // Then delete selected folders
      for (const fid of selectedFolderIds) {
        const resF = await apiFetch(`/api/folders/${fid}`, { method: 'DELETE' });
        if (!resF.ok) throw new Error('delete_folder_failed');
      }
      if (typeof selectedDbFolderId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['documents-by-folder', selectedDbFolderId, user?.id ?? 0] });
        await queryClient.invalidateQueries({ queryKey: ['folders-by-parent', selectedDbFolderId, user?.id ?? 0] });
      }
      setSelectedDocumentIds([]);
      setSelectedFolderIds([]);
      setSelectionMode(false);
      toast.success('Suppression effectuée');
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un dossier ou document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <FolderPlus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Nouveau dossier</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleUploadClick}
              >
                <Upload className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Téléverser</span>
              </Button>
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setSelectedDocumentIds([]);
                    setSelectedFolderIds([]);
                  } else if (selectedDocumentIds.length > 0 || selectedFolderIds.length > 0) {
                    handleDeleteSelectedItems();
                  } else {
                    setSelectionMode(false);
                  }
                }}
              >
                {selectionMode && (selectedDocumentIds.length > 0 || selectedFolderIds.length > 0) ? (
                  <>
                    <Trash2 className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Supprimer</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Sélectionner</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate" title={currentUploadingName || undefined}>
                  Téléversement… {currentUploadingName && (<>
                    <span className="text-foreground">{currentUploadingName}</span>
                  </>)}
                </span>
                <span aria-live="polite">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded overflow-hidden">
                <div
                  className="h-2 bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuemin={0 as number}
                  aria-valuemax={100 as number}
                  aria-valuenow={uploadProgress as number}
                  role="progressbar"
                  aria-label="Progression du téléversement"
                />
              </div>
            </div>
          )}

          <Breadcrumb path={displayPath} onNavigate={onFolderClick} />
          
        </div>
      </div>

      {/* Content with drag & drop */}
      <div
        className="flex-1 overflow-auto p-6"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {subfolders.length === 0 && uiDocuments.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Ce dossier est vide</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Glissez-déposez des fichiers ici ou utilisez le bouton "Téléverser"
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folders */}
            {filteredSubfolders.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredSubfolders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={{ ...folder, name: renamedFolders[folder.id] ?? folder.name }}
                      onClick={() => onFolderClick(folder.id)}
                      onRename={() => openRenameFolder(folder.id, folder.name)}
                      onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                      selectionMode={selectionMode}
                      selected={selectedFolderIds.includes(folder.id)}
                      onToggleSelect={() => toggleFolderSelection(folder.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {filteredDocuments.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-2">
                  {filteredDocuments.map((doc) => (
                    <FileItem
                      key={doc.id}
                      document={doc}
                      selectionMode={selectionMode}
                      selected={selectedDocumentIds.includes(doc.id)}
                      onToggleSelect={() => toggleDocumentSelection(doc.id)}
                      onView={() => handleViewDocument(doc.id, doc.name)}
                      onShare={() => handleShareDocument(doc.id, doc.name)}
                      onDownload={() => handleDownloadDocument(doc.id, doc.name)}
                      onDelete={() => handleDeleteDocument(doc.id)}
                      onRename={() => openRenameDocument(doc.id, doc.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {hasSearch && filteredSubfolders.length === 0 && filteredDocuments.length === 0 && (
              <div className="text-sm text-muted-foreground p-8 text-center">
                Aucun résultat pour « {searchQuery} »
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for upload button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Create folder modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>
              Saisissez le nom du nouveau dossier puis validez pour le créer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nom du dossier"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename document modal */}
      <Dialog open={isRenameDocModalOpen} onOpenChange={setIsRenameDocModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le document</DialogTitle>
            <DialogDescription>
              Entrez le nouveau nom pour ce document puis validez pour renommer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmRenameDocument} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nouveau nom"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
            />
            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRenameDocModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Renommer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename folder modal */}
      <Dialog open={isRenameFolderModalOpen} onOpenChange={setIsRenameFolderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
            <DialogDescription>
              Entrez le nouveau nom pour ce dossier puis validez pour renommer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmRenameFolder} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nouveau nom"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
            />
            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRenameFolderModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Renommer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Modal (utilisée ici pour le partage de document) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        folderName={shareDocumentName || displayPath[displayPath.length - 1]?.name || "Document"}
        folderId={shareDocumentId || folderId || 0}
      />

      {/* Preview modal */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => { setIsPreviewOpen(open); if (!open) setPreviewZoom(1); }}>
        <DialogContent className="max-w-3xl w-full h-[100vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Prévisualisation</DialogTitle>
            <DialogDescription>
              {previewDoc?.name?.replace(/\.[^.]+$/, '')}
            </DialogDescription>
          </DialogHeader>
          {/* Zoom controls (when applicable) */}
          <div className="flex items-center justify-between pb-2">
            <div className="text-xs text-muted-foreground">{previewMime?.includes('pdf') || previewMime?.startsWith('image/') ? 'Zoom disponible' : ''}</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewZoom((z) => Math.max(0.5, parseFloat((z - 0.1).toFixed(2))))} disabled={!(previewMime?.includes('pdf') || previewMime?.startsWith('image/'))}>−</Button>
              <span className="text-xs w-10 text-center">{Math.round(previewZoom * 100)}%</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewZoom((z) => Math.min(3, parseFloat((z + 0.1).toFixed(2))))} disabled={!(previewMime?.includes('pdf') || previewMime?.startsWith('image/'))}>+</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewZoom(1)} disabled={!(previewMime?.includes('pdf') || previewMime?.startsWith('image/'))}>Réinitialiser</Button>
            </div>
          </div>

          {/* Scrollable document area */}
          <div className="flex-1 overflow-auto rounded border bg-background p-2">
            {previewLoading && <div className="text-sm text-muted-foreground">Chargement…</div>}
            {!previewLoading && previewDoc && (
              previewMime?.startsWith('text/') && previewText !== null ? (
                <pre className="w-full h-full overflow-auto p-4 bg-muted rounded text-sm whitespace-pre-wrap break-words">{previewText}</pre>
              ) : (
                previewUrl ? (
                  previewMime?.startsWith('image/') ? (
                    <div className="w-full h-full" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}>
                      <img src={previewUrl} alt={previewDoc.name} className="max-w-full h-auto object-contain" />
                    </div>
                  ) : previewMime?.startsWith('video/') ? (
                    <video src={previewUrl} controls className="w-full h-full" />
                  ) : previewMime?.startsWith('audio/') ? (
                    <audio src={previewUrl} controls className="w-full" />
                  ) : (previewMime?.includes('pdf')) ? (
                    <div className="w-full" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}>
                      <object data={previewUrl} type="application/pdf" className="w-full h-[1200px] border rounded">
                        <a href={previewUrl} target="_blank" rel="noreferrer">Ouvrir le PDF</a>
                      </object>
                    </div>
                  ) : (
                    <iframe src={previewUrl} title={previewDoc.name} className="w-full h-full border rounded" />
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Préparation de l’aperçu…</div>
                )
              )
            )}
          </div>

          {/* Fixed footer */}
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(false)}>Fermer</Button>
            {previewDoc && (
              <Button type="button" onClick={() => handleDownloadDocument(previewDoc.id, previewDoc.name)}>Télécharger</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
