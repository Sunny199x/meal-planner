// A stand-in for Claude, used only by tests and by a local server started with
// IMPORT_TEST_READER=1 (never set on Vercel). It answers as Claude would for a
// Romanian chicken stew, so the import screens can be tried without an API key.
import type Anthropic from "@anthropic-ai/sdk";
import type { ReadRecipe } from "./read-with-claude";

export const SAMPLE_READING: ReadRecipe = {
  isRecipe: true,
  language: "Romanian",
  title: "Chicken stew with peppers and rice",
  servings: 4,
  totalMinutes: 50,
  activeMinutes: 20,
  cuisine: "Romanian",
  mainProtein: null,
  ingredients: [
    { group: null, line: "600 g chicken thighs" },
    { group: null, line: "2 red peppers, sliced" },
    { group: null, line: "1 onion, chopped" },
    { group: null, line: "200 ml tomato passata" },
    { group: null, line: "250 ml basmati rice" },
    { group: null, line: "2 tbsp sunflower oil" },
    { group: null, line: "salt, to taste" },
  ],
  steps: [
    "Brown the chicken in the oil for 5 minutes.",
    "Add the onion and peppers and cook for 5 minutes.",
    "Add the passata and 200 ml water, cover and simmer for 30 minutes.",
    "Cook the rice and serve with the stew.",
  ],
  notes: null,
  checks: ["A cană (cup) of rice was taken as 250 ml."],
  seafood: [],
};

/** Something with the same `messages.parse` as the real client, answering with `reading`. Requests go into `seen`. */
export function fakeClaude(
  reading: ReadRecipe | null = SAMPLE_READING,
  stopReason = "end_turn",
  seen: unknown[] = [],
): Pick<Anthropic, "messages"> {
  return {
    messages: {
      parse: async (request: unknown) => {
        seen.push(request);
        return { stop_reason: stopReason, parsed_output: reading };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
}
