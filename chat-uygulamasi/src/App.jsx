import { useEffect, useState } from "react";
import { auth } from "./firebase/config";
import Login from "./components/Login";
import WaitingRoom from "./components/WaitingRoom";
import Chat from "./components/Chat";

function App() {
  const [user, setUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [partnerUserId, setPartnerUserId] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !user.displayName) {
        setUser(null);
        auth.signOut();
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleMatch = (newChatId, partnerId) => {
    setIsExiting(false);
    setChatId(newChatId);
    setPartnerUserId(partnerId);
  };

  const handleExit = async () => {
    setIsExiting(true);
    setChatId(null);
    setPartnerUserId(null);
    await auth.signOut();
    setUser(null);
  };

  if (!user) return <Login />;
  if (!chatId || isExiting)
    return <WaitingRoom user={user} onMatch={handleMatch} />;

  return (
    <Chat
      chatId={chatId}
      currentUser={user}
      partnerUserId={partnerUserId}
      onExit={handleExit}
    />
  );
}

export default App;
