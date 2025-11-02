import { useState } from "react";

type Props = {
  onDone: () => void;
};

export default function Certificate({ onDone }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Practicum Level 1: Doctor&apos;s Office</h1>

        <div className="border-2 border-amber-400 rounded-2xl p-6 text-center">
          <div className="text-xl font-semibold">Certificate of Completion</div>
          <div className="mt-4 text-slate-700">
            This certifies that
          </div>

          <input
            className="mt-3 w-full md:w-2/3 mx-auto border rounded-lg px-3 py-2 text-center text-lg"
            placeholder="Type your full name here…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="mt-4 text-slate-700">
            has successfully completed <strong>Practicum Level 1: Doctor&apos;s Office</strong>.
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Tip: take a screenshot of this certificate with your name and upload it to your
          course reflection journal as proof of completion.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            disabled={!name.trim()}
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}
