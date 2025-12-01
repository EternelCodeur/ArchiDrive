import { FileText, Eye, MoreVertical, Share2, CheckSquare, Pencil, Download, Trash2 } from "lucide-react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileItemProps {
  document: Document;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onView?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

const getFileIcon = (type: string) => {
  return <FileText className="w-5 h-5 text-primary" />;
};

export const FileItem = ({ document, selectionMode, selected, onToggleSelect, onView, onShare, onRename, onDownload, onDelete }: FileItemProps) => {
  const displayName = document.name.replace(/\.[^.]+$/, '');
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-all group">
      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
        {getFileIcon(document.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">
          {displayName}
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{document.size}</span>
          <span>•</span>
          <span>{document.author}</span>
          <span>•</span>
          <span>{new Date(document.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      {selectionMode ? (
        <Button
          variant={selected ? "default" : "outline"}
          size="icon"
          className="transition-colors"
          type="button"
          onClick={onToggleSelect}
        >
          <CheckSquare className="w-4 h-4" />
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="group-hover:opacity-100 transition-opacity"
              type="button"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="w-4 h-4 mr-2" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </DropdownMenuItem>
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
      )}
    </div>
  );
};
