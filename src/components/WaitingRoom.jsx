import { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

const WaitingRoom = ({ user, onMatch }) => {
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    if (!user) return;

    const addToWaitingRoom = async () => {
      const waitingRef = doc(db, "waitingRoom", user.uid);
      await setDoc(waitingRef, {
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        timestamp: new Date().getTime(),
      });
    };

    const checkForMatch = () => {
      const waitingRoomRef = collection(db, "waitingRoom");
      const q = query(waitingRoomRef, where("userId", "!=", user.uid));

      return onSnapshot(q, async (snapshot) => {
        const waitingUsers = snapshot.docs.map((doc) => doc.data());

        if (waitingUsers.length > 0) {
          const randomUser =
            waitingUsers[Math.floor(Math.random() * waitingUsers.length)];
          const chatId = [user.uid, randomUser.userId].sort().join("-");

          await deleteDoc(doc(db, "waitingRoom", user.uid));
          await deleteDoc(doc(db, "waitingRoom", randomUser.userId));

          onMatch(chatId, randomUser.userId);
        }
      });
    };

    const unsubscribe = checkForMatch();
    addToWaitingRoom();

    return () => {
      unsubscribe();
      if (user?.uid) {
        deleteDoc(doc(db, "waitingRoom", user.uid));
      }
    };
  }, [user]);

  const handleLogoClick = async () => {
    try {
      if (user?.uid) {
        await deleteDoc(doc(db, "waitingRoom", user.uid));
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            onClick={handleLogoClick}
            className="text-2xl font-bold text-orange-500 cursor-pointer hover:text-orange-600 transition-colors"
          >
            oChatle
          </div>
          <div className="text-sm text-gray-500">Waiting for match...</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 animate-pulse">
            Looking for someone...
          </h2>
          <div className="flex justify-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">We're trying to find someone for you</p>
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

export default WaitingRoom;
