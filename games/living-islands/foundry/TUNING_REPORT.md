# TUNING REPORT: parameter sensitivity of the land formation tool

**PROPOSALS for the owner and the world.py owner. Nothing here was applied; `landform/world.py` was not edited.** Every setting was made by monkeypatching the imported module in-process (`foundry/tuning.py`, `patched()`), then restored.

World.py version used: `2b3433504179929c`. Design: 56 settings per province (Latin hypercube over the log of 10 factors) plus the baseline, 10 seeds each, coarse grid n=129 (4 m cells); 1710 worlds in 258 s on 2 workers, peak child memory 59 MB. Seeds 9001..9010 (not the sweep seeds).

Target bands (LANDFORM.md): K 0.5 to 0.85, D 1.10 to 1.35 (rocky 1.2 to 1.3, the loss uses 1.2 to 1.3), median slope A 8-30, B 10-35, C 10-40 degrees, small islands (64 to 500 m2) at least 8 (TUNING, mine). Loss = sum of band distances (K/0.15, D/0.08, slope/12, small-island shortfall/8), 0 = all four in band.

## Knobs

land_mult (land fraction range), relief_amp (whole height field x, the cut is re-quantiled), fine_amp and fine_scale (strength and decay of the small-island relief, `fine_envelope`), hard_gamma (HARD**g: contrast of rock hardness; also ERODE), smax (slope caps x), k_fluv, wave_k, shelf (province constants x), n_wave (wave/deposit passes). Ranges low..high: land_mult 0.75..1.35; relief_amp 0.6..1.6; fine_amp 0.5..1.9; fine_scale 0.6..1.7; hard_gamma 0.5..1.7; k_fluv 0.4..2.2; wave_k 0.4..2.2; smax 0.6..1.6; shelf 0.7..1.4; n_wave 3..8.

## Summary of the proposals

- **A (gneiss)**: best confirmed at n=257 on fresh seeds: land_mult 0.79, relief_amp 0.75, fine_amp 1.00, fine_scale 0.69, hard_gamma 0.57, k_fluv 2.09, wave_k 0.92, smax 1.36, shelf 0.77, n_wave 6. Loss 1.16 -> 0.78; K 0.54 -> 0.55, D 1.17 -> 1.15, median slope 36.4 -> 27.7 deg, small islands 10.9 -> 12.8; share of worlds with K in band 60% -> 80%, slope in band 0% -> 80%; worlds with a start island 60% -> 55%.
- **B (sandstone)**: best confirmed at n=257 on fresh seeds: land_mult 0.78, relief_amp 0.71, fine_amp 1.44, fine_scale 1.31, hard_gamma 1.56, k_fluv 0.41, wave_k 0.97, smax 1.00, shelf 1.36. Loss 0.56 -> 0.55; K 0.49 -> 0.57, D 1.19 -> 1.17, median slope 34.2 -> 35.0 deg, small islands 8.7 -> 10.2; share of worlds with K in band 25% -> 80%, slope in band 60% -> 55%; worlds with a start island 65% -> 50%.
- **C (basalt)**: best confirmed at n=257 on fresh seeds: land_mult 1.21, relief_amp 0.85, fine_amp 1.81, fine_scale 1.37, hard_gamma 0.56, k_fluv 1.50, wave_k 1.31, smax 1.59, shelf 0.96, n_wave 3. Loss 3.76 -> 1.56; K 0.42 -> 0.49, D 1.09 -> 1.12, median slope 27.1 -> 38.5 deg, small islands 3.5 -> 7.1; share of worlds with K in band 10% -> 55%, slope in band 100% -> 75%; worlds with a start island 30% -> 60%.

