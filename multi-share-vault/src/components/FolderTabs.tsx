import { X } from "lucide-react";
import { OpenTab, Service } from "@/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderView } from "./FolderView";
import { getFolderById } from "@/data/mockData";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface FolderTabsProps {
  tabs: OpenTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: number) => void;
  onFolderClick: (folderId: number) => void;
}

export const FolderTabs = ({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onFolderClick,
}: FolderTabsProps) => {
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

  const getTabDisplayName = (tab: OpenTab) => {
    const folder = getFolderById(tab.folderId);
    if (folder && folder.parent_id === null) {
      const svc = (visibleServices ?? []).find((s) => s.id === folder.service_id);
      if (svc?.name) return svc.name;
    }
    return tab.folderName;
  };
  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-3">
          <h3 className="text-xl font-semibold">Bienvenue dans votre espace documentaire</h3>
          <p className="text-muted-foreground">
            Sélectionnez un dossier dans la barre latérale pour commencer
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id.toString()}
            className="relative rounded-none border-r border-transparent hover:bg-muted/50 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-primary px-4 py-3 gap-2"
          >
            <span className="max-w-[150px] truncate">{getTabDisplayName(tab)}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onTabClose(tab.id);
                }
              }}
              className="ml-2 hover:bg-muted rounded-sm p-0.5 transition-colors cursor-pointer"
              aria-label="Fermer l'onglet"
            >
              <X className="w-3 h-3" />
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id.toString()}
          className="flex-1 m-0 data-[state=inactive]:hidden"
        >
          <FolderView folderId={tab.folderId} onFolderClick={onFolderClick} />
        </TabsContent>
      ))}
    </Tabs>
  );
};
