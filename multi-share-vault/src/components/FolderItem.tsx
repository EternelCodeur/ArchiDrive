import { Folder, FolderOpen, Share2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Folder as FolderType } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderItemProps {
  folder: FolderType;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export const FolderItem = ({ folder, onClick, onRename, onDelete, selectionMode, selected, onToggleSelect }: FolderItemProps) => {
  return (
    <div
      onClick={selectionMode ? (onToggleSelect ?? onClick) : onClick}
      className={`group relative flex flex-col items-center text-center gap-3 p-4 bg-card rounded-xl border transition-all cursor-pointer ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-folder-hover'}`}
    >
      {selectionMode && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={(e) => {
            e.stopPropagation();
            if (onToggleSelect) onToggleSelect();
          }}
          className="absolute left-2 top-2 w-4 h-4"
        />
      )}
      <div className="flex-shrink-0 w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Folder className="w-12 h-12 text-primary group-hover:hidden" />
        <FolderOpen className="w-12 h-12 text-primary hidden group-hover:block" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-foreground truncate">{folder.name}</h3>
      </div>

      {/* Menu actions dossier (renommer / supprimer) */}
      <div
        className="absolute top-2 right-2"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-full hover:bg-accent transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="w-4 h-4 mr-2" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {folder.shared && (
        <div className="absolute bottom-2 right-2">
          <Share2 className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
    </div>
  );
};
