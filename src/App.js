import { useState, useEffect, useCallback } from "react";
import { ref, set, onValue, push, update, remove } from "firebase/database";
import { db } from "./firebase";
import "./App.css";

function App() {
  const [nickname, setNickname] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);

  const findMatch = () => {
    const waitingUsersRef = ref(db, "waitingUsers");

    // Önce mevcut bekleyen kullanıcıları kontrol edelim
    onValue(
      waitingUsersRef,
      (snapshot) => {
        const users = snapshot.val();

        if (!users) {
          // Bekleyen kullanıcı yoksa, kendimizi ekleyelim
          const myRef = push(waitingUsersRef);
          set(myRef, {
            userId: nickname,
            timestamp: Date.now(),
          });
        } else {
          // Bekleyen kullanıcıları filtrele
          const availableUsers = Object.entries(users)
            .filter(([_, user]) => user.userId !== nickname)
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

          if (availableUsers.length > 0) {
            // Eşleşecek kullanıcı var
            const partner = availableUsers[0];
            createChat(partner);
          } else {
            // Eşleşecek kullanıcı yok, kendimizi ekleyelim
            const myRef = push(waitingUsersRef);
            set(myRef, {
              userId: nickname,
              timestamp: Date.now(),
            });
          }
        }
      },
      { onlyOnce: true }
    );
  };

  const createChat = (partner) => {
    const newChatId = push(ref(db, "chats")).key;

    const updates = {
      [`chats/${newChatId}`]: {
        users: {
          [nickname]: true,
          [partner[1].userId]: true,
        },
        createdAt: Date.now(),
        active: true,
      },
      [`waitingUsers/${partner[0]}`]: null, // Partner'ı bekleme listesinden sil
    };

    update(ref(db), updates).then(() => {
      setChatId(newChatId);
      setPartnerId(partner[1].userId);
      setIsMatching(false);
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      setIsLoggedIn(true);
      setIsMatching(true);
      findMatch();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim() && chatId) {
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      push(messagesRef, {
        text: currentMessage,
        sender: nickname,
        timestamp: Date.now(),
      })
        .then(() => {
          console.log("Mesaj gönderildi");
        })
        .catch((error) => {
          console.error("Mesaj gönderme hatası:", error);
        });
      setCurrentMessage("");
    }
  };

  const handleDisconnect = useCallback(() => {
    if (chatId) {
      // Chat'i temizle
      remove(ref(db, `chats/${chatId}`));
      // Eğer bekleme listesinde isek, oradan da temizleyelim
      const waitingUsersRef = ref(db, "waitingUsers");
      onValue(
        waitingUsersRef,
        (snapshot) => {
          const users = snapshot.val();
          if (users) {
            Object.entries(users).forEach(([key, user]) => {
              if (user.userId === nickname) {
                remove(ref(db, `waitingUsers/${key}`));
              }
            });
          }
        },
        {
          onlyOnce: true,
        }
      );
    }
    setChatId(null);
    setPartnerId(null);
    setMessages([]);
    setIsLoggedIn(false);
  }, [chatId, nickname]);

  useEffect(() => {
    if (chatId) {
      console.log("Chat ID:", chatId);

      // Mesajları dinle
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        console.log("Gelen mesaj verisi:", data);

        if (data) {
          const messageList = Object.entries(data)
            .map(([key, value]) => ({
              id: key,
              ...value,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

          console.log("İşlenmiş mesajlar:", messageList);
          setMessages(messageList);
        } else {
          setMessages([]);
        }
      });

      // Chat durumunu kontrol et
      const chatRef = ref(db, `chats/${chatId}`);
      const chatUnsubscribe = onValue(chatRef, (snapshot) => {
        if (!snapshot.exists()) {
          console.log("Chat sonlandı");
          handleDisconnect();
        }
      });

      return () => {
        unsubscribe();
        chatUnsubscribe();
      };
    }
  }, [chatId, handleDisconnect]);

  useEffect(() => {
    if (isLoggedIn) {
      const chatsRef = ref(db, "chats");
      const unsubscribe = onValue(chatsRef, (snapshot) => {
        const chats = snapshot.val();

        if (chats) {
          // Kullanıcının aktif bir chat'ini bul
          for (let cid in chats) {
            const chat = chats[cid];
            if (chat.users && chat.users[nickname] && chat.active) {
              setChatId(cid);
              const partner = Object.keys(chat.users).find(
                (u) => u !== nickname
              );
              setPartnerId(partner);
              setIsMatching(false);

              // Bekleme listesinden kendimizi temizle
              const waitingUsersRef = ref(db, "waitingUsers");
              onValue(
                waitingUsersRef,
                (waitingSnapshot) => {
                  const waitingUsers = waitingSnapshot.val();
                  if (waitingUsers) {
                    Object.entries(waitingUsers).forEach(([key, user]) => {
                      if (user.userId === nickname) {
                        remove(ref(db, `waitingUsers/${key}`));
                      }
                    });
                  }
                },
                { onlyOnce: true }
              );

              break;
            }
          }
        }
      });

      return () => unsubscribe();
    }
  }, [isLoggedIn, nickname]);

  // Bağlantı koptuğunda temizlik yapan useEffect
  useEffect(() => {
    return () => {
      if (nickname) {
        const waitingUsersRef = ref(db, "waitingUsers");
        onValue(
          waitingUsersRef,
          (snapshot) => {
            const users = snapshot.val();
            if (users) {
              Object.entries(users).forEach(([key, user]) => {
                if (user.userId === nickname) {
                  remove(ref(db, `waitingUsers/${key}`));
                }
              });
            }
          },
          { onlyOnce: true }
        );
      }
    };
  }, [nickname]);

  // Çıkış butonuna tıklandığında handleDisconnect'i çağıralım
  const handleLogout = () => {
    handleDisconnect();
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <div className="login-container">
          <h1>Random Chat</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Takma isminizi girin..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button type="submit">Sohbete Başla</button>
          </form>
        </div>
      </div>
    );
  }

  if (isMatching) {
    return (
      <div className="App">
        <div className="matching-container">
          <h2>Eşleşme bekleniyor...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="chat-container">
        <header className="chat-header">
          <h1>Random Chat</h1>
          <div className="user-info">
            <span>Sen: {nickname}</span>
            {partnerId && <span>Partner: {partnerId}</span>}
            <button onClick={handleLogout}>Çıkış</button>
          </div>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              Henüz mesaj yok. Sohbete başlayın!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.sender === nickname ? "my-message" : "other-message"
                }`}
              >
                <div className="message-info">
                  <span className="message-sender">
                    {message.sender === nickname ? "Sen" : message.sender}
                  </span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            ))
          )}
        </div>

        <form className="message-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Mesajınızı yazın..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
          />
          <button type="submit">Gönder</button>
        </form>
      </div>
    </div>
  );
}

export default App;
