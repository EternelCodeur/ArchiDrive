import { useState, useRef } from "react";
import { Upload, FolderPlus, Search, CheckSquare, Share2 } from "lucide-react";
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
  const [shareDocumentId, setShareDocumentId] = useState<number | null>(null);
  const [shareDocumentName, setShareDocumentName] = useState<string>("");
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
  const documents = folderId ? getDocumentsByFolder(folderId) : [];
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    toast.success(`${files.length} fichier(s) sélectionné(s)`, {
      description: "Les fichiers seront ajoutés au dossier (simulation).",
    });

    e.target.value = "";
  };

  const toggleDocumentSelection = (id: number) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const handleViewDocument = (name: string) => {
    toast.info(`Aperçu de "${name}"`, {
      description: "La prévisualisation avancée sera ajoutée plus tard (simulation).",
    });
  };

  const handleShareDocument = (id: number, name: string) => {
    setShareDocumentId(id);
    setShareDocumentName(name);
    setIsShareModalOpen(true);
  };

  const openRenameDocument = (id: number, name: string) => {
    setCurrentDocToRename({ id, name });
    setRenameInput(renamedDocuments[id] ?? name);
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

    setRenamedDocuments((prev) => ({ ...prev, [currentDocToRename.id]: value }));
    toast.success("Document renommé", {
      description: `"${currentDocToRename.name}" est maintenant "${value}" (simulation).`,
    });
    setIsRenameDocModalOpen(false);
    setCurrentDocToRename(null);
  };

  const handleConfirmRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFolderToRename) return;
    const value = renameInput.trim();
    if (!value) return;

    setRenamedFolders((prev) => ({ ...prev, [currentFolderToRename.id]: value }));
    toast.success("Dossier renommé", {
      description: `"${currentFolderToRename.name}" est maintenant "${value}" (simulation).`,
    });
    setIsRenameFolderModalOpen(false);
    setCurrentFolderToRename(null);
  };

  const handleDeleteFolder = (id: number, name: string) => {
    toast.success("Dossier supprimé", {
      description: `La suppression du dossier "${name}" est simulée pour l'instant.
Vous pourrez brancher le backend plus tard.`,
    });
  };

  const handleShareSelectedDocuments = () => {
    if (selectedDocumentIds.length === 0) return;

    setShareDocumentId(selectedDocumentIds[0]);
    setShareDocumentName(
      selectedDocumentIds.length === 1
        ? documents.find((d) => d.id === selectedDocumentIds[0])?.name || "Document"
        : `${selectedDocumentIds.length} documents sélectionnés`
    );
    setIsShareModalOpen(true);
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
                  } else if (selectedDocumentIds.length > 0) {
                    handleShareSelectedDocuments();
                  } else {
                    setSelectionMode(false);
                  }
                }}
              >
                {selectionMode && selectedDocumentIds.length > 0 ? (
                  <>
                    <Share2 className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Partager</span>
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
        {subfolders.length === 0 && documents.length === 0 ? (
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
            {displaySubfolders.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {displaySubfolders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={{ ...folder, name: renamedFolders[folder.id] ?? folder.name }}
                      onClick={() => onFolderClick(folder.id)}
                      onRename={() => openRenameFolder(folder.id, folder.name)}
                      onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-2">
                  {documents.map((doc) => (
                    <FileItem
                      key={doc.id}
                      document={{ ...doc, name: renamedDocuments[doc.id] ?? doc.name }}
                      selectionMode={selectionMode}
                      selected={selectedDocumentIds.includes(doc.id)}
                      onToggleSelect={() => toggleDocumentSelection(doc.id)}
                      onView={() => handleViewDocument(renamedDocuments[doc.id] ?? doc.name)}
                      onShare={() => handleShareDocument(doc.id, renamedDocuments[doc.id] ?? doc.name)}
                      onRename={() => openRenameDocument(doc.id, doc.name)}
                    />
                  ))}
                </div>
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
    </div>
  );
};
