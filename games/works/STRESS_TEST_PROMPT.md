# Stress-test prompt for the master plan

**How to use it.** Open a new ChatGPT chat. Attach `games/works/MASTER_PLAN.md`. If you can, also attach
`games/works/ledger.jsonl` and `games/works/ATLAS.md` (so it can check numbers), but never anything personal. Paste
everything inside the box below as one message. When the answer comes back, paste it to the foreman in the town chat,
whole and untouched; the foreman sorts each finding into do now, later or no (with why) and updates the plan.

```text
You are a hard, fair reviewer. The attached file is MASTER_PLAN.md for "PatchTown Works": a live 3D toy town
(three.js r128, one web page) that shows how a small AI game studio really works. The foreman is the main cloud AI
session; builders are helper AIs it hires; workshops are git branches; the inspection yard is the automated tests;
the shop window is what is live on GitHub Pages; across a bridge is the owner's "home town" of local models on his own
machines. The town is drawn from a ledger: one JSON line per real event. The repo is public.

The owner is dyslexic and has ADHD and works by voice. His rules: only ask him about money, security, deleting,
downloads and taste; nothing personal anywhere; people are counted, never tracked; no real brands or landmarks;
residents' words untouched, with credit.

Your job is to find what is wrong, missing, risky or over-built. Do not praise. Do not rewrite the plan.

Work through these in order. For each, cite the section number you are talking about.

1. HONESTY. The plan's first law is "measured, or not shown". Find every sign, number, building or alarm in the plan
   that could still show something that is not true, out of date, double counted, self-graded or guessed. For each:
   how exactly would it mislead, and what is the cheapest honest fix? Pay special attention to the battery gauge,
   the home town's numbers (they arrive hours late through a human paste), "who is speaking", the mood line, the
   truth meter, and anything drawn from typed (hand-written) ledger lines.

2. THE STALL TEST. On 15 Nov a builder stopped at 16:27 when a machine restarted and nobody noticed for 19 h 52 min.
   Walk through that night minute by minute under this plan's rules, in v1.1 (no heartbeats yet) and in v2 (with
   heartbeats and hooks). When exactly does each alarm fire, who sees it, and what happens if the browser tab is closed,
   the foreman session is dead, and the owner is asleep? Find any gap where the town would still look calm.

3. ALARMS. Count how many Calls (things that reach the owner) a normal busy day would produce under section 5.8 and
   section 4.3. Is the "3 or fewer a day" budget realistic? Which trigger will cry wolf first? Which real problem has
   no alarm at all?

4. THE LEDGER. Read section 3.5. Find fields or kinds that overlap, are ambiguous, cannot be filled by the writer that
   is allowed to write them, or would leak something personal into a public repo. Is anything required that no tool
   can actually produce today? Propose the smallest schema that keeps every alarm working.

5. PRIVACY AND SECURITY. The repo is public right now. List every way the plan could leak: the owner's routine (times),
   location, home network, other people, children's play, secrets, model or machine details, room pictures. Check the
   hooks design (section 3.6), the snapshot workflow, the public diary filter (section 6.8) and the image prompts.
   Rank the leaks by harm. Say which of the owner's security decisions (section 9.1) you would answer differently, and why.

6. READING AT A GLANCE. Imagine the wall view from 5 metres in a lit room, and the phone view one-handed. Using
   sections 5.3 to 5.6 and 2.5: can someone tell in 5 seconds whether anything needs them? What is still too small,
   too many, too subtle, colour-only, or moving for no reason? Does the plan break its own word and label budgets
   anywhere?

7. SHOWING AIs HONESTLY. Section 2.8 and section 6 say AIs are drawn as faceless wind-up toys, never as people. Find
   any place in the plan (animations, words, sounds, stories, image prompts) that still suggests feelings, memory,
   intent or personhood, and any place where the opposite error happens (making AIs look useless).

8. ORDER AND EFFORT. Read the roadmap (section 8). Is anything in the wrong version? What is under-estimated? What
   depends on something that comes later? What should be cut entirely because it costs more than it teaches or
   catches? Name the 5 items you would cut and the 3 you would move earlier.

9. PERFORMANCE. The page is already over its draw-call budget on a phone. Is the plan in sections 7.2 and 7.3 enough
   for three.js r128 on an older iPad and a 4K projector? What will break first as the town grows to 40 buildings and
   100 walkers?

10. WHAT IS MISSING. What would a real operations team, a real teacher, or a real privacy reviewer expect in a plan
    like this that is not here at all?

FORMAT OF YOUR ANSWER (the owner is dyslexic: keep it plain):
- Start with a 5-line verdict.
- Then a table: # | Section | Problem (one plain sentence) | Why it matters | Fix (one plain sentence) | Severity
  (High / Medium / Low).
- Most severe first. At most 40 rows. No row longer than about 50 words.
- Then "Questions for the owner": at most 5, and only about money, security, deleting, downloads or taste, each with
  your recommended answer.
- Short sentences. Digits, not number words. No jargon without a 5-word explanation in brackets.
- If you are not sure a claim is true, say "unsure" and how to check it. Never invent facts about the project.
- Do not include any personal details, places or real people's names in your answer.
```
