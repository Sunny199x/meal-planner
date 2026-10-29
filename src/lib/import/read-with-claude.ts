// Reads a recipe from text in any language with Claude, which returns it in the
// app's format: English, metric units, one ingredient per line. Server-side only
// (it needs ANTHROPIC_API_KEY). The suggestion rules never use Claude; this only
// reads recipes, and the review screen says so.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ImportDraft } from "./normalise";

/** The cheapest current model, chosen by Saketh for reading and translating recipes. */
export const READER_MODEL = "claude-haiku-5-5";
export const MAX_RECIPE_TEXT = 60_000;

const ReadRecipe = z.object({
  isRecipe: z.boolean(),
  language: z.string(),
  title: z.string(),
  servings: z.number().nullable(),
  totalMinutes: z.number().nullable(),
  activeMinutes: z.number().nullable(),
  cuisine: z.string().nullable(),
  mainProtein: z.string().nullable(),
  ingredients: z.array(z.object({ group: z.string().nullable(), line: z.string() })),
  steps: z.array(z.string()),
  notes: z.string().nullable(),
  checks: z.array(z.string()),
  seafood: z.array(z.string()),
});
export type ReadRecipe = z.infer<typeof ReadRecipe>;

const INSTRUCTIONS = `You read one recipe and write it out for a household's recipe app in Stockholm. They will check your version against the original before saving it.

- Write everything in English with UK spelling and the names used in a UK or Swedish kitchen (coriander, aubergine, courgette, spring onion, beef mince, double cream). Translate from any language, and set "language" to the language the recipe was written in.
- Use metric units only: g, kg, ml, dl, l, tsp, tbsp, or a plain count. Convert cups, glasses, ounces, pounds and local measures (for example a Russian стакан, a Romanian cană, a Hindi katori) to ml or g. When the size of a measure varies, use a common size and add a short note to "checks", such as "A glass was taken as 200 ml."
- One ingredient per line: amount, unit, ingredient, then any note after a comma. Examples: "150 g basmati rice", "2 garlic cloves, grated", "1 can chopped tomatoes (400 g)", "salt, to taste", "½ red chilli (optional)". Put ingredient groups such as "For the sauce" in "group".
- Keep the amounts for the number of servings the recipe states. Do not scale.
- One step per item in "steps", translated, with temperatures in °C.
- Only use what the text says. If servings, times, cuisine or main protein aren't stated, use null; you may give the cuisine when the dish name makes it plain (for example, pad thai is Thai).
- Do not add storage times, food-safety advice or nutrition figures.
- List in "seafood" every fish or shellfish ingredient, including fish sauce and shrimp paste, as written in the original.
- Put anything you were unsure about in "checks", briefly.
- If the text isn't a recipe, set "isRecipe" to false and leave the other fields empty.`;

export type ReadResult = { draft: ImportDraft; language: string } | { error: string };

export async function readWithClaude(
  text: string,
  source: { name: string; url: string | null },
  client: Pick<Anthropic, "messages"> = new Anthropic(),
): Promise<ReadResult> {
  if (text.length > MAX_RECIPE_TEXT) return { error: "That text is too long for one recipe. Paste just the recipe." };
  let response;
  try {
    response = await client.messages.parse({
      model: READER_MODEL,
      max_tokens: 16000,
      system: INSTRUCTIONS,
      output_config: { effort: "low", format: zodOutputFormat(ReadRecipe) },
      messages: [
        {
          role: "user",
          content: `Source: ${source.name}${source.url ? ` (${source.url})` : ""}\n\nRecipe text:\n${text}`,
        },
      ],
    });
  } catch (error) {
    return { error: describeClaudeError(error) };
  }
  if (response.stop_reason === "refusal") return { error: "Claude declined to read this text." };
  if (response.stop_reason === "max_tokens") return { error: "The recipe was too long to read in one go." };
  const read = response.parsed_output;
  if (!read) return { error: "Claude's answer couldn't be read. Please try again." };
  if (!read.isRecipe) return { error: "That doesn't look like a recipe. Paste the ingredients and steps." };
  return { draft: toDraft(read, source), language: read.language };
}

/** Claude's reading as a draft for the normalising layer, with what to check made explicit. */
export function toDraft(read: ReadRecipe, source: { name: string; url: string | null }): ImportDraft {
  const positive = (n: number | null) => (n !== null && n > 0 ? Math.round(n) : null);
  const english = /^english$/i.test(read.language.trim());
  return {
    title: read.title,
    source: source.name,
    sourceUrl: source.url,
    servings: positive(read.servings),
    timeTotalMin: positive(read.totalMinutes),
    timeActiveMin: positive(read.activeMinutes),
    cuisine: read.cuisine,
    mainProtein: read.mainProtein,
    diet: null,
    freezerFriendly: null,
    goodAsLeftovers: null,
    tags: [],
    ingredients: read.ingredients.map((i) => ({ line: i.line, group: i.group })),
    instructions: read.steps,
    makeAhead: [],
    notes: read.notes,
    flags: [
      english
        ? "Read automatically by Claude: compare it with the original before saving."
        : `Read and translated from ${read.language} automatically by Claude: compare it with the original before saving.`,
      ...read.checks,
      ...(read.seafood.length ? [`The original mentions seafood: ${read.seafood.join(", ")}.`] : []),
    ],
  };
}

function describeClaudeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key isn't valid. Check ANTHROPIC_API_KEY in Vercel's environment variables.";
  }
  if (error instanceof Anthropic.RateLimitError) return "Too many recipes at once. Try again in a minute.";
  if (error instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check the connection and try again.";
  if (error instanceof Anthropic.APIError) {
    return `Claude couldn't read it (error ${error.status ?? "unknown"}). If this keeps happening, check the credit balance in the Claude Console.`;
  }
  return "Something went wrong while reading the recipe. Please try again.";
}
