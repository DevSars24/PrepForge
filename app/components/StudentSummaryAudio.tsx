"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import type { EvaluationResult } from "@/lib/evaluation";

function cleanForSpeech(text: string) {
  return text.replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
}

export default function StudentSummaryAudio({
  result,
}: {
  result: EvaluationResult;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const parts = [
      `Here is your answer review. Your overall score is ${result.score} percent.`,
      cleanForSpeech(result.summary),
    ];

    if (result.strengths.length > 0) {
      parts.push(`What went well: ${result.strengths.slice(0, 3).map(cleanForSpeech).join(". ")}.`);
    }

    if (result.gaps.length > 0) {
      parts.push(`What to work on: ${result.gaps.slice(0, 3).map(cleanForSpeech).join(". ")}.`);
    }

    if (result.recommendations.length > 0) {
      parts.push(`A good next step: ${result.recommendations.slice(0, 2).map(cleanForSpeech).join(". ")}.`);
    }

    parts.push("Keep practicing. Progress comes one step at a time.");
    return parts.filter(Boolean).join(" ");
  }, [result]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [summary]);

  const stop = () => {
    setPlaybackError(null);
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const play = () => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setPlaybackError("Audio playback isn't available in this browser.");
      return;
    }

    setPlaybackError(null);
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      setSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = document.documentElement.lang || "en";
    utterance.rate = 0.94;
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = (event) => {
      setSpeaking(false);
      setPaused(false);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setPlaybackError("Audio playback stopped unexpectedly. Please try again.");
      }
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    setPlaybackError(null);
    window.speechSynthesis.pause();
    setPaused(true);
    setSpeaking(false);
  };

  return (
    <section className="student-audio-card" aria-labelledby="student-audio-title">
      <div className="student-audio-copy">
        <span className="student-audio-icon" aria-hidden="true">
          <Volume2 size={18} />
        </span>
        <div>
          <h3 id="student-audio-title">Your feedback, explained</h3>
          <p>A short, student-friendly audio summary of your score and next steps.</p>
        </div>
      </div>
      <div className="student-audio-actions">
        <div className="student-audio-controls">
          <button type="button" className="student-audio-button" onClick={speaking ? pause : play}>
            {speaking ? <Pause size={15} /> : <Play size={15} />}
            {speaking ? "Pause" : paused ? "Resume" : "Listen"}
          </button>
          {(speaking || paused) && (
            <button
              type="button"
              className="student-audio-stop"
              onClick={stop}
              aria-label="Stop audio summary"
            >
              <Square size={13} />
              Stop
            </button>
          )}
        </div>
        {playbackError && <p className="student-audio-unavailable" role="status">{playbackError}</p>}
      </div>
    </section>
  );
}
