import { Post, DiaryEntry, FirebaseConfig } from '../types';
import { 
  initFirebase, 
  savePostToCloud, 
  getPostsFromCloud, 
  saveDiaryToCloud, 
  getDiaryFromCloud, 
  deleteDiaryFromCloud,
  uploadImageToCloud
} from './firebase';

const DB_NAME = 'YuYuDB';
const DB_VERSION = 2;
const STORE_POSTS = 'posts';
const STORE_DIARY = 'diary';
const PROFILE_KEY = 'yuyu_user_profile';
const CLOUD_CONFIG_KEY = 'yuyu_firebase_config';

// --- Configuration Management ---

export const getCloudConfig = (): FirebaseConfig | null => {
  try {
    const stored = localStorage.getItem(CLOUD_CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveCloudConfig = (config: FirebaseConfig) => {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
  initFirebase(config);
};

export const removeCloudConfig = () => {
  localStorage.removeItem(CLOUD_CONFIG_KEY);
  window.location.reload(); // Reload to clear firebase state if needed
};

// Initialize Cloud if config exists
const storedConfig = getCloudConfig();
if (storedConfig) {
  initFirebase(storedConfig);
}

const isCloudEnabled = (): boolean => {
  return !!getCloudConfig();
};

// --- IndexedDB Helper ---

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject("Your browser doesn't support IndexedDB");
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", (event.target as IDBOpenDBRequest).error);
      reject("Database error");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_POSTS)) {
        db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DIARY)) {
        db.createObjectStore(STORE_DIARY, { keyPath: 'id' });
      }
    };
  });
};

// --- Helper: Upload Image (Auto detects Cloud vs Local) ---
export const uploadPostImage = async (file: File): Promise<string | undefined> => {
  if (isCloudEnabled()) {
    return await uploadImageToCloud(file);
  } else {
    // For local, we stick to base64 which is handled in App.tsx reader
    // This function acts as a pass-through or a place to handle local file system if we had it
    return undefined; 
  }
};

// --- Posts Operations ---

export const savePostToDB = async (post: Post): Promise<void> => {
  // CLOUD MODE
  if (isCloudEnabled()) {
    return savePostToCloud(post);
  }

  // LOCAL MODE
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS], 'readwrite');
      const store = transaction.objectStore(STORE_POSTS);
      const request = store.put(post);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save post:", error);
    throw error;
  }
};

export const getPostsFromDB = async (): Promise<Post[]> => {
  // CLOUD MODE
  if (isCloudEnabled()) {
    try {
      return await getPostsFromCloud();
    } catch (e) {
      console.error("Cloud fetch failed, falling back to local for viewing?", e);
      // Fallthrough to local? No, that's confusing.
      throw e;
    }
  }

  // LOCAL MODE
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS], 'readonly');
      const store = transaction.objectStore(STORE_POSTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const posts = request.result as Post[];
        posts.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        const postsWithDates = posts.map(p => ({
            ...p,
            date: p.date instanceof Date ? p.date : new Date(p.date)
        }));
        
        resolve(postsWithDates);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get posts:", error);
    return [];
  }
};

// --- Diary Operations ---

export const saveDiaryEntryToDB = async (entry: DiaryEntry): Promise<void> => {
  if (isCloudEnabled()) {
    return saveDiaryToCloud(entry);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_DIARY], 'readwrite');
      const store = transaction.objectStore(STORE_DIARY);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save diary entry:", error);
    throw error;
  }
};

export const getDiaryEntriesFromDB = async (): Promise<DiaryEntry[]> => {
  if (isCloudEnabled()) {
    return getDiaryFromCloud();
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_DIARY], 'readonly');
      const store = transaction.objectStore(STORE_DIARY);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as DiaryEntry[];
        entries.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        const entriesWithDates = entries.map(e => ({
            ...e,
            date: e.date instanceof Date ? e.date : new Date(e.date),
            updatedAt: e.updatedAt instanceof Date ? e.updatedAt : new Date(e.updatedAt)
        }));
        
        resolve(entriesWithDates);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get diary entries:", error);
    return [];
  }
};

export const deleteDiaryEntryFromDB = async (id: string): Promise<void> => {
  if (isCloudEnabled()) {
    return deleteDiaryFromCloud(id);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_DIARY], 'readwrite');
      const store = transaction.objectStore(STORE_DIARY);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to delete diary entry:", error);
    throw error;
  }
};

// --- LocalStorage Helper for Profile ---

export interface UserProfile {
  name: string;
  bio: string;
}

export const saveProfileToStorage = (profile: UserProfile): void => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save profile:", error);
  }
};

export const getProfileFromStorage = (): UserProfile | null => {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load profile:", error);
    return null;
  }
};

// --- Backup & Restore ---

export interface BackupData {
  profile: UserProfile | null;
  posts: Post[];
  diary: DiaryEntry[];
  timestamp: number;
  version: number;
}

export const exportAllData = async (): Promise<BackupData> => {
  const profile = getProfileFromStorage();
  const posts = await getPostsFromDB();
  const diary = await getDiaryEntriesFromDB();

  return {
    profile,
    posts,
    diary,
    timestamp: Date.now(),
    version: 1
  };
};

export const importAllData = async (data: BackupData): Promise<void> => {
  if (data.profile) {
    saveProfileToStorage(data.profile);
  }
  if (data.posts && Array.isArray(data.posts)) {
    for (const post of data.posts) {
      const hydratedPost = { ...post, date: new Date(post.date) };
      await savePostToDB(hydratedPost);
    }
  }
  if (data.diary && Array.isArray(data.diary)) {
    for (const entry of data.diary) {
      const hydratedEntry = {
        ...entry,
        date: new Date(entry.date),
        updatedAt: new Date(entry.updatedAt)
      };
      await saveDiaryEntryToDB(hydratedEntry);
    }
  }
};
