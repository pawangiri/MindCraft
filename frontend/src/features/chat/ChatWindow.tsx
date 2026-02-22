import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Markdown from "../../components/Markdown";
import api, { type ChatSession, type ChatMessage } from "../../api/client";
import { cn } from "../../utils/cn";
import { Send, Plus, Bot, User, Loader2, MessageSquare, Trash2 } from "lucide-react";

export default function ChatWindow() {
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get("lesson");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get("/chat/sessions/").then((r) => {
      const data = r.data.results || r.data;
      setSessions(data);
      if (lessonId && data.length === 0) {
        createSession("lesson", Number(lessonId));
      }
    });
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    api.get(`/chat/sessions/${activeSession.id}/messages/`).then((r) => {
      setMessages(r.data);
    });
  }, [activeSession?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const createSession = async (contextType = "general", contextId?: number) => {
    const { data } = await api.post("/chat/sessions/", {
      title: "New Chat",
      context_type: contextType,
      context_id: contextId || null,
    });
    setSessions((prev) => [data, ...prev]);
    setActiveSession(data);
    setMessages([]);
    setShowSessions(false);
  };

  const selectSession = (session: ChatSession) => {
    setActiveSession(session);
    setShowSessions(false);
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    await api.delete(`/chat/sessions/${sessionId}/`);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    if (!activeSession) {
      await createSession(lessonId ? "lesson" : "general", lessonId ? Number(lessonId) : undefined);
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: userMsg, created_at: new Date().toISOString() },
    ]);

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/v1/chat/sessions/${activeSession.id}/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === "chunk") {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                } else if (parsed.type === "done") {
                  setMessages((prev) => [
                    ...prev,
                    { id: Date.now() + 1, role: "assistant", content: parsed.content, created_at: new Date().toISOString() },
                  ]);
                  setStreamingContent("");
                } else if (parsed.type === "error") {
                  setMessages((prev) => [
                    ...prev,
                    { id: Date.now() + 1, role: "assistant", content: `Oops! Something went wrong: ${parsed.content}`, created_at: new Date().toISOString() },
                  ]);
                  setStreamingContent("");
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again!", created_at: new Date().toISOString() },
      ]);
      setStreamingContent("");
    }
    setIsStreaming(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] gap-4">
      {/* Mobile sessions backdrop */}
      {showSessions && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setShowSessions(false)}
        />
      )}

      {/* Sessions sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-lg flex flex-col md:static md:w-64 md:rounded-2xl md:shadow-sm md:z-auto transition-transform duration-200 ease-in-out md:translate-x-0 md:shrink-0",
          showSessions ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-3 border-b">
          <button
            onClick={() => createSession()}
            className="w-full bg-primary-500 text-white py-2 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => selectSession(session)}
              className={cn(
                "group w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-start gap-2",
                activeSession?.id === session.id
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{session.title}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {session.last_message || "No messages yet"}
                </div>
              </div>
              <button
                onClick={(e) => deleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 mt-0.5"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              Start a new chat! 💬
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col min-w-0">
        {!activeSession ? (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">AI Tutor</h2>
              <p className="text-gray-500 mb-4">
                I'm here to help you learn! Ask me anything about your lessons.
              </p>
              <button
                onClick={() => createSession()}
                className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all"
              >
                Start Chatting
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header with mobile sessions toggle */}
            <div className="flex items-center gap-2 px-4 py-2 border-b md:hidden">
              <button
                onClick={() => setShowSessions(true)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 truncate">
                {activeSession.title}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !streamingContent && (
                <div className="text-center text-gray-400 py-12">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Hi! How can I help you today? 😊</p>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {streamingContent && (
                <MessageBubble
                  message={{ id: -1, role: "assistant", content: streamingContent, created_at: "" }}
                  isStreaming
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 md:p-4 border-t">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  rows={1}
                  className="flex-1 resize-none px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="bg-primary-500 text-white p-3 rounded-xl hover:bg-primary-600 transition-all disabled:opacity-40 shrink-0"
                >
                  {isStreaming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm",
        isUser ? "bg-primary-100 text-primary-600" : "bg-accent-100 text-accent-600"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary-500 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-accent-500 rounded-sm animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
