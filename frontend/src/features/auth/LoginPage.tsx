import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Brain, Rocket } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Oops! Wrong username or password. Try again!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-400 via-accent-500 to-primary-600 p-4">
      {/* Floating decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <div className="absolute top-20 left-10 text-6xl animate-bounce" style={{ animationDelay: "0s", animationDuration: "3s" }}>🧠</div>
        <div className="absolute top-40 right-20 text-5xl animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}>⚡</div>
        <div className="absolute bottom-30 left-20 text-5xl animate-bounce" style={{ animationDelay: "1s", animationDuration: "3.5s" }}>🚀</div>
        <div className="absolute bottom-20 right-10 text-6xl animate-bounce" style={{ animationDelay: "1.5s", animationDuration: "2.8s" }}>✨</div>
        <div className="absolute top-60 left-1/3 text-4xl animate-bounce" style={{ animationDelay: "0.8s", animationDuration: "3.2s" }}>📚</div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "var(--font-display)" }}>
            Learning Monk
          </h1>
          <p className="text-white/80 mt-2 text-lg">Where learning becomes an adventure! ✨</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Who are you?</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 text-lg transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Secret password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 text-lg transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <span>😅</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white py-3.5 rounded-xl font-bold text-lg hover:from-primary-600 hover:to-accent-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Let's Go!
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
