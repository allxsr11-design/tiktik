import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// User provided Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBFMfmJSlN4qRxQ_dwi18on4ygvkvajZEc",
  authDomain: "nahid-7ce02.firebaseapp.com",
  projectId: "nahid-7ce02",
  storageBucket: "nahid-7ce02.firebasestorage.app",
  messagingSenderId: "488516740481",
  appId: "1:488516740481:web:f4ea332d70206a189db480",
  measurementId: "G-GMCY6GW3M4"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Authenticate anonymously so Firestore security rules work seamlessly
export const initAuth = async () => {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  } catch (err) {
    console.warn('Anonymous auth failed or disabled, continuing with client player ID:', err);
    return null;
  }
};
