# Set 2 simulated camera checks

Method: 130 pixels across, grayscale LANCZOS, Gaussian blur sigma 0.7px. Each number is Pearson correlation (-1 to +1). **These are NOT real camera recognition results.**

| Card | 00 | 01 | 02 | 03 | 04 | 05 |
| --- | --- | --- | --- | --- | --- | --- |
| 00 | 1.000 | 0.419 | 0.305 | 0.102 | 0.245 | 0.241 |
| 01 | 0.419 | 1.000 | 0.199 | 0.163 | 0.241 | 0.313 |
| 02 | 0.305 | 0.199 | 1.000 | 0.258 | 0.287 | 0.296 |
| 03 | 0.102 | 0.163 | 0.258 | 1.000 | 0.143 | 0.236 |
| 04 | 0.245 | 0.241 | 0.287 | 0.143 | 1.000 | 0.250 |
| 05 | 0.241 | 0.313 | 0.296 | 0.236 | 0.250 | 1.000 |

### 180° rotation correlation

| Card | r |
| --- | ---: |
| 00 world_anchor | 0.202 |
| 01 blue_base | 0.405 |
| 02 red_base | 0.188 |
| 03 capture_flag | 0.155 |
| 04 hill | 0.079 |
| 05 build_camp | 0.235 |

Threshold: distinct pairs should be < 0.50 (heuristic); smaller values are better. Real iPad testing at 0.4-1.5m is still required.
