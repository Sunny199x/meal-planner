// Database tables. After changing this file, run `npm run db:generate` to
// create a migration in drizzle/. While preview and production share one
// database, only add tables or columns; never rename or drop them.
import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { PlannedDish, PrepState, ShoppingState, WeekSetup } from "../plan/types";
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
  /** Changes whenever the photo is added or replaced (so phones fetch the new one); null = no photo. */
  photoVersion: text("photo_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RecipeRow = typeof recipes.$inferSelect;

/**
 * One photo per recipe, shrunk on the phone before upload (or taken from the
 * recipe's website). Stored as base64 text: the hosted and local databases
 * return binary columns differently, text behaves the same in both.
 */
export const recipePhotos = pgTable("recipe_photos", {
  recipeId: uuid("recipe_id")
    .primaryKey()
    .references(() => recipes.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(),
  source: text("source", { enum: ["upload", "website", "video"] }).notNull(),
  sourceUrl: text("source_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per week, named by its Sunday (weeks before 31 October 2026: by their Monday). */
export const weekPlans = pgTable("week_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekStart: date("week_start", { mode: "string" }).notNull().unique(),
  setup: jsonb("setup").$type<WeekSetup>().notNull(),
  dishes: jsonb("dishes").$type<PlannedDish[]>().notNull().default([]),
  /** When choosing dinners started, to see how long agreeing on a week takes. */
  choosingStartedAt: timestamp("choosing_started_at", { withTimezone: true }),
  /** Shopping-list ticks and items added by hand. */
  shopping: jsonb("shopping").$type<ShoppingState>().notNull().default({}),
  /** Sunday prep tasks ticked off. */
  prep: jsonb("prep").$type<PrepState>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WeekPlanRow = typeof weekPlans.$inferSelect;

/**
 * The household grocery list: things added by hand on any day ("milk").
 * The planned weeks' ingredients join them on the list but are stored with
 * each week (`week_plans.shopping`).
 */
export const groceryItems = pgTable("grocery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  /** Set when ticked as bought; bought items stay until "Clear bought items". */
  boughtAt: timestamp("bought_at", { withTimezone: true }),
});

export type GroceryItemRow = typeof groceryItems.$inferSelect;

/**
 * How far ahead a make-ahead task may be done, as the household set it, by
 * task name (matched like shared prep). See src/lib/plan/food-safety.ts.
 */
export const prepLimits = pgTable("prep_limits", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  /** At most this many days before the dinner; 0 = on the day itself. */
  days: integer("days").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
