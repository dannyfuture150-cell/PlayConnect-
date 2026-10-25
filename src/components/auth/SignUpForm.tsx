"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { readNext, withNext } from "@/lib/nextUrl";
import { useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const { user: signedInUser, profile: signedInProfile, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && signedInUser && signedInProfile?.onboardingComplete) {
      // Come back to the link they were opening (e.g. a shared tournament), not always the feed.
      router.replace(readNext() ?? "/feed");
    }
  }, [authLoading, signedInUser, signedInProfile, router]);
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => setNext(readNext()), []);
  // A friend's invite link (?ref=username): remember it until onboarding asks "how did you know PlayConnect?".
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) localStorage.setItem("playconnect-ref", ref.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30));
    } catch {}
  }, []);
  const { signUpWithEmail, loginWithGoogle, isLoading, error } = useAuthActions();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(data: SignUpInput) {
    try {
      await signUpWithEmail(data.email, data.password);
      router.push(withNext("/onboarding", readNext()));
    } catch {
      /* shown via error state */
    }
  }

  async function onGoogle() {
    try {
      await loginWithGoogle();
    } catch {
      return;
    }
    // Returning users go straight in; brand-new ones are sent to onboarding
    // by the guard on the main app.
    router.push(readNext() ?? "/feed");
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton onClick={onGoogle} isLoading={isLoading} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-muted" />
        <span className="text-xs uppercase tracking-widest text-steel/40">or</span>
        <div className="h-px flex-1 bg-muted" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-signal-red">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="At least 6 characters" {...register("password")} />
          {errors.password && <p className="text-xs text-signal-red">{errors.password.message}</p>}
        </div>


        {error && <p className="text-sm text-signal-red">{error}</p>}

        <Button type="submit" size="lg" disabled={isLoading} className="mt-1">
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-[11px] text-steel/50">By signing up you agree to our <a href="/privacy" className="underline">Privacy Policy</a>.</p>
      </form>

      <p className="text-center text-sm text-steel/50">
        Already playing?{" "}
        <Link href={withNext("/login", next)} className="font-medium text-violet-glow hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
