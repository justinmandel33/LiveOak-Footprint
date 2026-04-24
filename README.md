# Broadband Market Intelligence

This repository hosts a static broadband intelligence dashboard built for FCC-driven telecom analysis.

It includes:
- a static site in `site/`
- a config-driven snapshot builder in `scripts/`
- a GitHub Actions workflow that rebuilds the snapshot and deploys the site to GitHub Pages

## What this version does

- renders an analyst-facing dashboard from `site/`
- defines a 30-provider watchlist covering major cable, fiber, telco, FWA, and satellite competitors
- mirrors the workbook-style modules shown in the reference screenshots:
  - provider footprint
  - market size
  - demographics
  - competitive intensity
  - overlap by technology
  - overlap by provider
  - speed mix
  - download center
- exports the current site payload as:
  - JSON
  - CSV
  - Excel-readable workbook (`.xls`)

## What is still pending

- live FCC BDC download ingestion
- FCC account-backed API automation
- optional Fabric-based exact-location enrichment
- Census / ACS joins for the demographic and density modules

## Local build

```bash
python3 scripts/build_snapshot.py
```

## Generated files

The snapshot build writes:

- `site/data/latest.json`
- `site/data/provider_universe.csv`
- `site/data/metric_dictionary.csv`
- `site/data/data_sources.csv`

## Next upgrade path

1. Create or finish the FCC account and FRN setup.
2. Load the first public availability downloads.
3. Normalize provider naming to parent brands and cohorts.
4. Add Census enrichment for the benchmark tables.
5. Add Fabric workflows if exact-address analysis becomes necessary.
