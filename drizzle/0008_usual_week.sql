CREATE TABLE "household_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"usual_week" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
