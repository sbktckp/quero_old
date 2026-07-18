import { AlertTriangle } from "lucide-react";

export function CounselingDisclaimer() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 text-[11px] leading-snug text-amber-900 dark:text-amber-200">
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <div>
        Quero provides educational guidance and predictions based on previous years' counseling data.
        It does not conduct admissions, submit applications, or guarantee seat allotment.
        Always verify information through the official counseling authorities.
        Quero is not affiliated with MCC, NMC, NTA, or any state counseling authority.
      </div>
    </div>
  );
}
