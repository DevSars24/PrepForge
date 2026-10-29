"use client";

import { useState, type FormEvent } from "react";
import { Check, Send, ShieldCheck, Star } from "lucide-react";

const STORAGE_KEY = "prepforge.feedback.v1";

type FeedbackEntry = {
  workflow: string;
  rating: number;
  experience: string;
  createdAt: string;
};

const workflows = [
  {
    title: "Review descriptive answers",
    detail:
      "Compare each written step with the marking criteria, review the evidence behind awarded marks, and identify where a student could use another explanation.",
    label: "Step-by-step marking",
  },
  {
    title: "Check OMR sheets",
    detail:
      "Review answer selections alongside blank and flagged responses, then double-check any scan that may need a closer look.",
    label: "Response verification",
  },
  {
    title: "Explain what to practice next",
    detail:
      "Share the result summary in plain language and let students listen to strengths, areas to revisit, and suggested next steps.",
    label: "Student-friendly results",
  },
];

export default function FeedbackSection() {
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const workflow = String(formData.get("workflow") || "");
    const experience = String(formData.get("experience") || "").trim();

    if (!rating) {
      setStatus({ kind: "error", message: "Choose a rating before sending your feedback." });
      return;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const entries: FeedbackEntry[] = saved ? JSON.parse(saved) as FeedbackEntry[] : [];

      if (!Array.isArray(entries)) {
        throw new Error("Saved feedback has an invalid format.");
      }

      entries.unshift({
        workflow,
        rating,
        experience,
        createdAt: new Date().toISOString(),
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 20)));
      form.reset();
      setRating(0);
      setStatus({
        kind: "success",
        message: "Thanks — your feedback is saved privately in this browser.",
      });
    } catch (error) {
      console.error("Could not save product feedback in local browser storage:", error);
      setStatus({
        kind: "error",
        message: "Feedback could not be saved here. Check your browser storage settings and try again.",
      });
    }
  };

  return (
    <section className="feedback-section" id="feedback" aria-labelledby="feedback-title">
      <div className="feedback-intro">
        <span className="feedback-eyebrow">Built around real classroom tasks</span>
        <h3 id="feedback-title">A clearer way through every review.</h3>
        <p>
          Explore common ways to use PrepForge, then tell us what worked for you and what could be better.
        </p>
      </div>

      <div className="feedback-samples">
        {workflows.map((workflow, index) => (
          <article className="feedback-sample" key={workflow.title}>
            <span className="feedback-sample-label">WORKFLOW 0{index + 1}</span>
            <h4>{workflow.title}</h4>
            <p>{workflow.detail}</p>
            <span className="feedback-workflow-tag">{workflow.label}</span>
          </article>
        ))}
      </div>

      <form className="feedback-form" onSubmit={submitFeedback}>
        <div className="feedback-form-heading">
          <div>
            <span className="feedback-eyebrow">Your experience</span>
            <h4>How did PrepForge work for you?</h4>
          </div>
          <span className="feedback-private"><ShieldCheck size={15} /> Saved on this device</span>
        </div>

        <div className="feedback-fields">
          <label className="feedback-field">
            <span>What were you trying to do?</span>
            <select name="workflow" defaultValue="descriptive" required>
              <option value="descriptive">Review descriptive answers</option>
              <option value="omr">Check OMR sheets</option>
              <option value="insights">Understand performance insights</option>
              <option value="report">Create or review a report</option>
              <option value="other">Something else</option>
            </select>
          </label>

          <fieldset className="feedback-rating">
            <legend>How was the experience?</legend>
            <div role="radiogroup" aria-label="Rate your experience from 1 to 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} out of 5 stars`}
                  className={value <= rating ? "selected" : ""}
                  onClick={() => {
                    setRating(value);
                    setStatus(null);
                  }}
                >
                  <Star size={19} fill={value <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </fieldset>

          <label className="feedback-field feedback-field-wide">
            <span>How did it go? What felt clear, or what should we improve?</span>
            <textarea
              name="experience"
              required
              minLength={8}
              maxLength={1000}
              rows={4}
              placeholder="For example: I used the answer review to check a physics script. The step breakdown helped, but…"
            />
          </label>
        </div>

        <div className="feedback-form-footer">
          <p>No name, email, or student details are collected. Feedback stays in this browser.</p>
          <button type="submit" className="feedback-submit">
            <Send size={15} /> Save feedback
          </button>
        </div>
        {status && (
          <p
            className={`feedback-status ${status.kind}`}
            role={status.kind === "error" ? "alert" : "status"}
          >
            {status.kind === "success" && <Check size={16} />}
            {status.message}
          </p>
        )}
      </form>
    </section>
  );
}
