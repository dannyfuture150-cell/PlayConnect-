import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const onboardingSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or fewer")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
  displayName: z.string().max(40).optional(),
  platform: z.enum(["PC", "PlayStation", "Xbox", "Mobile", "Switch"]),
  favoriteGames: z.array(z.string()).min(1, "Pick at least one game").max(8),
  bio: z.string().max(280, "Bio must be 280 characters or fewer").optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
