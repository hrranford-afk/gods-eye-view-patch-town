# Next step — options, not a game decision

**The strongest next experiment** is **four buildings forming one playable district**, not a hundred decorative ones. Try a cottage, bakery, workshop and power shed. A cart supplies ingredients, shared electricity powers machines, and a blocked road causes a shortage. Give players three actions: **place, connect, repair**. In five minutes they should see a problem, choose a fix and watch a visible result. Today's recipes simulate separate buildings; links between them would be new, small city-level code.

There are three possible games to test, without choosing yet. **Growing town:** attract residents by keeping food, jobs and power available. **Engineering islands:** connect specialised settlements by bridge or boat. **Build-and-rebuild village:** use the same economy to repair damage and support defences. Try a short paper test of each before expanding the engine.

## Five biggest risks

1. **No rewarding loop:** pretty buildings with little to decide. Test whether players enjoy a five-minute session before making assets in bulk.
2. **Pretend systems:** stock appearing from nowhere or a “power shed” supposedly generating electricity. Show every connection honestly.
3. **iPad limits:** thousands of moving bricks plus AR tracking may overheat or slow the device. Measure actual frame rate and offer grouped meshes instead of full physics everywhere.
4. **Unfair table views:** hidden controls, tiny text or one privileged seat. Test round, square and long tables, including turning and re-anchoring.
5. **Workshop safety:** unsigned jobs, unrestricted model-written code and low disk space remain separate risks. Valid JSON does not fix execution security.

## Jobs for the local models

Give the **35B** one building brief at a time: purpose, economy, important parts, weak points and visual shape. It may critique design choices, but cannot certify physics, fairness or iPad performance. Ask the **14B** to make bounded variations of an existing passing recipe, such as new dimensions, materials or stock figures. It can fail at exact syntax or reference links; neither model replaces the validator. Because both use one 16 GB graphics card, schedule one at a time, with short outputs.

Make the task easy: give one **valid example**, the whitelist, a fixed JSON-only answer shape and a small list of permitted changes. Reject invalid output without cleaning it silently. Return precise validator errors for at most **two retries**. Then test the economy for five minutes, render a preview and ask a human which candidate is worth keeping. Record failures, but don't start an endless agent conversation.

## Outside reviewers, sparingly

Ask **Gemini once first** to find missing city systems and compare the three possible loops against what the recipes actually support. Only after there is a running prototype, ask **Grok once** to attack it: unfair prices, broken supports, confusing damage and bad seats. Combine both reviews into one short decision sheet. A second round should happen only for a specific unresolved issue. The owner chooses the game.
