import { Folder, FolderOpen, Share2 } from "lucide-react";
import { Folder as FolderType } from "@/types";

interface FolderItemProps {
  folder: FolderType;
  onClick: () => void;
}

export const FolderItem = ({ folder, onClick }: FolderItemProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:bg-folder-hover transition-all cursor-pointer"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Folder className="w-6 h-6 text-primary group-hover:hidden" />
        <FolderOpen className="w-6 h-6 text-primary hidden group-hover:block" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{folder.name}</h3>
        <p className="text-xs text-muted-foreground">Dossier</p>
      </div>

      {folder.shared && (
        <div className="absolute top-2 right-2">
          <Share2 className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
    </div>
  );
};
