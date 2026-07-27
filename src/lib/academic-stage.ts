export type Goal = "neet_ug" | "neet_pg";

export const UG_STAGES = [
  { value: "class_11", label: "Class 11th" },
  { value: "class_12", label: "Class 12th" },
  { value: "dropper", label: "Dropper" },
] as const;

export const PG_STAGES = [
  { value: "mbbs_1", label: "1st Year" },
  { value: "mbbs_2", label: "2nd Year" },
  { value: "mbbs_3", label: "3rd Year" },
  { value: "mbbs_4", label: "4th Year" },
] as const;

export function stageOptions(goal: Goal | null | undefined) {
  if (!goal) return [];
  return goal === "neet_pg" ? [...PG_STAGES] : [...UG_STAGES];
}

export function stageQuestion(goal: Goal | null | undefined) {
  return goal === "neet_pg" ? "Which MBBS year are you in?" : "What stage are you at?";
}

export function stageLabel(value: string | null | undefined) {
  if (!value) return "—";
  const all = [...UG_STAGES, ...PG_STAGES];
  return all.find((s) => s.value === value)?.label ?? value;
}

export function goalLabel(goal: Goal | null | undefined) {
  return goal === "neet_pg" ? "NEET PG" : "NEET UG";
}
