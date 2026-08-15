import { ref, uploadBytesResumable, UploadTask } from 'firebase/storage';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { UploadProgress } from '@/types';

export class FileUploadManager {
  private activeUploads: Map<string, UploadTask> = new Map();

  uploadFile(
    file: File,
    userId: string,
    folderId: string | null,
    onProgress: (progress: UploadProgress) => void,
    onComplete: (fileId: string) => void,
    onError: (error: Error) => void
  ): string {
    const fileId = doc(collection(db, `users/${userId}/files`)).id;
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${userId}/${folderId ? `${folderId}/` : ''}${fileId}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    this.activeUploads.set(fileId, uploadTask);

    let lastTime = Date.now();
    let lastBytes = 0;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        const bytesDiff = snapshot.bytesTransferred - lastBytes;

        let speed = 0;
        let remainingTime = null;

        if (timeDiff >= 0.5) {
          speed = bytesDiff / timeDiff;
          const remainingBytes = snapshot.totalBytes - snapshot.bytesTransferred;
          remainingTime = speed > 0 ? Math.ceil(remainingBytes / speed) : null;
          lastTime = now;
          lastBytes = snapshot.bytesTransferred;
        }

        const percentage = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);

        onProgress({
          fileId,
          fileName: file.name,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress: percentage,
          speedBytesPerSec: speed,
          timeRemainingSec: remainingTime,
          status: 'uploading',
          cancel: () => this.cancelUpload(fileId),
        });
      },
      (error) => {
        this.activeUploads.delete(fileId);
        onError(error);
      },
      async () => {
        this.activeUploads.delete(fileId);
        try {
          const fileDocRef = doc(db, `users/${userId}/files`, fileId);
          await setDoc(fileDocRef, {
            id: fileId,
            ownerId: userId,
            name: file.name,
            storagePath,
            folderId: folderId || null,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            starred: false,
            deleted: false,
          });
          onComplete(fileId);
        } catch (err) {
          onError(err as Error);
        }
      }
    );

    return fileId;
  }

  cancelUpload(fileId: string): void {
    const task = this.activeUploads.get(fileId);
    if (task) {
      task.cancel();
      this.activeUploads.delete(fileId);
    }
  }
}

export const fileUploadManager = new FileUploadManager();
