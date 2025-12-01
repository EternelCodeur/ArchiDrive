import { Folder, Document, Enterprise, Service, User, Employee } from "@/types";
import { apiFetch } from "@/lib/api";

export const mockEnterprises: Enterprise[] = [
  { id: 1, name: "TechCorp Solutions" }
];

// Runtime-created folders (persist in-memory only) — disabled from listing
const extraFolders: Folder[] = [];
const getAllFolders = (): Folder[] => [];

export const isRuntimeFolder = (id: number): boolean => {
  return extraFolders.some((f) => f.id === id);
};

export const addFolder = (payload: { id?: number; name: string; parent_id: number | null; service_id: number | null }): Folder => {
  const id = payload.id ?? Date.now();
  const folder: Folder = {
    id,
    name: payload.name,
    parent_id: payload.parent_id,
    service_id: payload.service_id,
  };
  extraFolders.push(folder);
  return folder;
};

 

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
  return getAllFolders().filter((folder) => folder.parent_id === parentId);
};

export const getDocumentsByFolder = (folderId: number): Document[] => {
  return mockDocuments.filter((doc) => doc.folder_id === folderId);
};

export const getFolderById = (id: number): Folder | undefined => {
  return getAllFolders().find((folder) => folder.id === id);
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

// API-backed helpers
export async function getVisibleServicesFromApi(): Promise<Service[]> {
  try {
    const res = await apiFetch('/api/services/visible', { toast: { error: { enabled: false }, success: { enabled: false } } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getEnterpriseUsersFromApi(): Promise<Employee[]> {
  // Guard: only admins with an enterprise_id should call this endpoint
  try {
    const raw = sessionStorage.getItem('auth:user');
    const user = raw ? (JSON.parse(raw) as { role?: string; enterprise_id?: number | null }) : null;
    if (!user || user.role !== 'admin' || !user.enterprise_id) {
      return [];
    }
  } catch { /* ignore */ }

  try {
    const res = await apiFetch('/api/admin/employees', { toast: { error: { enabled: false }, success: { enabled: false } } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getServiceRootFoldersFromApi(serviceId: number): Promise<Folder[]> {
  try {
    const res = await apiFetch(`/api/folders?service_id=${serviceId}`, { toast: { error: { enabled: false }, success: { enabled: false } } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getSubfoldersFromApi(parentId: number): Promise<Folder[]> {
  try {
    const res = await apiFetch(`/api/folders?parent_id=${parentId}`, { toast: { error: { enabled: false }, success: { enabled: false } } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getServiceTreeFromApi(serviceId: number): Promise<Folder[]> {
  const roots = await getServiceRootFoldersFromApi(serviceId);
  const all: Folder[] = [...roots];
  const seen = new Set<number>(roots.map(r => r.id));
  const queue: Folder[] = [...roots];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const children = await getSubfoldersFromApi(cur.id);
    for (const c of children) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        all.push(c);
        queue.push(c);
      }
    }
  }
  return all;
}
