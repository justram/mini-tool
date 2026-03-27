import { type Static, Type } from "@sinclair/typebox";
import { ajv } from "../../shared/validator.js";

export const LinkedInPostAuthorSchema = Type.Object({
  name: Type.String(),
  avatarUrl: Type.String(),
  headline: Type.Optional(Type.String()),
});

export const LinkedInPostMediaSchema = Type.Object({
  type: Type.Union([Type.Literal("image"), Type.Literal("video")]),
  url: Type.String(),
  alt: Type.String(),
});

export const LinkedInPostLinkPreviewSchema = Type.Object({
  url: Type.String(),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  imageUrl: Type.Optional(Type.String()),
  domain: Type.Optional(Type.String()),
});

export const LinkedInPostStatsSchema = Type.Object({
  likes: Type.Optional(Type.Number()),
  isLiked: Type.Optional(Type.Boolean()),
});

export const SerializableLinkedInPostSchema = Type.Object({
  id: Type.String(),
  author: LinkedInPostAuthorSchema,
  text: Type.Optional(Type.String()),
  media: Type.Optional(LinkedInPostMediaSchema),
  linkPreview: Type.Optional(LinkedInPostLinkPreviewSchema),
  stats: Type.Optional(LinkedInPostStatsSchema),
  createdAt: Type.Optional(Type.String()),
});

export type LinkedInPostAuthor = Static<typeof LinkedInPostAuthorSchema>;
export type LinkedInPostMedia = Static<typeof LinkedInPostMediaSchema>;
export type LinkedInPostLinkPreview = Static<typeof LinkedInPostLinkPreviewSchema>;
export type LinkedInPostStats = Static<typeof LinkedInPostStatsSchema>;
export type SerializableLinkedInPost = Static<typeof SerializableLinkedInPostSchema>;

const validateSerializableLinkedInPost = ajv.compile<SerializableLinkedInPost>(SerializableLinkedInPostSchema);

export function parseSerializableLinkedInPost(input: unknown): SerializableLinkedInPost {
  if (!validateSerializableLinkedInPost(input)) {
    throw new Error(ajv.errorsText(validateSerializableLinkedInPost.errors));
  }

  return input;
}

export function safeParseSerializableLinkedInPost(input: unknown): SerializableLinkedInPost | null {
  if (!validateSerializableLinkedInPost(input)) {
    return null;
  }

  return input;
}
