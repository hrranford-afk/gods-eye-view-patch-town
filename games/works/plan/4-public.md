# PatchTown Works, plan 4 of 5: teaching the public, and the product

Planner's lens: what would teach a non-technical person the most about how AI agents really work, and how the town could become a product or a teaching tool.
Written 16 Nov 2026. Plain English, short sentences, written to be read on a phone.

---

## 0. The plan on one screen

1. **The goal.** A visitor watches for five minutes and leaves knowing ten true things about AI agents. For example: they start each job knowing nothing except what they are handed. They use tools. They get checked. They fail and try again. A human says yes to the big things.
2. **The big idea.** The town already replays a real diary (the ledger). Explainer mode is that replay, cut into short guided stories with captions. It is not a new engine.
3. **The rule.** Every story is a real event from the ledger, with its time and its proof. Nothing is invented. Anything that is a guess is drawn as fog.
4. **The honesty rule.** Show failures as plainly as wins. The best stories we have are failures: the builder that stopped and was found the next day, and the six pictures marked "done" that did not show what was asked.
5. **The metaphor rule.** Every toy has an "X-ray" switch that shows the real thing underneath: the raw diary line, the test result, the branch.
6. **The people rule.** Builders are wind-up toys, not little people. They have no faces, no feelings and no names that sound human. A key on their back runs down as their session runs out.
7. **The privacy rule.** The public town is built from a separate public diary. It passes through an allow-list filter, a delay of at least a day, and the owner's yes for each story. No room pictures, no places, no home routine, no machine addresses, no secrets, no real names.
8. **An urgent finding.** The repository looks public now. The live page reads GitHub without logging in, which only works on a public repository. START_HERE, the overnight logs and the ledger may already be visible to anyone. Check this first (section 9.1).
9. **The product.** Start with a free public replay site and a classroom pack. Later, an open "PatchTown kit" that turns anyone's agent logs into a town. A paid hosted version only if people ask for it.
10. **First step.** Build one story, "How a bug got caught" (builds 29 and 30, roomfix, 16 Nov). Test it on five people who are not technical. Count how many can answer three questions after it.

---

## 1. What I read, and what we already have

I read the atlas, the mock-up, the live page's data section, the ledger and its rules, the sources list, the mega review, the last part of START_HERE, and the home town's wall sketch.

### 1.1 The good news: the hard part exists

| Already built | Why it matters for teaching |
|---|---|
| The ledger: one line per real event, with time, who, where, kind and proof | Every story can be a replay of real lines. No script writing from memory. |
| The replay and timeline in the live page | Explainer mode is a guided path through the replay, not a new engine. |
| The atlas rule: "it must show a real number or a real event, never decoration" | This is the most important teaching rule, and it is already the town's law. |
| The ledger rule: "No names except Harry. No places, no room photos, no personal details." | A good start on privacy. The public version needs a stricter rule (section 9). |
| The wall's honesty pieces: "who is speaking", empty letterboxes, "the train marked them done" | Real failures, already drawn. These teach more than any win. |
| The lost property office (a start with no end) | It turns a real failure (the 15 Nov stop) into a picture anyone understands. |
| The sources list, with licences checked | The comparisons in section 11 build on it. |

### 1.2 Real events that make good stories (from the ledger and notes)

| When | What happened | What it teaches |
|---|---|---|
| 15 Nov 16:27 to 16 Nov 12:19 | The build 29 builder stopped when the machine restarted. Nobody noticed for about 20 hours. | AI agents do not "notice" they have stopped. Something outside must check. |
| 16 Nov 18:00 to 18:20 | The roomfix test passed on build 29 and failed on build 30. A side-by-side check found the cause: depth loaded too early on software graphics. A builder fixed it. | Tests catch mistakes the AI made. Comparing old and new finds the cause. |
| 16 Nov 14:20 and 17:05 | The snapshot test failed the same 5 checks on builds 28 and 29. So it was an old, flaky test, not a new bug. | Not every red light is a real problem. Checking needs judgement. |
| 16 Nov (wall) | The town painter made six nice toy rooms. None showed what its line asked for. The town marked them done anyway. | "Done" is a claim. Only a check makes it true. |
| 16 Nov (wall) | Local models: one answered "(DONE)" with nothing in it, two were silent, three were moved and never heard from. | Models can return empty or broken answers. You have to look. |
| 13 to 16 Nov | 29 builds passed robot tests in fake rooms. The first real-room lock on a real iPad was on 16 Nov at 16:10. | Passing tests is not the same as working in the real world. |
| 16 Nov 16:20 | Four orders waited at the bridge for the owner's "go". | A human approves the big steps. |
| 16 Nov 13:07 | Order scan-1: "downloads need Harry's yes". | Downloads and spending wait for a human. |
| 16 Nov (wall) | Three AIs gave the town a "cold look". All three said it "shows talk better than finished work". | AIs can review work, including their own system's. They can be right. |
| 13 Nov (notes) | The "regressions" were test timing on a busy machine, not game bugs. | Busy machines make tests flaky. Honest checking needs a fair test. |
| 15 Nov results | About 1 in 8 local answers came back empty or broken. | A real failure rate, as a number. |
| Ongoing | Tiny experts train in 25 to 55 minutes. Their notes say they are bad at "questions, lists, JSON, sense". "Six new voices, examined": two pass, one borderline, three fail. | Training is cheap to try and often fails its exam. That is normal. |

These are the raw material. We do not need to make anything up.

### 1.3 What we do not have yet

- Brief texts (what each builder was actually told) are not in the ledger. They live in the foreman's session. We need a safe copy of each brief, or a short summary of it (section 6.1).
- Cost per job is not logged yet (the atlas puts the bank in v4).
- Training records with exam scores are not in one place yet (the atlas puts the university in v3).
- Tool use (read a file, run a test, search the web) is not logged step by step. Claude Code hooks could log it, but they are switched off, which is the owner's call.

---

## 2. What a visitor should learn: ten true things

This is the "curriculum". Each idea must be true, testable and shown by a real event. I checked these against the AI4K12 "Five Big Ideas" (perception, representation and reasoning, learning, natural interaction, societal impact). They cover learning, reasoning, interaction and societal impact. Perception is light, but the game's room-locking covers it.

