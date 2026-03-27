import { type Static, Type } from "@sinclair/typebox";
import { ajv } from "../../shared/validator.js";

export const InstagramPostAuthorSchema = Type.Object({
  name: Type.String(),
  handle: Type.String(),
  avatarUrl: Type.String(),
  verified: Type.Optional(Type.Boolean()),
});

export const InstagramPostMediaSchema = Type.Object({
  type: Type.Union([Type.Literal("image"), Type.Literal("video")]),
  url: Type.String(),
  alt: Type.String(),
});

export const InstagramPostStatsSchema = Type.Object({
  likes: Type.Optional(Type.Number()),
  isLiked: Type.Optional(Type.Boolean()),
});

export const SerializableInstagramPostSchema = Type.Object({
  id: Type.String(),
  author: InstagramPostAuthorSchema,
  text: Type.Optional(Type.String()),
  media: Type.Optional(Type.Array(InstagramPostMediaSchema)),
  stats: Type.Optional(InstagramPostStatsSchema),
  createdAt: Type.Optional(Type.String()),
});

export type InstagramPostAuthor = Static<typeof InstagramPostAuthorSchema>;
export type InstagramPostMedia = Static<typeof InstagramPostMediaSchema>;
export type InstagramPostStats = Static<typeof InstagramPostStatsSchema>;
export type SerializableInstagramPost = Static<typeof SerializableInstagramPostSchema>;

const validateSerializableInstagramPost = ajv.compile<SerializableInstagramPost>(SerializableInstagramPostSchema);

export function parseSerializableInstagramPost(input: unknown): SerializableInstagramPost {
  if (!validateSerializableInstagramPost(input)) {
    throw new Error(ajv.errorsText(validateSerializableInstagramPost.errors));
  }

  return input;
}

export function safeParseSerializableInstagramPost(input: unknown): SerializableInstagramPost | null {
  if (!validateSerializableInstagramPost(input)) {
    return null;
  }

  return input;
}
