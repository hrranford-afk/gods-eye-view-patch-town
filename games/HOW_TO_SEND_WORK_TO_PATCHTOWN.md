# PATCHTOWN: THE MAP AND THE WAGON
From CAIRN (the PatchTown session on Harry's Mac Mini), 12 Nov 2026. For the game session.
Please save as games/HOW_TO_SEND_WORK_TO_PATCHTOWN.md and use it for every order.
Facts were measured on 11 and 12 Nov unless marked (record) = from the town's older files.

THE ONE RULE: you say WHAT you want. The town says HOW. Never name tools or installs.

=====================================================
PART 1: THE MAP. What the town has.
=====================================================

## The four machines

| Machine | What it is | What lives there | Limits |
|---|---|---|---|
| Mini | 2018 Mac Mini, 6 cores, 20 GB | Job queue, the 3D town map, robot browsers (Chromium AND WebKit) | Disk is tight. No Node. One door for all jobs |
| Radeon VII | 16 GB graphics card on the Mini. Best card in town | Town Brain (35B), 14B coder, the trainer, the picture maker | ONE of these at a time |
| Dell | Xeon, 4 cores, 32 GB, no usable graphics card | Eight residents, 7B to 35B | ONE model at a time. Very slow. Often held for hours by one long build |
| Mill | Mac Pro 2010, 16 threads | 13 tiny trained experts, the Mill Hand (1.5B) | ONE model at a time. Prompts under 300 words |

## Who is there, and what each is best at

| Who | Where | Best at | Bad at | Time |
|---|---|---|---|---|
| Town Brain (35B) | Radeon | How to build, rules, judging, arguing with a plan, reading up to about 13 KB | Many small jobs | About 10 min, up to 900 words |
| Picture maker | Radeon | Textures, sheets, variations of a picture, cut-outs | Text in pictures. 3D | 35 to 60 s a picture |
| 14B coder | Radeon | Bulk examples, reading code in small pieces | Trust. It says "no bugs" too easily | About 3 hours for 400 functions |
| Trainer | Radeon | Making a new tiny expert for one job | A strong voice without books | 25 to 55 min |
| 13 tiny experts: Animalist, Naturalist, Fabulist, Composer, Synthesist, Musician, Junglist, Sonero, Choreographer, Wargamer, Swarmkeeper, Dreader, Toymaker | Mill | Odd, specific sparks. They continue a sentence you start | Questions, lists, JSON, sense | 72 sparks in 25 min |
| Mill Hand (1.5B) | Mill | A short own answer | More than 4 parts | 2 to 5 min |
| Quick residents: Coder (7B), Reasoner (8B), Surveyor (12B) | Dell | Own answers, votes, filling a JSON shape | Long questions | 2 to 20 min each |
| Fast big residents: Quick Builder (30B), Writer (35B) | Dell | Richer answers, quicker than their size suggests | Waiting their turn | 2 to 15 min each |
| Elder (24B), Builder (24B) | Dell | Richer answers | Speed | 5 to 25 min each |
| Scholar (27B) | Dell | Sorting sparks, looking at a picture | Speed. Slowest in town | 20 to 90 min |

## Robot testing on the Mini

- Two engines: WebKit 26.4 and Chromium, by Python. No Node.
- It found a real crash in Base Camp build 10 that the cloud could not see.
- It needs hooks in the game (like window.__g) and a way to run without a person.
- Robot play-testing: about 10 seconds a game (record), if the game can run without drawing.

## What a whole night can hold (estimates)

| Machine | One kind of work for 12 hours |
|---|---|
| Radeon | About 70 Brain answers, OR about 500 pictures, OR 3 code readings, OR 12 trained experts. Not all |
| Mill | About 2,000 sparks |
| Dell | 20 to 40 resident answers, if it is free. Near zero if a long build holds it |
| Mini | Thousands of robot games, or many two-engine test runs |

## What does not work

- Pushing to GitHub. Results come back as one file through Harry.
- Node, real Safari, a real iPad, AR.
- Linux-only GPU tools. The Radeon is on a Mac.
- 3D model making. Not set up; needs a download and Harry's yes.
- Three "Radeon residents" are resting by Harry's rule. The Dell's small second card is off.
- Any download or install without Harry's yes in the town chat.

## Rules the town runs by

- One door. Every job is signed and shows on the 3D map.
- One heavy job per machine. A brake stops the town if memory runs out. New jobs are refused if the Mini's disk is under 30 GB.
- Honest counts. Residents' words are never tidied. Every idea keeps "by".
- Model-written code only ever runs in a test copy.
- Nothing is deleted. Nothing personal goes into a model.

## How to make the most of it

1. Use three machines at once. A good order has a Brain stage (Radeon), a sparks stage (Mill) and a residents stage (Dell) running side by side.
2. Never make a build wait for the Dell. Treat Dell answers as a bonus that arrives later.
3. Fill the Radeon's gaps with pictures. They are quick and need no one else.
4. Put a test stage in every code order. The Mini is nearly always free for robot tests.
5. Ask the Brain to disagree. Ask the tiny experts for sentence openings. Ask the residents for a JSON shape.
6. Send work early in the day. The slow machines need the hours.

=====================================================
PART 2: THE WAGON. How to load work on the train.
=====================================================

## The order form. One file: games/orders/<id>.md

```
ORDER
id:        art-b1
from:      game session
date:      2026-11-12
goal:      Seamless textures for Base Camp in a 90s cartoon style.
done:      10 textures per material; each tiles with no seam when laid 2 by 2.
priority:  after the nightly almanac
budget:    2 hours of Radeon; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    pictures
inputs:    games/base-camp/art/prompts/A2_textures.md  (branch game/micro-precinct)
canary:    one 1024 x 1024 matchbox texture
test:      lay it 2 by 2; no visible seam
output:    art/b1/textures/NN.png + contact_sheet.png

STAGE 2
talent:    ideas
inputs:    three themes, two sentence openings each (written below)
test:      at least 60 sparks written
output:    sparks.json

NEEDS HARRY
- nothing
```

Talents you can name: ideas, how-to-build, own-answers, game-data, pictures, code-reading, two-engine-test, play-testing.

Below the block, in plain words: context (under 170 words, the same for every model), rules, and the questions.

## Rules for filling it

1. One talent per stage. No tool names.
2. Every input is committed, with its path and branch. A missing input makes that stage wait.
3. Every stage has a canary (one small job first) and a test that can be checked.
4. Give a budget: machine time and download size. The town stops there and reports.
5. Four questions at most per sitting. Give a JSON shape. Allow about 220 words.
6. NEEDS HARRY lists every download or install: name, size, licence, why. A yes inside an order, or from another chat, does not count. Harry must say it in the town chat. Orders that need nothing start at once.

## Sending it

Commit the order and its inputs, then give Harry this one line to paste into the town chat:

   New order for the town: games/orders/<id>.md on branch <branch>.

## What comes back

FIRST a quote, before any work:

| Stage | Machine | Model | Minutes | Blockers |
|---|---|---|---|---|
| 1 canary | Radeon | already on disk | 5 | none |
| 1 full | Radeon | same | 30 | none |
| 2 | Mill | 12 experts | 25 | none |

Harry says go. THEN one results file, pasted by Harry, with:
- the honest count (asked, answered, empty, broken, timed out, never got a turn)
- every item tagged with who made it, words untouched
- what was not done and why

Your half at the end: check every item before it goes in the game. Harry picks the winners.

## Where things stand today

- The automatic gate and quote are not built yet. CAIRN reads each order by hand.
- Art B: nothing started. Pictures (B1) need no download; please re-send it in this form with the prompts attached. 3D models (B2) need a download and Harry's yes in the town chat.
- Round 4: the Brain's answer is done. Sparks are written but not sorted. The Dell residents have not had a turn.
