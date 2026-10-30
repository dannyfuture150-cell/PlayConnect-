import { z } from "zod";

export const editProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(40),
  bio: z.string().max(280, "Bio must be 280 characters or fewer").optional().default(""),
  platform: z.enum(["PC", "PlayStation", "Xbox", "Mobile", "Switch"]),
  favoriteGames: z.array(z.string()).min(1, "Pick at least one game").max(8),
  efootballId: z.string().max(40).optional().or(z.literal("")),
  eaFcId: z.string().max(40).optional().or(z.literal("")),
  mkId: z.string().max(40).optional().or(z.literal("")),
  bloodStrikeId: z.string().max(40).optional().or(z.literal("")),
  efootballPlatform: z.enum(["PC", "PlayStation", "Xbox", "Mobile", "Switch"]).optional().or(z.literal("")),
  eaFcPlatform: z.enum(["PC", "PlayStation", "Xbox", "Mobile", "Switch"]).optional().or(z.literal("")),
  mkPlatform: z.enum(["PC", "PlayStation", "Xbox", "Mobile", "Switch"]).optional().or(z.literal("")),
  bloodStrikePlatform: z.enum(["PC", "PlayStation", "Xbox", "Mobile", "Switch"]).optional().or(z.literal("")),
  discordUsername: z.string().max(40).optional().or(z.literal("")),
  twitchUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  youtubeUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  tiktokUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;

export const createPostSchema = z.object({
  text: z.string().max(2000, "Posts must be 2000 characters or fewer"),
  gameTag: z.string().max(40).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty").max(500),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
