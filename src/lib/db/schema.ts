// Database tables. After changing this file, run `npm run db:generate` to
// create a migration in drizzle/. While preview and production share one
// database, only add tables or columns; never rename or drop them.
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { DIETS, type IngredientLine, type MakeAheadTask } from "../recipes/types";

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** "file" = loaded from seed-recipes/, "app" = added in the app. */
  origin: text("origin", { enum: ["file", "app"] }).notNull(),
  fileSlug: text("file_slug").unique(),
  /** A file recipe changed in the app; reloading files leaves it alone. */
  editedInApp: boolean("edited_in_app").notNull().default(false),
  isTemplate: boolean("is_template").notNull().default(false),
  title: text("title").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  servings: integer("servings").notNull(),
  timeTotalMin: integer("time_total_min").notNull(),
  timeActiveMin: integer("time_active_min"),
  cuisine: text("cuisine").notNull(),
  diet: text("diet", { enum: DIETS }).notNull(),
  mainProtein: text("main_protein"),
  freezerFriendly: boolean("freezer_friendly").notNull(),
  goodAsLeftovers: boolean("good_as_leftovers").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  ingredients: jsonb("ingredients").$type<IngredientLine[]>().notNull(),
  instructions: jsonb("instructions").$type<string[]>().notNull(),
  makeAhead: jsonb("make_ahead").$type<MakeAheadTask[]>().notNull(),
  notes: text("notes"),
  isFavourite: boolean("is_favourite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RecipeRow = typeof recipes.$inferSelect;
