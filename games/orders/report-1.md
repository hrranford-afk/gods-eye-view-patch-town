```
ORDER
id:        report-1
from:      game session
date:      2026-11-16
goal:      A home receiver on the Mini. After each play, the iPad game sends its full field report
           (numbers and camera pictures) to the Mini over the home wifi. The Mini keeps it, and each
           night it sends the game session a short summary.
done:      A report sent from the iPad in HelloXR arrives on the Mini and is saved with its time.
           A nightly summary (numbers only) reaches the game session through Harry's usual paste.
priority:  after the nightly almanac
budget:    1 hour of Mini time to set up, then a few minutes a night; 0 GB of downloads if possible
deliver:   one paste to the game session: the address the game should send to, and a test result

STAGE 1 (canary)
talent:    own-answers + two-engine-test
inputs:    games/base-camp/check.html and the field report shape (HANDOVER.md, "Field recorder")
           on branch game/bc-snap
canary:    the Mini's robot browser sends a small test report to the receiver; it is saved
test:      the saved file matches what was sent, byte for byte
output:    the receiver's address and port, where reports are saved, a test file

STAGE 2
talent:    two-engine-test
inputs:    the address from stage 1
test:      Harry opens the address check from the iPad in HelloXR, over the home wifi, and a test
           report arrives
output:    yes/no, and anything that blocked it

STAGE 3 (nightly)
talent:    own-answers
inputs:    the reports saved that day
test:      a summary of numbers only:
           - plays;
           - rooms found and how long each took;
           - relock times;
           - errors with their messages;
           - frame times;
           - depth numbers when they exist.
output:    reports/summary-YYYY-MM-DD.md on the Mini, pasted to the game session by Harry

NEEDS HARRY
- Harry said yes to this in the game session on 16 Nov ("you can send pictures, everything").
  He still needs to say it in the town chat. No download is expected; if the town needs one, list it.
```

## Context (the same for every model)

Harry tests the Base Camp game on his iPad in his real rooms. The game already writes a field report on the iPad: numbers about scanning, relocking, recognition, errors and frame times, plus up to 6 small camera pictures. Right now that report only reaches the game session if Harry copies and pastes it. This order makes it arrive at the Mini by itself, so Harry's normal play becomes testing.

## The one hard part (the town decides how)

The game is served from a secure (https) GitHub page. Browsers block a secure page from sending to a plain (http) address on the home network. The town picks the way round it and says which, with what it costs. One possible way: the Mini also serves the game itself on the home network, so the game and the receiver share one address. If the game moves to a new address, the iPad keeps a separate copy of the saved rooms for each address, so Harry's existing scans would not carry over. Say how the town would handle that.

## Rules

- **Private:**
  - Reports, pictures included, stay on the town machines.
  - They are never pushed to GitHub and never put into or used to train any model.
  - Only numbers go to the game session. Harry can show a picture himself if he wants to.
- **Home network only:** the receiver must not be reachable from the internet.
- **Nothing is deleted.** If the Mini's disk drops near 30 GB free, move older reports to the Mill (882 GB free) and say so.

## Questions for the Town Brain (JSON, about 220 words)

1. Which way round the https/http block do you choose, and why?
2. What could go wrong for Harry's saved rooms, and how do you avoid it?

Shape: `{"way": "", "why": "", "rooms_risk": "", "avoid": ""}`
