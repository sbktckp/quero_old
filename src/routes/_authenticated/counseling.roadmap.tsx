import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/counseling/roadmap")({
  component: Roadmap,
});

const STEPS = [
  ["NEET Result", "NTA declares the NEET UG result and All India Rank (AIR). Save your rank card and scorecard."],
  ["Registration", "Register separately on the MCC portal for All India Quota (AIQ) and on your state counseling portal for State Quota."],
  ["Choice Filling", "Fill preferences for colleges and courses in order of priority. Lock choices before the deadline."],
  ["Mock Allotment", "A trial allotment shows a likely seat based on current choices. Use it to adjust your list."],
  ["Seat Allotment", "The counseling authority runs the actual allotment. Result is published on the portal."],
  ["Document Verification", "Report to the allotted college with originals: NEET admit card, scorecard, class 10/12 marksheets, ID proof, caste/EWS/PwD certificates if applicable."],
  ["Reporting", "Pay fees, submit documents, and formally join the allotted college by the deadline."],
  ["Upgradation Rounds", "In later rounds (Round 2, Mop-up) you may upgrade to a higher preference. Follow the upgradation rules carefully."],
  ["Stray Vacancy", "The final round fills remaining seats. Once accepted, refusal typically bars you from further counseling that year."],
];

function Roadmap() {
  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {STEPS.map(([title, desc], i) => (
        <li key={title} className="pl-4">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full gradient-primary text-primary-foreground text-[11px] font-bold">
            {i + 1}
          </span>
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="font-semibold text-sm">{title}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
