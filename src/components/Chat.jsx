import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase/config";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

const Chat = ({ chatId, currentUser, partnerUserId, onMatch, onSkip }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const messagesEndRef = useRef(null);

  // Mesajları yükle ve dinle
  useEffect(() => {
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy("timestamp")
    );

    return onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });
  }, [chatId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: newMessage,
      senderId: currentUser.uid,
      timestamp: Date.now(),
    });

    setNewMessage("");
  };

  const handleSkip = async () => {
    if (isSkipping) return;
    setIsSkipping(true);

    try {
      // Önce tüm mesajları silelim
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);
      const deletePromises = messagesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Sonra chat dokümanını silelim
      await deleteDoc(doc(db, `chats/${chatId}`));

      // WaitingRoom'a geçiş yap
      onSkip();
    } catch (error) {
      console.error("Skip error:", error);
    } finally {
      setIsSkipping(false);
    }
  };

  const handleLogoClick = async () => {
    try {
      // Önce chat mesajlarını ve dokümanını temizleyelim
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);
      const deletePromises = messagesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, `chats/${chatId}`));

      // Kullanıcıyı çıkış yaptır
      await signOut(auth);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div
            onClick={handleLogoClick}
            className="text-xl font-bold text-primary cursor-pointer hover:text-orange-600 transition-colors"
          >
            oChatle
          </div>
          <div className="text-sm text-gray-500">
            You are talking with a stranger
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          <div className="text-center text-sm text-gray-500">
            👋 Chat started
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUser.uid
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.senderId === currentUser.uid
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <div className="text-sm">
                  {message.senderId === currentUser.uid ? "You" : "Stranger"}:{" "}
                  {message.text}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="text-gray-500 text-sm">Stranger is typing...</div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <button
            onClick={handleSkip}
            disabled={isSkipping}
            className={`px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors
                  ${isSkipping ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSkipping ? "Searching..." : "SKIP"}
          </button>

          <form onSubmit={handleSend} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              SEND
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
