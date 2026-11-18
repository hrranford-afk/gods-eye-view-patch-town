<!-- by ChatGPT, from Harry's Round Table Kingdom cards set 2b (18 Nov 2026). Words untouched. -->
# Set 2 simulated camera checks

Method: 130 pixels across, grayscale LANCZOS, Gaussian blur sigma 0.7px. Each number is Pearson correlation (-1 to +1). **These are NOT real camera recognition results.**

| Card | 00 | 01 | 02 | 03 | 04 | 05 |
| --- | --- | --- | --- | --- | --- | --- |
| 00 | 1.000 | 0.440 | 0.316 | 0.076 | 0.292 | 0.249 |
| 01 | 0.440 | 1.000 | 0.323 | 0.208 | 0.420 | 0.373 |
| 02 | 0.316 | 0.323 | 1.000 | 0.222 | 0.404 | 0.319 |
| 03 | 0.076 | 0.208 | 0.222 | 1.000 | 0.139 | 0.245 |
| 04 | 0.292 | 0.420 | 0.404 | 0.139 | 1.000 | 0.331 |
| 05 | 0.249 | 0.373 | 0.319 | 0.245 | 0.331 | 1.000 |

### 180° rotation correlation

| Card | r |
| --- | ---: |
| 00 world_anchor | 0.291 |
| 01 blue_base | 0.468 |
| 02 red_base | 0.168 |
| 03 capture_flag | 0.132 |
| 04 hill | 0.126 |
| 05 build_camp | 0.231 |

Threshold: distinct pairs should be < 0.50 (heuristic); smaller values are better. Real iPad testing at 0.4-1.5m is still required.
