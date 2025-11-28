import { ChevronRight, Home } from "lucide-react";
import { Folder } from "@/types";

interface BreadcrumbProps {
  path: Folder[];
  onNavigate: (folderId: number | null) => void;
}

export const Breadcrumb = ({ path, onNavigate }: BreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Accueil</span>
      </button>
      
      {path.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`hover:text-foreground transition-colors ${
              index === path.length - 1 ? "font-medium text-foreground" : ""
            }`}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </div>
  );
};
