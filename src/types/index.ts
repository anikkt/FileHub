import { Timestamp } from 'firebase/firestore';

export interface FileItem {
  id: string;
  ownerId: string;
  name: string;
  storagePath: string;
  folderId: string | null;
  mimeType: string;
  size: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  starred: boolean;
  deleted: boolean;
}

export interface FolderItem {
  id: string;
  ownerId: string;
  name: string;
  parentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  speedBytesPerSec: number;
  timeRemainingSec: number | null;
  status: 'uploading' | 'completed' | 'error' | 'paused';
  cancel: () => void;
  error?: string;
}
