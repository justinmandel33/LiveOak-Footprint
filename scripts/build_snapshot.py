#!/usr/bin/env python3

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "tracker_config.json"
OUTPUT_PATH = ROOT / "site" / "data" / "latest.json"

USER_AGENT = "Mozilla/5.0 (compatible; LiveOakFiberTracker/0.1; +https://github.com/)"


FETCH_RULES = {
    "liveoak": {
        "patterns": [
            (r"500\s*(?:Mbps|MBPS).*?\$59", "500 Mbps", "$59/mo"),
            (r"1\s*(?:G(?:bps|BPS)|Gig).*?\$89", "1 Gbps", "$89/mo"),
            (r"3\s*(?:G(?:bps|BPS)|Gig).*?\$109", "3 Gbps", "$109/mo"),
            (r"5\s*(?:G(?:bps|BPS)|Gig).*?\$139", "5 Gbps", "$139/mo"),
        ],
    },
    "xfinity": {
        "patterns": [
            (r"300\s*Mbps.*?\$45", "300 Mbps", "$45/mo"),
            (r"500\s*Mbps.*?\$60", "500 Mbps", "$60/mo"),
            (r"1\s*Gig.*?\$70", "1 Gig", "$70/mo"),
            (r"2\s*G(?:bps|BPS).*?\$100", "2 Gbps", "$100/mo"),
        ],
    },
    "cox": {
        "patterns": [
            (r"300\s*Mbps.*?\$55", "300 Mbps", "$55/mo"),
            (r"500\s*Mbps.*?\$75", "500 Mbps", "$75/mo"),
            (r"1\s*GIG.*?\$90", "1 GIG", "$90/mo"),
            (r"2\s*GIG.*?\$110", "2 GIG", "$110/mo"),
        ],
    },
    "tmobile-home": {
        "patterns": [
            (r"Rely.*?\$50", "Rely", "$50/mo"),
            (r"Amplified.*?\$60", "Amplified", "$60/mo"),
            (r"All-In.*?\$70", "All-In", "$70/mo"),
        ],
    },
    "starlink": {
        "patterns": [
            (r"Residential Lite.*?\$80", "Residential Lite", "$80/mo"),
            (r"Residential.*?\$120", "Residential", "$120/mo"),
        ],
    },
}


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def fetch_html(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8", errors="ignore")


def find_offers(provider_id: str, html: str) -> list[dict]:
    offers: list[dict] = []
    rules = FETCH_RULES.get(provider_id, {})
    for pattern, tier, price in rules.get("patterns", []):
        if re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL):
            offers.append({"tier": tier, "price": price})
    return offers


def refresh_provider(provider_id: str, provider: dict) -> dict:
    refreshed = {
        "providerId": provider_id,
        "name": provider["name"],
        "technology": provider["technology"],
        "confidence": provider["confidence"],
        "priceUrl": provider["priceUrl"],
        "priceSourceLabel": provider["priceSourceLabel"],
        "notes": provider["notes"],
        "offers": provider["fallbackOffers"],
        "refreshStatus": "fallback_used",
        "refreshDetail": "Loaded the seeded public-price snapshot.",
    }

    try:
        html = fetch_html(provider["priceUrl"])
        offers = find_offers(provider_id, html)
        if offers:
            refreshed["offers"] = offers
            refreshed["refreshStatus"] = "live_public_page_match"
            refreshed["refreshDetail"] = "Matched current pricing from the provider's public page."
        else:
            refreshed["refreshDetail"] = "Fetched the public page, but the current parser could not confidently match pricing tiers."
    except HTTPError as exc:
        refreshed["refreshDetail"] = f"Provider page returned HTTP {exc.code}; keeping the seeded public-price snapshot."
    except URLError as exc:
        refreshed["refreshDetail"] = f"Provider page fetch failed ({exc.reason}); keeping the seeded public-price snapshot."
    except Exception as exc:
        refreshed["refreshDetail"] = f"Unexpected refresh error ({exc.__class__.__name__}); keeping the seeded public-price snapshot."

    return refreshed


def build_snapshot(config: dict) -> dict:
    provider_catalog = {
        provider_id: refresh_provider(provider_id, provider)
        for provider_id, provider in config["providers"].items()
    }

    addresses = []
    for address in config["addresses"]:
        provider_rows = []
        for provider_id in address["providers"]:
            provider = provider_catalog[provider_id]
            provider_rows.append(
                {
                    "providerId": provider_id,
                    "name": provider["name"],
                    "technology": provider["technology"],
                    "availabilityStatus": "provisional_market_level",
                    "availabilityDetail": "Exact-address FCC confirmation is still pending. This row is based on public market coverage and pricing pages.",
                    "confidence": provider["confidence"],
                    "refreshStatus": provider["refreshStatus"],
                    "refreshDetail": provider["refreshDetail"],
                    "priceSourceLabel": provider["priceSourceLabel"],
                    "priceUrl": provider["priceUrl"],
                    "notes": provider["notes"],
                    "offers": provider["offers"],
                }
            )

        addresses.append(
            {
                "id": address["id"],
                "street": address["street"],
                "city": address["city"],
                "state": address["state"],
                "zip": address["zip"],
                "region": address["region"],
                "sampleAddressSource": address["sampleAddressSource"],
                "footprintStatus": address["footprintStatus"],
                "footprintNote": address["footprintNote"],
                "liveoakMarketSource": address["liveoakMarketSource"],
                "providers": provider_rows,
            }
        )

    generated_at = datetime.now(timezone.utc)
    return {
        "trackerName": config["trackerName"],
        "tagline": config["tagline"],
        "generatedAt": generated_at.isoformat(),
        "generatedDateLabel": generated_at.strftime("%B %d, %Y"),
        "summary": {
            "addressCount": len(addresses),
            "stateCount": len({address["state"] for address in addresses}),
            "providerCount": len(provider_catalog),
        },
        "confidenceLegend": config["dataConfidenceLegend"],
        "globalBlockers": config["globalBlockers"],
        "addresses": addresses,
    }


def main() -> None:
    config = load_config()
    snapshot = build_snapshot(config)
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2))
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
