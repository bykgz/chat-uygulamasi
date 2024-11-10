import { useEffect, useState } from "react";
import { auth, db } from "./firebase/config";
import Login from "./components/Login";
import WaitingRoom from "./components/WaitingRoom";
import Chat from "./components/Chat";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [partnerUserId, setPartnerUserId] = useState(null);

  useEffect(() => {
    const cleanup = async () => {
      if (auth.currentUser) {
        try {
          // Kullanıcının mevcut chat mesajlarını temizle
          if (chatId) {
            const messagesRef = collection(db, `chats/${chatId}/messages`);
            const messagesSnapshot = await getDocs(messagesRef);
            const deletePromises = messagesSnapshot.docs.map((doc) =>
              deleteDoc(doc.ref)
            );
            await Promise.all(deletePromises);
            await deleteDoc(doc(db, "chats", chatId));
          }

          // Kullanıcıyı waiting room ve users'dan sil
          await deleteDoc(doc(db, "waitingRoom", auth.currentUser.uid));
          await deleteDoc(doc(db, "users", auth.currentUser.uid));
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    };

    const handleBeforeUnload = () => {
      cleanup();
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const userRef = doc(db, "users", user.uid);

        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          lastSeen: Date.now(),
          isOnline: true,
        });

        // Kullanıcının aktif olduğunu belirli aralıklarla güncelle
        const updateInterval = setInterval(() => {
          setDoc(
            userRef,
            {
              lastSeen: Date.now(),
              isOnline: true,
            },
            { merge: true }
          );
        }, 10000);

        return () => {
          clearInterval(updateInterval);
          setDoc(userRef, { isOnline: false }, { merge: true });
        };
      } else {
        setUser(null);
        setChatId(null);
        setPartnerUserId(null);
      }
    });

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cleanup();
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [chatId]);

  const handleMatch = (newChatId, partnerId) => {
    setChatId(newChatId);
    setPartnerUserId(partnerId);
  };

  const handleSkip = async () => {
    if (chatId) {
      try {
        // Mevcut chat'i temizle
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const messagesSnapshot = await getDocs(messagesRef);
        const deletePromises = messagesSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);
        await deleteDoc(doc(db, "chats", chatId));
      } catch (error) {
        console.error("Skip cleanup error:", error);
      }
    }

    setChatId(null);
    setPartnerUserId(null);
  };

  if (!user) return <Login />;
  if (!chatId) return <WaitingRoom user={user} onMatch={handleMatch} />;

  return (
    <Chat
      chatId={chatId}
      currentUser={user}
      partnerUserId={partnerUserId}
      onMatch={handleMatch}
      onSkip={handleSkip}
    />
  );
}

export default App;
