import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
const signupSchema = loginSchema.extend({
  confirm: z.string().min(6),
}).refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
const forgotSchema = z.object({ email: z.string().email() });

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen gradient-soft flex flex-col items-center justify-center px-5 py-8">
      <Link to="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary shadow-card">
          <span className="text-xl font-extrabold text-primary-foreground">Q</span>
        </div>
        <span className="text-2xl font-bold tracking-tight">Quero</span>
      </Link>

      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-elevated">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "login" && <LoginForm onSwitch={setMode} />}
            {mode === "signup" && <SignupForm onSwitch={setMode} />}
            {mode === "forgot" && <ForgotForm onSwitch={setMode} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function GoogleButton() {
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };
  return (
    <button
      type="button"
      onClick={handleGoogle}
      className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted transition"
    >
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.4 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6c1.9-5.6 7.2-9.8 13.6-9.8z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.8-6C1 16.9 0 20.3 0 24s1 7.1 2.6 10.2l7.8-5.5z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6.4 0-11.7-4.2-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
      Continue with Google
    </button>
  );
}

function LoginForm({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-1">Login</h1>
      <p className="text-center text-sm text-muted-foreground mb-6">Welcome back to Quero</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" placeholder="you@example.com" className="input" />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input {...register("password")} type={showPw ? "text" : "password"} className="input pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <button type="button" onClick={() => onSwitch("forgot")} className="text-xs text-primary font-medium">
          Forgot password?
        </button>
        <PrimaryButton disabled={busy}>{busy ? "Signing in..." : "Login"}</PrimaryButton>
      </form>
      <Divider />
      <GoogleButton />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button onClick={() => onSwitch("signup")} className="text-primary font-semibold">Sign Up</button>
      </p>
    </div>
  );
}

function SignupForm({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your inbox to verify your email.");
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-1">Sign Up</h1>
      <p className="text-center text-sm text-muted-foreground mb-6">Start your NEET journey</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" placeholder="you@example.com" className="input" />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input {...register("password")} type={showPw ? "text" : "password"} className="input pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password" error={errors.confirm?.message}>
          <input {...register("confirm")} type={showPw ? "text" : "password"} className="input" />
        </Field>
        <PrimaryButton disabled={busy}>{busy ? "Creating..." : "Create Account"}</PrimaryButton>
      </form>
      <Divider />
      <GoogleButton />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <button onClick={() => onSwitch("login")} className="text-primary font-semibold">Login</button>
      </p>
    </div>
  );
}

function ForgotForm({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(forgotSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent — check your email.");
  });
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft"><Mail className="text-primary" /></div>
      </div>
      <h1 className="text-2xl font-bold text-center mb-1">Reset password</h1>
      <p className="text-center text-sm text-muted-foreground mb-6">We'll email you a reset link</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" className="input" />
        </Field>
        <PrimaryButton disabled={busy}>{busy ? "Sending..." : "Send reset link"}</PrimaryButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <button onClick={() => onSwitch("login")} className="text-primary font-semibold">Back to login</button>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
function PrimaryButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-2xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60 transition"
    >
      {children}
    </button>
  );
}
function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
    </div>
  );
}
