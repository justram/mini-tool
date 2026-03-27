import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";
import { CitationVariantSchema, SerializableCitationSchema } from "../citation/schema.js";

export const SerializableCitationListSchema = Type.Object({
  id: MiniToolIdSchema,
  citations: Type.Array(SerializableCitationSchema, { minItems: 1 }),
  variant: Type.Optional(CitationVariantSchema),
  maxVisible: Type.Optional(Type.Number({ minimum: 1 })),
});

export type SerializableCitationList = Static<typeof SerializableCitationListSchema>;

const validateSerializableCitationList = ajv.compile<SerializableCitationList>(SerializableCitationListSchema);

function assertCitationListInvariants(payload: SerializableCitationList): void {
  const ids = new Set<string>();

  for (const citation of payload.citations) {
    if (ids.has(citation.id)) {
      throw new Error(`Duplicate citation id '${citation.id}' in citation list payload.`);
    }
    ids.add(citation.id);
  }
}

export function parseSerializableCitationList(input: unknown): SerializableCitationList {
  if (!validateSerializableCitationList(input)) {
    throw new Error(ajv.errorsText(validateSerializableCitationList.errors));
  }

  assertCitationListInvariants(input);
  return input;
}

export function safeParseSerializableCitationList(input: unknown): SerializableCitationList | null {
  if (!validateSerializableCitationList(input)) {
    return null;
  }

  try {
    assertCitationListInvariants(input);
    return input;
  } catch {
    return null;
  }
}
