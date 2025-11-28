import { useState, useRef } from "react";
import { Upload, FolderPlus, Search, CheckSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FolderItem } from "./FolderItem";
import { FileItem } from "./FileItem";
import { Breadcrumb } from "./Breadcrumb";
import { ShareModal } from "./ShareModal";
import { getFoldersByParent, getDocumentsByFolder, getFolderPath } from "@/data/mockData";
import { toast } from "sonner";

interface FolderViewProps {
  folderId: number | null;
  onFolderClick: (folderId: number) => void;
}

export const FolderView = ({ folderId, onFolderClick }: FolderViewProps) => {
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
  
  const subfolders = getFoldersByParent(folderId);
  const documents = folderId ? getDocumentsByFolder(folderId) : [];
  const path = folderId ? getFolderPath(folderId) : [];

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

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    toast.success(`Dossier "${name}" créé`, {
      description: "Cette action est simulée côté interface pour l'instant.",
    });

    setNewFolderName("");
    setIsCreateModalOpen(false);
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

          <Breadcrumb path={path} onNavigate={onFolderClick} />
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
            {subfolders.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {subfolders.map((folder) => (
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
        folderName={shareDocumentName || path[path.length - 1]?.name || "Document"}
        folderId={shareDocumentId || folderId || 0}
      />
    </div>
  );
};
