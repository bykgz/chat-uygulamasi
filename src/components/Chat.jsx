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
  const typingTimeoutRef = useRef(null);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = (e) => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000);
  };

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md p-2 sm:p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-2">
          <div
            onClick={handleLogoClick}
            className="text-lg sm:text-xl font-bold text-primary cursor-pointer hover:text-orange-600 transition-colors"
          >
            oChatle
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            Chatting with stranger
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-2 sm:space-y-3">
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
                className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-2 sm:p-3 ${
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
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSkipping}
            className={`px-6 py-3 ${
              isSkipping ? "bg-gray-400" : "bg-orange-500 hover:bg-orange-600"
            } text-white rounded-lg text-base transition-colors`}
          >
            {isSkipping ? "Skipping..." : "Skip"}
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping(e);
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSend(e)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border rounded-lg text-base focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg text-base hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Hata durumunda gösterilecek */}
      {error && (
        <div className="text-red-500 text-sm text-center mb-2">{error}</div>
      )}
    </div>
  );
};

export default Chat;
