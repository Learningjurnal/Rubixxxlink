import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  limit,
  getDocFromServer,
} from 'firebase/firestore';
import { LinkItem, AppSettings } from '../types';

// Safely resolve local config json if present
const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const rawFirebaseConfig = (configModules['../../firebase-applet-config.json'] as { default?: Record<string, string> })?.default || {};

// Embedded default public Firebase client configuration for seamless GitHub / Web deployment
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAjO1QrHyIuR8T0NM07NWxAgbwjnrbSYXk',
  authDomain: 'zinc-snowfall-6lcf1.firebaseapp.com',
  projectId: 'zinc-snowfall-6lcf1',
  firestoreDatabaseId: 'ai-studio-linkmanagementda-6268afbb-4df8-4a7c-a72e-1cc23fc1e26b',
  storageBucket: 'zinc-snowfall-6lcf1.firebasestorage.app',
  messagingSenderId: '1097630283503',
  appId: '1:1097630283503:web:eedb1b5fafd56ac16b4d1a',
};

// Construct Firebase configuration with priority: ENV -> local JSON -> default config
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || rawFirebaseConfig.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || rawFirebaseConfig.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || rawFirebaseConfig.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || rawFirebaseConfig.firestoreDatabaseId || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || rawFirebaseConfig.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || rawFirebaseConfig.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || rawFirebaseConfig.appId || DEFAULT_FIREBASE_CONFIG.appId,
};

// Initialize Firebase App safely with fallback if config is incomplete
let app: ReturnType<typeof initializeApp>;
try {
  const dummyConfig = { apiKey: 'dummy-api-key', projectId: 'dummy-project' };
  const effectiveConfig = firebaseConfig.apiKey && firebaseConfig.projectId ? firebaseConfig : dummyConfig;
  app = getApps().length === 0 ? initializeApp(effectiveConfig) : getApp();
} catch (e) {
  console.warn('Firebase initialization warning:', e);
  app = getApps().length > 0 ? getApp() : initializeApp({ apiKey: 'dummy-api-key', projectId: 'dummy-project' });
}

export const auth = getAuth(app);

// Use named database if specified, with robust long-polling auto-detection for web/iframe environments
function createFirestoreInstance() {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      dbId
    );
  } catch {
    try {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    } catch {
      return getFirestore(app);
    }
  }
}

export const db = createFirestoreInstance();

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore operating in offline / local cache mode.');
    }
  }
}
testFirestoreConnection().catch(() => {});

export const DEFAULT_SETTINGS: AppSettings = {
  statusOptions: ['Blank', 'Sudah Terunduh', 'Proses', 'Gagal', 'Web Inactive'],
  outputOptions: ['Single', 'Batch', 'Bulk', 'Folder', 'Mirror'],
  regionOptions: ['LIVE', 'ASIA', 'US', 'EU', 'ID', 'GLOBAL'],
  notePresets: [
    'Web Inactive',
    'Perlu VPN',
    'Captcha Aktif',
    'File Rusak / Corrupt',
    'Kecepatan Tinggi',
    'Kadaluarsa',
  ],
};

const LINKS_COLLECTION = 'links';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app_config';
export const LOCAL_STORAGE_LINKS_KEY = 'link_manager_cached_links_v2';
export const LOCAL_STORAGE_SETTINGS_KEY = 'link_manager_cached_settings_v2';

export function getCachedLocalLinks(): LinkItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LINKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read cached links from localStorage:', e);
  }
  return [];
}

export function saveCachedLocalLinks(items: LinkItem[]): void {
  try {
    // Keep localStorage lightweight (< 1MB) for instant reload and zero stutter
    const buffer = items.length > 1500 ? items.slice(0, 1500) : items;
    localStorage.setItem(LOCAL_STORAGE_LINKS_KEY, JSON.stringify(buffer));
  } catch (e) {
    console.warn('Could not cache links to localStorage:', e);
  }
}

