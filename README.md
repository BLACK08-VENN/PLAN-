# Little Wins — ICEA LION

A mobile-friendly platform game for ICEA LION lobby visitors. Players choose one of four planning journeys, collect stars, read three short discovery signs, and reach a finish screen with a first-premium discount concept.

## Run locally

Open `index.html` in a browser, or run `python3 -m http.server 8000` here and open http://localhost:8000. There is no build step or dependency installation.

## Deployment

This repository is a static website. In Vercel, use the repository root, the **Other** framework preset, no build command, and no output directory. Keep `game.js`, `icea-lion-logo.png`, `lion-hero.webp`, `monsters.webp`, `environment.webp`, and `props.webp` alongside `index.html`. The artwork uses compressed WebP files for phone connections. Game sounds begin after a player chooses a journey and can be muted.

The discount amount, eligible policies, and redemption terms must be confirmed by ICEA LION before a public launch. The game has no redemption validation or customer data collection.
