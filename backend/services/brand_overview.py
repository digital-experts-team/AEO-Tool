from collections import Counter
from typing import List, Dict, Any, Optional

BUYING_INTENT_KEYWORDS = [
    "best", "buy", "where to", "cheapest", "affordable", "price",
    "deal", "discount", "purchase", "order", "shop", "top"
]
COMPARISON_KEYWORDS = [
    "vs", "versus", "compare", "difference between", "alternative",
    "better than", "or ", "which is", "alternatives to"
]
LOCATION_KEYWORDS = [
    "near", "in ", "hotel in", "restaurant in", "best in",
    "near me", "around", "city", "local", "area"
]

def classify_query_intent(query_text: str) -> str:
    q = query_text.lower()
    if any(k in q for k in COMPARISON_KEYWORDS):
        return "comparison"
    if any(k in q for k in BUYING_INTENT_KEYWORDS):
        return "buying_intent"
    if any(k in q for k in LOCATION_KEYWORDS):
        return "location"
    return "informational"

def calculate_ai_visibility_score(runs: List[Dict]) -> float:
    if not runs:
        return 0.0
    total = len(runs)
    mention_count = sum(1 for r in runs if str(r.get("brand_mentioned", "")).lower() == "true")
    citation_count = sum(1 for r in runs if str(r.get("brand_cited_as_source", "")).lower() == "true")
    positive_count = sum(1 for r in runs if str(r.get("brand_sentiment", "")).lower() == "positive")
    mention_rate = (mention_count / total) * 100
    citation_rate = (citation_count / total) * 100
    positive_pct = (positive_count / total) * 100
    score = (mention_rate * 0.35) + (citation_rate * 0.40) + (positive_pct * 0.25)
    return round(score, 1)

def calculate_visibility_trend(summaries: List[Dict]) -> str:
    if len(summaries) < 2:
        return "stable"
    try:
        latest = float(summaries[0].get("citation_rate", 0))
        oldest = float(summaries[-1].get("citation_rate", 0))
        diff = latest - oldest
        if diff > 2:
            return "up"
        if diff < -2:
            return "down"
        return "stable"
    except (ValueError, TypeError):
        return "stable"

def extract_perception_phrases(runs: List[Dict]) -> List[str]:
    phrases = [
        str(r.get("brand_description", "")).strip()
        for r in runs
        if r.get("brand_description") and str(r.get("brand_description")).strip()
        and str(r.get("brand_description")).strip().lower() not in ("none", "null", "")
    ]
    if not phrases:
        return []
    counter = Counter(phrases)
    return [phrase for phrase, _ in counter.most_common(5)]

def calculate_intent_breakdown(runs: List[Dict]) -> List[Dict]:
    groups: Dict[str, Dict] = {
        "buying_intent": {"total": 0, "cited": 0},
        "comparison": {"total": 0, "cited": 0},
        "location": {"total": 0, "cited": 0},
        "informational": {"total": 0, "cited": 0},
    }
    for r in runs:
        intent = classify_query_intent(str(r.get("query", "")))
        groups[intent]["total"] += 1
        if str(r.get("brand_mentioned", "")).lower() == "true":
            groups[intent]["cited"] += 1
    result = []
    for intent_type, data in groups.items():
        total = data["total"]
        cited = data["cited"]
        result.append({
            "intent_type": intent_type,
            "total_queries": total,
            "cited_count": cited,
            "citation_rate": round((cited / total * 100), 1) if total > 0 else 0.0
        })
    return result

def calculate_priority_gap_queries(runs: List[Dict]) -> List[Dict]:
    gap_runs = [
        r for r in runs
        if str(r.get("brand_mentioned", "")).lower() == "true"
        and str(r.get("brand_cited_as_source", "")).lower() == "false"
    ]
    query_data: Dict[str, Dict] = {}
    for r in gap_runs:
        q = str(r.get("query", "")).strip()
        if not q:
            continue
        if q not in query_data:
            query_data[q] = {"competitors": set(), "times_missed": 0}
        query_data[q]["times_missed"] += 1
        for comp in r.get("competitors_mentioned", []):
            if comp:
                query_data[q]["competitors"].add(str(comp).strip())
    sorted_queries = sorted(
        query_data.items(),
        key=lambda x: len(x[1]["competitors"]),
        reverse=True
    )
    result = []
    for rank, (query_text, data) in enumerate(sorted_queries[:5], start=1):
        comps = list(data["competitors"])
        result.append({
            "query_text": query_text,
            "competitor_count": len(comps),
            "competitors": comps,
            "times_missed": data["times_missed"],
            "priority_rank": rank
        })
    return result

def calculate_competitor_dominance(runs: List[Dict]) -> Dict[str, int]:
    all_comps = []
    for r in runs:
        all_comps.extend(r.get("competitors_mentioned", []))
    counter = Counter(c.strip() for c in all_comps if c and c.strip())
    return dict(counter.most_common(10))

def calculate_sentiment_trend(runs: List[Dict]) -> List[Dict]:
    date_groups: Dict[str, Dict] = {}
    for r in runs:
        date = str(r.get("run_date", ""))[:10]
        if not date:
            continue
        if date not in date_groups:
            date_groups[date] = {"positive": 0, "neutral": 0, "negative": 0, "total": 0}
        sentiment = str(r.get("brand_sentiment", "neutral")).lower()
        date_groups[date]["total"] += 1
        if sentiment in ("positive", "neutral", "negative"):
            date_groups[date][sentiment] += 1
    result = []
    for date in sorted(date_groups.keys()):
        data = date_groups[date]
        total = data["total"] or 1
        result.append({
            "date": date,
            "positive_pct": round(data["positive"] / total * 100, 1),
            "neutral_pct": round(data["neutral"] / total * 100, 1),
            "negative_pct": round(data["negative"] / total * 100, 1)
        })
    return result[-30:]

