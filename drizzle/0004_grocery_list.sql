CREATE TABLE "grocery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bought_at" timestamp with time zone
);
--> statement-breakpoint
-- Items added by hand on a week's shopping list move to the household grocery list (copied; the old data stays).
INSERT INTO "grocery_items" ("id", "text", "added_at", "bought_at")
SELECT e.key::uuid, e.value->>'text', coalesce((e.value->>'addedAt')::timestamptz, now()),
  CASE WHEN wp."shopping"->'bought'->>('extra:' || e.key) IS NOT NULL THEN now() END
FROM "week_plans" wp, jsonb_each(coalesce(wp."shopping"->'extra', '{}'::jsonb)) e
ON CONFLICT ("id") DO NOTHING;
