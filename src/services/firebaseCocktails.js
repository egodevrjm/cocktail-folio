let cachedClient = null;

export async function createFirebaseClient() {
  if (cachedClient) return cachedClient;

  const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!rawConfig) return null;

  try {
    const config = JSON.parse(rawConfig);
    if (!config.apiKey || !config.projectId) return null;

    const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);

    const app = initializeApp(config);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    const appId = import.meta.env.VITE_FIREBASE_APP_ID || 'cocktail-folio';

    cachedClient = {
      appId,
      auth,
      db,
      signInAnonymously: authModule.signInAnonymously,
      onAuthStateChanged: authModule.onAuthStateChanged,
      collection: firestoreModule.collection,
      onSnapshot: firestoreModule.onSnapshot,
      addDoc: firestoreModule.addDoc,
    };

    return cachedClient;
  } catch (error) {
    console.warn('Firebase is not configured correctly. Falling back to local storage.', error);
    return null;
  }
}
