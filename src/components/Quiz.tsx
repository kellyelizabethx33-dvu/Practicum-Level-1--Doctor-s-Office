import { useMemo, useState } from "react";

/** Props: parent will advance stage when quiz finishes */
type Props = {
  onComplete: (finalScore: number) => void;
};

/** Utility: Fisher–Yates shuffle (pure) */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** --------- Multiple-choice bank (first 4 questions) --------- */
type MCQ = {
  q: string;
  choices: string[];
  correct: string;
};

const MCQS: MCQ[] = [
  {
    q: "Before discussing PHI with a caller, what must you do first?",
    choices: [
      "Verify two patient identifiers (e.g., full name and DOB).",
      "Ask for the insurance group number.",
      "Place the caller on hold and transfer to billing.",
      "Confirm the provider’s NPI."
    ],
    correct: "Verify two patient identifiers (e.g., full name and DOB)."
  },
  {
    q: "A spouse requests the patient’s records. What should you confirm next?",
    choices: [
      "There is a valid authorization or documented permission allowing spouse access.",
      "That the spouse knows the last visit date.",
      "That the spouse is listed as emergency contact for billing.",
      "That the spouse can pick up any records they want."
    ],
    correct:
      "There is a valid authorization or documented permission allowing spouse access."
  },
  {
    q: "The patient wants records by email today. What is the best next step?",
    choices: [
      "Confirm scope & delivery, verify ID/authorization, and follow policy timelines.",
      "Email everything immediately to be helpful.",
      "Decline all email requests for security reasons.",
      "Send only the problem list without documentation."
    ],
    correct:
      "Confirm scope & delivery, verify ID/authorization, and follow policy timelines."
  },
  {
    q: "For minimum necessary, you should:",
    choices: [
      "Disclose only what’s needed to fulfill the stated purpose.",
      "Provide the entire chart for convenience.",
      "Refuse all disclosures unless in person.",
      "Share everything if the caller states it’s urgent."
    ],
    correct: "Disclose only what’s needed to fulfill the stated purpose."
  }
];

/** --------- Reorder (drag/drop or move buttons) final question ---------
 * Exactly one correct order. We render with a randomized, *incorrect* start.
 * The student must arrange to match 'CORRECT_ORDER' exactly.
 */
const CORRECT_ORDER = [
  "Verify patient identity (two identifiers).",
  "Confirm authorization/permission is valid.",
  "Clarify request scope & preferred delivery method.",
  "Process request (fees/timelines per policy).",
  "Log disclosure per policy."
];

export default function Quiz({ onComplete }: Props) {
  /** Which page of the quiz are we on?
   *  0..3 => MCQs, 4 => reorder, 5 => finished summary
   */
  const [step, setStep] = useState<number>(0);

  /** Score for MCQs (first 4 questions only) */
  const [score, setScore] = useState<number>(0);

  /** For the current MCQ, which option is selected? */
  const [selected, setSelected] = useState<string | null>(null);

  /** Shuffle the visible MCQ’s options on every step change */
  const shuffledChoices = useMemo(() => {
    if (step >= 0 && step < MCQS.length) {
      return shuffle(MCQS[step].choices);
    }
    return [];
  }, [step]);

  /** ---------- Reorder state ----------
   * Build a randomized order that is *not* already correct.
   */
  const randomizedStart = useMemo(() => {
    let start = shuffle(CORRECT_ORDER);
    // Ensure it's not accidentally correct:
    if (JSON.stringify(start) === JSON.stringify(CORRECT_ORDER)) {
      start = shuffle(CORRECT_ORDER);
    }
    return start;
  }, []);

  const [order, setOrder] = useState<string[]>(randomizedStart);

  const isOrderCorrect = JSON.stringify(order) === JSON.stringify(CORRECT_ORDER);

  /** Move helpers for reorder */
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setOrder((prev) => {
      const a = prev.slice();
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
      return a;
    });
  };
  const moveDown = (idx: number) => {
    if (idx === order.length - 1) return;
    setOrder((prev) => {
      const a = prev.slice();
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
      return a;
    });
  };

  /** Handle MCQ submit */
  const submitMCQ = () => {
    if (selected == null) return;
    const isCorrect = selected === MCQS[step].correct;
    if (isCorrect) setScore((s) => s + 1);
    setSelected(null);
    if (step < MCQS.length - 1) {
      setStep(step + 1);
    } else {
      // jump to reorder screen
      setStep(MCQS.length);
    }
  };

  /** Submit reorder */
  const submitReorder = () => {
    if (!isOrderCorrect) return;
    setStep(MCQS.length + 1);
  };

  /** Renderers */
  if (step <= MCQS.length - 1) {
    // MCQ page
    const q = MCQS[step];
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
          <div className="text-sm text-slate-500 mb-2">
            Question {step + 1} of {MCQS.length}
          </div>
          <h1 className="text-2xl font-bold mb-4">{q.q}</h1>

          <div className="grid gap-2">
            {shuffledChoices.map((c) => (
              <label
                key={c}
                className={`border rounded-lg px-3 py-2 cursor-pointer ${
                  selected === c ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${step}`}
                  value={c}
                  className="mr-2"
                  checked={selected === c}
                  onChange={() => setSelected(c)}
                />
                {c}
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-slate-600 text-sm">Score: {score}</div>
            <button
              onClick={submitMCQ}
              disabled={selected == null}
              className={`px-4 py-2 rounded-lg text-white ${
                selected == null ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {step === MCQS.length - 1 ? "Continue to Reorder" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === MCQS.length) {
    // Reorder page
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
          <div className="text-sm text-slate-500 mb-2">Final task</div>
          <h2 className="text-xl font-semibold mb-3">
            Arrange the ROI workflow steps in the correct order:
          </h2>

          <ol className="space-y-2">
            {order.map((item, idx) => (
              <li
                key={item}
                className="border rounded-lg p-3 flex items-center justify-between bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
                    onClick={() => moveUp(idx)}
                    aria-label={`Move "${item}" up`}
                  >
                    ↑
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
                    onClick={() => moveDown(idx)}
                    aria-label={`Move "${item}" down`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center justify-between">
            <div
              className={`text-sm ${
                isOrderCorrect ? "text-green-700" : "text-slate-600"
              }`}
            >
              {isOrderCorrect
                ? "Perfect! The order is correct."
                : "Tip: Start with identity, then permission, then scope/delivery, then processing, then logging."}
            </div>
            <button
              onClick={submitReorder}
              disabled={!isOrderCorrect}
              className={`px-4 py-2 rounded-lg text-white ${
                isOrderCorrect
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              Finish Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Finished summary page
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Great job!</h2>
        <p className="text-slate-700">
          MCQ score: <strong>{score}</strong> / {MCQS.length}
        </p>
        <p className="text-slate-700 mt-1">Reorder task: <strong>Passed</strong> ✅</p>

        <button
          className="mt-5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => onComplete(score)}
        >
          Enter the Doctor’s Office
        </button>
      </div>
    </div>
  );
}
