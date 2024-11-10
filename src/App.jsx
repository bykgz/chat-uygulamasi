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
    let updateInterval;
    const handleBeforeUnload = async () => {
      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, "users", auth.currentUser.uid));
          await deleteDoc(doc(db, "waitingRoom", auth.currentUser.uid));
          if (chatId) {
            await deleteDoc(doc(db, "chats", chatId));
          }
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        const userRef = doc(db, "users", user.uid);

        setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          lastSeen: new Date().getTime(),
        });

        updateInterval = setInterval(() => {
          setDoc(userRef, { lastSeen: new Date().getTime() }, { merge: true });
        }, 10000);
      } else {
        setUser(null);
      }
    });

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribe();
      if (updateInterval) clearInterval(updateInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [chatId]);

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
