import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/choice-filling")({
  component: ChoiceFilling,
});

function ChoiceFilling() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h2 className="font-semibold">Prioritize as Dream / Target / Safe</h2>
        <ul className="text-sm space-y-2">
          <li><b>Dream</b> — colleges you'd love to get into but where your rank is at or above the historical closing rank. Place these at the top so a lucky upgrade can catch them.</li>
          <li><b>Target</b> — colleges where your rank is well within recent closing ranks for your category. This is the realistic core of your list.</li>
          <li><b>Safe</b> — colleges where your rank is comfortably better than the closing rank across multiple years. Keep enough of these so you don't end up unallotted.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h2 className="font-semibold">General principles</h2>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>Order strictly by your genuine preference. Allotment always tries the highest available choice, not the "safest".</li>
          <li>Fill AIQ and State portals separately. Don't assume one carries over to the other.</li>
          <li>Consider fees, bond years, hostel availability, and location realistically — a seat you can't afford or attend is not useful.</li>
          <li>Verify each college's NMC recognition and current admission status on the official portal.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-600" /> Do</h2>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Fill a long list — you can always leave lower choices unfilled at the bottom.</li>
          <li>Save/lock choices before the deadline. Unlocked choices may be auto-locked at the last minute.</li>
          <li>Cross-check category, quota, and course code against the official brochure.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><XCircle size={16} className="text-destructive" /> Avoid</h2>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Filling only "dream" colleges — you may end up unallotted.</li>
          <li>Ranking safe colleges above target colleges thinking it "secures" a seat. It just gives you the safe seat first.</li>
          <li>Ignoring bond amounts and service commitments in government/state colleges.</li>
          <li>Trusting third-party predictors as final — always confirm on the official counseling portal.</li>
        </ul>
      </section>

      <p className="text-[11px] text-muted-foreground">
        This is educational guidance only. Quero does not generate or submit official preference lists on your behalf.
      </p>
    </div>
  );
}
