import { useEffect, useState } from "react";
import { Volume2, VolumeX, Square } from "lucide-react";

export default function VoiceButton({ text, language }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window,
    );
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function play() {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  if (!supported) {
    return (
      <p className="voice-unavailable" role="status">
        <VolumeX size={18} />
        {language === "ta"
          ? "இந்த உலாவியில் குரல் வசதி இல்லை."
          : "Voice playback is not available in this browser."}
      </p>
    );
  }

  return (
    <div className="voice-controls">
      <button className="button button-voice" type="button" onClick={play} disabled={speaking}>
        <Volume2 size={19} /> {language === "ta" ? "கேட்க" : "Listen"}
      </button>
      <button className="button button-voice-stop" type="button" onClick={stop} disabled={!speaking}>
        <Square size={16} /> {language === "ta" ? "நிறுத்து" : "Stop"}
      </button>
    </div>
  );
}
