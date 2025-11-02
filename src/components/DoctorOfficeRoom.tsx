import { useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";

type Props = { onFinish: () => void };

type CodingCase = {
  id: string;
  prompt: string;
  choices: string[];
  correct: string;
};

type ChartRow = {
  id: string;
  label: string;
  isDefect: boolean;
};

type ChartDoc = {
  id: string;
  title: string;
  pages: { id: string; title: string; body: string }[];
  issues: { id: string; pageId: string; label: string }[]; // exactly 0 or 1 per page here
};

const BG_IMG = "/images/doctor-office.jpg.png";
const AMBIENCE = "/audio/clinic-ambience.mp3.mp3";
const RING = "/audio/phone-ring.mp3.mp3";

// plausible distractors for doc pages
const DISTRACTOR_POOL = [
  "Missing signature date",
  "Wrong patient name",
  "Wrong MRN",
  "No valid authorization for spouse",
  "DOB mismatch vs. request",
  "Scope exceeds authorization",
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DoctorOfficeRoom({ onFinish }: Props) {
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const ringRef = useRef<HTMLAudioElement | null>(null);

  const [ringing] = useState(true);
  const [callAnswered, setCallAnswered] = useState(false);
  const [callComplete, setCallComplete] = useState(false);

  // post-call tasks
  const [codingOpen, setCodingOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [codingDone, setCodingDone] = useState(false);
  const [auditDone, setAuditDone] = useState(false);

  // UI hints
  const [showHints, setShowHints] = useState(false);

  // phone ring hint bubble after 5s
  const [showPhoneHint, setShowPhoneHint] = useState(false);
  useEffect(() => {
    if (callAnswered) {
      setShowPhoneHint(false);
      return;
    }
    const t = setTimeout(() => setShowPhoneHint(true), 5000);
    return () => clearTimeout(t);
  }, [callAnswered]);

  // ambience + delayed ring
  useEffect(() => {
    if (!ambienceRef.current) {
      const a = new Audio(AMBIENCE);
      a.loop = true;
      a.volume = 0.35;
      ambienceRef.current = a;
    }
    ambienceRef.current.play().catch(() => {});

    const t = setTimeout(() => {
      if (!ringRef.current) {
        const r = new Audio(RING);
        r.loop = true;
        r.volume = 0.7;
        ringRef.current = r;
      }
      if (ringing) ringRef.current.play().catch(() => {});
    }, 2500);
    return () => clearTimeout(t);
  }, [ringing]);

  // Auto-hint if they’re idle after call completes
  useEffect(() => {
    if (!callComplete) return;
    const t = setTimeout(() => {
      if (!codingDone || !auditDone) setShowHints(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [callComplete, codingDone, auditDone]);

  const handleAnswerPhone = () => {
    setCallAnswered(true);
    if (ringRef.current) {
      ringRef.current.pause();
      ringRef.current.currentTime = 0;
    }
  };

  // ---- 3-step call MCQ ----
  const callSteps = [
    {
      q: "What should you do first?",
      choices: [
        "Verify two identifiers (name + DOB).",
        "Ask what records they want before identifying them.",
        "Put caller on hold immediately.",
      ],
      correct: "Verify two identifiers (name + DOB).",
    },
    {
      q: "Caller identified as patient’s spouse; what do you confirm next?",
      choices: [
        "Authorization on file or signed ROI allowing spouse access.",
        "Insurance group number.",
        "The provider’s NPI.",
      ],
      correct: "Authorization on file or signed ROI allowing spouse access.",
    },
    {
      q: "They want records emailed today. Best response?",
      choices: [
        "Confirm scope & delivery method, review ID/authorization, and give timeline following policy.",
        "Say you’ll email anything they want right now.",
        "Decline all requests over the phone.",
      ],
      correct:
        "Confirm scope & delivery method, review ID/authorization, and give timeline following policy.",
    },
  ];
  const [callIndex, setCallIndex] = useState(0);
  const [callSelected, setCallSelected] = useState<string | null>(null);
  const callStep = callSteps[callIndex];
  const callChoices = useMemo(() => shuffle(callStep.choices), [callIndex]);

  const submitCall = () => {
    if (!callSelected) return;
    if (callSelected !== callStep.correct) {
      alert("Not quite — try again!");
      return;
    }
    if (callIndex < callSteps.length - 1) {
      setCallIndex((i) => i + 1);
      setCallSelected(null);
    } else {
      setCallComplete(true);
    }
  };

  // ---- Coding binder ----
  const codingCases: CodingCase[] = useMemo(() => {
    const base: CodingCase[] = [
      {
        id: "A1",
        prompt: "Established pt follow-up for hypertension, stable control.",
        choices: shuffle(["99213 + I10", "99203 + J06.9", "99214 + E11.9"]),
        correct: "99213 + I10",
      },
      {
        id: "A2",
        prompt: "Established pt BP check, med refill; no complicating factors.",
        choices: shuffle(["99213 + I10", "99203 + J06.9", "99212 + Z76.0"]),
        correct: "99213 + I10",
      },
      {
        id: "B1",
        prompt: "NEW patient with acute URI, low complexity.",
        choices: shuffle(["99203 + J06.9", "99213 + I10", "99204 + J45.909"]),
        correct: "99203 + J06.9",
      },
      {
        id: "B2",
        prompt: "NEW patient, acute URI symptoms, exam and counseling provided.",
        choices: shuffle(["99203 + J06.9", "99214 + J06.9", "99212 + Z20.822"]),
        correct: "99203 + J06.9",
      },
    ];
    return shuffle(base);
  }, []);
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({});
  const codingAllCorrect =
    codingCases.length > 0 &&
    codingCases.every((c) => codingAnswers[c.id] === c.correct);

  useEffect(() => {
    if (codingAllCorrect && codingOpen) setCodingDone(true);
  }, [codingAllCorrect, codingOpen]);

  // ---- Chart audit (list) ----
  const charts: ChartRow[] = useMemo(() => {
    const base: ChartRow[] = [
      { id: "1", label: "Chart 1 — Signed, dated, correct patient", isDefect: false },
      { id: "2", label: "Chart 2 — Signed, dated, correct patient", isDefect: false },
      { id: "3", label: "Chart 3 — Missing provider signature", isDefect: true },
      { id: "4", label: "Chart 4 — Signed, date present", isDefect: false },
      { id: "5", label: "Chart 5 — DOB mismatch vs. request", isDefect: true },
      { id: "6", label: "Chart 6 — Signed, complete", isDefect: false },
      { id: "7", label: "Chart 7 — Signed, complete", isDefect: false },
      { id: "8", label: "Chart 8 — Signed, complete", isDefect: false },
      { id: "9", label: "Chart 9 — Signed, complete", isDefect: false },
      { id: "10", label: "Chart 10 — Signed, complete", isDefect: false },
    ];
    return shuffle(base);
  }, []);

  // ---- Part B docs (each page has exactly one real issue OR none) ----
  const chartDocs: ChartDoc[] = useMemo(
    () => [
      {
        id: "D1",
        title: "D1 — Progress Note",
        pages: [
          { id: "p1", title: "Header", body: "Patient: Angela Wood  DOB: 07/14/1988\nMRN: 55421\nProvider: J. Lang, MD\nDate of Service: 03/02/2025" },
          { id: "p2", title: "Assessment", body: "Assessment: Essential Hypertension (I10)\nPlan: Continue current meds" },
          { id: "p3", title: "Signature", body: "Signed: __________________  Date: 03/02/2025" },
        ],
        issues: [
          { id: "i1", pageId: "p3", label: "Missing provider signature" },
        ],
      },
      {
        id: "D2",
        title: "D2 — ROI Packet",
        pages: [
          { id: "p1", title: "Request", body: "Requester: Spouse\nDelivery: Email\nPatient: Sam Brooks (DOB: 08/22/1984)" },
          { id: "p2", title: "Authorization", body: "Authorization allows PCP access only; spouse not listed" },
        ],
        issues: [
          { id: "i1", pageId: "p2", label: "No valid authorization for spouse" },
        ],
      },
      {
        id: "D3",
        title: "D3 — Lab Result",
        pages: [
          { id: "p1", title: "Header", body: "Patient: L. Chen  DOB: 02/03/1982 (Request DOB: 02/30/1982)" },
          { id: "p2", title: "Result", body: "CMP normal" },
        ],
        issues: [
          { id: "i1", pageId: "p1", label: "DOB mismatch vs. request" },
        ],
      },
      {
        id: "D4",
        title: "D4 — Imaging Report",
        pages: [
          { id: "p1", title: "Header", body: "Patient: Erin Diaz  DOB: 01/19/1990\nSigned by: P. Rivera, MD" },
          { id: "p2", title: "Footer", body: "No signature date" },
        ],
        issues: [
          { id: "i1", pageId: "p2", label: "Missing signature date" },
        ],
      },
      {
        id: "D5",
        title: "D5 — Discharge Summary",
        pages: [
          { id: "p1", title: "Header", body: "Patient: T. Morgan  DOB: 11/11/1975\nMRN: 77102" },
          { id: "p2", title: "Attestation", body: "Electronically signed by S. Patel, PA-C 03/08/2025" },
          { id: "p3", title: "Countersign", body: "Supervising MD: ________  (not signed)" },
        ],
        issues: [
          { id: "i1", pageId: "p3", label: "Missing supervising MD countersignature" },
        ],
      },
    ],
    []
  );

  const [auditSelected, setAuditSelected] = useState<string[]>([]);
  const [openDoc, setOpenDoc] = useState<ChartDoc | null>(null);
  const [docPage, setDocPage] = useState(0);

  // NEW: store the learner’s radio pick per page (for UI), and the set of correctly-found pages (for gating)
  const [pageSelections, setPageSelections] = useState<Record<string, string>>({});
  const [foundIssues, setFoundIssues] = useState<string[]>([]); // each key == `${docId}:${pageId}` that’s correct

  const toggleAudit = (id: string) => {
    setAuditSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAuditCheck = () => {
    const picked = charts.filter((c) => auditSelected.includes(c.id));
    if (picked.length !== 2) {
      alert("Select exactly TWO charts you believe are defective.");
      return;
    }
    const bothCorrect = picked.every((p) => p.isDefect);
    if (!bothCorrect) {
      alert("Not quite — review the list and try again!");
      return;
    }
    // Require they also complete at least 3 correct page picks across the docs
    if (foundIssues.length < 3) {
      alert("Nice! Now open a few sample charts below and correctly identify at least 3 page issues.");
      return;
    }
    setAuditDone(true);
  };

  const allTasksDone = callComplete && codingDone && auditDone;

  useEffect(() => {
    if (allTasksDone) setTimeout(() => onFinish(), 700);
  }, [allTasksDone, onFinish]);

  // ---------- UI ----------
  return (
    <div className="relative min-h-screen bg-slate-100">
      <img
        src={BG_IMG}
        alt="Doctor’s office background"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow text-sm">
        Doctor’s Office: Intake &amp; ROI
      </div>

      {/* --- Phone ring hint bubble (appears after 5s) --- */}
      {!callAnswered && showPhoneHint && (
        <div className="absolute bottom-6 right-6 bg-amber-100 text-amber-900 px-4 py-2 rounded-xl shadow">
          The phone is ringing! Click the phone to answer.
        </div>
      )}

      {/* phone hotspot */}
      {!callAnswered && (
        <button
          aria-label="Phone"
          onClick={handleAnswerPhone}
          className="absolute"
          style={{ right: "22%", bottom: "23%", width: "10%", height: "12%" }}
        />
      )}

      {/* call MCQ */}
      {callAnswered && !callComplete && (
        <div className="absolute inset-x-0 bottom-0 md:bottom-8 mx-auto max-w-3xl">
          <div className="mx-4 bg-white/95 rounded-2xl shadow p-5">
            <h3 className="text-lg font-semibold mb-2">Phone Call</h3>
            <p className="text-slate-700 mb-3">{callStep.q}</p>
            <div className="grid gap-2">
              {callChoices.map((c) => (
                <label
                  key={c}
                  className={`border rounded-lg px-3 py-2 cursor-pointer ${
                    callSelected === c
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="call"
                    value={c}
                    className="mr-2"
                    checked={callSelected === c}
                    onChange={() => setCallSelected(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={submitCall}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* tasks unlocked */}
      {callComplete && (
        <>
          <div className="absolute bottom-6 left-6 bg-white/95 rounded-2xl shadow p-4 max-w-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">Next steps</h4>
                <p className="text-slate-700 text-sm">
                  Complete both activities:{" "}
                  <span className={codingDone ? "text-green-700" : ""}>
                    Coding Binder
                  </span>{" "}
                  and{" "}
                  <span className={auditDone ? "text-green-700" : ""}>
                    Chart Audit
                  </span>
                  .
                </p>
              </div>
              <button
                className="text-xs text-blue-700 underline"
                onClick={() => setShowHints((v) => !v)}
              >
                {showHints ? "Hide hints" : "Need a hint?"}
              </button>
            </div>
          </div>

          {/* Coding binder hotspot */}
          <button
            aria-label="Coding Binder"
            onClick={() => setCodingOpen(true)}
            className={`absolute ${
              showHints || !codingDone
                ? "animate-pulse ring-4 ring-amber-300 rounded-xl"
                : ""
            }`}
            style={{ right: "40%", bottom: "26%", width: "16%", height: "12%" }}
            title="Coding Binder"
          />

          {/* Filing cabinet hotspot */}
          <button
            aria-label="Filing Cabinet"
            onClick={() => setAuditOpen(true)}
            className={`absolute ${
              showHints || !auditDone
                ? "animate-pulse ring-4 ring-amber-300 rounded-xl"
                : ""
            }`}
            style={{ right: "12%", bottom: "36%", width: "13%", height: "35%" }}
            title="Filing Cabinet"
          />
        </>
      )}

      {/* CODING modal */}
      {codingOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Coding Binder</h3>
              <button
                className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300"
                onClick={() => setCodingOpen(false)}
              >
                Close
              </button>
            </div>

            <ol className="space-y-4">
              {codingCases.map((c, idx) => {
                const selected = codingAnswers[c.id];
                const correct = selected && selected === c.correct;
                return (
                  <li key={c.id} className="border rounded-xl p-4">
                    <div className="font-semibold mb-2">
                      Case {idx + 1}: {c.prompt}
                    </div>
                    <div className="grid gap-2">
                      {c.choices.map((ch) => (
                        <label
                          key={ch}
                          className={`border rounded-lg px-3 py-2 cursor-pointer ${
                            selected === ch
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name={c.id}
                            value={ch}
                            className="mr-2"
                            checked={selected === ch}
                            onChange={() =>
                              setCodingAnswers((prev) => ({
                                ...prev,
                                [c.id]: ch,
                              }))
                            }
                          />
                          {ch}
                        </label>
                      ))}
                    </div>
                    {selected && (
                      <div
                        className={`mt-2 text-sm ${
                          correct ? "text-green-700" : "text-rose-700"
                        }`}
                      >
                        {correct
                          ? "Correct"
                          : "Not quite — check the binder tabs again."}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {codingAllCorrect ? (
              <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                Coding task complete! ✅
              </div>
            ) : (
              <div className="mt-4 text-slate-600 text-sm">
                Select the best CPT + ICD-10 combo for each mini-case (4 total).
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIT modal */}
      {auditOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Chart Audit</h3>
              <button
                className="px-3 py-1 rounded-lg bg-slate-2 00 hover:bg-slate-300"
                onClick={() => setAuditOpen(false)}
              >
                Close
              </button>
            </div>

            <p className="text-slate-700 mb-3">
              Part A: Select the <strong>two</strong> non-compliant charts from
              the list.
            </p>

            <ul className="space-y-2 mb-6">
              {charts.map((row) => (
                <li
                  key={row.id}
                  className="border rounded-lg p-3 flex items-center justify-between"
                >
                  <span>{row.label}</span>
                  <input
                    type="checkbox"
                    checked={auditSelected.includes(row.id)}
                    onChange={() => toggleAudit(row.id)}
                  />
                </li>
              ))}
            </ul>

            <p className="text-slate-700 mb-2">
              Part B: Open sample charts and <strong>find the issues</strong>{" "}
              (get at least 3 pages right).
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {chartDocs.map((d) => (
                <button
                  key={d.id}
                  className="border rounded-lg p-3 text-left hover:bg-slate-50"
                  onClick={() => {
                    setOpenDoc(d);
                    setDocPage(0);
                  }}
                >
                  <div className="font-semibold">{d.title}</div>
                  <div className="text-sm text-slate-600">
                    {d.pages.length} pages
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              {!auditDone ? (
                <button
                  onClick={handleAuditCheck}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                >
                  Submit Selection
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                  Chart audit complete! ✅
                </div>
              )}
              <div className="text-sm text-slate-600">
                Tip: Think signatures, dates, identifiers, authorization scope.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc viewer (single-choice per page) */}
      {openDoc && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">{openDoc.title}</h3>
              <button
                className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300"
                onClick={() => setOpenDoc(null)}
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-slate-600">
                Page {docPage + 1} of {openDoc.pages.length}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 rounded bg-slate-200 disabled:opacity-50"
                  disabled={docPage === 0}
                  onClick={() => setDocPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="px-2 py-1 rounded bg-slate-200 disabled:opacity-50"
                  disabled={docPage === openDoc.pages.length - 1}
                  onClick={() =>
                    setDocPage((p) => Math.min(openDoc.pages.length - 1, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>

            <div className="border rounded-xl p-4 mb-4">
              <div className="font-semibold mb-1">
                {openDoc.pages[docPage].title}
              </div>
              <pre className="whitespace-pre-wrap text-slate-800">
                {openDoc.pages[docPage].body}
              </pre>
            </div>

            <div className="mb-2 text-sm font-medium">Possible issues on this page:</div>

            {/* --- radio trio (No issues + real + fake) --- */}
            {(() => {
              const pageId = openDoc.pages[docPage].id;
              const docId = openDoc.id;
              const pageKey = `${docId}:${pageId}`;              // key for selection storage
              const realIssue = openDoc.issues.find((i) => i.pageId === pageId); // undefined => no issue here

              const correctValue = realIssue
                ? `${docId}:${realIssue.id}`
                : `${docId}:${pageId}:none`;

              // Build 3 options
              const noIssuesOption = { label: "No issues on this page", value: `${docId}:${pageId}:none` };
              let distractorLabel = shuffle(
                DISTRACTOR_POOL.filter((l) => l !== realIssue?.label)
              )[0] || "Scope exceeds authorization";
              const fakeOption = { label: distractorLabel, value: `${docId}:${pageId}:fake` };
              const realOption = realIssue
                ? { label: realIssue.label, value: `${docId}:${realIssue.id}` }
                : null;

              // If there is a real issue, options: [No issues, Real, Fake]; if none, options: [No issues (correct), Fake1, Fake2? -> we’ll still show one fake only as requested]
              const baseOptions = realOption
                ? [noIssuesOption, realOption, fakeOption]
                : [noIssuesOption, fakeOption, { label: "Wrong MRN", value: `${docId}:${pageId}:fake2` }];

              const options = shuffle(baseOptions);

              const selected = pageSelections[pageKey] ?? "";

              return (
                <div className="grid gap-2">
                  {options.map((opt) => (
                    <label key={opt.value} className="border rounded-lg px-3 py-2 cursor-pointer flex items-center gap-2">
                      <input
                        type="radio"
                        name={`issue-${pageKey}`}
                        value={opt.value}
                        checked={selected === opt.value}
                        onChange={() => {
                          setPageSelections((prev) => ({ ...prev, [pageKey]: opt.value }));
                          setFoundIssues((prev) => {
                            const withoutThisPage = prev.filter((k) => k !== pageKey);
                            // credit only if correct answer picked
                            if (opt.value === correctValue) {
                              return [...withoutThisPage, pageKey];
                            }
                            return withoutThisPage;
                          });
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* toast + confetti */}
      {allTasksDone && (
        <>
          <Confetti numberOfPieces={240} recycle={false} />
          <div className="absolute inset-x-0 top-6 mx-auto w-fit">
            <div className="bg-emerald-600 text-white px-5 py-2 rounded-full shadow">
              Great work! Generating certificate…
            </div>
          </div>
        </>
      )}
    </div>
  );
}