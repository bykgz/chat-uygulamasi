import { useEffect, useState } from "react";
import { auth, db } from "./firebase/config";
import Login from "./components/Login";
import WaitingRoom from "./components/WaitingRoom";
import Chat from "./components/Chat";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [partnerUserId, setPartnerUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed:", user);
      if (user) {
        setUser(user);
        const userRef = doc(db, "users", user.uid);
        setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          lastSeen: new Date().getTime(),
        });
      } else {
        setUser(null);
      }
    });

    window.addEventListener("beforeunload", async () => {
      if (auth.currentUser) {
        try {
          // Kullanıcı kaydını sil
          await deleteDoc(doc(db, "users", auth.currentUser.uid));

          // Waiting room kaydını sil
          await deleteDoc(doc(db, "waitingRoom", auth.currentUser.uid));

          // Eğer aktif bir chat varsa onu da sil
          if (chatId) {
            await deleteDoc(doc(db, "chats", chatId));
          }
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleMatch = (newChatId, partnerId) => {
    setChatId(newChatId);
    setPartnerUserId(partnerId);
  };

  const handleSkip = () => {
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
