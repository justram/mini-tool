import { describe, expect, it } from "vitest";
import {
  parseSerializableApprovalCard,
  safeParseSerializableApprovalCard,
} from "../../src/mini-tool/approval-card/schema";
import { parseSerializableAudio, safeParseSerializableAudio } from "../../src/mini-tool/audio/schema";
import { parseSerializableChart, safeParseSerializableChart } from "../../src/mini-tool/chart/schema";
import { parseSerializableCitation, safeParseSerializableCitation } from "../../src/mini-tool/citation/schema";
import {
  parseSerializableCitationList,
  safeParseSerializableCitationList,
} from "../../src/mini-tool/citation-list/schema";
import { parseSerializableCodeBlock, safeParseSerializableCodeBlock } from "../../src/mini-tool/code-block/schema";
import { parseSerializableCodeDiff, safeParseSerializableCodeDiff } from "../../src/mini-tool/code-diff/schema";
import { parseSerializableGeoMap, safeParseSerializableGeoMap } from "../../src/mini-tool/geo-map/schema";
import { parseSerializableImage, safeParseSerializableImage } from "../../src/mini-tool/image/schema";
import {
  parseSerializableImageGallery,
  safeParseSerializableImageGallery,
} from "../../src/mini-tool/image-gallery/schema";
import {
  parseSerializableInstagramPost,
  safeParseSerializableInstagramPost,
} from "../../src/mini-tool/instagram-post/schema";
import {
  parseSerializableLinkPreview,
  safeParseSerializableLinkPreview,
} from "../../src/mini-tool/link-preview/schema";
import {
  parseSerializableLinkedInPost,
  safeParseSerializableLinkedInPost,
} from "../../src/mini-tool/linkedin-post/schema";
import {
  parseSerializableMessageDraft,
  safeParseSerializableMessageDraft,
} from "../../src/mini-tool/message-draft/schema";
import { parseSerializableOptionList, safeParseSerializableOptionList } from "../../src/mini-tool/option-list/schema";
import {
  parseSerializableOrderSummary,
  safeParseSerializableOrderSummary,
} from "../../src/mini-tool/order-summary/schema";
import {
  parseSerializableParameterSlider,
  safeParseSerializableParameterSlider,
} from "../../src/mini-tool/parameter-slider/schema";
import { parseSerializablePlan, safeParseSerializablePlan } from "../../src/mini-tool/plan/schema";
import {
  parseSerializablePreferencesPanel,
  parseSerializablePreferencesPanelReceipt,
  safeParseSerializablePreferencesPanel,
  safeParseSerializablePreferencesPanelReceipt,
} from "../../src/mini-tool/preferences-panel/schema";
import {
  parseSerializableProgressTracker,
  safeParseSerializableProgressTracker,
} from "../../src/mini-tool/progress-tracker/schema";
import {
  parseSerializableQuestionFlow,
  safeParseSerializableQuestionFlow,
} from "../../src/mini-tool/question-flow/schema";
import {
  parseSerializableStatsDisplay,
  safeParseSerializableStatsDisplay,
} from "../../src/mini-tool/stats-display/schema";
import { parseSerializableTerminal, safeParseSerializableTerminal } from "../../src/mini-tool/terminal/schema";
import { parseSerializableVideo, safeParseSerializableVideo } from "../../src/mini-tool/video/schema";
import { parseSerializableXPost, safeParseSerializableXPost } from "../../src/mini-tool/x-post/schema";

