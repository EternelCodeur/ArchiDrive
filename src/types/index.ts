export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  created_at?: string;
  shared?: boolean;
}

export interface Document {
  id: number;
  name: string;
  folder_id: number;
  size: string;
  created_at: string;
  author: string;
  type: string;
}

export interface OpenTab {
  id: number;
  folderId: number;
  folderName: string;
  parentId: number | null;
}

export interface SharePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export interface ShareTarget {
  type: 'user' | 'service' | 'role' | 'all';
  id?: string;
  name?: string;
}
