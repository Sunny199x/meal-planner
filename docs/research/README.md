# Research briefs

Market analysis and consumer research for Forkcast is done in a separate session ("Research").
Its findings reach the build session ("Core Builder") as **briefs**, saved here one file per brief:
`YYYY-MM-DD-short-topic.md`.

## How a brief becomes code

1. **Research writes a brief** in the format below.
2. **Sunny brings it to Core Builder**: pasted into that chat, or sent from the Research session.
3. **Core Builder takes it in:**
   - saves the brief here unchanged, with a short "What this means for Forkcast" note at the end
   - checks each proposed requirement against the product rules in `CLAUDE.md` and
     `docs/BRIEF.md`, and against what the app already does (`docs/STATUS.md`)
   - says which requirements are new, which already exist, which conflict, and roughly how big
     each one is
   - adds the ones worth doing to `docs/IDEAS.md`
4. **Sunny decides.** Nothing from a brief is built until he agrees. Agreed items then go into a
   milestone plan, and the decisions into `docs/DECISIONS.md`.
5. **Core Builder builds** in small steps, as usual.

A brief informs; it doesn't change the plan by itself. Where research and the brief or decisions
disagree, Core Builder points it out and Sunny chooses.

## Brief format

```markdown
# <Topic>

- Date:
- Question: what we wanted to find out
- Method and sources: interviews, survey, desk research, app reviews… with links. Sample sizes.
  Mark anything estimated or illustrative.

## Findings
Each finding with its evidence and how strong it is (one person said / most people said /
published data).

## What it means for Forkcast
Which part of the app it touches, and why it matters for Sunny and Victoria (or for other
households, if that's the question).

## Proposed requirements
For each one:
- The problem it solves, in a user's words if possible
- What would change in the app
- How we'd know it worked
- Priority: must / should / could

## Open questions
What we still don't know, and how we could find out.
```

## Rules that apply to research too

From `CLAUDE.md`: no invented prices, nutrition figures or food storage times; no claims of AI,
machine learning or clinical nutrition; no medical, fertility or pregnancy advice; SEK only for
real or clearly labelled illustrative figures. A finding that needs one of these is written as a
question to check, not as a fact.
