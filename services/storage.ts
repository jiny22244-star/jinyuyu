import { Post, DiaryEntry } from '../types';

const DB_NAME = 'YuYuDB';
const DB_VERSION = 2; // Incremented for Diary store
const STORE_POSTS = 'posts';
const STORE_DIARY = 'diary';
const PROFILE_KEY = 'yuyu_user_profile';

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
      
      // Create Posts store
      if (!db.objectStoreNames.contains(STORE_POSTS)) {
        db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
      }

      // Create Diary store
      if (!db.objectStoreNames.contains(STORE_DIARY)) {
        db.createObjectStore(STORE_DIARY, { keyPath: 'id' });
      }
    };
  });
};

// --- Posts Operations ---

export const savePostToDB = async (post: Post): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_POSTS], 'readwrite');
      const store = transaction.objectStore(STORE_POSTS);
      const request = store.add(post);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save post:", error);
    throw error;
  }
};

export const getPostsFromDB = async (): Promise<Post[]> => {
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
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_DIARY], 'readwrite');
      const store = transaction.objectStore(STORE_DIARY);
      const request = store.put(entry); // put handles both add and update

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save diary entry:", error);
    throw error;
  }
};

export const getDiaryEntriesFromDB = async (): Promise<DiaryEntry[]> => {
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