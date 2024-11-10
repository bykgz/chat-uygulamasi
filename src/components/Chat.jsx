import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";

const Chat = ({ chatId, currentUser, partnerUserId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messageList);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setOnlineUsers(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: newMessage,
      senderId: currentUser.uid,
      timestamp: new Date().getTime(),
    });

    setNewMessage("");
  };

  const handleExit = async () => {
    try {
      await deleteDoc(doc(db, "chats", chatId));
      window.location.reload();
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-gradient-to-r from-primary-dark via-secondary to-secondary-dark p-4 shadow-lg">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="text-white/80 text-sm">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Sohbet Aktif
          </div>
          <h2 className="text-2xl font-bold text-white text-center">
            Random Chat
          </h2>
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-red-500/10 text-white rounded-lg hover:bg-red-500/20 
            transition-all duration-200"
          >
            Çıkış
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
              className={`max-w-[70%] break-words p-4 rounded-2xl shadow-md ${
                message.senderId === currentUser.uid
                  ? "bg-gradient-to-r from-primary to-secondary text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none"
              }`}
            >
              {message.text}
              <div
                className={`text-xs mt-1 ${
                  message.senderId === currentUser.uid
                    ? "text-white/70"
                    : "text-gray-500"
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t shadow-lg">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 
            focus:ring-primary focus:border-transparent shadow-sm transition-all duration-200"
            placeholder="Mesajınızı yazın..."
          />
          <button
            type="submit"
            className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl 
            font-semibold hover:opacity-90 transform hover:-translate-y-0.5 transition-all duration-200 
            shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            disabled={!newMessage.trim()}
          >
            Gönder
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
