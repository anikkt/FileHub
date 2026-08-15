import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../services/firebase/config';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject, getDownloadURL } from 'firebase/storage';
import { fileUploadManager } from '../services/storage/uploadService';
import { FileItem, UploadProgress } from '../types';
import { Upload, LogOut, Trash2, Download, FileText } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/files`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data() as FileItem);
      setFiles(docs);
    });
    return unsubscribe;
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const selectedFiles = Array.from(e.target.files);

    selectedFiles.forEach((file) => {
      fileUploadManager.uploadFile(
        file,
        user.uid,
        null,
        (progress) => {
          setUploads((prev) => new Map(prev.set(progress.fileId, progress)));
        },
        (fileId) => {
          setUploads((prev) => {
            const next = new Map(prev);
            next.delete(fileId);
            return next;
          });
        },
        (error) => {
          console.error('Upload failed', error);
        }
      );
    });
  };

  const handleDelete = async (file: FileItem) => {
    if (!user || !window.confirm(`Delete ${file.name}?`)) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/files`, file.id));
      await deleteObject(ref(storage, file.storagePath));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const url = await getDownloadURL(ref(storage, file.storagePath));
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="h-16 border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">FileHub</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.email}</span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Upload size={16} /> Upload Files
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {uploads.size > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Active Uploads</h3>
            {Array.from(uploads.values()).map((up) => (
              <div key={up.fileId} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{up.fileName}</span>
                  <span>{up.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all" style={{ width: `${up.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
            My Files ({files.length})
          </div>
          {files.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No files uploaded yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {files.map((file) => (
                <li key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-500" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};