def calculate_top_cited_sources(runs: List[Dict]) -> List[str]:
    all_urls = []
    for r in runs:
        all_urls.extend(r.get("source_urls", []))
    counter = Counter(u.strip() for u in all_urls if u and u.strip())
    return [url for url, _ in counter.most_common(5)]

def calculate_industry_insights(
    runs: List[Dict],
    industry: str,
    queries: List[str]
) -> Dict[str, Any]:
    ind = industry.lower()

    if any(k in ind for k in ["ecommerce", "retail", "shopping", "commerce"]):
        categories = {
            "electronics": ["phone", "laptop", "tv", "camera", "gadget", "device"],
            "fashion": ["clothing", "dress", "shoes", "fashion", "wear", "outfit"],
            "grocery": ["grocery", "food", "vegetable", "fruit", "supermarket"],
            "beauty": ["beauty", "skincare", "makeup", "cosmetic", "hair"],
            "home": ["furniture", "home", "decor", "kitchen", "appliance"]
        }
        category_breakdown = {}
        for cat, keywords in categories.items():
            cat_runs = [
                r for r in runs
                if any(k in str(r.get("query", "")).lower() for k in keywords)
            ]
            if cat_runs:
                cited = sum(1 for r in cat_runs if str(r.get("brand_mentioned", "")).lower() == "true")
                category_breakdown[cat] = {
                    "total": len(cat_runs),
                    "cited": cited,
                    "citation_rate": round(cited / len(cat_runs) * 100, 1)
                }
        buying_intent_runs = [
            r for r in runs
            if classify_query_intent(str(r.get("query", ""))) == "buying_intent"
        ]
        top_buying = sorted(
            buying_intent_runs,
            key=lambda x: len(x.get("competitors_mentioned", [])),
            reverse=True
        )[:5]
        return {
            "product_category_breakdown": category_breakdown,
            "top_buying_intent_queries": [
                {"query": r.get("query"), "competitors": r.get("competitors_mentioned", [])}
                for r in top_buying
            ]
        }

    if any(k in ind for k in ["saas", "software", "tech", "productivity", "app"]):
        use_cases = {
            "project_management": ["project", "task", "kanban", "sprint", "deadline"],
            "note_taking": ["note", "wiki", "document", "writing", "knowledge"],
            "collaboration": ["team", "collaborate", "share", "workspace", "together"],
            "automation": ["automate", "workflow", "integration", "zapier", "trigger"],
            "analytics": ["analytics", "dashboard", "report", "metric", "insight"]
        }
        use_case_coverage = {}
        for uc, keywords in use_cases.items():
            uc_runs = [
                r for r in runs
                if any(k in str(r.get("query", "")).lower() for k in keywords)
            ]
            if uc_runs:
                cited = sum(1 for r in uc_runs if str(r.get("brand_mentioned", "")).lower() == "true")
                use_case_coverage[uc] = {
                    "total": len(uc_runs),
                    "cited": cited,
                    "citation_rate": round(cited / len(uc_runs) * 100, 1)
                }
        comparison_runs = [
            r for r in runs
            if classify_query_intent(str(r.get("query", ""))) == "comparison"
        ]
        return {
            "use_case_coverage": use_case_coverage,
            "comparison_query_performance": [
                {
                    "query": r.get("query"),
                    "brand_mentioned": str(r.get("brand_mentioned", "")).lower() == "true",
                    "brand_cited": str(r.get("brand_cited_as_source", "")).lower() == "true",
                    "competitors": r.get("competitors_mentioned", [])
                }
                for r in comparison_runs
            ],
            "ai_brand_positioning": extract_perception_phrases(runs)
        }

    if any(k in ind for k in ["hotel", "hospitality", "travel", "restaurant", "tourism"]):
        location_runs = [
            r for r in runs
            if classify_query_intent(str(r.get("query", ""))) == "location"
        ]
        buying_runs = [
            r for r in runs
            if classify_query_intent(str(r.get("query", ""))) == "buying_intent"
        ]
        loc_cited = sum(1 for r in location_runs if str(r.get("brand_mentioned", "")).lower() == "true")
        buy_cited = sum(1 for r in buying_runs if str(r.get("brand_mentioned", "")).lower() == "true")
        total = len(runs) or 1
        pos = sum(1 for r in runs if str(r.get("brand_sentiment", "")).lower() == "positive")
        neu = sum(1 for r in runs if str(r.get("brand_sentiment", "")).lower() == "neutral")
        neg = sum(1 for r in runs if str(r.get("brand_sentiment", "")).lower() == "negative")
        return {
            "location_query_dominance": {
                "total": len(location_runs),
                "cited": loc_cited,
                "citation_rate": round(loc_cited / len(location_runs) * 100, 1) if location_runs else 0.0
            },
            "booking_intent_score": {
                "total": len(buying_runs),
                "cited": buy_cited,
                "citation_rate": round(buy_cited / len(buying_runs) * 100, 1) if buying_runs else 0.0
            },
            "sentiment_summary": {
                "positive_pct": round(pos / total * 100, 1),
                "neutral_pct": round(neu / total * 100, 1),
                "negative_pct": round(neg / total * 100, 1)
            }
        }

    return {
        "intent_breakdown": calculate_intent_breakdown(runs),
        "competitor_dominance": calculate_competitor_dominance(runs)
    }
