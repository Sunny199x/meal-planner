CREATE TABLE "suggestion_events" (
	"week_start" date NOT NULL,
	"recipe_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suggestion_events_week_start_recipe_id_kind_pk" PRIMARY KEY("week_start","recipe_id","kind")
);
--> statement-breakpoint
ALTER TABLE "week_plans" ADD COLUMN "dismissed" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestion_events" ADD CONSTRAINT "suggestion_events_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;