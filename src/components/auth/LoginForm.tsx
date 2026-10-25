"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { readNext, withNext } from "@/lib/nextUrl";
import { useState } from "react";

export function LoginForm() {
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
  const { loginWithEmail, loginWithGoogle, isLoading, error } = useAuthActions();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    try {
      await loginWithEmail(data.email, data.password);
      router.push(readNext() ?? "/feed");
    } catch {
      /* the error message is shown from the hook's error state */
    }
  }

  async function onGoogle() {
    try {
      await loginWithGoogle();
      router.push(readNext() ?? "/feed");
    } catch {
      /* shown via error state */
    }
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-violet-glow hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-signal-red">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <Button type="submit" size="lg" disabled={isLoading} className="mt-1">
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-steel/50">
        New to PlayConnect?{" "}
        <Link href={withNext("/signup", next)} className="font-medium text-violet-glow hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
