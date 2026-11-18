#!/bin/sh
# joins src-parts/*.js into models.js (the file the game loads)
cd "$(dirname "$0")" && cat src-parts/0*.js > models.js && node --check models.js && echo built
