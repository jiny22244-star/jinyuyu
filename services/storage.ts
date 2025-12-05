import { Post } from '../types';

const DB_NAME = 'YuYuDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';
const PROFILE_KEY = 'yuyu_user_profile';

// --- IndexedDB Helper for Posts ---

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const savePostToDB = async (post: Post): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
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
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const posts = request.result as Post[];
        // Sort by date descending (newest first)
        posts.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Ensure dates are Date objects (IDB handles structured cloning, but safety first)
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
