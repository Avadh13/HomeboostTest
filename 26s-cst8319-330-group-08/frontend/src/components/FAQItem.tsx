import { useState } from "react";

type FAQItemProps = {
  question: string;
  answer: string;
};

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <button className="flex w-full items-center justify-between text-left font-bold text-slate-950" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className="text-blue-600">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="mt-3 leading-relaxed text-slate-600">{answer}</p>}
    </div>
  );
}

export default FAQItem;
