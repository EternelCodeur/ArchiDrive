import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FolderTabs } from "@/components/FolderTabs";
import { Header } from "@/components/Header";
import { OpenTab } from "@/types";
import { getFolderById } from "@/data/mockData";
import { AuthProvider } from "@/contexts/AuthContext";

const Index = () => {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const handleFolderClick = (folderId: number) => {
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
        setOpenTabs([...openTabs, newTab]);
        setActiveTabId(newTab.id.toString());
      }
    }
  };

  const handleTabClose = (tabId: number) => {
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

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <Header />
        
        <div className="flex-1 flex w-full overflow-hidden">
          <Sidebar onFolderClick={handleFolderClick} currentFolderId={currentFolderId} />
          
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
      </div>
    </AuthProvider>
  );
};

export default Index;
