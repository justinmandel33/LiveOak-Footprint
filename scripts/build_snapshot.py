#!/usr/bin/env python3

from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "tracker_config.json"
DATA_DIR = ROOT / "site" / "data"
OUTPUT_PATH = DATA_DIR / "latest.json"
PROVIDERS_CSV_PATH = DATA_DIR / "provider_universe.csv"
METRICS_CSV_PATH = DATA_DIR / "metric_dictionary.csv"
SOURCES_CSV_PATH = DATA_DIR / "data_sources.csv"


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def csv_text(rows: list[dict], fieldnames: list[str]) -> str:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def provider_rows(providers: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for provider in providers:
        rows.append(
            {
                "rank": provider["rank"],
                "name": provider["name"],
                "segment": provider["segment"],
                "category": provider["category"],
                "technologies": ", ".join(provider["technologies"]),
                "focus": provider["focus"],
                "notes": provider["notes"],
            }
        )
    return rows


def metric_rows(metric_families: list[dict]) -> list[dict]:
    return [
        {
            "metric_family": metric["name"],
            "description": metric["description"],
        }
        for metric in metric_families
    ]


def source_rows(data_sources: list[dict]) -> list[dict]:
    return [
        {
            "source": source["name"],
            "status": source["status"],
            "detail": source["detail"],
            "fields": ", ".join(source["fields"]),
        }
        for source in data_sources
    ]


def build_snapshot(config: dict) -> dict:
    providers = config["providers"]
    provider_counter = Counter(provider["category"] for provider in providers)
    segment_counter = Counter(provider["segment"] for provider in providers)
    technology_counter = Counter()
    for provider in providers:
        for technology in provider["technologies"]:
            technology_counter[technology] += 1

    generated_at = datetime.now(timezone.utc)
    return {
        "dashboardName": config["dashboardName"],
        "tagline": config["tagline"],
        "heroNarrative": config["heroNarrative"],
        "generatedAt": generated_at.isoformat(),
        "generatedDateLabel": generated_at.strftime("%B %d, %Y"),
        "summary": {
            "providerTargetCount": config["summary"]["providerTargetCount"],
            "geographyLevelCount": len(config["summary"]["geographyLevels"]),
            "sourceCount": config["summary"]["sourceCount"],
            "exportFormatCount": len(config["summary"]["exportFormats"]),
            "geographyLevels": config["summary"]["geographyLevels"],
            "exportFormats": config["summary"]["exportFormats"],
        },
        "statusCards": config["statusCards"],
        "dataSources": config["dataSources"],
        "analysisViews": config["analysisViews"],
        "metricFamilies": config["metricFamilies"],
        "roadmap": config["roadmap"],
        "providerUniverse": providers,
        "providerCategoryBreakdown": [
            {"label": label, "count": count}
            for label, count in sorted(provider_counter.items(), key=lambda item: (-item[1], item[0]))
        ],
        "providerSegmentBreakdown": [
            {"label": label, "count": count}
            for label, count in sorted(segment_counter.items(), key=lambda item: (-item[1], item[0]))
        ],
        "technologyCoverageBreakdown": [
            {"label": label, "count": count}
            for label, count in sorted(technology_counter.items(), key=lambda item: (-item[1], item[0]))
        ],
        "downloadCatalog": [
            {
                "id": "json",
                "title": "Current JSON snapshot",
                "description": "Full site payload for reuse in downstream analysis or ingestion tooling.",
            },
            {
                "id": "providers_csv",
                "title": "Provider universe CSV",
                "description": "Top-30 watchlist with categories, technologies, and notes.",
            },
            {
                "id": "metrics_csv",
                "title": "Metric dictionary CSV",
                "description": "Definitions for the core overlap, speed, and demographic modules.",
            },
            {
                "id": "sources_csv",
                "title": "Data sources CSV",
                "description": "Source readiness and fields expected in the ingest pipeline.",
            },
            {
                "id": "excel",
                "title": "Excel workbook",
                "description": "Workbook-style export containing providers, metrics, and source metadata.",
            },
        ],
    }


def main() -> None:
    config = load_config()
    snapshot = build_snapshot(config)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    providers_csv = csv_text(
        provider_rows(config["providers"]),
        ["rank", "name", "segment", "category", "technologies", "focus", "notes"],
    )
    metrics_csv = csv_text(
        metric_rows(config["metricFamilies"]),
        ["metric_family", "description"],
    )
    sources_csv = csv_text(
        source_rows(config["dataSources"]),
        ["source", "status", "detail", "fields"],
    )

    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2))
    PROVIDERS_CSV_PATH.write_text(providers_csv)
    METRICS_CSV_PATH.write_text(metrics_csv)
    SOURCES_CSV_PATH.write_text(sources_csv)

    print(f"Wrote {OUTPUT_PATH}")
    print(f"Wrote {PROVIDERS_CSV_PATH}")
    print(f"Wrote {METRICS_CSV_PATH}")
    print(f"Wrote {SOURCES_CSV_PATH}")


if __name__ == "__main__":
    main()
