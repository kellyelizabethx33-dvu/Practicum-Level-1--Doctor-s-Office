import { useState } from "react";
import "./index.css";

import Quiz from "./components/Quiz";
import DoctorOfficeRoom from "./components/DoctorOfficeRoom";
import Certificate from "./components/Certificate";


export default function App() {
  const [stage, setStage] = useState<"quiz" | "room" | "certificate" | "done">("quiz");
 const [, setScore] = useState(0);      // or: const _score = useRef(0)

if (stage === "quiz") {
  return (
    <Quiz
      onComplete={(finalScore) => {
        setScore(finalScore);
        setStage("room");
      }}
    />
  );
}


if (stage === "room") {
  return <DoctorOfficeRoom onFinish={() => setStage("certificate")} />;
}


if (stage === "certificate") {
  return <Certificate onDone={() => setStage("done")} />;
}

if (stage === "done") {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Great job!</h1>
        <p className="text-slate-700">
          You’ve completed the Doctor’s Office level.
        </p>
      </div>
    </div>
  );
}


  // --- DONE (simple end screen fallback) ---
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Great job!</h1>
        <p className="text-slate-700">You’ve completed the Doctor’s Office level.</p>
      </div>
    </div>
  );
}
