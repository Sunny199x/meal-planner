CREATE TABLE "week_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"setup" jsonb NOT NULL,
	"dishes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"choosing_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "week_plans_week_start_unique" UNIQUE("week_start")
);
