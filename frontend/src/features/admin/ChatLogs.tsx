import { useEffect, useState } from "react";
import { MessageCircle, ArrowLeft, User, Bot, Clock } from "lucide-react";
import api from "../../api/client";
import { cn } from "../../utils/cn";

interface ChatSession {
  id: number;
  kid: number;
  kid_name: string;
  kid_avatar: string;
  title: string;
  context_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  message_count: number;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const contextLabels: Record<string, string> = {
  general: "General",
  lesson: "Lesson Help",
  quiz_help: "Quiz Help",
  canvas: "Canvas",
  math: "Math Practice",
};

export default function ChatLogs() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterKid, setFilterKid] = useState<string>("all");

  // Get unique kids from sessions
  const kids = Array.from(
    new Map(sessions.map((s) => [s.kid, { id: s.kid, name: s.kid_name, avatar: s.kid_avatar }])).values()
  );

  const filteredSessions = filterKid === "all"
    ? sessions
    : sessions.filter((s) => String(s.kid) === filterKid);

  useEffect(() => {
    api.get("/chat/sessions/").then((r) => {
      const data = r.data.results ?? r.data;
      setSessions(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openSession = (session: ChatSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    api.get(`/chat/sessions/${session.id}/messages/`).then((r) => {
      setMessages(r.data);
      setLoadingMessages(false);
    }).catch(() => setLoadingMessages(false));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (selectedSession) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedSession(null); setMessages([]); }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all sessions
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{selectedSession.kid_avatar}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedSession.title}</h2>
              <p className="text-sm text-gray-500">
                {selectedSession.kid_name} · {contextLabels[selectedSession.context_type] || selectedSession.context_type} · {formatDate(selectedSession.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingMessages ? (
            <div className="p-8 text-center text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No messages in this session.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.filter((m) => m.role !== "system").map((msg) => (
                <div key={msg.id} className={cn("px-5 py-4", msg.role === "assistant" && "bg-gray-50")}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === "user" ? "bg-blue-100" : "bg-purple-100"
                    )}>
                      {msg.role === "user" ? (
                        <User className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {msg.role === "user" ? selectedSession.kid_name : "AI Tutor"}
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Chat Logs</h1>
        <p className="text-gray-500 mt-1">View your kids' conversations with the AI tutor.</p>
      </div>

      {/* Filter */}
      {kids.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterKid("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filterKid === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All Kids
          </button>
          {kids.map((kid) => (
            <button
              key={kid.id}
              onClick={() => setFilterKid(String(kid.id))}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                filterKid === String(kid.id) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {kid.avatar} {kid.name}
            </button>
          ))}
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading chat sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No chat sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => openSession(session)}
              className="w-full bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">{session.kid_avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 truncate">{session.title}</span>
                    <span className="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                      {contextLabels[session.context_type] || session.context_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-medium">{session.kid_name}</span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {session.message_count} messages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.updated_at)}
                    </span>
                  </div>
                  {session.last_message && (
                    <p className="text-sm text-gray-400 mt-1 truncate">{session.last_message}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
