import { Folder, Document } from "@/types";

export const mockFolders: Folder[] = [
  { id: 1, name: "Ressources Humaines", parent_id: null, shared: true },
  { id: 2, name: "Comptabilité", parent_id: null, shared: false },
  { id: 3, name: "Direction", parent_id: null, shared: true },
  { id: 4, name: "Congés", parent_id: 1 },
  { id: 5, name: "Salaires", parent_id: 1 },
  { id: 6, name: "Recrutement", parent_id: 1 },
  { id: 7, name: "Factures 2024", parent_id: 2 },
  { id: 8, name: "Budget", parent_id: 2 },
  { id: 9, name: "Rapports", parent_id: 3 },
  { id: 10, name: "Congés annuels", parent_id: 4 },
  { id: 11, name: "Congés maladie", parent_id: 4 },
  { id: 12, name: "Janvier 2024", parent_id: 7 },
  { id: 13, name: "Février 2024", parent_id: 7 },
];

export const mockDocuments: Document[] = [
  {
    id: 1,
    name: "Politique de congés.pdf",
    folder_id: 4,
    size: "245 KB",
    created_at: "2024-01-15",
    author: "Marie Dupont",
    type: "pdf",
  },
  {
    id: 2,
    name: "Template demande congé.docx",
    folder_id: 4,
    size: "52 KB",
    created_at: "2024-01-10",
    author: "Jean Martin",
    type: "docx",
  },
  {
    id: 3,
    name: "Grille salariale 2024.xlsx",
    folder_id: 5,
    size: "128 KB",
    created_at: "2024-02-01",
    author: "Sophie Bernard",
    type: "xlsx",
  },
  {
    id: 4,
    name: "Bilan Q1 2024.pdf",
    folder_id: 2,
    size: "1.2 MB",
    created_at: "2024-04-05",
    author: "Pierre Leroy",
    type: "pdf",
  },
  {
    id: 5,
    name: "Rapport annuel.pdf",
    folder_id: 9,
    size: "3.8 MB",
    created_at: "2024-03-20",
    author: "Direction",
    type: "pdf",
  },
];

export const getFoldersByParent = (parentId: number | null): Folder[] => {
  return mockFolders.filter((folder) => folder.parent_id === parentId);
};

export const getDocumentsByFolder = (folderId: number): Document[] => {
  return mockDocuments.filter((doc) => doc.folder_id === folderId);
};

export const getFolderById = (id: number): Folder | undefined => {
  return mockFolders.find((folder) => folder.id === id);
};

export const getFolderPath = (folderId: number | null): Folder[] => {
  const path: Folder[] = [];
  let currentId = folderId;

  while (currentId !== null) {
    const folder = getFolderById(currentId);
    if (folder) {
      path.unshift(folder);
      currentId = folder.parent_id;
    } else {
      break;
    }
  }

  return path;
};