export function clearCachedLocalLinks(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_LINKS_KEY);
    localStorage.removeItem('link_manager_cached_links');
    localStorage.removeItem('link_manager_cached_links_v1');
    localStorage.removeItem('rubixxxlink_cached_links');
    localStorage.setItem(LOCAL_STORAGE_LINKS_KEY, JSON.stringify([]));
  } catch (e) {
    console.warn('Could not clear cached links:', e);
  }
}

/**
 * Real-time listener for links in Firestore with automatic offline/local fallback
 */
export function subscribeToLinks(
  onUpdate: (links: LinkItem[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, LINKS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snapshot => {
        const items: LinkItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || '',
            link: data.link || '',
            status: data.status || 'Blank',
            output: data.output || 'Single',
            region: data.region || 'LIVE',
            counta: typeof data.counta === 'number' ? data.counta : 1,
            note: data.note || '',
            tag: data.tag || '',
            diperbarui: data.diperbarui || '',
            createdAt: data.createdAt || Date.now(),
            downloadedAt: data.downloadedAt || undefined,
            userEmail: data.userEmail || undefined,
          });
        });
        saveCachedLocalLinks(items);
        onUpdate(items);
      },
      error => {
        console.warn('Firestore links subscription notice (using offline cache):', error);
        // Fallback to local cache so data is never lost or wiped
        const local = getCachedLocalLinks();
        if (local && local.length > 0) {
          onUpdate(local);
        }
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Failed to initialize links listener, falling back to local storage:', err);
    const local = getCachedLocalLinks();
    if (local && local.length > 0) {
      onUpdate(local);
    }
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Add a single link to Firestore
 */
export async function addLinkToFirestore(
  item: Omit<LinkItem, 'id'>,
  userEmail?: string
): Promise<string> {
  const colRef = collection(db, LINKS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: item.createdAt || Date.now(),
    userEmail: userEmail || null,
  });
  return docRef.id;
}

/**
 * Batch add links to Firestore
 */
export async function batchAddLinksToFirestore(
  items: Omit<LinkItem, 'id'>[],
  userEmail?: string
): Promise<number> {
  if (items.length === 0) return 0;
  
  // Firestore batch limit is 500
  const CHUNK_SIZE = 400;
  let totalSaved = 0;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(item => {
      const docRef = doc(collection(db, LINKS_COLLECTION));
      batch.set(docRef, {
        ...item,
        createdAt: item.createdAt || Date.now(),
        userEmail: userEmail || null,
      });
    });

    await batch.commit();
    totalSaved += chunk.length;
  }

  return totalSaved;
}

/**
 * Update link in Firestore
 */
export async function updateLinkInFirestore(
  id: string,
  updates: Partial<LinkItem>
): Promise<void> {
  const docRef = doc(db, LINKS_COLLECTION, id);
  await updateDoc(docRef, updates as any);
}

/**
 * Delete link from Firestore safely
 */
export async function deleteLinkFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, LINKS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete link notice (handled locally):', err);
  }
}

/**
 * Batch update status
 */
export async function batchUpdateStatusInFirestore(
  ids: string[],
  status: string,
  diperbarui: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, LINKS_COLLECTION, id);
      batch.update(docRef, {
        status,
        diperbarui,
        ...(status === 'Sudah Terunduh' ? { downloadedAt: new Date().toISOString() } : {}),
      });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore batch update status notice:', err);
    }
  }
}

/**
 * Batch update tag / category
 */
export async function batchUpdateTagInFirestore(
  ids: string[],
  tag: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, LINKS_COLLECTION, id);
      batch.update(docRef, {
        tag: tag.trim(),
      });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore batch update tag notice:', err);
    }
  }
}

/**
 * Batch delete links safely
 */
export async function batchDeleteLinksFromFirestore(ids: string[]): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const docRef = doc(db, LINKS_COLLECTION, id);
      batch.delete(docRef);
    });
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore batch delete notice:', err);
    }
  }
}