- What moves what (see the effect tables): **fine_amp** (strength of the small-island relief) raises K and the small-island count in every province, but also steepens slopes; **relief_amp** (overall height scale) is the slope knob (about 5 to 25 degrees across its range) and also raises the share of land below 10 m, and costs small islands; **land_mult** (land fraction) lowers K when raised in A and B (more land merges the islands), so a slightly lower land fraction gives a better K and more separate islands; for C a higher land fraction helps because the basalt worlds are too sparse. **fine_scale, hard_gamma, k_fluv, wave_k, shelf and n_wave barely move K, D or the slope** (effects under about 0.03 in K and D), so the erosion constants are not where the shortfall is; the shortfall is in the relief amplitudes, which are literals inside build_A/B/C.
- Coast roughness D is in band for A and B already (1.17 to 1.19 at n=257) and low only for C (1.09, rocky target 1.2 to 1.3): nothing tested lifts C beyond about 1.12 (D responds to land_mult and fine_amp only weakly), so the C coast needs a structural change (rougher riser edge from the terrace step, or higher resolution) not a constant.
- The coarse-grid (n=129) winners transfer only partly to n=257 (B: the best n=129 setting made the slope worse, 5% in band); the confirmation tables are the numbers to trust. The FOCUSED three-knob settings are the simplest to adopt but were set by hand from the effect tables, not optimised.

## Province A (gneiss)

Baseline (10 seeds, n=129): K 0.51, D 1.26, median slope 33.8 deg, small islands 7.7, islands 17.3, loss 0.60 (K 0.12, D 0.06, slope 0.32, small 0.11).

Effect sizes: change in the 10-seed mean of each response from the LOW to the HIGH end of each factor (linear fit, other factors varying; R2 in the header; large R2 means the linear story is trustworthy):

| factor | K (R2 0.97) | D (R2 0.94) | slope deg (R2 0.99) | small isl (R2 0.91) | land<10m (R2 0.98) |
|---|---|---|---|---|---|
| land_mult | -0.083 | +0.132 | +1.27 | -0.31 | -0.095 |
| relief_amp | -0.018 | -0.073 | +24.33 | -4.16 | -0.366 |
| fine_amp | +0.201 | -0.021 | +18.99 | +6.41 | -0.086 |
| fine_scale | +0.017 | +0.008 | +2.36 | -0.12 | -0.018 |
| hard_gamma | +0.005 | +0.003 | +0.14 | +0.68 | +0.007 |
| k_fluv | +0.006 | -0.016 | -0.24 | -0.07 | +0.018 |
| wave_k | -0.006 | +0.012 | -0.16 | -0.22 | -0.004 |
| smax | +0.010 | +0.006 | +1.86 | -0.12 | -0.054 |
| shelf | -0.011 | -0.005 | -0.04 | -0.27 | -0.006 |
| n_wave | -0.011 | -0.014 | -0.29 | -0.98 | -0.003 |

Best settings found (coarse grid, 10 seeds):

| setting (changed knobs only) | K | D | slope | small isl | islands | land<10m | loss |
|---|---|---|---|---|---|---|---|
| baseline | 0.51 | 1.26 | 33.8 | 7.7 | 17.3 | 0.82 | 0.60 |
| land_mult 0.79, relief_amp 0.75, fine_amp 1.00, fine_scale 0.69, hard_gamma 0.57, k_fluv 2.09, wave_k 0.92, smax 1.36, shelf 0.77, n_wave 6 | 0.53 | 1.22 | 25.7 | 10.4 | 19.7 | 0.95 | 0.14 |
| land_mult 0.76, relief_amp 0.69, fine_amp 0.98, fine_scale 0.99, hard_gamma 0.64, k_fluv 0.80, wave_k 0.91, smax 0.74, shelf 1.38, n_wave 6 | 0.53 | 1.22 | 24.3 | 10.6 | 19.6 | 0.97 | 0.15 |
| land_mult 0.76, relief_amp 0.84, fine_amp 1.07, fine_scale 1.13, hard_gamma 1.07, k_fluv 0.58, wave_k 0.49, smax 0.84, shelf 1.09, n_wave 4 | 0.55 | 1.21 | 30.2 | 11.1 | 20.1 | 0.92 | 0.17 |
| land_mult 0.83, relief_amp 0.80, fine_amp 0.95, fine_scale 0.70, hard_gamma 1.23, k_fluv 0.66, wave_k 0.77, smax 1.18, shelf 0.79, n_wave 7 | 0.52 | 1.23 | 26.7 | 9.9 | 18.7 | 0.94 | 0.22 |

