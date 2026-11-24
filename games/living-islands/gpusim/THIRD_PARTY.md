# Third party material in gpusim/

No third-party code has been copied into this folder.

- Scheme: the "virtual pipes" shallow-water model. Idea from Mei, Decaudin and Hu, "Fast Hydraulic Erosion Simulation and Visualization on GPU" (Pacific Graphics 2007), building on O'Brien and Hornus (1993). Implemented here from the idea (flux between neighbouring cells, flux limiter, depth update). The face-depth form of the flux (hydrostatic reconstruction: highest surface minus highest bed) is the standard well-balanced trick from the shallow-water literature; written here from the description, not copied.
- Data: the exported world heightfields in `../landform/worlds/` belong to this project.
- three.js is not used by these pages (plain WebGL2).
- If code from a permissive project is ever reused here (MIT, BSD, Apache, CC0), add it to this file with its licence text location. Learn-only projects (GPL, no licence, non-commercial) are never copied. See `../research/RADEON_VII_SPECIALITIES.md` section 5 for the survey and the licence status of each project.