/**
 * Clear all links from Firestore (Reset Database) & Clear Local Cache
 */
export async function clearAllLinksFromFirestore(): Promise<number> {
  // Always clear local cache first so local state is guaranteed wiped
  clearCachedLocalLinks();

  try {
    const colRef = collection(db, LINKS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const CHUNK_SIZE = 400;
    const docs = snap.docs;
    let deletedCount = 0;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      deletedCount += chunk.length;
    }
    return deletedCount;
  } catch (err) {
    console.warn('Firestore clearAllLinksFromFirestore notice (local storage wiped successfully):', err);
    return 0;
  }
}

/**
 * Remove specific dummy links if they exist in Firestore
 */
export async function clearKnownDummyLinksFromFirestore(): Promise<number> {
  try {
    const colRef = collection(db, LINKS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const dummyKeywords = [
      'file-upload.com/cszb6c317633',
      'file-upload.com/ih1afxhb6rrr',
      'file-upload.com/k5qrathrsnpu',
      'firestream.to/v/QumSFrCv',
      'listeamed.net/e/VqbX53LV86zxQzp',
      'listeamed.net/e/vQBYEbK0VYbOn1m',
      'listeamed.net/e/wP2050PVX6e5dmy',
      'listeamed.net/e/YWA8E9MVKd3EGmM',
      'listeamed.net/v/ao9rxorZ0YP5yGe',
      'listeamed.net/v/edVqE4InDodEYWm',
      'listeamed.net/v/edVqE4rXbY35YWm',
      'listeamed.net/v/g9Vd5JWYiLixqQi',
    ];

    const dummyDocs = snap.docs.filter(docSnap => {
      const link = (docSnap.data().link || '').toLowerCase();
      const id = docSnap.id;
      return dummyKeywords.some(k => link.includes(k.toLowerCase())) || /^link-\d+$/.test(id);
    });

    if (dummyDocs.length === 0) return 0;

    const batch = writeBatch(db);
    dummyDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return dummyDocs.length;
  } catch (err) {
    console.warn('Could not auto-purge dummy links from Firestore:', err);
    return 0;
  }
}

/**
 * Seed initial links to Firestore if collection is empty
 */
export async function seedInitialLinksIfEmpty(initialList: LinkItem[]): Promise<boolean> {
  try {
    if (!initialList || initialList.length === 0) return false;
    const colRef = collection(db, LINKS_COLLECTION);
    const q = query(colRef, limit(1));
    const snap = await getDocs(q);
    if (snap.empty && initialList.length > 0) {
      console.log('Seeding initial dataset to Firestore database...');
      await batchAddLinksToFirestore(initialList);
      return true;
    }
  } catch (e) {
    console.warn('Could not check/seed Firestore:', e);
  }
  return false;
}

/**
 * Settings listener & persistence
 */
export function subscribeToSettings(
  onUpdate: (settings: AppSettings) => void
) {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      snap => {
        if (snap.exists()) {
          const data = snap.data();
          onUpdate({
            statusOptions: data.statusOptions || DEFAULT_SETTINGS.statusOptions,
            outputOptions: data.outputOptions || DEFAULT_SETTINGS.outputOptions,
            regionOptions: data.regionOptions || DEFAULT_SETTINGS.regionOptions,
            notePresets: data.notePresets || DEFAULT_SETTINGS.notePresets,
          });
        } else {
          // Initialize default in database
          setDoc(docRef, DEFAULT_SETTINGS).catch(console.error);
          onUpdate(DEFAULT_SETTINGS);
        }
      },
      err => {
        console.warn('Settings subscription notice:', err);
        onUpdate(DEFAULT_SETTINGS);
      }
    );
  } catch (err) {
    onUpdate(DEFAULT_SETTINGS);
    return () => {};
  }
}

/**
 * Save settings to Firestore
 */
export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  await setDoc(docRef, settings);
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
};
