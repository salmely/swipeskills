// SwipeSkills Firebase Configuration
// Placez ce fichier à la racine du projet : firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACJHNHMMIp7sB2bx1QtWLPcH9QQqOAYv4",
  authDomain: "swipeskills-cf784.firebaseapp.com",
  projectId: "swipeskills-cf784",
  storageBucket: "swipeskills-cf784.firebasestorage.app",
  messagingSenderId: "30195503547",
  appId: "1:30195503547:web:8a06855de559e2b08c749e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export app for other uses
export default app;