Confirmation at n=257, 20 fresh seeds (baseline, the two best DoE settings, and a FOCUSED setting that changes only land_mult, relief_amp and fine_amp):

| setting | K | D | slope | small isl | islands | share K in band | share D in band | share slope in band | start island found | loss |
|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 0.54 | 1.17 | 36.4 | 10.9 | 25.1 | 60% | 90% | 0% | 60% | 1.16 |
| land_mult 0.79, relief_amp 0.75, fine_amp 1.00, fine_scale 0.69, hard_gamma 0.57, k_fluv 2.09, wave_k 0.92, smax 1.36, shelf 0.77, n_wave 6 | 0.55 | 1.15 | 27.7 | 12.8 | 25.6 | 80% | 95% | 80% | 55% | 0.78 |
| land_mult 0.76, relief_amp 0.69, fine_amp 0.98, fine_scale 0.99, hard_gamma 0.64, k_fluv 0.80, wave_k 0.91, smax 0.74, shelf 1.38, n_wave 6 | 0.55 | 1.14 | 26.5 | 12.3 | 25.6 | 80% | 85% | 90% | 60% | 0.80 |
| FOCUSED: land_mult 0.85, relief_amp 0.75, fine_amp 1.30 | 0.60 | 1.16 | 34.8 | 15.1 | 30.6 | 95% | 95% | 10% | 55% | 0.90 |

## Province B (sandstone)

Baseline (10 seeds, n=129): K 0.46, D 1.32, median slope 29.5 deg, small islands 5.6, islands 14.7, loss 0.94 (K 0.27, D 0.34, slope 0.00, small 0.33).

Effect sizes: change in the 10-seed mean of each response from the LOW to the HIGH end of each factor (linear fit, other factors varying; R2 in the header; large R2 means the linear story is trustworthy):

| factor | K (R2 0.98) | D (R2 0.93) | slope deg (R2 0.98) | small isl (R2 0.89) | land<10m (R2 0.92) |
|---|---|---|---|---|---|
| land_mult | -0.185 | +0.115 | -0.68 | -2.20 | -0.061 |
| relief_amp | -0.014 | -0.036 | +19.35 | -2.43 | -0.291 |
| fine_amp | +0.132 | +0.018 | +18.36 | +4.50 | -0.162 |
| fine_scale | +0.010 | +0.011 | +2.50 | -0.06 | -0.026 |
| hard_gamma | -0.007 | -0.007 | +0.40 | -1.44 | -0.023 |
| k_fluv | +0.006 | -0.007 | -1.29 | -0.38 | +0.019 |
| wave_k | +0.000 | -0.028 | +2.33 | -1.18 | -0.018 |
| smax | +0.017 | +0.007 | +3.84 | +0.70 | -0.032 |
| shelf | -0.012 | -0.022 | +0.42 | -0.85 | -0.012 |
| n_wave | -0.005 | -0.010 | +0.63 | -0.19 | -0.009 |

Best settings found (coarse grid, 10 seeds):

