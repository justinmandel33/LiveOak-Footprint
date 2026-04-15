# LiveOak Fiber Footprint Tracker

This repository hosts a small website for tracking five sample addresses in LiveOak Fiber markets across Georgia and Florida.

It includes:
- a static site in `site/`
- a config-driven snapshot builder in `scripts/`
- a daily GitHub Actions workflow that rebuilds the pricing snapshot and deploys the site to GitHub Pages

Current scope notes:
- public pricing baselines are wired in for LiveOak Fiber, Xfinity, Cox, T-Mobile Home Internet, and Starlink
- exact-address FCC provider verification is still marked provisional until authenticated FCC access or a reliable browser automation path is added
