<!-- by ChatGPT, from Harry's Round Table Kingdom cards set 2b (18 Nov 2026). Words untouched. -->
# Set 2 simulated camera checks

Method: 130 pixels across, grayscale LANCZOS, Gaussian blur sigma 0.7px. Each number is Pearson correlation (-1 to +1). **These are NOT real camera recognition results.**

| Card | 00 | 01 | 02 | 03 | 04 | 05 |
| --- | --- | --- | --- | --- | --- | --- |
| 00 | 1.000 | 0.410 | 0.305 | 0.085 | 0.245 | 0.241 |
| 01 | 0.410 | 1.000 | 0.305 | 0.205 | 0.351 | 0.343 |
| 02 | 0.305 | 0.305 | 1.000 | 0.238 | 0.287 | 0.296 |
| 03 | 0.085 | 0.205 | 0.238 | 1.000 | 0.159 | 0.241 |
| 04 | 0.245 | 0.351 | 0.287 | 0.159 | 1.000 | 0.250 |
| 05 | 0.241 | 0.343 | 0.296 | 0.241 | 0.250 | 1.000 |

### 180° rotation correlation

| Card | r |
| --- | ---: |
| 00 world_anchor | 0.202 |
| 01 blue_base | 0.447 |
| 02 red_base | 0.188 |
| 03 capture_flag | 0.118 |
| 04 hill | 0.079 |
| 05 build_camp | 0.235 |

Threshold: distinct pairs should be < 0.50 (heuristic); smaller values are better. Real iPad testing at 0.4-1.5m is still required.
