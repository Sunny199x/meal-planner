CREATE TABLE "prep_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"days" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
