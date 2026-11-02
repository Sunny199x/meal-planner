CREATE TABLE "liked_combinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_ids" jsonb NOT NULL,
	"week_start" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
