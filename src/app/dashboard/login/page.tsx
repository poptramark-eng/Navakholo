"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");

    const credentials = new FormData(event.currentTarget);
    const email = String(credentials.get("email") || "").trim().toLowerCase();
    const password = String(credentials.get("password") || "");
    if (!email || !password) {
      setError("Enter your email address and password to continue.");
      return;
    }

    try {
      setLoading(true);
      const request = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const response: { message?: string; error?: string } = await request.json();
      if (!request.ok) throw new Error(response.error || response.message || "Unable to sign in. Check your details and try again.");
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden px-5 py-10 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 size-[28rem] rounded-full bg-accent/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-secondary/70 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_-40px_rgba(20,92,70,0.32)] lg:grid-cols-[1fr_0.92fr]">
        <section className="relative hidden min-h-[610px] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
          <div aria-hidden="true" className="absolute -right-24 top-24 size-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-8 top-40 size-48 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/12 text-sm font-bold">CBE</span>
            <span className="flex flex-col"><span className="text-sm font-semibold">Navakholo</span><span className="text-xs text-white/65">Assessment platform</span></span>
          </div>
          <div className="relative max-w-md pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">Competency-based education</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight">Clearer assessment. Stronger learning.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/75">One secure workspace for assessment coordination, candidate records, marks entry and institutional reporting.</p>
            <div className="mt-9 flex items-center gap-3 border-t border-white/15 pt-5 text-sm text-white/80">
              <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
              <span>Access is scoped to your signed-in account.</span>
            </div>
          </div>
          <p className="relative text-xs text-white/55">Institutional assessment management · Kenya</p>
        </section>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">CBE</span>
            <span className="flex flex-col"><span className="text-sm font-semibold">Navakholo</span><span className="text-xs text-muted-foreground">Assessment platform</span></span>
          </div>
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Secure workspace</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in with your institutional account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email address</label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" name="email" type="email" autoComplete="username" required disabled={loading} placeholder="name@school.ac.ke" className="h-11 pl-10" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={loading} placeholder="Enter your password" className="h-11 px-10" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={loading} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>

            {error && <Alert variant="destructive" role="alert"><AlertTitle>Sign-in unsuccessful</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            <Button type="submit" disabled={loading} className="mt-1 h-11 w-full">
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight aria-hidden="true" data-icon="inline-end" />}
            </Button>
          </form>

          <div className="mt-8 border-t border-border pt-5">
            <p className="text-center text-xs leading-5 text-muted-foreground">Your session is protected with secure, httpOnly authentication.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
