import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, Trash2, X } from "lucide-react";
import { api } from "../backend/api";

const SUGGESTIONS = [
  "10th tarvata nenu em cheyyali?",
  "Inter MPC tarvata best options enti?",
  "Non-IT lo manchi careers enti?",
  "B.Tech tarvata job ki ye skills kavali?",
];

// The chat itself. Used on the AI Skill Coach page: <ChatPanel full />
export function ChatPanel({ full = false, page = "website" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api("/chat/history")
      .then((data) => setMessages(data.messages))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const data = await api("/chat", {
        method: "POST",
        body: { message, page },
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    try {
      await api("/chat/history", { method: "DELETE" });
      setMessages([]);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="chat-card">
      <div className="chat-header">
        <div className="ai-avatar">
          <Sparkles size={18} />
        </div>

        <div style={{ flex: 1 }}>
          <strong>Career Compass AI</strong>
          <span>Ask about studies, exams, IT and non-IT careers</span>
        </div>

        <button className="icon-btn" onClick={clear} title="Clear chat">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <>
            <div className="message ai">
              Hi! Nenu mee career guide ni. Mee stage, interest cheppandi, nenu
              roadmap istanu.
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`message ${m.role === "user" ? "user" : "ai"}`}
          >
            {m.content}
          </div>
        ))}

        {loading && <div className="message ai typing">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask your career question..."
        />
        <button className="send-btn" onClick={() => send()} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

// Floating button + popup. Mounted once in Root.jsx so it shows on every page.
export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="chat-float">
          <ChatPanel />
        </div>
      )}

      <button
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open AI chat"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}