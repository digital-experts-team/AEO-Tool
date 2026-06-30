import os
import sys
import json
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure backend package is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

load_dotenv()

from backend.sheets import client_ops, run_ops

def seed_data():
    sheet_id = os.getenv("GOOGLE_SHEET_ID")
    if not sheet_id:
        print("ERROR: GOOGLE_SHEET_ID environment variable is missing.")
        print("Please configure .env before running this script.")
        return

    print(f"Connecting to Google Sheet ID: {sheet_id}...")

    queries = [
        "best project management software for small teams",
        "what is the top CRM for startups",
        "who makes the best project tracking tool",
        "project management software comparison",
        "best software for team collaboration",
        "top rated CRM tools 2025",
        "which project management tool do experts recommend",
        "affordable project management for agencies",
        "best CRM with email integration",
        "project management software with time tracking"
    ]

    client_payload = {
        "name": "Test Client — Acme Software",
        "brand_name": "Acme Software",
        "brand_aliases": ["Acme", "AcmeSoft"],
        "competitors": ["CompetitorOne", "CompetitorTwo", "CompetitorThree"],
        "queries": queries,
        "is_active": True
    }

    print("Creating test client record...")
    client = client_ops.create_client(client_payload)
    if not client:
        print("ERROR: Failed to create test client in Google Sheets.")
        return

    client_id = client["id"]
    print(f"Successfully created client: '{client['name']}' (ID: {client_id})")

    # Create 14 days of fake daily_summaries rows
    print("Generating 14 days of historical daily summaries...")
    rates = [25.0, 27.5, 30.0, 32.5, 35.0, 37.0, 40.0, 42.5, 45.0, 47.5, 50.0, 52.0, 53.5, 55.0]
    today = datetime.now().date()

    for i, rate in enumerate(rates):
        summary_date = (today - timedelta(days=13 - i)).strftime("%Y-%m-%d")
        total_queries = 20
        cited_count = int(round((rate / 100.0) * total_queries))
        
        comp_counts = {
            "CompetitorOne": 12,
            "CompetitorTwo": 6,
            "CompetitorThree": 3
        }

        summary_text = (
            f"Acme Software citation rate reached {rate:.1f}% on {summary_date}. "
            f"Brand presence showed steady visibility across generative engine responses for core PM and CRM queries. "
            f"CompetitorOne continues to lead mentions in general comparisons; strategic content updates are recommended."
        )

        summary_data = {
            "client_id": client_id,
            "summary_date": summary_date,
            "total_queries": total_queries,
            "cited_count": cited_count,
            "citation_rate": rate,
            "not_cited_queries": queries[cited_count % len(queries):],
            "competitor_citation_counts": comp_counts,
            "summary_text": summary_text
        }

        run_ops.upsert_daily_summary(client_id, summary_date, summary_data)

    print("\n==================================================")
    print("SUCCESS: Test data successfully seeded into Google Sheets!")
    print(f"Created Client ID: {client_id}")
    print(f"Dashboard URL: http://localhost:3000/client/{client_id}")
    print("==================================================\n")

if __name__ == "__main__":
    seed_data()
