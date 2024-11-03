import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBIMm-CI7e0S8s6s0O4m9Lw0tfodPQ1LuY",
  authDomain: "rondom-chat.firebaseapp.com",
  databaseURL: "https://rondom-chat-default-rtdb.firebaseio.com",
  projectId: "rondom-chat",
  storageBucket: "rondom-chat.firebasestorage.app",
  messagingSenderId: "260903519406",
  appId: "1:260903519406:web:3a84b928584d087322993f",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
