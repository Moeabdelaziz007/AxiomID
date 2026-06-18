import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const axiomCatalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string().optional() }),
      description: "A card container for grouped information",
    },
    LinkItem: {
      props: z.object({
        label: z.string(),
        href: z.string(),
        icon: z.enum(["fingerprint", "clipboard", "none"]).optional(),
        color: z.enum(["neon-green", "electric-blue", "default"]).optional(),
      }),
      description: "A clickable link item with an optional leading icon and themed hover color",
    },
    Heading: {
      props: z.object({ text: z.string(), level: z.enum(["h1", "h2", "h3"]).optional() }),
      description: "A heading element",
    },
    Button: {
      props: z.object({ label: z.string(), action: z.string().optional() }),
      description: "A clickable button",
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
      }),
      description: "Display a metric value",
    },
  },
  actions: {
    refresh_data: { description: "Refresh dashboard data" },
  },
});