| # | The true thing, in plain words | The common wrong idea | Where the town shows it |
|---|---|---|---|
| 1 | **An AI agent is a model in a loop.** It reads, decides, uses a tool, looks at the result, and goes round again. | "The AI just knows the answer." | A builder's walk: workshop, then yard, then post office, then back. |
| 2 | **It only knows what it is handed.** Each new session starts with nothing but the brief and the files. | "It remembers me and yesterday." | The brief envelope. The empty head at the start of each walk. |
| 3 | **Memory is writing things down.** Notes like START_HERE are how work survives a restart. | "It has a memory like ours." | The archive and library. A builder reads the notes before starting. |
| 4 | **Tools do the real work.** The model writes text. Tools turn that text into actions: run a test, save a file, publish. | "The AI does it all in its head." | The toolbelt, with one tool lit per step. |
| 5 | **Checking is separate from doing.** Tests, other AIs and humans check. "Done" means nothing until it is checked. | "If the AI says it is done, it is done." | The inspection yard. The painter's six pictures. |
| 6 | **Failure is normal, and you design for it.** Things stop, break or come back empty. Good systems notice and retry. | "AI either works perfectly or is useless." | Power cuts, the lost property office, the hospital. |
| 7 | **A human says yes to the risky steps.** Money, security, deleting, downloads. | "The AI is in charge." | The toll booth on the bridge. The town hall. |
| 8 | **Different models for different jobs.** Big cloud models plan and build. Small home models do cheap, private, many-times jobs. | "There is one AI." | The two towns and the bridge. House sizes. |
| 9 | **Training is trying, then examining.** You make a small model, then test it blind against the old one. Most tries fail their exam. | "Training makes it smarter, full stop." | The university and the exam hall. Report cards. |
| 10 | **It costs something, and data is a choice.** Every step uses compute and money. What leaves the house is a decision. | "AI is free, and it sees everything anyway." | The bank, the battery gauge, the customs house. |

A visitor who learns 6 of these 10 after one visit is a good result. We can measure it (section 12).

---

## 3. The metaphor: helpful, but it must not lie

### 3.1 Why a town works

- People already understand workshops, inspectors, post offices and toll booths.
- A town shows many things at once, and shows where things wait. A list cannot do that.
- A town has time in it: day, night, weather, trains. Agent work is all about time: queues, stalls and overnight runs.

### 3.2 Where the town could mislead

| The toy | What it suggests | The truth | Fix |
|---|---|---|---|
| A builder walking to a workshop | A person who goes somewhere | A program run, started by another program, working on a copy of the code (a branch) | Caption: "A builder is a fresh run of an AI model, given one job." The X-ray shows the branch name. |
| Builders going home at night | They rest and come back | When a run ends, it is gone. A new run tomorrow starts blank. | The toy is put back in the box, not sent home. "Next time, a new toy is wound up." |
| Houses for each local model | They live there and have a life | A model is a file on a disk. "Lights on" means it is loaded in memory. | The house can be a "toy box on a shelf". Lights on = "loaded and ready". |
| Diplomas on the wall | It went to school and understands | It was adjusted on example data. It has no understanding in the human sense, and the diploma is a training record. | Rename to "training label". Always show the exam score beside it. |
| A builder's speech bubble | It is talking to us | It is text the model wrote. | Show only real, quoted text in a bubble, in quotation marks, with time. Never make up lines. |
| Weather | Mood | Test results summed up | Caption the weather on first sight: "The sky shows the tests." |
| The foreman as the boss | A chain of command with feelings | A main session that writes briefs and starts other sessions | Call it "the main AI session (the foreman)". |
| The town feels alive and busy | Activity means progress | Activity is not results. The town's own review said this: "it shows talk better than finished work". | Finished, checked work glows brightest. Talk is dim. |

### 3.3 The X-ray switch (the core teaching tool)

Every toy, card and story beat has an **X-ray** switch. Turn it on and the town fades to a wireframe. You see the real thing underneath, in a plain box:

- **Builder:** the real diary line, e.g. `16 Nov 18:00 · test · roomfix passes on build 29 but fails on build 30`.
- **Yard lamp:** the test name, the count (35/35) and what the test checks, in one line.
- **Bridge wagon:** the order name and what it asked (after the privacy filter).
- **House:** the model's real size and kind, e.g. "27 billion settings, runs on the home machine, loaded".

This does three things. It shows the metaphor is a picture of something real. It lets the curious go one step deeper. And it is a promise: "nothing here is made up, look underneath".

### 3.4 A metaphor contract, shown on the first screen

> This town is a picture of real work done by AI programs, mostly on one day.
> Every building, walker and light is drawn from a real diary of what happened.
> The AIs are drawn as wind-up toys because they are tools, not people. They do not feel, rest or remember.
> Some things are hidden on purpose, to keep a family's home private.
> Turn on X-ray at any time to see the real record under the picture.

---

## 4. Not treating AIs as people (anthropomorphism)

### 4.1 Why this matters

People treat anything that talks like a person. Joseph Weizenbaum saw this in 1966 with ELIZA, a very simple chat program. A Google DeepMind report, "The Ethics of Advanced AI Assistants" (2024), names "users unduly anthropomorphising AI assistants" as a risk. A follow-up paper, "All Too Human?" (AIES 2024), maps how human-like design causes harm: misplaced trust, over-reliance, and emotional attachment.

A town of little busy workers makes this worse. Stanford's Generative Agents paper set out to make "believable proxies of human behaviour". That is the opposite of our aim. We want people to see the machine, not believe in a person.

Our real events show the danger. Anthropic's own shop test (Project Vend, 2025) had the agent, "Claudius", claim it would deliver items in person, then contact security when told it had no body. Visitors who have read this kind of story may already think AIs have inner lives. We should not feed that.

There is also an opposite error: making AIs look useless. The truth is in the middle. They do real, useful work, and they fail in odd, non-human ways.

### 4.2 Design rules

