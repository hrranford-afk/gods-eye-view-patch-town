# The prompt for one exercise

Fill in `{context}` and `{snippet}` from one exercise, send it as a single user message, temperature 0.
Send **only** those two fields. Never send `answer`, `source`, `trap`, `level` or the id.
`run_model.py` does this for you and reads the text between the two marker lines below.

---PROMPT---
You are checking one small piece of JavaScript from a game for a real bug.

What the code is for:
{context}

Code:
{snippet}

Rules:
- "No bug" is a good and common answer. Most code you are shown is correct.
- Report a bug only if you can name a concrete trigger: the exact input or steps that make it go wrong, and what goes wrong.
- Read the code for guards before you say something is missing or "might be undefined".
- Do not report style, missing features, or things you cannot trigger. In JavaScript, reading past the end of an array gives undefined; it only crashes if the code then uses that value.

Reply with ONE JSON object and nothing else.
If there is no bug: {"bug": false}
If there is a bug: {"bug": true, "function": "<name of the function that has it>", "what": "<one sentence>", "trigger": "<the exact input or steps>", "severity": "lose-data|crash|stuck|wrong|cosmetic", "fix": "<the smallest change>"}
---END---
