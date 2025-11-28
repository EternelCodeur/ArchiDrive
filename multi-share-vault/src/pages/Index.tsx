import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FolderTabs } from "@/components/FolderTabs";
import { Header } from "@/components/Header";
import { OpenTab } from "@/types";
import type { Folder as FolderDto } from "@/types";
import { getFolderById } from "@/data/mockData";
import { apiFetch } from "@/lib/api";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FolderTree } from "@/components/FolderTree";

const Index = () => {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [collapseFolderId, setCollapseFolderId] = useState<number | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const handleFolderClick = async (folderId: number) => {
    setCurrentFolderId(folderId);
    
    const existingTab = openTabs.find((tab) => tab.folderId === folderId);
    
    if (existingTab) {
      setActiveTabId(existingTab.id.toString());
    } else {
      const folder = getFolderById(folderId);
      if (folder) {
        const newTab: OpenTab = {
          id: Date.now(),
          folderId: folder.id,
          folderName: folder.name,
          parentId: folder.parent_id,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id.toString());
      } else {
        try {
          const res = await apiFetch(`/api/folders/${folderId}`, { toast: { error: { enabled: false }, success: { enabled: false } } });
          if (res.ok) {
            const data = (await res.json()) as FolderDto;
            const newTab: OpenTab = {
              id: Date.now(),
              folderId,
              folderName: data?.name ?? `Dossier #${folderId}`,
              parentId: (data && typeof data.parent_id === 'number') ? data.parent_id : null,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id.toString());
          } else {
            const fallback: OpenTab = {
              id: Date.now(),
              folderId,
              folderName: `Dossier #${folderId}`,
              parentId: null,
            };
            setOpenTabs((prev) => [...prev, fallback]);
            setActiveTabId(fallback.id.toString());
          }
        } catch {
          const fallback: OpenTab = {
            id: Date.now(),
            folderId,
            folderName: `Dossier #${folderId}`,
            parentId: null,
          };
          setOpenTabs((prev) => [...prev, fallback]);
          setActiveTabId(fallback.id.toString());
        }
      }
    }
  };

  const handleTabClose = (tabId: number) => {
    const closedTab = openTabs.find((t) => t.id === tabId);
    if (closedTab) {
      setCollapseFolderId(closedTab.folderId);
    }
    const updatedTabs = openTabs.filter((tab) => tab.id !== tabId);
    setOpenTabs(updatedTabs);
    
    if (activeTabId === tabId.toString()) {
      if (updatedTabs.length > 0) {
        setActiveTabId(updatedTabs[updatedTabs.length - 1].id.toString());
      } else {
        setActiveTabId("");
        setCurrentFolderId(null);
      }
    }
  };

  const handleCloseTabByFolderId = (folderId: number) => {
    const tab = openTabs.find((t) => t.folderId === folderId);
    if (tab) {
      handleTabClose(tab.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:block">
            <Sidebar onFolderClick={handleFolderClick} currentFolderId={currentFolderId} collapseFolderId={collapseFolderId} onCloseTabByFolderId={handleCloseTabByFolderId} />
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <FolderTabs
              tabs={openTabs}
              activeTab={activeTabId}
              onTabChange={setActiveTabId}
              onTabClose={handleTabClose}
              onFolderClick={handleFolderClick}
            />
          </div>
        </div>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0">
            <div className="h-full flex flex-col">
              <div className="border-b px-4 h-16 flex items-center gap-2">
                <img src="logo-archi.png" alt="ArchiDrive" className="h-6 w-6 object-contain" />
                <span className="text-sm font-semibold tracking-tight">Navigation</span>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <FolderTree onFolderClick={(id) => { handleFolderClick(id); setMobileSidebarOpen(false); }} currentFolderId={currentFolderId} externalCollapseId={collapseFolderId} onCloseTabByFolderId={handleCloseTabByFolderId} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
};

export default Index;