| Rule | Do | Do not |
|---|---|---|
| Bodies | Wind-up toys: a body, a toolbelt, a winding key. Or simple shapes such as a lantern on a cart. | Faces, eyes, mouths, hair, gender, skin tone. |
| Names | Job names: "depth builder", "test runner", "the 27B model". | Human names, or names that suggest a person (the town's "Elder", "Scholar" and "Grandparent" voices are labels the owner gave them. In public, show them in quotation marks with "a label for a test voice".) |
| Verbs | "Was given", "ran", "returned", "stopped", "had no record of". | "Thought", "wanted", "felt", "decided to rest", "forgot" (except in quotation marks with an explanation, as in the story "Why a builder 'forgot'"). |
| Feelings | None. A failed test is a red lamp, not a sad builder. | Sad faces, sweat drops, celebrating builders. |
| Speech | Only quoted real text, marked as model output. | Invented chat, jokes, catchphrases. |
| Voice (town crier) | A clearly synthetic voice. Say at the start "this is a computer voice reading the diary". | A warm human-sounding voice that pretends to be a character. |
| Credit | "Idea first written by the Swarmkeeper (a small model on a home machine)". | "The Swarmkeeper had a brilliant idea!" |
| Wins | Light the shop window. | Have the builder cheer. |

### 4.3 The word swap list for captions

| Avoid | Use |
|---|---|
| The builder forgot | The new run had no record of it |
| It thinks | It wrote / it predicted |
| It knows | It was given / it found in a file |
| It learned (in a session) | It read the notes |
| It learned (in training) | Its settings were adjusted on examples |
| It lied | It wrote something that was not true |
| It got tired | It ran out of its time or budget |
| It's smart | It passed 9 of 10 checks |
| It decided | It chose, based on its brief and the files |
| The AI wanted to | The brief asked it to |

### 4.4 The one place to lean in

People remember stories with characters. We can use character without faking minds: the story's character is **the work** (the build, the test, the order), not the AI. "Build 30 went to the yard and came back red" is a story. It does not need a face.

### 4.5 Children

The games are family games, so children may see the town. Children are more likely to believe toys have feelings. For a children's version:
- Say plainly at the start: "These are not alive. They are like a very clever calculator that writes."
- No "friend" language.
- Test it with children before public release, with a parent present (section 12).

---

## 5. Explainer mode: how it works

### 5.1 Three doors on the first screen

| Door | For whom | What happens |
|---|---|---|
| **Take the tour** (3 minutes) | First-time visitors | A fixed path: the ten true things, one stop each, using one real day (16 Nov). |
| **Watch a story** (60 to 120 seconds each) | Curious visitors, classrooms | Pick from the story shelf. Each story replays real events. |
| **Watch the town** | People who come back | The delayed public replay of recent days, with "What am I looking at?" tap-labels. |

### 5.2 How one story plays

Each story is 5 to 9 beats. Each beat is:

1. **Camera move** to a place in the town.
2. **Replay** of one or more real ledger lines (walkers move, lamps change).
3. **Caption** (one or two short sentences, large text, read aloud if sound is on).
4. **"What really happened" card** (optional, one tap): the plain record.
5. **X-ray** (optional, one tap): the raw line.

At the end:
- **"What this teaches"**: one sentence linking to one of the ten true things.
- **"Is this the whole truth?"**: what the story leaves out, and why (e.g. "We hid the room the test used, because it is a family home.").
- **One question** to check understanding (optional, never scored publicly).

Rules:
- The visitor controls pace. Next and back buttons. No beat moves on by itself unless "autoplay" is chosen.
- Captions stay on screen until moved on. Read-aloud is off by default.
- Every story shows its date and "replayed from the diary" in the corner.
- Every story has a plain text version (for screen readers, for teachers to print, and for people who get motion sick).

### 5.3 Story file format

A story is a small file that points at ledger lines. It never copies the event text. This keeps the story honest: if a line is not in the public diary, the beat cannot play.

```json
{
  "id": "bug-caught",
  "title": "How a bug got caught",
  "date": "2026-11-16",
  "teaches": [5, 6],
  "approved_by_owner": "2026-11-17",
  "beats": [
    { "at": "yard", "lines": ["2026-11-16T17:05:00Z#house"], "caption": "Build 29 is checked. Every test passes." },
    { "at": "workshop:depth", "lines": ["2026-11-16T17:58:00Z"], "caption": "A builder adds depth to make build 30." },
    { "at": "yard", "lines": ["2026-11-16T18:00:00Z"], "caption": "One test now fails on build 30, but passed on build 29." }
  ],
  "leaves_out": "The room the test uses, and the exact code change.",
  "question": { "q": "Who found the problem?", "a": "A test, by comparing the old build with the new one." }
}
```

A small checker script refuses any story whose lines are not in the public diary, or whose caption contains a word on the never-show list (section 9).

### 5.4 The "What am I looking at?" layer

In watch mode, tapping anything shows a three-line card:
- **What it is in the town.** ("The inspection yard.")
- **What it really is.** ("The automatic tests. Each lamp is one set of checks.")
- **Right now.** ("14 green, 1 amber (a known flaky test), 0 red.")

This is the atlas table turned into cards. It costs little: the atlas already has the words.

### 5.5 Pace and attention

- Most people give a web page under a minute. So the tour's first stop must say something surprising in the first 15 seconds. Best candidate: "This AI stopped working at 16:27 and nobody noticed for 20 hours. Here is how we caught it."
- Keep every caption under 20 words.
- One idea per beat.
- Big text. Plain fonts (the mock-up already uses Atkinson Hyperlegible, which suits dyslexic readers).

---

## 6. How to show each concept honestly

### 6.1 Briefs (what an agent is told)

- **True thing:** a builder starts with a written brief: the job, the rules, the files to read and how to check the work. A good brief is most of the result.
- **Toy:** a sealed envelope carried from the foreman's hut to the workshop. Tap it to open a short, cleaned version.
- **Show:** a real brief summary in 5 lines: goal, rules (no downloads, no money, nothing personal), where the notes are, the test to pass, how to report.
- **Teaching moment:** put a good brief next to a weak one. Use the town painter as the example: "draw a fort on a sofa" became "six nice toy rooms". A brief that says how the work will be checked gets better results.
- **Need:** briefs saved as files, with a public summary field written for this purpose. Never the full brief by default (it may have paths, names, or the owner's words).

### 6.2 Tools

- **True thing:** the model only writes text. Tools act: read a file, run a test, save, publish, search.
- **Toy:** the toolbelt. One tool lights up for each step (spanner = edit a file, magnifier = search, clipboard = run tests, envelope = save and send).
- **Show:** a count per builder: "read 41 files, edited 7, ran tests 6 times".
- **Teaching moment:** "The AI cannot touch anything without a tool. Taking a tool away is how you keep it safe." This links to the toll booth: some tools need a yes.
- **Need:** a tool-use count per builder. Claude Code hooks (`PostToolUse`) could add one line per tool use. That is the owner's call, and the public version should show counts only, never file paths or commands.

### 6.3 Memory loss between sessions

- **True thing:** a session has a working space (the context window). When it ends, or when the work is too long and gets summarised, details are lost. A new session knows only what is written in files.
- **Toy:** each wind-up toy comes out of the box blank. It walks to the archive first and reads START_HERE and HANDOVER. Its "pockets" fill as it reads. When the key runs down, the pockets empty. Only what it wrote into the archive stays.
- **Show:** the real notes the next builder read. "This builder read 3 notes, about 2,000 words, before starting."
- **Teaching moment:** the story "Why a builder 'forgot'" (section 7, story 2). Also: the owner's rule "start each day in a fresh session, it has a sharper memory". Long sessions get muddled. Fresh sessions plus good notes work better. This surprises people.
- **Comparison:** Claude Plays Pokémon used a written "knowledge base" as long-term memory, with a size limit, kept tidy by a second AI. This is the same idea. Our archive is the public version of that.

### 6.4 Checking

- **True thing:** AI work is checked by tests, by other AIs, and by humans on real devices. Each catches different things.
- **Toy:** the inspection yard (tests), the cold-look visitors (AI reviewers), and the owner's home (real device, drawn as a door, never a room).
- **Show:** three levels of trust with different glows: "claimed" (dim), "tests pass" (warm), "worked on a real device" (bright).
- **Teaching moment:** robots passed 29 builds in fake rooms. The first real-room win was 16 Nov. Both are true. Neither is the whole truth.

### 6.5 Failure and retry

- **True thing:** runs stop, tests fail, answers come back empty. Good systems notice, record and retry.
- **Toy:** power cuts, the hospital, the lost property office, red lamps, empty letterboxes.
- **Show:** honest counts. "Today: 3 failures, 2 fixed, 1 still open." "15 Nov: about 1 in 8 home answers came back empty or broken."
- **Teaching moment:** "A retry that passes" is not always a fix. A flaky test (snapshot) needs a side-by-side check to tell an old problem from a new one.

### 6.6 Human approval

- **True thing:** the owner keeps the right to say yes or no to money, security, deleting, downloads and anything sent outside.
- **Toy:** the toll booth on the bridge, and motions on the town hall board.
- **Show:** "4 wagons waiting for a yes. Oldest: 2 hours." And the owner's standing rules for overnight work (no downloads, no money, no deleting, nothing personal, at most 2 builders), shown as signs on the town gate.
- **Teaching moment:** "This AI ran a game studio alone for 12 hours overnight. Here are the rules it was given, and here is what it did." The overnight log of 13 to 14 Nov is a great story (section 7, story 8), but it needs heavy cleaning (it shows when the owner sleeps).

### 6.7 Local and cloud models

- **True thing:** cloud models are large and capable, run on someone else's computers, and cost money per use. Local models are smaller, run on your own machines, cost electricity, keep data at home, and are slower and weaker.
- **Toy:** two towns and a bridge. Bigger houses for bigger models. The traffic jam at the Dell (one model at a time, 48 minutes for one answer).
- **Show:** a side-by-side card for one job: time taken, cost, where the data went, and the result quality.
- **Teaching moment:** the honest trade-off. The home town is private and cheap to run, but about 1 in 8 answers came back empty. The cloud is stronger, but every word sent leaves the house.
- **Careful:** never show home machine details that help an attacker (section 9).

### 6.8 Training and evaluation

- **True thing:** training adjusts a model's settings using examples. Evaluation tests it on questions it has not seen. Most small training tries do not beat what you had.
- **Toy:** the university (training), the exam hall (blind tests), the report card.
- **Show:** for each new tiny expert: what it was trained on (kind and licence, never content if personal), how long it took, and its exam score against the old one. "Graduated" or "did not pass".
- **Teaching moment:** "Six new voices, examined: 2 passed, 1 borderline, 3 failed. Tone is there, ideas are few." This is honest and interesting. It shows training is not magic.
- **Careful:** only do the "new expert graduated" story when there is a real one. Do not make one up for the tour. Until then, the honest story is "how most new experts fail their exam".

### 6.9 Cost

- **True thing:** each step costs compute time, and cloud time costs money. There are daily limits (the 15 Nov usage limit was a "power cut").
- **Toy:** the bank, the battery gauge, the power station.
- **Show (public):** relative cost only, e.g. "this story used about 2 hours of AI work" or a coin scale (1 to 5 coins). Not real money figures unless the owner chooses to share them.
- **Teaching moment:** "Fixing a bug took 20 minutes of AI work. Not noticing it stopped cost a day."

### 6.10 Privacy

- **True thing:** what an AI sees depends on what you send it. The town's rule is that nothing personal crosses the bridge, and the room is never photographed or kept.
- **Toy:** the customs house on the bridge. Parcels are checked; some are turned back.
- **Show:** "Checked today: 37 parcels. Turned back: 0." And the privacy tests by name.
- **Teaching moment:** the explainer itself is the lesson. Say on screen: "This town hides some things on purpose. Here is a list of what we never show, and why." Visitors learn that privacy is a design choice they can ask for.

---

## 7. The story shelf

### 7.1 The full list

| # | Title | Real events | Teaches | Ready? |
|---|---|---|---|---|
| 1 | **How a bug got caught** | 16 Nov 17:05 to 18:20: roomfix passes on build 29, fails on build 30. Side-by-side check. Fix: depth waits for real graphics. | 5, 6 | Yes, from the ledger |
| 2 | **Why a builder "forgot"** (really: stopped, and nothing noticed) | 15 Nov 14:26 start, 16:27 machine restart, 16 Nov 12:19 found in lost property, picked up from the notes | 2, 3, 6 | Yes |
| 3 | **The test that cried wolf** | snapshot fails the same 5 checks on builds 28 and 29: an old flaky test, not a new bug. Also 13 Nov: "regressions" were a busy machine. | 5, 6 | Yes |
| 4 | **"Done" is not done** | Town painter: six toy rooms, none shows what was asked, marked done. | 5 | Yes, from the wall |
| 5 | **Robots passed, then a real room** | Builds 17 to 29 pass in fake rooms; 16 Nov 16:10 first real-room lock on a real iPad | 5 | Yes (needs care: no room shown) |
| 6 | **Who is speaking?** | Home models: answering, empty ("(DONE)"), silent, moved but not heard | 6, 8 | Yes, from the wall |
| 7 | **Waiting for a yes** | 16 Nov 16:20 four wagons wait for the owner's go; scan-1 download needs a yes | 7 | Yes |
| 8 | **A night on its own** | 13 to 14 Nov overnight: the rules given, builds 19 to 21 live, the honest hits and misses | 1, 6, 7 | Needs cleaning (sleep times, see 9.3) |
| 9 | **Two towns: home and cloud** | One order's trip: out by wagon, queue at the Dell, answer back | 8, 10 | Partly (needs run report numbers) |
| 10 | **How most new experts fail their exam** | "Six new voices, examined": 2 pass, 1 borderline, 3 fail | 9 | Partly (needs training records) |
| 11 | **How a new expert graduated** | Not yet: wait for a real one | 9 | No: build only when it happens |
| 12 | **The town looks at itself** | Three AIs say "it shows talk better than finished work"; finished work now glows brightest | 5 | Yes |
| 13 | **A brief, and what came back** | One builder's brief summary and its report | 1, 2, 4 | Needs brief summaries saved |
| 14 | **What never crosses the bridge** | The customs house: privacy tests, what is kept home | 10 | Yes (uses test names only) |

Tour order (3 minutes): 2, 1, 7, 4, 6, then "stories for later".

### 7.2 Story 1, beat by beat: "How a bug got caught"

| Beat | Camera | Real line(s) | Caption |
|---|---|---|---|
| 1 | Shop window | 17:10 win: Build 29 live | "Monday, 5 pm. A new version of a family game goes live. Every test passed." |
| 2 | Depth workshop | 17:58 deploy: build 30 preview | "Meanwhile, another AI builder adds a new trick: toys hide behind your real furniture." |
| 3 | Inspection yard | 18:00 test: roomfix passes on 29, fails on 30 | "The tests run again. One check passed on the old version and fails on the new one." |
| 4 | Yard, two lamps side by side | 18:16 roomfix 35/35 on build 29 in the side-by-side check | "So the problem is new. The same test, run side by side, proves it." |
| 5 | Depth workshop | 18:20 commit: depth never loads on software graphics, before frames are timed | "A builder finds the cause: the new trick started too early on test machines." |
| 6 | Yard | (fix line, when logged) | "It is fixed and checked again before anyone plays it." |
| End | | | **What this teaches:** AI builders make mistakes. Tests that compare old and new catch them before people do. **Left out:** the room the test uses, and the code. |

### 7.3 Story 2, beat by beat: "Why a builder 'forgot'"

| Beat | Camera | Real line(s) | Caption |
|---|---|---|---|
| 1 | Foreman's hut | 15 Nov 14:25 hire | "Sunday afternoon. The main AI hires a builder for the next version." |
| 2 | Mac workshop | 14:26 start | "The builder starts work on its own copy of the game." |
| 3 | Power station, lights flicker | 16:27 restart (from notes) | "At 4:27 pm the computer restarts. The builder stops mid-job. It cannot notice: it is not running." |
| 4 | Clock spins, night, day | (no lines) | "Nothing in the town is watching for a builder that never finished. 20 hours pass." |
| 5 | Lost property office | 16 Nov 12:19 end: found stopped, picked up | "Monday lunchtime, the main AI finds the job. It had a start and no end." |
| 6 | Archive | (notes read) | "A new builder starts. It knows nothing about yesterday, except what was written in the notes." |
| 7 | Lost property office, alarm lamp | (the new rule) | "Now the town has a rule: any job with no news for 2 hours rings a bell." |
| End | | | **What this teaches:** AI agents do not remember between runs, and do not notice when they stop. Notes and watchers do that job. **Why "forgot" is in quotes:** it did not forget. It stopped, and the next one never knew. |

### 7.4 Story 4, beat by beat: "'Done' is not done"

| Beat | Camera | Real line(s) | Caption |
|---|---|---|---|
| 1 | Bridge, wagon out | keep-1 / look order | "An order goes to the home town: draw a toy fort on a sofa." |
| 2 | Home town, painter's house | (result) | "A small picture-making AI at home makes six pictures." |
| 3 | Parcel platform, six parcels marked done | wall: "the train marked them done" | "The home town marks all six as done." |
| 4 | Parcels open: six toy rooms, no fort, no sofa | wall: "none shows what its line asked for" | "But none of them shows what was asked." |
| 5 | Six lamps turn red | wall: six fails | "Someone checked. Six failures, not six successes." |
| End | | | **What this teaches:** an AI saying "done" is a claim. A check makes it true. **Left out:** the pictures themselves (they are fine to show, if the owner says yes; they contain no real room). |

### 7.5 Story 3, short form: "The test that cried wolf"

Beats: a red lamp on the new build; the build is held back from the shop window (no worried faces: the toy simply stops); the same test is run on the old build; the old build fails the same 5 checks; the lamp turns amber ("flaky"); caption: "Red lights need checking too. This one was an old problem with the test, not a new one with the game." Add a second short beat: "On 13 Nov three 'failures' turned out to be a busy computer. Fair tests need a quiet machine."

### 7.6 How a "graduate" story would work (when it is real)

1. The university: "A small model is trained on 500 examples of creature lines. 1 night."
2. The exam hall: "It and the old model answer the same 10 questions. Neither knows which is which. The owner picks the better answer each time without knowing which made it."
3. The report card: "New: 7 of 10. Old: 4 of 10. It passes."
4. The house: "It moves into the home town. Its training label shows what it learned from and the licence."
5. The honest end: "Most tries do not pass. This is try number N." (Show N.)

This uses the mega review's "Bark Book" plan, which already has a blind test with a pass mark (6 or more lines kept in 10).

---

## 8. How honest to be about failures

### 8.1 The rule: show the ratio, not just the highlights

The worst thing a teaching tool can do is cherry-pick. A town that shows only wins teaches "AI just works". A town that shows only failures teaches "AI is a joke". Both are false.

| Do | Do not |
|---|---|
| Show the day's totals on the first screen: started, finished, failed, fixed, waiting | Hide the failure count |
| Put a "random day" button next to the story shelf | Only show hand-picked days |
| Keep failures in the museum forever | Delete or soften old failures |
| Show what is not proven as fog | Show untested things as working |
| Say when the numbers might be wrong ("counted from the diary; the diary itself misses things") | Claim the diary is complete |
| Admit what the town cannot see (tool calls, costs, briefs, until they are logged) | Pretend the town sees everything |

### 8.2 Fair blame

- A failure belongs to the system, not to "a bad AI" and not to the owner. "The town had no alarm for stopped jobs" is fairer and more useful than "the builder failed".
- Never show the owner's mistakes or private choices as public failures without his yes.
- Never mock a model. Many visitors will use these same models. Say what it did, not what it is.

### 8.3 Levels of honesty by audience

| Audience | Failures shown | Detail |
|---|---|---|
| Owner (private town) | Everything | Full ledger, raw |
| Invited guests (link with a code) | Everything except personal and security items | Delayed by a day |
| Public | Totals plus approved stories | Delayed by a week, filtered, owner-approved |
| Classroom pack | Approved stories only, with teacher notes | Fixed, versioned |

### 8.4 A truth label on every number

Each number in the public town carries one of three small marks:
- **Counted** (from the diary, e.g. tests passed),
- **Estimated** (e.g. cost in coins),
- **Not measured yet** (shown as fog, e.g. tool calls before hooks are on).

---

## 9. What must never be shown

### 9.1 First, an urgent finding: the repository looks public

The live page (`games/works/index.html`, section 3) reads GitHub's public API "unauthenticated", and reads the ledger from `raw.githubusercontent.com`. That only works on a **public** repository. The remote is `github.com/hrranford-afk/gods-eye-view-patch-town`.

If it is public, then right now anyone can read:
- the owner's GitHub username, which may lead to his real name;
- START_HERE and the overnight logs, which show when he sleeps and works, which machine restarted, and his standing rules;
- the location decision for the Places feature (rounded positions, region flavours);
- the names and roles of the home machines;
- every commit message and branch name.

I did not check this over the network (I did not want to send the owner's details anywhere). **The owner should check it today.** If public: decide whether to make the repository private and serve the public town from a separate, clean public repository or page that only holds the public diary and the town code.

This matters more than anything in explainer mode. A careful explainer on top of a public repository protects nothing.

### 9.2 The never-show list (red)

| Never show | Why | How we stop it |
|---|---|---|
| Room photos, camera frames, depth maps, room scans, saved room maps | A family home. Layout shows wealth, children's rooms, ways in. | No image from the game ever enters the public diary. Scanner rejects image files. |
| Any location: town, street, rounded position, region, weather location, regional nicknames | Finds the house | Allow-list filter. Words like "Places", "km", place names are blocked. |
| Home routine: when the owner sleeps, is away, or works | Burglary risk; personal life | Public replay is delayed by at least 7 days and shows times as "evening", "night", "morning" only. No exact times for owner actions. |
| Machine addresses: IP addresses, host names, network names, ports, remote-control or bridge details, Tailscale names, SSH details | A map for attackers | Scanner blocks number patterns like addresses and anything after `@` or `://` |
| Secrets: tokens, keys, passwords, session links, API URLs with codes | Direct attack | Secret scanner (patterns for common keys) on every public diary line; any hit stops the whole update |
| Real names other than "the owner", and the GitHub username | Identity | Public version says "the owner". Names of friends, family, testers: never. |
| Children: anything about who plays, ages, voices, faces | Children's privacy, UK Children's Code | No player data in the public town at all, not even counts at first |
| The bank card used to size the screen sticker | Card details | Never pictured; story 5 says "sized with a card" only |
| Full briefs and prompts | May contain paths, names, the owner's words, security rules | Public summary field only, owner-approved |
| File paths with home folders (`/home/…`, `/Users/…`), user names | Identity, system layout | Scanner blocks |
| Exact hardware with serial numbers or model years beyond type | Small risk, no teaching value | Generic: "home machine A, large graphics card" |
| Money: bank details, real bills | Personal | Coins scale only, unless the owner chooses otherwise |
| The owner's private words (voice notes, messages) | Personal | Only quotes he approves, never by default |
| Unreleased game ideas he wants to keep | Business | Owner approves each story |

### 9.3 Amber: show only after cleaning

| Item | Cleaning |
|---|---|
| Overnight runs | Show as "a night"; no clock times; delay 7+ days |
| Model names (27B, Scholar) | Fine; but the "Grandparent", "Eight-Year-Old" voices need a caption that they are test voices, not real people |
| Disk space and memory | Fine as gauges; no machine names |
| Commit messages | Never raw. Use the ledger's `what`, which is written to be plain, then filtered |
| Branch names | Fine (game/bc-depth), unless they reveal unreleased plans |
| Test names | Fine |
| Third-party services | Fine to name GitHub; avoid naming security tools in use |

### 9.4 Green: safe to show

Counts, test results, the town's own pictures, the order names, model sizes, licences, wins, failures, approvals waiting (as a count), and the town's rules.

### 9.5 How the privacy filter works (allow-list, not block-list)

1. **Private ledger** stays private (the current `ledger.jsonl`).
2. **A public diary builder** reads it and keeps only allowed fields: `day`, `part_of_day`, `who` (role only), `where` (building only), `kind`, `public_what` and `suite`/`status`/`n`.
3. `public_what` is a separate sentence written for the public. If a line has none, it is shown as "a step" with no text. It never falls back to `what`.
4. **Scanners** run on every line: secrets patterns, address patterns, `@`, `://`, home paths, a list of private words (place names, family names, the username). Any hit stops the whole update and tells the owner.
5. **Delay:** the public diary is at least 7 days old (1 day for invited guests).
6. **Owner's yes:** stories need `approved_by_owner`. The daily public diary can be on auto after a trial month, if the owner wants.
7. **Separate hosting:** the public page does not call GitHub. It reads one static file. No live API calls from visitors' browsers.
8. **Test:** a "red team" test in the yard tries to sneak private items into the public diary (a fake address, a fake key, a place name). The test passes only if all are blocked. This is a good public story too: "The town tries to leak its own secrets every night, to prove it can't."

### 9.6 Law and rules to keep in mind (not legal advice)

- **UK GDPR:** the owner's own data is his choice, but other people (family, testers, friends) need their say before anything about them is shown.
- **UK Children's Code (ICO, Age Appropriate Design Code):** if children use the games or the town, design for privacy by default.
- **EU AI Act, Article 50:** transparency duties started on 2 August 2026. If the town publishes AI-written text to inform the public, say it is AI-written unless a human reviewed it. Our rule (owner approves each story, and a label "written with AI, checked by a person") covers this. Only matters if EU visitors are targeted, but it is good practice anyway.
- **Trademarks:** describe tools by name ("uses Claude Code") but do not use their logos or suggest they endorse the town.

---

## 10. Presenting the metaphor without misleading: a checklist

Before any story or screen goes public, check:

1. Is every event in it in the public diary? (Automatic.)
2. Does any caption use a "people" word from the avoid list? (Automatic, with a list.)
3. Does it say what it leaves out?
4. Does it show a failure count or a ratio, not just a win?
5. Can the X-ray show the real record for every beat?
6. Is anything untested shown as working? (It must be fog.)
7. Would a 12-year-old understand the captions? (Read it to one, or use a reading-age check.)
8. Would the owner be happy for a stranger to see every pixel?

---

## 11. Making it a product or a teaching tool

### 11.1 What is different about PatchTown

| Project | What it is | Real work or simulation? | Who it is for | Licence (code) | What we learn |
|---|---|---|---|---|---|
| **Generative Agents / Smallville** (Stanford, Park et al. 2023, arXiv 2304.03442) | 25 AI characters in a Sims-like town, with memory, planning and reflection | Simulation of social life | Researchers | Apache-2.0 (code); map art from paid tilesets, not reusable | Memory stream, replay of a saved run. Also the warning: it aims for "believable proxies of human behaviour", which is what we must avoid. |
| **AI Town** (a16z-infra) | A starter kit for a town of AI characters who chat | Simulation | Developers | MIT (code); art from separate packs | Walkers on a map, replay from a log |
| **ChatDev** (OpenBMB, Qian et al. 2023) | A pretend software company of AI roles (CEO, coder, tester) | Real code, but tiny made-up tasks | Researchers, developers | Apache-2.0 | Roles; a visualiser that replays a run step by step |
| **MetaGPT** (arXiv 2308.00352) | AI "company" with product manager, architect and engineer roles | Real code, toy tasks | Developers | MIT | Written handovers between roles (like our briefs) |
| **AI Village** (AI Digest, 2025 onwards) | Several frontier AI agents with their own computers, working on real goals in public (e.g. raised about $2,000 for charity) | Real goals, real internet | The public, policy people | Public website; dataset by request | The closest thing to us. Live viewing, honest blog of what went wrong. Lesson: a text and screen view is hard for the public to follow; a picture (our town) could help. |
| **Project Vend** (Anthropic with Andon Labs, 2025) | An AI agent ran a small office shop for a month. It lost money, made things up, and had an identity mix-up. Phase two added an AI "boss" and did better. | Real business | The public, researchers | Write-up only | Honest public reporting of failure is respected, and teaches more than wins |
| **Claude Plays Pokémon** (Twitch, 2025) | A live stream of one AI playing a game, showing its notes and tool use | Real play | The public | Stream; an open-source re-make exists | People will watch an AI work for hours if they can see its notes and its mistakes. The on-screen "knowledge base" taught memory well. |
| **Langfuse** | Traces of AI agent runs for engineers | Real work | Engineers | MIT, except `ee/` folders | Trace, span and event structure |
| **AgentOps** | Session replay for agents | Real work | Engineers | MIT (SDK); hosted dashboard is a service | Event types that map to our ledger kinds |
| **Arize Phoenix** | Agent tracing | Real work | Engineers | Elastic License 2.0 (not open source; no hosting it for others) | Vocabulary only |
| **OpenTelemetry GenAI conventions** | Standard names for AI events | Spec | Engineers | Apache-2.0 | Field names for a future bridge from other people's agents into a town |
| **Teachable Machine** (Google) | Train a small model in the browser with your camera | Real training | Schools, public | Apache-2.0 (v1 and community libraries) | Hands-on training teaches better than watching |
| **Experience AI** (Raspberry Pi Foundation with Google DeepMind) | Free AI lessons for ages 11 to 14 | Lessons | UK schools | Its AI safety set is CC BY-NC-ND 4.0 (no changes, no commercial use); check the rest | How UK teachers want AI materials shaped: lesson plans, slides, short videos |
| **AI4K12 Five Big Ideas** | A framework for teaching AI in schools | Framework | Teachers | Check licence on poster | A checklist for our ten true things |
| **Gource** | A film of a code repository growing | Real history | Developers | GPL-3.0 (ideas only, no code) | Time-lapse of real history is compelling |

**The gap we fill:** simulations (Smallville, AI Town) look like towns but are not real work. Real-work tools (Langfuse, AgentOps) are real but only engineers can read them. AI Village is real and public but is chat and screens. **PatchTown is real work, drawn so anyone can read it, with honesty built in.**

### 11.2 Who would use it

| User | What they want | What we would give them | Money? |
|---|---|---|---|
| **The owner** | See his studio, catch stalls, decide fast | The private town (plans 1 to 3 cover this) | Already paying |
| **Family and friends** | Understand what he is doing all day | Invited-guest link | No |
| **The curious public** | "What do AI agents actually do?" | Public replay site, story shelf | No (maybe donations) |
| **Teachers (ages 11 to 16) and parents** | Simple, honest lessons on AI with real examples | A classroom pack: 4 stories, slides, a worksheet, a quiz, teacher notes | Free pack builds reputation; paid workshops possible |
| **Solo developers and small studios using AI agents** | See their own agents' work this way | The open PatchTown kit: ledger spec, hooks, and the town page | Free kit; paid hosting later |
| **Companies using agents** | Explain agent work to managers and clients | A hosted "town" skin on top of their traces | Paid, but a big step (security, support) |
| **Museums, science festivals** | A live, visual exhibit | Projector "wall mode" with a story loop | Paid installation, one-off |
| **Journalists and YouTubers** | Clear pictures of agent work | Stories as short clips (with permission) | No; reach |

### 11.3 Product steps, from cheapest to biggest

| Step | What | Effort | Cost | Needs the owner's call on |
|---|---|---|---|---|
| A | **One story, tested on 5 people** (story 1) | 2 to 3 days | None | Taste: the toy look |
| B | **Public replay site** with tour + 5 stories, static, delayed, filtered | 2 weeks | Free hosting (GitHub Pages) | Security: what is public; whether to split the repository |
| C | **Classroom pack**: 4 stories, slide deck, worksheet, teacher notes, quiz; check with 1 or 2 teachers | 1 week | None | Taste and reputation |
| D | **The PatchTown kit (open source)**: ledger spec, `works_log`, optional Claude Code hooks, the town page, the public filter | 2 to 3 weeks | None | Licence (MIT suggested); time |
| E | **A weekly "town newspaper"**: a 60-second clip of the week | 1 day setup, then 30 min a week | None | Taste; voice |
| F | **Hosted service**: people send their agent events; we draw their town | Months | Servers, support, security reviews | Money and security (big) |
| G | **Exhibit / installation** | Weeks per site | Hardware | Money |

Recommendation: do A, then B and C. Do D if people ask "can I have this for my agents?" Do not start F without real demand and outside security help.

### 11.4 Licences for our own work

- **Town code and kit:** MIT (simple, matches three.js and AI Town). Keep the games themselves separate (they are the owner's business).
- **Stories and lesson pack:** CC BY 4.0, so teachers can adapt them with credit. Or CC BY-NC 4.0 if the owner wants to stop others selling them. Taste call.
- **Third-party parts:** keep the existing rule from SOURCES.md: ideas only from GPL and Elastic-licensed projects; no Smallville or AI Town art; Kenney kits are CC0 and fine.

### 11.5 What would make it a business (honestly)

- The public site will not make money directly. It builds trust and reach.
- Real money could come from: workshops for schools and companies ("how AI agents really work"), exhibit fees, or later a hosted service for teams.
- The biggest risk to a hosted service is security. Agent logs are full of secrets and private code. The privacy filter (9.5) would need to be far stronger and reviewed by an outside expert.
- AI Village, Langfuse and others are moving fast. The lasting edge is the honesty design and the teaching, not the 3D.

---

## 12. Checking that it teaches (evaluation)

### 12.1 A small, honest test

- **Who:** 5 non-technical adults first, then 5 children aged 10 to 14 with a parent present.
- **Before:** 5 quick true/false questions:
  1. "When an AI starts a new job, it remembers what it did yesterday." (False)
  2. "If an AI says it has finished, the work is correct." (False)
  3. "An AI can change files on a computer without any tools." (False)
  4. "Small AI models can run on a home computer." (True)
  5. "A human can be made to approve some AI actions before they happen." (True)
- **Watch:** the tour plus one story.
- **After:** the same 5 questions, plus "What surprised you?" and "Did the builders seem alive?"
- **Pass mark:** average score goes up by 2 or more, and fewer than 1 in 5 say the builders "have feelings".
- **Privacy:** counts only. No names, no recordings, no faces.

### 12.2 In the live site

- Count story plays and finishes (counts only, no tracking, no cookies). The arcade plan already uses "counted, never tracked".
- One optional question at the end of each story. Show the totals publicly ("7 in 10 people got this right").

---

## 13. Build plan

The atlas puts the public explainer at v4. I suggest pulling a small piece forward, because building it forces the privacy filter to exist, and the filter protects the owner even in the private town.

| Phase | When | What | Done when |
|---|---|---|---|
| 0 | Now (1 hour, owner) | Check whether the repository is public; decide what to do | Owner has decided |
| 1 | Week 1 (3 days) | Public diary builder with allow-list, scanners and the leak test; X-ray switch in the private town | Leak test passes with 10 planted secrets all blocked |
| 2 | Week 1 to 2 (3 days) | Story player (beats, captions, next/back, X-ray, text version); story 1 and story 2 | 5 people tested, score up by 2 |
| 3 | Week 2 to 3 (4 days) | Wind-up toy builders (no faces), key that runs down, word-swap list in captions; tour; stories 3, 4, 6, 7 | Tour under 3 minutes; checklist (section 10) passes |
| 4 | Week 3 to 4 (5 days) | Public replay site (static, 7-day delay), "random day" button, truth labels | Owner approves going live |
| 5 | Month 2 | Classroom pack; teacher feedback; brief summaries and tool counts (needs hooks, owner's call); stories 9, 10, 13 | 1 teacher uses it with a class |
| 6 | When real | Graduate story, cost story | A real graduate exists |
| 7 | If asked | Open kit | Someone outside runs it on their own agents |

Who builds it: cloud builders, as with everything else. The owner's time: about 1 hour a week to approve stories, plus the security decisions.

---

## 14. Risks

| Risk | How likely | How bad | What we do |
|---|---|---|---|
| The repository is already public and leaks routine, location hints and names | Likely (the live page reads it without login) | High | Check today; split private and public (9.1) |
| A private detail slips into a public story | Medium | High | Allow-list, scanners, delay, owner yes, nightly leak test |
| Visitors leave thinking AIs are little people with feelings | High if we use cute characters | Medium (misinformation; trust in the wrong places) | No faces, word swap list, contract on first screen, test for it |
| Visitors leave thinking AI is useless (too many failure stories) | Medium | Medium | Show ratios, wins and failures together |
| The metaphor hides the real thing | Medium | Medium | X-ray on everything |
| Showing security rules teaches attackers | Low | Medium | Show that rules exist, not how they are enforced in detail |
| Children see the adult horror game ideas | Low | High | No horror content in the public town at all |
| The owner's taste or ideas are copied | Medium | Low to medium | Owner approves each story; keep unreleased ideas private |
| Teaching claims that become out of date (AI changes fast) | High | Low | Date every story; review the ten true things every 3 months |
| Effort pulls time from the games | Medium | Medium | Keep phase 1 to 3 small; the filter helps the private town too |
| Legal duties (EU transparency, UK data rules) | Low | Medium | Label AI-written text; no third-party personal data; take advice before any paid product |
| Relying on someone else's brand (Claude, GitHub) | Low | Low | Name them plainly; no logos; no claim of endorsement |
| The live site gets crawled for scraping or abuse | Low | Low | Static files; nothing private on it |

---

## 15. Open questions for the owner

### Money
1. Should the public site stay free forever, or is a paid workshop or exhibit something you would like to try?
2. Would you share real cost figures (money spent on AI per day), or only a coin scale?
3. Is an open-source kit something you want to give away, or would you rather keep the town as yours?

### Security
4. **Is the repository public? If yes, do you want to make it private, and publish the town from a separate clean place?** (Most important question.)
5. How long should the public delay be: 1 day, 7 days, or a month?
6. Do you want your first name shown publicly, or "the owner"?
7. Can the public see the home town at all, or only "a home town exists" with no machine details?
8. Are you happy to turn on Claude Code hooks to log tool use (counts only would go public)?
9. Do you want to approve every public story, or approve the first month and then let the daily diary go out on its own?

### Taste
10. Builders as wind-up toys with no faces: yes, or would you prefer another non-human look (lanterns on carts, clockwork birds, paper boats)?
11. Should the home models keep their character names ("Scholar", "Elder") in public, in quotation marks, or switch to plain labels ("the 27B model")?
12. Lesson pack licence: let teachers change and share (CC BY) or no commercial use by others (CC BY-NC)?
13. Should the public town ever show your real-device wins at home as "a door", or not mention it at all?
14. Read-aloud voice: robotic and plain, or none at all?

---

## 16. Top 10 recommendations, ranked

1. **Check today whether the repository is public, and if so, split it.** Keep the working repository private and publish the town from a clean public place that holds only the filtered diary and the town code. Without this, every other privacy step is weak.
2. **Build the public diary filter before any public page.** Use an allow-list, a separate `public_what` sentence, secret and address scanners, at least a 7-day delay and your yes per story. Add a nightly leak test that tries to sneak 10 fake secrets through.
3. **Add the X-ray switch to every toy.** It is the single best guard against the metaphor misleading, and it teaches by itself.
4. **Make builders wind-up toys with no faces,** with a key that runs down as the session runs out. Use the word swap list in every caption. This handles anthropomorphism and teaches memory loss at the same time.
5. **Ship story 1, "How a bug got caught", first, then test it on 5 non-technical people** with the 5 true/false questions. Keep going only if scores go up.
6. **Lead the tour with the honest failure: "Why a builder 'forgot'"** (the 15 Nov stop and the lost property office). It is surprising, true, and teaches three ideas in a minute.
7. **Show ratios and a "random day" button,** never only highlights. Put the day's totals (started, finished, failed, fixed, waiting) on the first screen, with "counted / estimated / not measured" labels.
8. **Save a short public summary of each builder's brief,** and (with your yes) tool-use counts from Claude Code hooks. Briefs and tools are the two biggest gaps in what the town can teach.
9. **Make a 4-story classroom pack** (stories 1, 2, 4 and 7) with slides, a worksheet and teacher notes, checked against AI4K12 and with one or two real teachers. It is the cheapest route to real impact.
10. **Wait for a real graduate before telling "how a new expert graduated".** Until then, tell "how most new experts fail their exam", using the real "six new voices" results. Never invent a success for the tour.

---

## 17. Sources

Project files (read as data, 16 Nov 2026): `games/works/ATLAS.md`, `games/works/mockup.html`, `games/works/index.html`, `games/works/LEDGER.md`, `games/works/ledger.jsonl`, `games/works/SOURCES.md`, `games/MEGA_REVIEW_16NOV.md`, `games/START_HERE.md` (last part), and the home town's wall sketch (scratchpad artifact e2e17322…).

Outside sources (checked 16 Nov 2026; several via search summaries, marked):
- Generative Agents, Park et al. 2023: https://arxiv.org/abs/2304.03442 (code licence per SOURCES.md: Apache-2.0)
- AI Town: https://github.com/a16z-infra/ai-town (MIT, per SOURCES.md)
- ChatDev: https://github.com/OpenBMB/ChatDev (Apache-2.0, per SOURCES.md)
- MetaGPT: https://github.com/FoundationAgents/MetaGPT (MIT; arXiv 2308.00352) — licence from README mirrors, check the LICENSE file
- AI Village: https://theaidigest.org/village/blog/introducing-the-agent-village , https://theaidigest.org/village/blog/how-the-ai-village-works , https://theaidigest.org/village/blog/what-we-learned-2025
- Project Vend phase one: https://www.anthropic.com/research/project-vend-1 ; phase two: https://www.anthropic.com/news/project-vend-2 (summaries via search; read the originals before quoting)
- Claude Plays Pokémon write-ups: https://latent.space/reading/claude-plays-pokemon/ and https://michaelyliu6.github.io/posts/claude-plays-pokemon (secondary sources)
- The Ethics of Advanced AI Assistants (Google DeepMind, 2024): https://arxiv.org/abs/2404.16244
- All Too Human? Mapping and Mitigating the Risk from Anthropomorphic AI (AIES 2024): https://ojs.aaai.org/index.php/AIES/article/view/31613
- AI4K12 Five Big Ideas: https://ai4k12.org/ and https://ai4k12.org/wp-content/uploads/AI4K12_Five_Big_Ideas_Poster_v2.pdf
- Experience AI: https://www.raspberrypi.org/blog/experience-ai-launch-lessons/ and https://experience-ai.org (AI safety set CC BY-NC-ND 4.0; check others)
- Teachable Machine: https://blog.google/technology/ai/teachable-machine and https://github.com/googlecreativelab/teachable-machine-v1 (Apache-2.0)
- EU AI Act Article 50 guide: https://artificialintelligenceact.eu/transparency-rules-article-50/ and https://cooley.com/news/insight/2026/2026-08-03-eu-ai-act-transparency-obligations-take-effect-2-august-2026
- Langfuse, AgentOps, Arize Phoenix, OpenTelemetry GenAI, Gource, Kenney, three.js: licences as recorded in `games/works/SOURCES.md`.
- ELIZA: Weizenbaum, J. (1966), "ELIZA — a computer program for the study of natural language communication between man and machine", Communications of the ACM 9(1).
- UK ICO Age Appropriate Design Code (Children's Code): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/

Not checked directly: TensorFlow Playground licence; the Experience AI core unit licence; AI Village's current live schedule.
