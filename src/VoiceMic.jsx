import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

// Drop next to a textarea:  <VoiceMic onText={(text) => setDraft((d) => d + text)} />
// Works in Chrome/Edge (webkitSpeechRecognition). Silently hides itself in
// browsers without support, so it never breaks the page.
export default function VoiceMic({ onText, lang = "en-IN" }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;

    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) onText(text.trim() + " ");
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!supported) return null;

  const toggle = () => {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        /* already started */
      }
    }
  };

  return (
    <button
      type="button"
      className={`icon-btn voice-mic ${listening ? "listening" : ""}`}
      onClick={toggle}
      title={listening ? "Stop dictation" : "Speak your answer"}
      aria-pressed={listening}
      aria-label="Toggle voice input"
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
}