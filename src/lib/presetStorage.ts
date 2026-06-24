import { initDB } from './indexedDb';

const STORE_NAME = 'preset_assets_v2';

function getDB(): Promise<IDBDatabase> {
  return initDB();
}

export async function savePresetAsset(presetId: string, assetType: 'bg' | 'logo', file: File | null): Promise<void> {
  if (!file) {
    await deletePresetAsset(presetId, assetType);
    return;
  }
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, `${presetId}_${assetType}`);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPresetAsset(presetId: string, assetType: 'bg' | 'logo'): Promise<File | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(`${presetId}_${assetType}`);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error loading asset from IndexedDB:', err);
    return null;
  }
}

export async function deletePresetAsset(presetId: string, assetType: 'bg' | 'logo'): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(`${presetId}_${assetType}`);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting asset from IndexedDB:', err);
  }
}

export async function clearAllAssetsForPreset(presetId: string): Promise<void> {
  await Promise.all([
    deletePresetAsset(presetId, 'bg'),
    deletePresetAsset(presetId, 'logo')
  ]);
}
