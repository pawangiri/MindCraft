import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import Markdown from "../../components/Markdown";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Calculator,
  MessageCircle,
} from "lucide-react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ChatMessage, MathPracticeSessionDetail } from "../../api/client";
import {
  generateProblem,
  evaluateAnswer,
  getSession,
  createAttempt,
  updateAttempt,
} from "../../api/math";
import type { MathProblem, MathEvaluation } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { cn } from "../../utils/cn";

export default function MathPractice() {
  const { sessionId } = useParams();
  const user = useAuthStore((s) => s.user);
  const grade = user?.kid_profile?.grade_level ?? 4;

  // Session state
  const [session, setSession] = useState<MathPracticeSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);

  // Problem state
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [generatingProblem, setGeneratingProblem] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<MathEvaluation | null>(null);

  // Canvas
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  // Chat state
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Ref to hold latest session for use in fetchNewProblem
  const sessionRef = useRef<MathPracticeSessionDetail | null>(null);
  sessionRef.current = session;

  // Load session on mount
  useEffect(() => {
    if (!sessionId) return;
    getSession(Number(sessionId)).then((s) => {
      setSession(s);
      sessionRef.current = s;
      setChatSessionId(s.chat_session_id);
      // If session has attempts, show last problem; otherwise generate new
      if (s.attempts.length > 0) {
        const last = s.attempts[s.attempts.length - 1];
        setProblem({ problem_text: last.problem_text, difficulty: last.difficulty, hint: last.hint });
        setCurrentAttemptId(last.id);
        if (last.is_correct !== null) {
          setEvaluation({ correct: last.is_correct, correct_answer: last.correct_answer, feedback: last.feedback });
        }
      } else {
        fetchNewProblem();
      }
      setLoading(false);
    });
  }, [sessionId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const fetchNewProblem = async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    setGeneratingProblem(true);
    setEvaluation(null);
    setShowHint(false);
    try {
      const p = await generateProblem(grade, currentSession.topic);
      setProblem(p);
      // Save to DB
      const attempt = await createAttempt(currentSession.id, {
        problem_text: p.problem_text,
        difficulty: p.difficulty,
        hint: p.hint,
      });
      setCurrentAttemptId(attempt.id);
    } catch {
      setProblem({
        problem_text: "Could not generate a problem. Please try again!",
        difficulty: "unknown",
        hint: "",
      });
    }
    setGeneratingProblem(false);
  };

  const handleSubmit = useCallback(async () => {
    if (!excalidrawAPI || !problem || !session || !currentAttemptId) return;

    const elements = excalidrawAPI.getSceneElements();
    if (elements.length === 0) return;

    setSubmitting(true);
    try {
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
        exportPadding: 16,
      });

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      // Convert blob to File for upload
      const file = new File([blob], "canvas.png", { type: "image/png" });

      const result = await evaluateAnswer(problem.problem_text, base64, grade);
      setEvaluation(result);

      // Save to DB
      await updateAttempt(session.id, currentAttemptId, {
        canvas_image: file,
        is_correct: result.correct,
        correct_answer: result.correct_answer,
        feedback: result.feedback,
      });
    } catch {
      setEvaluation({
        correct: false,
        correct_answer: "",
        feedback:
          "Oops! Something went wrong checking your answer. Please try again.",
      });
    }
    setSubmitting(false);
  }, [excalidrawAPI, problem, grade, session, currentAttemptId]);

  const handleTryAnother = () => {
    if (excalidrawAPI) {
      excalidrawAPI.resetScene();
    }
    fetchNewProblem();
  };

  const handleClearCanvas = useCallback(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.resetScene();
  }, [excalidrawAPI]);

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isStreaming || !chatSessionId) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: userMsg,
        created_at: new Date().toISOString(),
      },
    ]);

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/v1/chat/sessions/${chatSessionId}/send/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            message: userMsg,
            context: {
              problem_text: problem?.problem_text ?? null,
              topic: session?.topic ?? null,
              difficulty: problem?.difficulty ?? null,
              hint: problem?.hint ?? null,
              evaluation: evaluation
                ? {
                    correct: evaluation.correct,
                    correct_answer: evaluation.correct_answer,
                    feedback: evaluation.feedback,
                  }
                : null,
            },
          }),
        }
      );

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
                    {
                      id: Date.now() + 1,
                      role: "assistant",
                      content: parsed.content,
                      created_at: new Date().toISOString(),
                    },
                  ]);
                  setStreamingContent("");
                } else if (parsed.type === "error") {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: Date.now() + 1,
                      role: "assistant",
                      content: `Oops! Something went wrong: ${parsed.content}`,
                      created_at: new Date().toISOString(),
                    },
                  ]);
                  setStreamingContent("");
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again!",
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");
    }
    setIsStreaming(false);
    chatInputRef.current?.focus();
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const difficultyColor =
    problem?.difficulty === "easy"
      ? "bg-green-100 text-green-700"
      : problem?.difficulty === "hard"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] gap-3">
      {/* Main Panel: Canvas + Problem */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Link
            to="/math-practice"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-700 truncate">
              {session.topic}
            </span>
          </div>
        </div>

        {/* Problem Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3 border border-amber-100">
          {generatingProblem ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span className="text-gray-500 font-medium">
                Generating a new problem...
              </span>
            </div>
          ) : problem ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold text-gray-900 leading-relaxed flex-1">
                  {problem.problem_text}
                </p>
                {problem.difficulty && problem.difficulty !== "unknown" && (
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 capitalize",
                      difficultyColor
                    )}
                  >
                    {problem.difficulty}
                  </span>
                )}
              </div>
              {showHint && problem.hint && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{problem.hint}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Evaluation Feedback */}
        {evaluation && (
          <div
            className={cn(
              "rounded-2xl shadow-sm p-4 mb-3 border",
              evaluation.correct
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            )}
          >
            <div className="flex items-start gap-3">
              {evaluation.correct ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={cn(
                    "font-bold text-lg",
                    evaluation.correct ? "text-green-700" : "text-amber-700"
                  )}
                >
                  {evaluation.correct
                    ? "Great job! That's correct!"
                    : "Not quite right, keep trying!"}
                </p>
                {!evaluation.correct && evaluation.correct_answer && (
                  <p className="text-sm text-amber-700 mt-1">
                    <span className="font-semibold">Correct answer:</span>{" "}
                    {evaluation.correct_answer}
                  </p>
                )}
                {evaluation.feedback && (
                  <p className="text-sm mt-2 text-gray-700">
                    {evaluation.feedback}
                  </p>
                )}
                <button
                  onClick={handleTryAnother}
                  className="mt-3 bg-primary-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all"
                >
                  Try Another Problem
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Excalidraw Canvas */}
        <div className="flex-1 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 min-h-0">
          <Excalidraw
            excalidrawAPI={(a) => setExcalidrawAPI(a)}
            theme="light"
            name="Math Practice"
            gridModeEnabled={true}
            initialData={{ appState: { gridSize: 20 } }}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                export: false,
                saveAsImage: false,
              },
            }}
          />
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={submitting || !problem || generatingProblem}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2 disabled:opacity-40 text-sm"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {submitting ? "Checking..." : "Submit Answer"}
          </button>
          {problem?.hint && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-200 transition-all flex items-center gap-2 text-sm"
            >
              <Lightbulb className="w-4 h-4" /> Get Hint
            </button>
          )}
          <button
            onClick={handleClearCanvas}
            className="bg-white text-gray-600 px-4 py-2.5 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(
              "ml-auto px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm",
              chatOpen
                ? "bg-accent-100 text-accent-700 hover:bg-accent-200"
                : "bg-accent-500 text-white hover:bg-accent-600"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Math Tutor
          </button>
        </div>
      </div>

      {/* Right Panel: Chat Tutor (collapsible) */}
      {chatOpen && (
      <div
        className={cn(
          "flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden",
          "h-80 mt-3 md:mt-0 md:h-auto md:w-80 md:shrink-0 md:min-h-0"
        )}
      >
        {/* Chat Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-accent-500 text-white shrink-0">
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">Math Tutor</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center text-gray-400 py-8">
              <Bot className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                Need help? Ask me about the problem!
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {streamingContent && (
            <ChatBubble
              message={{
                id: -1,
                role: "assistant",
                content: streamingContent,
                created_at: "",
              }}
              isStreaming
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask for help..."
              rows={1}
              className="flex-1 resize-none px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-100 text-sm"
              style={{ minHeight: "42px", maxHeight: "80px" }}
            />
            <button
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isStreaming}
              className="bg-accent-500 text-white p-2.5 rounded-xl hover:bg-accent-600 transition-all disabled:opacity-40 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function ChatBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs",
          isUser
            ? "bg-primary-100 text-primary-600"
            : "bg-accent-100 text-accent-600"
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
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
          <span className="inline-block w-2 h-3.5 bg-accent-500 rounded-sm animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
