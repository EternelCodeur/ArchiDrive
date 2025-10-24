import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FolderTabs } from "@/components/FolderTabs";
import { OpenTab } from "@/types";
import { getFolderById } from "@/data/mockData";

const Index = () => {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId);
    
    // Check if tab already exists
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
    
    // If closing active tab, switch to previous or first tab
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
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar onFolderClick={handleFolderClick} currentFolderId={currentFolderId} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <FolderTabs
          tabs={openTabs}
          activeTab={activeTabId}
          onTabChange={setActiveTabId}
          onTabClose={handleTabClose}
          onFolderClick={handleFolderClick}
        />
      </main>
    </div>
  );
};

export default Index;
