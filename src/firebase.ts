import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore with explicit databaseId, experimentalForceLongPolling, and local persistence cache.
// In containerized/iframe browser environments (like AI Studio preview), WebSockets to Firestore backend
// can experience 10-second connection timeouts or firewall blocking. experimentalForceLongPolling ensures
// reliable, uninterrupted HTTP long-polling transport.
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  },
  firebaseConfig.firestoreDatabaseId
);

export default app;

