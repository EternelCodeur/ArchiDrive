import { useState } from "react";
import { Upload, FolderPlus, Share2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
              <Button variant="outline" size="sm">
                <FolderPlus className="w-4 h-4 mr-2" />
                Nouveau dossier
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Téléverser
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
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
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Dossiers ({subfolders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {subfolders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      onClick={() => onFolderClick(folder.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Documents ({documents.length})
                </h2>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <FileItem key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        folderName={path[path.length - 1]?.name || "Racine"}
        folderId={folderId || 0}
      />
    </div>
  );
};
