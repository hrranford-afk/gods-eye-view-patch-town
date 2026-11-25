# Job 6c: clarity (owner playtest 25 Nov). One line per pushed item.
0. gift-day-page-test touch section timed out at 'Lift the lid': NOT a regression (fails the same at base 317e195 and at head). Cause: on touch the first tap now opens the inspect card (Job 6), the second does the action; the test tapped once. Fixed in the test (second tap). Test: gift-day-page-test.js only=7 (19 of 19).
