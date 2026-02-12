const DB_NAME = 'baby-prep-photos';
const DB_VERSION = 2;
const PHOTO_STORE = 'photos';
const STATE_STORE = 'appState';
const STORAGE_PREFIX = 'baby-prep-';
const RESERVED_STORAGE_KEYS = new Set([
  'baby-prep-cloud-session',
  // Notification preferences are device-local, not account backup data.
  'baby-prep-smart-notifs-enabled',
  'baby-prep-smart-notif-quiet-hours',
  'baby-prep-smart-notif-channels',
]);

function isReservedStorageKey(key) {
  const safe = String(key || '');
  return RESERVED_STORAGE_KEYS.has(safe) || safe.startsWith('baby-prep-cloud-session:');
}

function isAppStorageKey(key) {
  return Boolean(key && key.startsWith(STORAGE_PREFIX) && !isReservedStorageKey(key));
}

function listAppStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isAppStorageKey(key)) keys.push(key);
  }
  return keys;
}

function setSyncApplying(flag) {
  if (typeof window !== 'undefined') {
    window.__peggySyncApplying = Boolean(flag);
  }
}

function notifyBackupRestored() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('peggy-backup-restored'));
  }
}

function notifyPhotoChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('peggy-photo-changed'));
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        const store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== Photo operations =====

export function resizeImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) {
          h = Math.round(h * (maxWidth / w));
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function savePhoto(category, file) {
  const dataUrl = await resizeImage(file);
  const photo = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    category,
    date: new Date().toISOString(),
    name: file.name,
    data: dataUrl
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(PHOTO_STORE, 'readwrite');
    t.objectStore(PHOTO_STORE).put(photo);
    t.oncomplete = () => {
      notifyPhotoChanged();
      resolve(photo);
    };
    t.onerror = () => reject(t.error);
  });
}

export async function getPhotos(category) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(PHOTO_STORE, 'readonly');
    const store = t.objectStore(PHOTO_STORE);
    const idx = store.index('category');
    const req = category ? idx.getAll(category) : store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.date.localeCompare(a.date)));
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(PHOTO_STORE, 'readwrite');
    t.objectStore(PHOTO_STORE).delete(id);
    t.oncomplete = () => {
      notifyPhotoChanged();
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
}

// ===== State persistence (IndexedDB mirror of localStorage) =====

export async function saveState(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STATE_STORE, 'readwrite');
      t.objectStore(STATE_STORE).put({ key, value, updated: new Date().toISOString() });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch { /* silent fail, localStorage is the primary */ }
}

export async function loadState(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STATE_STORE, 'readonly');
      const req = t.objectStore(STATE_STORE).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

export async function getAllState() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STATE_STORE, 'readonly');
      const req = t.objectStore(STATE_STORE).getAll();
      req.onsuccess = () => {
        const result = {};
        for (const item of req.result) {
          result[item.key] = item.value;
        }
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch { return {}; }
}

async function clearObjectStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, 'readwrite');
    t.objectStore(storeName).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function clearStateStoreAppKeys() {
  // Keep reserved keys (like cloud session) intact in IndexedDB.
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STATE_STORE, 'readwrite');
    const store = t.objectStore(STATE_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = Array.isArray(req.result) ? req.result : [];
      for (const key of keys) {
        if (isAppStorageKey(String(key))) {
          store.delete(key);
        }
      }
    };
    req.onerror = () => reject(req.error);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearLocalAppData() {
  setSyncApplying(true);
  try {
    for (const key of listAppStorageKeys()) {
      localStorage.removeItem(key);
    }

    await clearStateStoreAppKeys();
    await clearObjectStore(PHOTO_STORE);
    notifyBackupRestored();
    notifyPhotoChanged();
  } finally {
    setSyncApplying(false);
  }
}

// ===== Backup & Restore =====

function collectAppDataFromLocalStorage() {
  const lsData = {};
  for (const key of listAppStorageKeys()) {
    try { lsData[key] = JSON.parse(localStorage.getItem(key)); }
    catch { lsData[key] = localStorage.getItem(key); }
  }
  return lsData;
}

function isValidBackupObject(backup) {
  return Boolean(
    backup &&
    typeof backup === 'object' &&
    backup.version &&
    backup.appData &&
    typeof backup.appData === 'object'
  );
}

export async function buildBackupObject() {
  const appData = collectAppDataFromLocalStorage();

  // Photos are optional, fail-safe if IndexedDB has issues.
  let photos = [];
  try { photos = await getPhotos(null); } catch {}

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    appData,
    photos
  };
}

export async function restoreBackupObject(backup) {
  if (!isValidBackupObject(backup)) {
    throw new Error('Invalid backup data');
  }

  setSyncApplying(true);
  try {
    // Clear current app-scoped data first so account switching does not keep stale values.
    for (const key of listAppStorageKeys()) {
      localStorage.removeItem(key);
    }
    await clearStateStoreAppKeys();

    // Restore localStorage + IndexedDB state mirror
    for (const [key, value] of Object.entries(backup.appData)) {
      if (!isAppStorageKey(key)) continue;
      localStorage.setItem(key, JSON.stringify(value));
      await saveState(key, value);
    }

    // Replace photos fully to avoid mixing photos from different accounts.
    await clearObjectStore(PHOTO_STORE);
    const photos = Array.isArray(backup.photos) ? backup.photos : [];
    if (photos.length) {
      const db = await openDB();
      for (const photo of photos) {
        await new Promise((res, rej) => {
          const t = db.transaction(PHOTO_STORE, 'readwrite');
          t.objectStore(PHOTO_STORE).put(photo);
          t.oncomplete = () => res();
          t.onerror = () => rej(t.error);
        });
      }
    }

    notifyBackupRestored();
    notifyPhotoChanged();
    return { items: Object.keys(backup.appData).length, photos: photos.length };
  } finally {
    setSyncApplying(false);
  }
}

export async function exportBackup() {
  const backup = await buildBackupObject();
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baby-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!isValidBackupObject(backup)) {
          reject(new Error('Invalid backup file'));
          return;
        }
        const result = await restoreBackupObject(backup);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
