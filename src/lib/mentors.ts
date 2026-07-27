import { supabase } from "@/integrations/supabase/client";

export const MENTOR_BUCKET = "mentor-verification-docs";
export const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export const YEAR_OPTIONS = [
  { value: "1st", label: "1st Year MBBS" },
  { value: "2nd", label: "2nd Year MBBS" },
  { value: "3rd", label: "3rd Year MBBS" },
  { value: "final", label: "Final Year MBBS" },
  { value: "intern", label: "Intern" },
] as const;

export const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia", "Assamese",
] as const;

export function yearLabel(v: string) {
  return YEAR_OPTIONS.find((y) => y.value === v)?.label ?? v;
}

export type MentorRow = {
  id: string;
  user_id: string;
  full_name: string;
  college_id: string;
  current_year: string;
  photo_url: string | null;
  bio: string | null;
  languages: string[] | null;
  gender: string | null;
  rating: number;
  total_reviews: number;
  total_sessions: number;
  verification_status: string;
  is_active: boolean;
  availability: unknown;
  created_at: string;
  colleges?: { id: string; name: string; state: string; city: string | null } | null;
};

export type PricingRow = {
  session_type: string;
  label: string;
  duration_minutes: number;
  price_inr: number;
  commission_percent: number;
  is_active: boolean;
  sort_order: number;
};

/** Uploads a file to the private mentor bucket and returns a long-lived signed URL. */
export async function uploadMentorFile(userId: string, folder: string, file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(MENTOR_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from(MENTOR_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}
