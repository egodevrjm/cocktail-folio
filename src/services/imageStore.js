const DB_NAME = 'cocktail-folio-media';
const DB_VERSION = 1;
const STORE_NAME = 'cocktail-images';

export async function getCocktailImage(cocktailId) {
  const db = await openImageDb();
  return requestToPromise(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(cocktailId));
}

export async function saveCocktailImage(imageRecord) {
  const db = await openImageDb();
  await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(imageRecord));
  return imageRecord;
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'cocktailId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
