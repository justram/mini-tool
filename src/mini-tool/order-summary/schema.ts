import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const OrderItemSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    imageUrl: Type.Optional(Type.String({ format: "uri" })),
    quantity: Type.Optional(Type.Integer({ minimum: 1 })),
    unitPrice: Type.Number(),
  },
  { additionalProperties: false },
);

export const PricingSchema = Type.Object(
  {
    subtotal: Type.Number(),
    tax: Type.Optional(Type.Number()),
    taxLabel: Type.Optional(Type.String()),
    shipping: Type.Optional(Type.Number()),
    discount: Type.Optional(Type.Number({ minimum: 0 })),
    discountLabel: Type.Optional(Type.String()),
    total: Type.Number(),
    currency: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const OrderSummaryVariantSchema = Type.Union([Type.Literal("summary"), Type.Literal("receipt")]);

export const OrderDecisionSchema = Type.Object(
  {
    action: Type.Literal("confirm"),
    orderId: Type.Optional(Type.String()),
    confirmedAt: Type.Optional(Type.String({ format: "date-time" })),
  },
  { additionalProperties: false },
);

export const SerializableOrderSummarySchema = Type.Object(
  {
    id: MiniToolIdSchema,
    role: Type.Optional(MiniToolRoleSchema),
    title: Type.Optional(Type.String()),
    variant: Type.Optional(OrderSummaryVariantSchema),
    items: Type.Array(OrderItemSchema, { minItems: 1 }),
    pricing: PricingSchema,
    choice: Type.Optional(OrderDecisionSchema),
  },
  { additionalProperties: false },
);

export type OrderItem = Static<typeof OrderItemSchema>;
export type Pricing = Static<typeof PricingSchema>;
export type OrderSummaryVariant = Static<typeof OrderSummaryVariantSchema>;
export type OrderDecision = Static<typeof OrderDecisionSchema>;
export type SerializableOrderSummary = Static<typeof SerializableOrderSummarySchema>;

const validateSerializableOrderSummary = ajv.compile<SerializableOrderSummary>(SerializableOrderSummarySchema);

function validateOrderSummaryInvariants(payload: SerializableOrderSummary): string | null {
  const seenItemIds = new Set<string>();

  for (const item of payload.items) {
    if (seenItemIds.has(item.id)) {
      return `Duplicate item id: "${item.id}"`;
    }
    seenItemIds.add(item.id);
  }

  if (payload.variant === "receipt" && payload.choice === undefined) {
    return 'Receipt variant requires "choice".';
  }

  if (payload.variant === "summary" && payload.choice !== undefined) {
    return 'Summary variant cannot include "choice".';
  }

  return null;
}

export function parseSerializableOrderSummary(input: unknown): SerializableOrderSummary {
  if (!validateSerializableOrderSummary(input)) {
    throw new Error(ajv.errorsText(validateSerializableOrderSummary.errors));
  }

  const invariantError = validateOrderSummaryInvariants(input);
  if (invariantError) {
    throw new Error(invariantError);
  }

  return input;
}

export function safeParseSerializableOrderSummary(input: unknown): SerializableOrderSummary | null {
  if (!validateSerializableOrderSummary(input)) {
    return null;
  }

  if (validateOrderSummaryInvariants(input) !== null) {
    return null;
  }

  return input;
}
