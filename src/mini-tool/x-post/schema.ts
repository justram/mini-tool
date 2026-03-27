import { type Static, Type } from "@sinclair/typebox";
import { ajv } from "../../shared/validator.js";

export const XPostAuthorSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  handle: Type.String({ minLength: 1 }),
  avatarUrl: Type.String({ format: "uri" }),
  verified: Type.Optional(Type.Boolean()),
});

export const XPostMediaSchema = Type.Object({
  type: Type.Union([Type.Literal("image"), Type.Literal("video")]),
  url: Type.String({ format: "uri" }),
  alt: Type.String({ minLength: 1 }),
  aspectRatio: Type.Optional(
    Type.Union([Type.Literal("1:1"), Type.Literal("4:3"), Type.Literal("16:9"), Type.Literal("9:16")]),
  ),
});

export const XPostLinkPreviewSchema = Type.Object({
  url: Type.String({ format: "uri" }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  imageUrl: Type.Optional(Type.String({ format: "uri" })),
  domain: Type.Optional(Type.String()),
});

export const XPostStatsSchema = Type.Object({
  likes: Type.Optional(Type.Number()),
  isLiked: Type.Optional(Type.Boolean()),
  isReposted: Type.Optional(Type.Boolean()),
  isBookmarked: Type.Optional(Type.Boolean()),
});

export const SerializableXPostSchema = Type.Recursive((Self) =>
  Type.Object({
    id: Type.String({ minLength: 1 }),
    author: XPostAuthorSchema,
    text: Type.Optional(Type.String()),
    media: Type.Optional(XPostMediaSchema),
    linkPreview: Type.Optional(XPostLinkPreviewSchema),
    quotedPost: Type.Optional(Self),
    stats: Type.Optional(XPostStatsSchema),
    createdAt: Type.Optional(Type.String()),
  }),
);

export type XPostAuthor = Static<typeof XPostAuthorSchema>;
export type XPostMedia = Static<typeof XPostMediaSchema>;
export type XPostLinkPreview = Static<typeof XPostLinkPreviewSchema>;
export type XPostStats = Static<typeof XPostStatsSchema>;
export type SerializableXPost = Static<typeof SerializableXPostSchema>;

const validateSerializableXPost = ajv.compile<SerializableXPost>(SerializableXPostSchema);

export function parseSerializableXPost(input: unknown): SerializableXPost {
  if (!validateSerializableXPost(input)) {
    throw new Error(ajv.errorsText(validateSerializableXPost.errors));
  }

  return input;
}

export function safeParseSerializableXPost(input: unknown): SerializableXPost | null {
  if (!validateSerializableXPost(input)) {
    return null;
  }

  return input;
}
