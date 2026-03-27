import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolRoleSchema, SerializableActionSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const ItemCarouselItemSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    subtitle: Type.Optional(Type.String()),
    image: Type.Optional(Type.String({ format: "uri" })),
    color: Type.Optional(Type.String({ minLength: 1 })),
    actions: Type.Optional(Type.Array(SerializableActionSchema)),
  },
  { additionalProperties: false },
);

export const SerializableItemCarouselSchema = Type.Object(
  {
    id: MiniToolIdSchema,
    role: Type.Optional(MiniToolRoleSchema),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    items: Type.Array(ItemCarouselItemSchema),
  },
  { additionalProperties: false },
);

export type ItemCarouselItem = Static<typeof ItemCarouselItemSchema>;
export type SerializableItemCarousel = Static<typeof SerializableItemCarouselSchema>;

const validateSerializableItemCarousel = ajv.compile<SerializableItemCarousel>(SerializableItemCarouselSchema);

function validateItemCarouselInvariants(payload: SerializableItemCarousel): string | null {
  const seenItemIds = new Set<string>();

  for (const item of payload.items) {
    if (seenItemIds.has(item.id)) {
      return `Duplicate item id: "${item.id}"`;
    }
    seenItemIds.add(item.id);
  }

  return null;
}

export function parseSerializableItemCarousel(input: unknown): SerializableItemCarousel {
  if (!validateSerializableItemCarousel(input)) {
    throw new Error(ajv.errorsText(validateSerializableItemCarousel.errors));
  }

  const invariantError = validateItemCarouselInvariants(input);
  if (invariantError !== null) {
    throw new Error(invariantError);
  }

  return input;
}

export function safeParseSerializableItemCarousel(input: unknown): SerializableItemCarousel | null {
  if (!validateSerializableItemCarousel(input)) {
    return null;
  }

  if (validateItemCarouselInvariants(input) !== null) {
    return null;
  }

  return input;
}
