"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const { resetPassword, isLoading, error } = useAuthActions();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    try {
      await resetPassword(data.email);
      setSent(true);
    } catch {
      /* shown via error state */
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-signal-green/30 bg-signal-green/10 p-4">
        <p className="text-sm text-foreground">
          Check your inbox. If that email has an account, we&apos;ve sent a link to reset the password.
        </p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-violet-glow hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <p className="text-xs text-signal-red">{errors.email.message}</p>}
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <Button type="submit" size="lg" disabled={isLoading}>
        {isLoading ? "Sending…" : "Send reset link"}
      </Button>

      <Link href="/login" className="text-center text-sm text-steel/50 hover:text-steel">
        Back to sign in
      </Link>
    </form>
  );
}
