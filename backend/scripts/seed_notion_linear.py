import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
load_dotenv()
from backend.sheets import run_ops

def seed_custom():
    clients = [
        {"id": "c1a2b3d4-0001-0001-0001-000000000001", "name": "Notion"},
        {"id": "c2b3d4e5-0002-0002-0002-000000000002", "name": "Linear"}
    ]
    rates = [25.0, 27.5, 30.0, 32.5, 35.0, 37.0, 40.0, 42.5, 45.0, 47.5, 50.0, 52.0, 53.5, 55.0]
    today = datetime.now().date()

    for client in clients:
        for i, rate in enumerate(rates):
            summary_date = (today - timedelta(days=13 - i)).strftime("%Y-%m-%d")
            total_queries = 20
            cited_count = int(round((rate / 100.0) * total_queries))
            
            source_rate = round(rate * 0.55, 1)
            
            comp_counts = {"Competitor1": 10, "Competitor2": 5}
            
            summary_data = {
                "client_id": client["id"],
                "summary_date": summary_date,
                "total_queries": total_queries,
                "cited_count": cited_count,
                "citation_rate": rate,
                "mention_count": cited_count,
                "mention_rate": rate,
                "source_citation_count": int(round((source_rate / 100.0) * total_queries)),
                "source_citation_rate": source_rate,
                "not_cited_queries": [],
                "competitor_citation_counts": comp_counts,
                "summary_text": f"{client['name']} citation rate is {rate:.1f}% on {summary_date}. Visibility is improving steadily."
            }
            run_ops.upsert_daily_summary(client["id"], summary_date, summary_data)
        print(f"Seeded 14 days of historical summaries for {client['name']}")

if __name__ == "__main__":
    seed_custom()
