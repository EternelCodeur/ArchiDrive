import { Folder, Document, Enterprise, Service, User, SharedAccess } from "@/types";

export const mockEnterprises: Enterprise[] = [
  { id: 1, name: "TechCorp Solutions" }
];

export const mockServices: Service[] = [
  { id: 1, name: "Ressources Humaines", enterprise_id: 1 },
  { id: 2, name: "Comptabilité", enterprise_id: 1 },
  { id: 3, name: "Direction", enterprise_id: 1 },
  { id: 4, name: "Marketing", enterprise_id: 1 }
];

export const mockUsers: User[] = [
  { id: 1, name: "Marie Dubois", email: "marie.dubois@techcorp.fr", role: "dg", service_id: null, enterprise_id: 1 },
  { id: 2, name: "Jean Martin", email: "jean.martin@techcorp.fr", role: "manager", service_id: 1, enterprise_id: 1 },
  { id: 3, name: "Sophie Bernard", email: "sophie.bernard@techcorp.fr", role: "employee", service_id: 1, enterprise_id: 1 }
];

export const mockFolders: Folder[] = [
  // Dossier partagé accessible à tous
  { id: 1, name: "📢 Dossier Partagé", parent_id: null, service_id: null, shared: true, is_shared_folder: true },
  
  // Dossiers RH
  { id: 2, name: "Ressources Humaines", parent_id: null, service_id: 1, shared: false },
  { id: 3, name: "Congés", parent_id: 2, service_id: 1 },
  { id: 4, name: "Salaires", parent_id: 2, service_id: 1 },
  { id: 5, name: "Recrutement", parent_id: 2, service_id: 1 },
  { id: 6, name: "Congés annuels", parent_id: 3, service_id: 1 },
  { id: 7, name: "Congés maladie", parent_id: 3, service_id: 1 },
  
  // Dossiers Comptabilité
  { id: 8, name: "Comptabilité", parent_id: null, service_id: 2, shared: false },
  { id: 9, name: "Factures 2024", parent_id: 8, service_id: 2 },
  { id: 10, name: "Budget", parent_id: 8, service_id: 2 },
  { id: 11, name: "Janvier 2024", parent_id: 9, service_id: 2 },
  { id: 12, name: "Février 2024", parent_id: 9, service_id: 2 },
  
  // Dossiers Direction
  { id: 13, name: "Direction", parent_id: null, service_id: 3, shared: true },
  { id: 14, name: "Rapports", parent_id: 13, service_id: 3 },
  { id: 15, name: "Stratégie", parent_id: 13, service_id: 3 },
  
  // Dossiers Marketing
  { id: 16, name: "Marketing", parent_id: null, service_id: 4, shared: false },
  { id: 17, name: "Campagnes", parent_id: 16, service_id: 4 }
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
