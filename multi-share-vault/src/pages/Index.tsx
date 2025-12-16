import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FolderTabs } from "@/components/FolderTabs";
import { Header } from "@/components/Header";
import { OpenTab } from "@/types";
import type { Folder as FolderDto } from "@/types";
import { getFolderById } from "@/data/mockData";
import { apiFetch } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { FolderTree } from "@/components/FolderTree";
import { useAuth } from "@/contexts/AuthContext";
import { mockEnterprises } from "@/data/mockData";
import { useQuery } from "@tanstack/react-query";
import { Folder as FolderIcon, FolderOpen as FolderOpenIcon } from "lucide-react";

const Index = () => {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [collapseFolderId, setCollapseFolderId] = useState<number | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const { user } = useAuth();
  const currentEnterpriseName =
    user && user.role !== 'super_admin'
      ? (user.enterprise_name ?? (user.enterprise_id ? (mockEnterprises.find((e) => e.id === user.enterprise_id)?.name ?? null) : null))
      : null;

  type SharedFolderSummary = { id: number; name: string; folder_id: number; visibility: 'enterprise' | 'services' };
  const { data: sharedFolders = [] } = useQuery<SharedFolderSummary[]>({
    queryKey: ["shared-folders", user?.id ?? 0],
    queryFn: async () => {
      const res = await apiFetch(`/api/shared-folders/visible`);
      if (!res.ok) return [] as SharedFolderSummary[];
      return res.json();
    },
    staleTime: 30_000,
  });
  const [expandedShared, setExpandedShared] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (typeof currentFolderId !== 'number') return;
    const match = (sharedFolders || []).find(sf => sf.folder_id === currentFolderId);
    if (match) setExpandedShared(prev => ({ ...prev, [match.id]: true }));
  }, [currentFolderId, sharedFolders]);
  useEffect(() => {
    if (typeof collapseFolderId !== 'number') return;
    const match = (sharedFolders || []).find(sf => sf.folder_id === collapseFolderId);
    if (match) setExpandedShared(prev => ({ ...prev, [match.id]: false }));
  }, [collapseFolderId, sharedFolders]);

  const handleFolderClick = async (folderId: number) => {
    // Collapse the previously active folder in the sidebar
    if (currentFolderId !== null) {
      setCollapseFolderId(currentFolderId);
    }
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
    <div className="h-screen overflow-hidden flex flex-col bg-background">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} currentFolderId={currentFolderId} />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:block">
            <Sidebar onFolderClick={handleFolderClick} currentFolderId={currentFolderId} collapseFolderId={collapseFolderId} onCloseTabByFolderId={handleCloseTabByFolderId} />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
          <SheetContent side="left" className="p-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900/90 text-slate-100">
            {/* A11y: Hidden header to satisfy DialogContent requirements */}
            <SheetHeader>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Menu latéral de navigation</SheetDescription>
            </SheetHeader>
            <div className="h-full flex flex-col">
              <div className="border-b border-slate-700/60 px-4 h-16 flex items-center gap-2">
                <img src="/logo-archi.png" alt="ArchiDrive" className="h-6 w-6 object-contain" />
                <span className="text-sm font-semibold tracking-tight">{currentEnterpriseName ?? 'Navigation'}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-4">
                {sharedFolders.length > 0 && (
                  <div className="mb-0">
                    <div className="mt-2 space-y-1">
                      {sharedFolders.map((sf) => {
                        const isOpen = Boolean(expandedShared[sf.id]) || currentFolderId === sf.folder_id;
                        return (
                          <div
                            key={sf.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              isOpen ? "bg-blue-100 text-blue-700 font-medium" : "text-slate-100 hover:bg-blue-100 hover:text-blue-700"
                            }`}
                            onClick={() => {
                              if (isOpen) {
                                setExpandedShared((prev) => ({ ...prev, [sf.id]: false }));
                                handleCloseTabByFolderId(sf.folder_id);
                              } else {
                                setExpandedShared((prev) => ({ ...prev, [sf.id]: true }));
                                handleFolderClick(sf.folder_id);
                                setMobileSidebarOpen(false);
                              }
                            }}
                            title={sf.name}
                          >
                            {isOpen ? (
                              <FolderOpenIcon className="w-4 h-4" />
                            ) : (
                              <FolderIcon className="w-4 h-4" />
                            )}
                            <span className="text-sm truncate">{sf.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <FolderTree onFolderClick={(id) => { handleFolderClick(id); setMobileSidebarOpen(false); }} currentFolderId={currentFolderId} externalCollapseId={collapseFolderId} onCloseTabByFolderId={handleCloseTabByFolderId} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
};

export default Index;
