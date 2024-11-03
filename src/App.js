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
  const [isCallActive, setIsCallActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

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

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalStream(stream);

      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(configuration);
      setPeerConnection(pc);

      // Ses akışını ekle
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Uzak ses akışını dinle
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);

        // Ses elementini oluştur ve oynat
        const audioElement = new Audio();
        audioElement.srcObject = remoteStream;
        audioElement
          .play()
          .catch((err) => console.error("Audio play error:", err));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          update(ref(db, `chats/${chatId}/callData/candidates/${nickname}`), {
            [Date.now()]: event.candidate.toJSON(),
          });
        }
      };

      // Offer oluştur ve Firebase'e gönder
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callData = {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      };

      await update(ref(db, `chats/${chatId}`), { callData });
      setIsCallActive(true);
    } catch (error) {
      console.error("Arama başlatılamadı:", error);
    }
  };

  const handleIncomingCall = async (callData) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };

      const pc = new RTCPeerConnection(configuration);
      setPeerConnection(pc);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          update(ref(db, `chats/${chatId}/callData/candidates/${nickname}`), {
            [Date.now()]: event.candidate.toJSON(),
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const answerData = {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      };

      await update(ref(db, `chats/${chatId}/callData`), answerData);
      setIsCallActive(true);
    } catch (error) {
      console.error("Arama yanıtlanamadı:", error);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setIsCallActive(false);

    // Firebase'den arama verilerini temizle
    update(ref(db, `chats/${chatId}`), {
      callData: null,
    });
  };

  useEffect(() => {
    if (chatId && peerConnection && isCallActive) {
      const candidatesRef = ref(db, `chats/${chatId}/callData/candidates`);
      const unsubscribe = onValue(candidatesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([user, candidates]) => {
            if (user !== nickname) {
              Object.values(candidates).forEach((candidate) => {
                peerConnection
                  .addIceCandidate(new RTCIceCandidate(candidate))
                  .catch((err) => console.error("ICE candidate error:", err));
              });
            }
          });
        }
      });

      return () => unsubscribe();
    }
  }, [chatId, peerConnection, isCallActive, nickname]);

  useEffect(() => {
    if (chatId) {
      const callRef = ref(db, `chats/${chatId}/callData`);
      const unsubscribe = onValue(callRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.offer && !isCallActive && !peerConnection) {
            handleIncomingCall(data);
          }
          if (data.answer && peerConnection) {
            peerConnection
              .setRemoteDescription(new RTCSessionDescription(data.answer))
              .catch((err) => console.error("Answer error:", err));
          }
        }
      });

      return () => unsubscribe();
    }
  }, [chatId, isCallActive, peerConnection]);

  useEffect(() => {
    const messagesContainer = document.querySelector(".messages-container");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

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
            {!isCallActive ? (
              <button onClick={startCall} className="call-button">
                Sesli Arama Başlat
              </button>
            ) : (
              <button onClick={endCall} className="end-call-button">
                Aramayı Sonlandır
              </button>
            )}
            <button onClick={handleLogout}>Çıkış</button>
          </div>
        </header>

        <div
          className="messages-container"
          style={{ scrollBehavior: "smooth" }}
        >
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