| setting (changed knobs only) | K | D | slope | small isl | islands | land<10m | loss |
|---|---|---|---|---|---|---|---|
| baseline | 0.46 | 1.32 | 29.5 | 5.6 | 14.7 | 0.89 | 0.94 |
| land_mult 0.78, relief_amp 0.71, fine_amp 1.44, fine_scale 1.31, hard_gamma 1.56, k_fluv 0.41, wave_k 0.97, smax 1.00, shelf 1.36 | 0.57 | 1.27 | 29.9 | 8.8 | 20.7 | 0.93 | 0.14 |
| land_mult 0.84, relief_amp 0.70, fine_amp 1.89, fine_scale 0.91, hard_gamma 1.50, k_fluv 0.59, wave_k 1.06, smax 0.71, shelf 1.27, n_wave 8 | 0.56 | 1.26 | 32.7 | 8.7 | 20.5 | 0.90 | 0.17 |
| land_mult 0.79, relief_amp 1.03, fine_amp 1.11, fine_scale 0.96, hard_gamma 0.57, k_fluv 0.55, wave_k 0.46, smax 1.32, shelf 0.70 | 0.56 | 1.29 | 32.4 | 9.1 | 20.3 | 0.89 | 0.18 |
| land_mult 0.78, relief_amp 1.01, fine_amp 0.89, fine_scale 1.23, hard_gamma 0.78, k_fluv 1.92, wave_k 0.94, smax 0.97, shelf 0.77, n_wave 4 | 0.53 | 1.28 | 28.0 | 8.1 | 18.2 | 0.93 | 0.19 |

Confirmation at n=257, 20 fresh seeds (baseline, the two best DoE settings, and a FOCUSED setting that changes only land_mult, relief_amp and fine_amp):

| setting | K | D | slope | small isl | islands | share K in band | share D in band | share slope in band | start island found | loss |
|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 0.49 | 1.19 | 34.2 | 8.7 | 21.8 | 25% | 100% | 60% | 65% | 0.56 |
| land_mult 0.84, relief_amp 0.70, fine_amp 1.89, fine_scale 0.91, hard_gamma 1.50, k_fluv 0.59, wave_k 1.06, smax 0.71, shelf 1.27, n_wave 8 | 0.58 | 1.16 | 38.9 | 10.8 | 25.1 | 85% | 100% | 5% | 55% | 0.90 |
| land_mult 0.78, relief_amp 0.71, fine_amp 1.44, fine_scale 1.31, hard_gamma 1.56, k_fluv 0.41, wave_k 0.97, smax 1.00, shelf 1.36 | 0.57 | 1.17 | 35.0 | 10.2 | 25.4 | 80% | 100% | 55% | 50% | 0.55 |
| FOCUSED: land_mult 0.80, relief_amp 0.85, fine_amp 1.50 | 0.56 | 1.17 | 39.2 | 10.6 | 25.1 | 80% | 100% | 5% | 75% | 0.86 |

## Province C (basalt)

Baseline (10 seeds, n=129): K 0.42, D 1.16, median slope 22.8 deg, small islands 3.5, islands 9.0, loss 2.02 (K 0.85, D 0.60, slope 0.00, small 0.56).

Effect sizes: change in the 10-seed mean of each response from the LOW to the HIGH end of each factor (linear fit, other factors varying; R2 in the header; large R2 means the linear story is trustworthy):

| factor | K (R2 0.73) | D (R2 0.83) | slope deg (R2 0.98) | small isl (R2 0.87) | land<10m (R2 0.92) |
|---|---|---|---|---|---|
| land_mult | -0.106 | +0.048 | -0.10 | +0.58 | -0.118 |
| relief_amp | -0.061 | -0.016 | +5.88 | -1.59 | -0.210 |
| fine_amp | +0.074 | -0.063 | +6.94 | +1.52 | -0.051 |
| fine_scale | +0.033 | +0.002 | +0.65 | -0.12 | -0.021 |
| hard_gamma | +0.008 | -0.006 | +0.17 | -0.60 | +0.036 |
| k_fluv | +0.006 | -0.011 | -0.20 | +0.08 | +0.021 |
| wave_k | +0.016 | -0.017 | +0.71 | -0.50 | -0.012 |
| smax | +0.013 | +0.040 | +12.93 | +2.27 | -0.060 |
| shelf | +0.009 | -0.025 | +0.36 | -0.48 | -0.014 |
| n_wave | -0.010 | -0.007 | +0.14 | -0.54 | +0.005 |

