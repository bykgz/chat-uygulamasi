import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { signInAnonymously, updateProfile } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

const Login = () => {
  const [nickname, setNickname] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    // Aktif kullanıcıları dinle (hem waiting room hem de chat'teki kullanıcılar)
    const waitingRoomRef = collection(db, "waitingRoom");
    const chatsRef = collection(db, "chats");

    const unsubscribeWaiting = onSnapshot(waitingRoomRef, (waitingSnapshot) => {
      const waitingCount = waitingSnapshot.size;

      const unsubscribeChats = onSnapshot(chatsRef, (chatSnapshot) => {
        const chatCount = chatSnapshot.size * 2; // Her chat'te 2 kullanıcı var
        setOnlineUsers(waitingCount + chatCount);
      });

      return () => {
        unsubscribeChats();
      };
    });

    return () => {
      unsubscribeWaiting();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    try {
      const userCredential = await signInAnonymously(auth);
      await updateProfile(userCredential.user, {
        displayName: nickname.trim(),
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        displayName: nickname.trim(),
        userId: userCredential.user.uid,
        timestamp: new Date().getTime(),
        isOnline: true,
      });
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred, please try again");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-2xl font-bold text-orange-500">oChatle</div>
          <div className="text-sm text-gray-500">
            <span className="inline-flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {onlineUsers} online
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your nickname"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none 
              focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium
              hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-all duration-200"
            >
              Start Chat
            </button>
          </form>
        </div>
      </div>

      <div className="bg-gray-50 border-t py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          Please be polite and avoid inappropriate behavior during chat.
        </div>
      </div>
    </div>
  );
};

export default Login;
