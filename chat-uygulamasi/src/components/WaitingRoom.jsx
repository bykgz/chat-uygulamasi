import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

const WaitingRoom = ({ user, onMatch }) => {
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user || !searching) return;

    const addToWaitingRoom = async () => {
      const waitingRef = doc(db, "waitingRoom", user.uid);
      await setDoc(waitingRef, {
        userId: user.uid,
        displayName: user.displayName || "Anonim",
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
          setSearching(false);
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
  }, [user, searching]);

  const handleCancel = async () => {
    try {
      setSearching(false);
      await deleteDoc(doc(db, "waitingRoom", user.uid));
      window.location.reload();
    } catch (error) {
      console.error("İptal hatası:", error);
    }
  };

  const startSearching = () => {
    if (!user.displayName) {
      alert("Lütfen önce bir kullanıcı adı belirleyin!");
      window.location.reload();
      return;
    }
    setSearching(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-dark via-secondary to-secondary-dark">
      <div className="p-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {!searching ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
              Sohbet Başlatın
            </h2>
            <button
              onClick={startSearching}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 px-8 rounded-xl
              font-semibold hover:opacity-90 transition-all duration-200 shadow-lg"
            >
              Sohbet Arkadaşı Bul
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text animate-pulse">
              Sohbet arkadaşı aranıyor...
            </h2>
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
                <div className="w-20 h-20 border-4 border-secondary rounded-full animate-ping opacity-20 absolute top-0"></div>
              </div>
              <p className="text-gray-600 text-center text-lg">
                Size en uygun sohbet arkadaşını bulmaya çalışıyoruz
              </p>
              <button
                onClick={handleCancel}
                className="mt-6 px-6 py-2 text-red-500 border border-red-500 rounded-lg hover:bg-red-50 
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Aramayı İptal Et
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
