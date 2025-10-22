import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyg_B2fzJsgaDO8bjyyikjVeee4AM08kI",
  authDomain: "unify-app-wad2.firebaseapp.com",
  projectId: "unify-app-wad2",
  storageBucket: "unify-app-wad2.firebasestorage.app",
  messagingSenderId: "1071880442683",
  appId: "1:1071880442683:web:aab32153d164fd2b515d1e"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const db = getFirestore(app);

export { db, auth };