Best settings found (coarse grid, 10 seeds):

| setting (changed knobs only) | K | D | slope | small isl | islands | land<10m | loss |
|---|---|---|---|---|---|---|---|
| baseline | 0.42 | 1.16 | 22.8 | 3.5 | 9.0 | 0.93 | 2.02 |
| land_mult 1.21, relief_amp 0.85, fine_amp 1.81, fine_scale 1.37, hard_gamma 0.56, k_fluv 1.50, wave_k 1.31, smax 1.59, shelf 0.96, n_wave 3 | 0.52 | 1.16 | 32.6 | 7.5 | 16.1 | 0.82 | 0.80 |
| land_mult 1.26, relief_amp 0.73, fine_amp 1.72, fine_scale 1.43, hard_gamma 0.70, k_fluv 0.53, wave_k 0.84, smax 0.97, shelf 0.82, n_wave 6 | 0.50 | 1.16 | 23.5 | 5.9 | 14.3 | 0.90 | 0.94 |
| land_mult 1.08, relief_amp 0.82, fine_amp 1.32, fine_scale 1.22, hard_gamma 1.27, k_fluv 1.46, wave_k 1.15, smax 1.56, shelf 0.79, n_wave 7 | 0.52 | 1.17 | 30.4 | 4.8 | 12.0 | 0.91 | 1.09 |
| land_mult 1.07, relief_amp 0.68, fine_amp 1.03, fine_scale 0.80, hard_gamma 0.51, k_fluv 0.44, wave_k 0.51, smax 1.45, shelf 0.77, n_wave 4 | 0.46 | 1.21 | 25.5 | 5.5 | 12.5 | 0.96 | 1.13 |

Confirmation at n=257, 20 fresh seeds (baseline, the two best DoE settings, and a FOCUSED setting that changes only land_mult, relief_amp and fine_amp):

| setting | K | D | slope | small isl | islands | share K in band | share D in band | share slope in band | start island found | loss |
|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 0.42 | 1.09 | 27.1 | 3.5 | 12.3 | 10% | 30% | 100% | 30% | 3.76 |
| land_mult 1.26, relief_amp 0.73, fine_amp 1.72, fine_scale 1.43, hard_gamma 0.70, k_fluv 0.53, wave_k 0.84, smax 0.97, shelf 0.82, n_wave 6 | 0.47 | 1.11 | 29.1 | 6.0 | 18.1 | 55% | 70% | 100% | 50% | 1.71 |
| land_mult 1.21, relief_amp 0.85, fine_amp 1.81, fine_scale 1.37, hard_gamma 0.56, k_fluv 1.50, wave_k 1.31, smax 1.59, shelf 0.96, n_wave 3 | 0.49 | 1.12 | 38.5 | 7.1 | 19.5 | 55% | 80% | 75% | 60% | 1.56 |
| FOCUSED: land_mult 1.20, relief_amp 0.85, fine_amp 1.60 | 0.46 | 1.11 | 30.4 | 5.0 | 16.3 | 20% | 55% | 100% | 55% | 2.04 |

## Reading it

- These are PROPOSALS found on a coarse grid; effects at n=257/513 can differ (box-count D and the 4-cell island floor depend on the cell size). The confirmation tables re-run the best settings at the sweep grid on fresh seeds.
- Metrics are the checks.py numbers; a setting that improves K and D can still make worse-looking or less playable worlds (look at the contact sheet before adopting any of them). Playability (start island) was not part of this loss.
- Knob names are mine; `relief_amp`, `fine_amp` and `hard_gamma` have no single constant in world.py (the amplitudes are literals inside `build_A/B/C`, `fine_envelope` call sites and the rock table), so adopting them means editing those literals, not one value.
