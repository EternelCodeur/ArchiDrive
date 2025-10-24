import { FileText, Download } from "lucide-react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";

interface FileItemProps {
  document: Document;
}

const getFileIcon = (type: string) => {
  return <FileText className="w-5 h-5 text-primary" />;
};

export const FileItem = ({ document }: FileItemProps) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-all group">
      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
        {getFileIcon(document.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">
          {document.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{document.size}</span>
          <span>•</span>
          <span>{document.author}</span>
          <span>•</span>
          <span>{new Date(document.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
};
