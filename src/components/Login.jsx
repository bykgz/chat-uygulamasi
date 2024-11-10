import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { signInAnonymously, updateProfile } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";

const Login = () => {
  const [nickname, setNickname] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setOnlineUsers(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError("Lütfen bir kullanıcı adı girin");
      return;
    }

    try {
      const userCredential = await signInAnonymously(auth);
      await updateProfile(userCredential.user, {
        displayName: nickname,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        displayName: nickname,
        userId: userCredential.user.uid,
        timestamp: new Date().getTime(),
      });
    } catch (error) {
      console.error("Giriş hatası:", error);
      setError("Giriş yapılırken bir hata oluştu");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-dark via-secondary to-secondary-dark">
      <div className="p-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center bg-green-100 px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            <span className="text-green-800 text-sm">
              {onlineUsers} çevrimiçi
            </span>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
          Random Chat
        </h1>

        <p className="text-gray-600 mb-8 text-center">
          Yeni insanlarla tanışmaya hazır mısın?
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Kullanıcı adınız"
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 
              focus:ring-primary focus:border-transparent shadow-sm"
              maxLength={20}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 px-8 rounded-xl
            font-semibold hover:opacity-90 transform hover:-translate-y-0.5 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg"
          >
            Sohbete Başla
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
