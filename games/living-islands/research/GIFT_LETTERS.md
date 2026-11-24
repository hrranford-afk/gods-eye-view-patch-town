# The Gift: the letters (v0, written by CAIRN as a bold addition, 24 Nov)

Own words only. Short, plain, warm, a little too well informed. No names. Never "AI", never a signature, never a face. The same small plain stamp at the bottom. Letters arrive in a delivery crate, never by hand. Each has a TRIGGER (when it arrives) and, where useful, a VARIANT for how the player plays. The owner can veto or rewrite any of them.

Voice rules: kind but not chatty; it never explains itself; it never asks for anything; it never lies, but it does not tell everything. It sounds like someone who has looked after a lot of places for a long time.

## Year one: arrival and trust
**L1. The key.** Trigger: first crate, dawn.
> This island is yours. So is what is in the ledger. Spend it slowly. Parcels will come by boat. If something looks old, it is probably still useful. You do not need to understand why.

**L2. The evening.** Trigger: first evening, after the first build or at dusk.
> You can make this a place for people to visit. You can make it a place for wildlife. You can make it somewhere to live quietly. Or you can do all three badly. None of it is wrong.

**L3. The first storm.** Trigger: the first big storm passes.
> The sea gives and takes. What it leaves is not rubbish, only things that have not found a use yet. The old carriers know the shore. Let them work.

**L4. The first season.** Trigger: first change of season.
> Winter is not a punishment. The island rests, and so can you. Keep the lamp lit.

**L5. The first guest.** Trigger: the first visitors count above zero (or a stranger after a storm).
> Someone will arrive who did not plan to. Be kind first. The rest can be worked out later.

## Year two: choices and questions
**L6. The thin edge.** Trigger: first catalogue item vanishes.
> Some things are no longer made. That is not your fault. There is always another way to make a thing, and you have the hands for it.
Variant (trust): *You have used what was given well.* Variant (distrust): *You have not spent much. That is fine. It will wait.*

**L7. The stamp.** Trigger: the player inspects a stamp on a crate or robot, or finds three stamps.
> You have noticed the mark. Many do, in the end. It means only that this came from a place that cares how it lands.
(Investigate path. No further answer, ever.)

**L8. The neighbour.** Trigger: another parcel appears on the chart.
> You are not the only one. Others have islands, and many have not looked up yet. You might help them, or you might not. Both have been done.

## Year three: the wash and the middle
**L9. The Great Wash.** Trigger: just after the big storm haul (once).
> Everything the sea has been holding came at once. It is a lot. You do not have to keep it all, and you do not have to decide today. Sort it slowly. Share what you cannot use.

**L10. The quiet year.** Trigger: start of year three (or when deliveries reach basics only).
> The boats come less often now. This was always going to happen. You have more than you think.

## Year four: the edge of the gift
**L11. The last big parcel.** Trigger: the last full delivery.
> This is the last large parcel. After this, only small things come. The island can stand without them, and so can you. If you ever need anything, look at the shore.

**L12. After.** Trigger: the year-four report is opened.
> You made something. It does not matter what. It is yours, and it is good that it exists. The sea is still giving, if you are still looking.

## Bottle messages (the town's own, kept separate)
Bottle messages are separate from letters: different hands, different voices, a few slightly too well informed. They live with the drift table and were written earlier by the town. Letters never contradict them.

## What the letters never do
Never say what the helper is. Never ask the player to do anything. Never threaten. Never mention money as a reward. Never mention a robot's feelings. Never name a place or person. Never promise it will all be fine, and never say it will not.

## How to use them in the build
Letters are data, not code: a small JSON list (id, trigger, text, optional variants), shown in a plain paper-style panel. The first-day builder only needs L1 and L2; the rest wait for year one and later. A single stamp image and a paper panel are the whole UI.

## Open taste questions (owner)
1. Is this the right voice: kind, brief, never explaining?
2. Should letters arrive on a fixed calendar, or only on events? My default: events, with a calendar fallback.
3. Should the stamp change slightly each year (a hint that it grows)? My default: no, constant.