describe("mini-tool contract parity", () => {
  describe("link-preview", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableLinkPreview({
        id: "lp-1",
        href: "https://example.com",
        title: "Example",
      });

      expect(parsed.id).toBe("lp-1");
      expect(parsed.href).toBe("https://example.com");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableLinkPreview({
        id: "",
        href: "not-a-url",
        title: "",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableLinkPreview({
          id: "",
          href: "not-a-url",
        });
      }).toThrowError();
    });
  });

  describe("option-list", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableOptionList({
        id: "opt-1",
        options: [
          { id: "small", label: "Small" },
          { id: "medium", label: "Medium" },
        ],
        selectionMode: "multi",
        defaultValue: ["small"],
      });

      expect(parsed.id).toBe("opt-1");
      expect(parsed.options).toHaveLength(2);
    });

    it("returns null for invariant failure in safe parse", () => {
      const parsed = safeParseSerializableOptionList({
        id: "opt-2",
        options: [{ id: "small", label: "Small" }],
        minSelections: 2,
        maxSelections: 1,
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate option ids", () => {
      expect(() => {
        parseSerializableOptionList({
          id: "opt-3",
          options: [
            { id: "small", label: "Small" },
            { id: "small", label: "Small duplicate" },
          ],
        });
      }).toThrowError(/Duplicate option id/);
    });

    it("throws when selection references unknown ids", () => {
      expect(() => {
        parseSerializableOptionList({
          id: "opt-4",
          options: [{ id: "small", label: "Small" }],
          defaultValue: ["large"],
        });
      }).toThrowError(/must exist in options/);
    });
  });

  describe("question-flow", () => {
    it("accepts a valid progressive payload", () => {
      const parsed = parseSerializableQuestionFlow({
        id: "question-flow-1",
        step: 1,
        title: "Select a runtime",
        options: [
          { id: "node", label: "Node.js" },
          { id: "bun", label: "Bun" },
        ],
      });

      expect(parsed.id).toBe("question-flow-1");
      expect("step" in parsed).toBe(true);
    });

    it("returns null for duplicate option ids in safe parse", () => {
      const parsed = safeParseSerializableQuestionFlow({
        id: "question-flow-2",
        step: 2,
        title: "Select a runtime",
        options: [
          { id: "node", label: "Node.js" },
          { id: "node", label: "Duplicate" },
        ],
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate upfront step ids", () => {
      expect(() => {
        parseSerializableQuestionFlow({
          id: "question-flow-3",
          steps: [
            {
              id: "language",
              title: "Language",
              options: [{ id: "ts", label: "TypeScript" }],
            },
            {
              id: "language",
              title: "Framework",
              options: [{ id: "lit", label: "Lit" }],
            },
          ],
        });
      }).toThrowError(/Duplicate step id/);
    });
  });

  describe("image", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableImage({
        id: "img-1",
        assetId: "asset-1",
        src: "https://example.com/image.jpg",
        alt: "Example alt",
      });

      expect(parsed.id).toBe("img-1");
      expect(parsed.assetId).toBe("asset-1");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableImage({
        id: "img-2",
        assetId: "asset-2",
        src: "not-a-url",
        alt: "",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableImage({
          id: "img-3",
          assetId: "asset-3",
          src: "not-a-url",
          alt: "",
        });
      }).toThrowError();
    });
  });

  describe("image-gallery", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableImageGallery({
        id: "gallery-1",
        images: [
          {
            id: "img-1",
            src: "https://example.com/one.jpg",
            alt: "Alpine sunrise",
            width: 800,
            height: 600,
          },
        ],
      });

      expect(parsed.id).toBe("gallery-1");
      expect(parsed.images).toHaveLength(1);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableImageGallery({
        id: "gallery-2",
        images: [],
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableImageGallery({
          id: "gallery-3",
          images: [
            {
              id: "img-1",
              src: "not-a-url",
              alt: "Broken",
              width: 100,
              height: 100,
            },
          ],
        });
      }).toThrowError();
    });
  });

  describe("geo-map", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableGeoMap({
        id: "geo-map-1",
        markers: [
          {
            id: "marker-1",
            lat: 37.7749,
            lng: -122.4194,
            label: "San Francisco",
          },
        ],
      });

      expect(parsed.id).toBe("geo-map-1");
      expect(parsed.markers).toHaveLength(1);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableGeoMap({
        id: "geo-map-2",
        markers: [],
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate marker ids", () => {
      expect(() => {
        parseSerializableGeoMap({
          id: "geo-map-3",
          markers: [
            { id: "dup", lat: 40, lng: -74 },
            { id: "dup", lat: 41, lng: -73 },
          ],
        });
      }).toThrowError(/Duplicate marker id/);
    });
  });

  describe("audio", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableAudio({
        id: "audio-1",
        assetId: "asset-audio-1",
        src: "https://example.com/audio.mp3",
        title: "Morning Forest",
      });

      expect(parsed.id).toBe("audio-1");
      expect(parsed.assetId).toBe("asset-audio-1");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableAudio({
        id: "audio-2",
        assetId: "asset-audio-2",
        src: "not-a-url",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableAudio({
          id: "audio-3",
          assetId: "",
          src: "not-a-url",
        });
      }).toThrowError();
    });
  });

  describe("video", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableVideo({
        id: "video-1",
        assetId: "asset-video-1",
        src: "https://example.com/video.mp4",
        ratio: "16:9",
      });

      expect(parsed.id).toBe("video-1");
      expect(parsed.assetId).toBe("asset-video-1");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableVideo({
        id: "video-2",
        assetId: "asset-video-2",
        src: "not-a-url",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableVideo({
          id: "video-3",
          assetId: "",
          src: "not-a-url",
        });
      }).toThrowError();
    });
  });

  describe("terminal", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableTerminal({
        id: "terminal-1",
        command: "pnpm test",
        stdout: "done",
        exitCode: 0,
        maxCollapsedLines: 4,
      });

      expect(parsed.id).toBe("terminal-1");
      expect(parsed.exitCode).toBe(0);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableTerminal({
        id: "terminal-2",
        command: "pnpm build",
        exitCode: -1,
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableTerminal({
          id: "terminal-3",
          command: "pnpm lint",
          exitCode: -2,
        });
      }).toThrowError();
    });
  });

  describe("citation", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableCitation({
        id: "citation-1",
        href: "https://arxiv.org/abs/2303.08774",
        title: "GPT-4 Technical Report",
      });

      expect(parsed.id).toBe("citation-1");
      expect(parsed.title).toBe("GPT-4 Technical Report");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableCitation({
        id: "citation-2",
        href: "not-a-url",
        title: "",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid payload in strict parse", () => {
      expect(() => {
        parseSerializableCitation({
          id: "citation-3",
          href: "not-a-url",
          title: "x",
        });
      }).toThrowError();
    });
  });

  describe("citation-list", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableCitationList({
        id: "citation-list-1",
        variant: "stacked",
        citations: [
          {
            id: "citation-1",
            href: "https://react.dev/reference/react/useState",
            title: "useState – React",
          },
          {
            id: "citation-2",
            href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            title: "JavaScript - MDN Web Docs",
          },
        ],
      });

      expect(parsed.id).toBe("citation-list-1");
      expect(parsed.citations).toHaveLength(2);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableCitationList({
        id: "citation-list-2",
        citations: [],
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate citation ids", () => {
      expect(() => {
        parseSerializableCitationList({
          id: "citation-list-3",
          citations: [
            {
              id: "citation-1",
              href: "https://react.dev/reference/react/useState",
              title: "useState – React",
            },
            {
              id: "citation-1",
              href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
              title: "JavaScript - MDN Web Docs",
            },
          ],
        });
      }).toThrowError(/Duplicate citation id/);
    });
  });

  describe("progress-tracker", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableProgressTracker({
        id: "pt-1",
        steps: [
          { id: "build", label: "Build", status: "completed" },
          { id: "test", label: "Test", status: "in-progress" },
        ],
      });

      expect(parsed.id).toBe("pt-1");
      expect(parsed.steps).toHaveLength(2);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableProgressTracker({
        id: "pt-2",
        steps: [],
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate step ids", () => {
      expect(() => {
        parseSerializableProgressTracker({
          id: "pt-3",
          steps: [
            { id: "build", label: "Build", status: "completed" },
            { id: "build", label: "Build again", status: "pending" },
          ],
        });
      }).toThrowError(/Duplicate step id/);
    });
  });

  describe("approval-card", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableApprovalCard({
        id: "ac-1",
        title: "Deploy to production",
        description: "This publishes the latest release.",
        metadata: [{ key: "Environment", value: "production" }],
      });

      expect(parsed.id).toBe("ac-1");
      expect(parsed.title).toBe("Deploy to production");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableApprovalCard({
        id: "ac-2",
        title: "",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid decision", () => {
      expect(() => {
        parseSerializableApprovalCard({
          id: "ac-3",
          title: "Delete project",
          choice: "maybe",
        });
      }).toThrowError();
    });
  });

  describe("order-summary", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableOrderSummary({
        id: "order-1",
        items: [
          {
            id: "item-1",
            name: "Coffee Beans",
            unitPrice: 24,
            quantity: 2,
          },
        ],
        pricing: {
          subtotal: 48,
          tax: 3.84,
          shipping: 0,
          total: 51.84,
          currency: "USD",
        },
      });

      expect(parsed.id).toBe("order-1");
      expect(parsed.items).toHaveLength(1);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableOrderSummary({
        id: "order-2",
        items: [],
        pricing: {
          subtotal: 10,
          total: 10,
        },
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate item ids", () => {
      expect(() => {
        parseSerializableOrderSummary({
          id: "order-3",
          items: [
            { id: "item-1", name: "A", unitPrice: 10 },
            { id: "item-1", name: "B", unitPrice: 20 },
          ],
          pricing: {
            subtotal: 30,
            total: 30,
          },
        });
      }).toThrowError(/Duplicate item id/);
    });
  });

  describe("stats-display", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableStatsDisplay({
        id: "stats-1",
        title: "Q4 Performance",
        stats: [
          {
            key: "revenue",
            label: "Revenue",
            value: 847300,
            format: { kind: "currency", currency: "USD", decimals: 0 },
            diff: { value: 12.4, decimals: 1 },
            sparkline: { data: [1, 2, 3] },
          },
        ],
      });

      expect(parsed.id).toBe("stats-1");
      expect(parsed.stats).toHaveLength(1);
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableStatsDisplay({
        id: "stats-2",
        stats: [],
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid format payload", () => {
      expect(() => {
        parseSerializableStatsDisplay({
          id: "stats-3",
          stats: [
            {
              key: "rate",
              label: "Rate",
              value: 12,
              format: { kind: "currency" },
            },
          ],
        });
      }).toThrowError();
    });
  });

  describe("chart", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableChart({
        id: "chart-1",
        type: "bar",
        xKey: "month",
        data: [
          { month: "Jan", revenue: 4000, expenses: 2400 },
          { month: "Feb", revenue: 3000, expenses: 1398 },
        ],
        series: [
          { key: "revenue", label: "Revenue" },
          { key: "expenses", label: "Expenses" },
        ],
      });

      expect(parsed.id).toBe("chart-1");
      expect(parsed.series).toHaveLength(2);
    });

    it("returns null when xKey is missing in safe parse", () => {
      const parsed = safeParseSerializableChart({
        id: "chart-2",
        type: "line",
        xKey: "month",
        data: [{ revenue: 4000 }],
        series: [{ key: "revenue", label: "Revenue" }],
      });

      expect(parsed).toBeNull();
    });

    it("throws on duplicate series key", () => {
      expect(() => {
        parseSerializableChart({
          id: "chart-3",
          type: "bar",
          xKey: "month",
          data: [{ month: "Jan", revenue: 4000 }],
          series: [
            { key: "revenue", label: "Revenue" },
            { key: "revenue", label: "Revenue 2" },
          ],
        });
      }).toThrowError(/Duplicate series key/);
    });
  });

  describe("instagram-post", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableInstagramPost({
        id: "ig-1",
        author: {
          name: "Alex Rivera",
          handle: "alexrivera",
          avatarUrl: "https://example.com/avatar.jpg",
          verified: true,
        },
        text: "Golden hour vibes",
        media: [
          {
            type: "image",
            url: "https://example.com/post.jpg",
            alt: "City skyline",
          },
        ],
        stats: { likes: 42 },
        createdAt: "2025-11-05T18:45:00.000Z",
      });

      expect(parsed.id).toBe("ig-1");
      expect(parsed.media?.length).toBe(1);
    });

    it("returns null for invalid media enum in safe parse", () => {
      const parsed = safeParseSerializableInstagramPost({
        id: "ig-2",
        author: {
          name: "Alex Rivera",
          handle: "alexrivera",
          avatarUrl: "https://example.com/avatar.jpg",
        },
        media: [{ type: "gif", url: "https://example.com/post.gif", alt: "Clip" }],
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid author payload in strict parse", () => {
      expect(() => {
        parseSerializableInstagramPost({
          id: "ig-3",
          author: "alexrivera",
        });
      }).toThrowError();
    });
  });

  describe("linkedin-post", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableLinkedInPost({
        id: "li-post-1",
        author: {
          name: "Dr. Sarah Chen",
          avatarUrl: "https://example.com/avatar.jpg",
          headline: "VP Engineering",
        },
        text: "Shipping updates this week",
        stats: { likes: 847 },
      });

      expect(parsed.id).toBe("li-post-1");
      expect(parsed.author.name).toBe("Dr. Sarah Chen");
    });

    it("returns null for invalid author payload in safe parse", () => {
      const parsed = safeParseSerializableLinkedInPost({
        id: "li-post-2",
        author: "invalid",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid media enum in strict parse", () => {
      expect(() => {
        parseSerializableLinkedInPost({
          id: "li-post-3",
          author: {
            name: "Dr. Sarah Chen",
            avatarUrl: "https://example.com/avatar.jpg",
          },
          media: {
            type: "gif",
            url: "https://example.com/demo.gif",
            alt: "Demo",
          },
        });
      }).toThrowError();
    });
  });

  describe("code-block", () => {
    it("applies language and lineNumbers defaults", () => {
      const parsed = parseSerializableCodeBlock({
        id: "code-1",
        code: "console.log('hello')",
      });

      expect(parsed.language).toBe("text");
      expect(parsed.lineNumbers).toBe("visible");
    });

    it("returns null for invalid line number mode in safe parse", () => {
      const parsed = safeParseSerializableCodeBlock({
        id: "code-2",
        code: "print('x')",
        lineNumbers: "auto",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid highlight line payload", () => {
      expect(() => {
        parseSerializableCodeBlock({
          id: "code-3",
          code: "x",
          highlightLines: [0],
        });
      }).toThrowError();
    });
  });

  describe("code-diff", () => {
    it("applies defaults for language, lineNumbers, and diffStyle", () => {
      const parsed = parseSerializableCodeDiff({
        id: "diff-1",
        oldCode: "const a = 1",
        newCode: "const a = 2",
      });

      expect(parsed.language).toBe("text");
      expect(parsed.lineNumbers).toBe("visible");
      expect(parsed.diffStyle).toBe("unified");
    });

    it("rejects payloads that mix patch mode and file mode", () => {
      const parsed = safeParseSerializableCodeDiff({
        id: "diff-2",
        patch: "@@ -1 +1 @@\n-a\n+b",
        oldCode: "a",
      });

      expect(parsed).toBeNull();
    });

    it("throws when no mode input is provided", () => {
      expect(() => {
        parseSerializableCodeDiff({
          id: "diff-3",
          language: "typescript",
        });
      }).toThrowError();
    });
  });

  describe("x-post", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableXPost({
        id: "x-post-1",
        author: {
          name: "Athia Zohra",
          handle: "athiazohra",
          avatarUrl: "https://images.unsplash.com/photo-1753288695169-e51f5a3ff24f?w=200&h=200&fit=crop",
        },
        text: "A compact post payload",
        stats: { likes: 5 },
      });

      expect(parsed.id).toBe("x-post-1");
      expect(parsed.author.handle).toBe("athiazohra");
    });

    it("returns null for invalid avatar url in safe parse", () => {
      const parsed = safeParseSerializableXPost({
        id: "x-post-2",
        author: {
          name: "Athia Zohra",
          handle: "athiazohra",
          avatarUrl: "invalid-url",
        },
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid media payload in strict parse", () => {
      expect(() => {
        parseSerializableXPost({
          id: "x-post-3",
          author: {
            name: "Athia Zohra",
            handle: "athiazohra",
            avatarUrl: "https://example.com/avatar.png",
          },
          media: {
            type: "image",
            url: "https://example.com/photo.png",
            alt: "",
          },
        });
      }).toThrowError();
    });
  });

  describe("message-draft", () => {
    it("accepts a valid email payload", () => {
      const parsed = parseSerializableMessageDraft({
        id: "message-draft-1",
        channel: "email",
        subject: "Draft",
        to: ["sarah@acme.dev"],
        body: "hello",
      });

      expect(parsed.id).toBe("message-draft-1");
      expect(parsed.channel).toBe("email");
    });

    it("returns null for invalid payload in safe parse", () => {
      const parsed = safeParseSerializableMessageDraft({
        id: "message-draft-2",
        channel: "email",
        to: [],
        body: "",
      });

      expect(parsed).toBeNull();
    });

    it("throws for invalid slack target in strict parse", () => {
      expect(() => {
        parseSerializableMessageDraft({
          id: "message-draft-3",
          channel: "slack",
          target: { type: "channel", name: "" },
          body: "message",
        });
      }).toThrowError();
    });
  });

  describe("parameter-slider", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializableParameterSlider({
        id: "slider-1",
        sliders: [
          {
            id: "exposure",
            label: "Exposure",
            min: -3,
            max: 3,
            value: 0,
            step: 0.1,
            precision: 1,
            unit: "EV",
          },
        ],
      });

      expect(parsed.id).toBe("slider-1");
      expect(parsed.sliders[0]?.id).toBe("exposure");
    });

    it("returns null for duplicate ids in safe parse", () => {
      const parsed = safeParseSerializableParameterSlider({
        id: "slider-2",
        sliders: [
          { id: "gain", label: "Gain", min: -12, max: 12, value: 0 },
          { id: "gain", label: "Gain duplicate", min: -12, max: 12, value: 2 },
        ],
      });

      expect(parsed).toBeNull();
    });

    it("throws when slider value is outside range", () => {
      expect(() => {
        parseSerializableParameterSlider({
          id: "slider-3",
          sliders: [
            {
              id: "contrast",
              label: "Contrast",
              min: 0,
              max: 100,
              value: 120,
            },
          ],
        });
      }).toThrowError(/within \[min, max\]/);
    });
  });

  describe("plan", () => {
    it("accepts a valid payload", () => {
      const parsed = parseSerializablePlan({
        id: "plan-1",
        title: "Launch checklist",
        todos: [
          { id: "todo-1", label: "Cut release", status: "completed" },
          { id: "todo-2", label: "Publish changelog", status: "pending" },
        ],
      });

      expect(parsed.id).toBe("plan-1");
      expect(parsed.todos).toHaveLength(2);
    });

    it("returns null on duplicate todo ids in safe parse", () => {
      const parsed = safeParseSerializablePlan({
        id: "plan-2",
        title: "Bad todos",
        todos: [
          { id: "todo-1", label: "A", status: "pending" },
          { id: "todo-1", label: "B", status: "completed" },
        ],
      });

      expect(parsed).toBeNull();
    });

    it("throws on empty todo label in strict parse", () => {
      expect(() => {
        parseSerializablePlan({
          id: "plan-3",
          title: "Invalid",
          todos: [{ id: "todo-1", label: "", status: "pending" }],
        });
      }).toThrowError();
    });
  });

  describe("preferences-panel", () => {
    it("accepts a valid editable payload", () => {
      const parsed = parseSerializablePreferencesPanel({
        id: "prefs-1",
        title: "Automation Settings",
        sections: [
          {
            heading: "Task Rules",
            items: [
              { id: "auto-assign", label: "Auto Assign", type: "switch", defaultChecked: true },
              {
                id: "priority",
                label: "Priority",
                type: "select",
                selectOptions: [
                  { value: "critical", label: "Critical" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                  { value: "backlog", label: "Backlog" },
                ],
              },
            ],
          },
        ],
      });

      expect(parsed.id).toBe("prefs-1");
      expect(parsed.sections).toHaveLength(1);
    });

    it("accepts a valid receipt payload", () => {
      const parsed = parseSerializablePreferencesPanelReceipt({
        id: "prefs-2",
        title: "Automation Settings",
        sections: [
          {
            items: [
              { id: "auto-assign", label: "Auto Assign", type: "switch", defaultChecked: true },
              {
                id: "timing",
                label: "Timing",
                type: "toggle",
                options: [
                  { value: "instant", label: "Instant" },
                  { value: "daily", label: "Daily" },
                ],
              },
            ],
          },
        ],
        choice: {
          "auto-assign": false,
          timing: "daily",
        },
      });

      expect(parsed.choice.timing).toBe("daily");
    });

    it("returns null for invalid editable payload in safe parse", () => {
      const parsed = safeParseSerializablePreferencesPanel({
        id: "prefs-3",
        sections: [
          {
            items: [
              {
                id: "priority",
                label: "Priority",
                type: "select",
                selectOptions: [{ value: "high", label: "High" }],
              },
            ],
          },
        ],
      });

      expect(parsed).toBeNull();
    });

    it("returns null for invalid receipt payload in safe parse", () => {
      const parsed = safeParseSerializablePreferencesPanelReceipt({
        id: "prefs-4",
        sections: [],
        choice: {},
      });

      expect(parsed).toBeNull();
    });
  });
});
