import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, setDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirebaseConfig, Post, DiaryEntry } from "../types";

let app: FirebaseApp | null = null;
let db: any = null;
let storage: any = null;

export const initFirebase = (config: FirebaseConfig) => {
  try {
    if (!app) {
      app = initializeApp(config);
      db = getFirestore(app);
      storage = getStorage(app);
    }
    return true;
  } catch (error) {
    console.error("Firebase init error:", error);
    return false;
  }
};

export const isFirebaseInitialized = () => !!app;

// --- Storage Operations (Images) ---

export const uploadImageToCloud = async (file: File): Promise<string> => {
  if (!storage) throw new Error("Cloud storage not initialized");
  
  const fileName = `images/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, fileName);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

// --- Firestore Operations (Data) ---

export const savePostToCloud = async (post: Post): Promise<void> => {
  if (!db) throw new Error("Cloud DB not initialized");
  
  // We don't save the base64 or file object to Firestore to save space
  // We expect post.imageUrl to be populated by uploadImageToCloud result
  const docData = {
    id: post.id,
    description: post.description,
    date: Timestamp.fromDate(post.date),
    imageUrl: post.imageUrl || post.image.previewUrl, // Should be a http URL
    type: 'post'
  };

  await setDoc(doc(db, "posts", post.id), docData);
};

export const getPostsFromCloud = async (): Promise<Post[]> => {
  if (!db) throw new Error("Cloud DB not initialized");

  const q = query(collection(db, "posts"), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.id,
      description: data.description,
      date: data.date.toDate(),
      image: {
        previewUrl: data.imageUrl,
        base64: undefined // Not available from cloud
      },
      imageUrl: data.imageUrl
    } as Post;
  });
};

export const saveDiaryToCloud = async (entry: DiaryEntry): Promise<void> => {
  if (!db) throw new Error("Cloud DB not initialized");

  const docData = {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    date: Timestamp.fromDate(entry.date),
    updatedAt: Timestamp.fromDate(entry.updatedAt),
    type: 'diary'
  };

  await setDoc(doc(db, "diary", entry.id), docData);
};

export const getDiaryFromCloud = async (): Promise<DiaryEntry[]> => {
  if (!db) throw new Error("Cloud DB not initialized");

  const q = query(collection(db, "diary"), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      date: data.date.toDate(),
      updatedAt: data.updatedAt.toDate()
    } as DiaryEntry;
  });
};

export const deleteDiaryFromCloud = async (id: string): Promise<void> => {
  if (!db) throw new Error("Cloud DB not initialized");
  await deleteDoc(doc(db, "diary", id));
};
