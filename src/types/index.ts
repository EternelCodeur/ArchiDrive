export type UserRole = 'dg' | 'manager' | 'employee';

export interface Enterprise {
  id: number;
  name: string;
}

export interface Service {
  id: number;
  name: string;
  enterprise_id: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  service_id: number | null;
  enterprise_id: number;
  avatar?: string;
}

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  service_id: number | null;
  created_at?: string;
  shared?: boolean;
  is_shared_folder?: boolean;
}

export interface Document {
  id: number;
  name: string;
  folder_id: number;
  size: string;
  created_at: string;
  author: string;
  type: string;
  version?: number;
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

export interface SharedAccess {
  id: number;
  target_type: 'user' | 'service' | 'role' | 'all';
  target_name: string;
  permissions: SharePermissions;
  expires_at?: string;
  created_at: string;
}
