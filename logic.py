import re
import pandas as pd
import string
import collections
from rapidfuzz import process, fuzz
from datetime import datetime, timezone

# Database & Fetch Logic
from database import engine, load_author_profile, save_author_profile
from fetchProfile import get_scholar_profile

def normalize_text(s: str) -> str:
    if not isinstance(s, str): return ""
    s = s.lower()
    s = re.sub(r'\b\d+(st|nd|rd|th)\b', '', s)
    s = re.sub(r'\b\d+[-–]\d+\b', '', s) 
    s = re.sub(r'\b(pp|vol|no|issue)\.?\s*\d+', '', s)
    s = re.sub(r'\b(19|20)\d{2}\b', '', s)
    s = re.sub(r'\b\d+\b', '', s)
    s = s.translate(str.maketrans("", "", string.punctuation))
    return re.sub(r"\s+", " ", s).strip()

def get_rank_from_row(row):
    val = row.get("rank")
    if pd.notna(val) and str(val).strip() not in ["", "-", "nan", "None"]:
        return str(val).strip()
    return "-"

def load_quality_data():
    """ Fetches the faculty quality data from Supabase. """
    with engine.begin() as conn:
        journals = pd.read_sql("SELECT * FROM journals_quality", conn)
        conferences = pd.read_sql("SELECT * FROM conferences_quality", conn)
    
    journals["Title"] = journals["Title"].astype(str)
    conferences["Title"] = conferences["Title"].astype(str)
    
    journals["Title_norm"] = journals["Title"].apply(normalize_text)
    conferences["Title_norm"] = conferences["Title"].apply(normalize_text)

    return journals, conferences

def extract_top_keywords(df, top_n=5):
    STOPWORDS = {
        'using', 'based', 'approach', 'system', 'analysis', 'study', 'research',
        'evaluation', 'framework', 'method', 'towards', 'process', 'new', 'multi',
        'systematic', 'review', 'perspective', 'case', 'application', 'design',
        'efficient', 'optimization', 'performance', 'modeling', 'via', 'learning',
        'intelligent', 'automated', 'data', 'information', 'implementation', 'with',
        'and', 'of', 'a', 'in', 'for', 'on', 'to', 'an', 'at', 'survey', 'development',
        'comparative', 'algorithm', 'model', 'data', 'user' , 'proposed'
    }
    
    words = []
    for title in df['title']:
        clean_title = re.sub(r'[^a-zA-Z\s]', '', str(title)).lower()
        for word in clean_title.split():
            if len(word) > 3 and word not in STOPWORDS:
                words.append(word)       
    counts = collections.Counter(words).most_common(top_n)

    return [{"text": word, "count": count} for word, count in counts]

print("Loading Quality Data...")
journals, conferences = load_quality_data()

def get_lookup_dicts(journals_df, conferences_df):
    lookup = {}

    # Journals
    if "Title_norm" in journals_df.columns:
        for _, row in journals_df.iterrows():
            norm = row["Title_norm"]
            lookup[norm] = ("Journal", row["Title"], get_rank_from_row(row))

    # Conferences
    if "Title_norm" in conferences_df.columns:
        for _, row in conferences_df.iterrows():
            norm = row["Title_norm"]
            lookup[norm] = ("Conference", row["Title"], get_rank_from_row(row))

    return lookup

lookup_map = get_lookup_dicts(journals, conferences)


def extract_author_id(url):
    if "scholar.google" not in url:
        return None
    match = re.search(r"user=([\w-]+)", url)
    return match.group(1) if match else None


def load_or_fetch_author(author_id: str, refresh_days: int = 7, force_refresh: bool = False):
    # if NOT forcing refresh, try to load from db
    if not force_refresh:
        profile = load_author_profile(author_id)

        if profile:
            last_scraped = profile.get("last_scraped")
            if last_scraped:
                if last_scraped.tzinfo is None:
                    last_scraped = last_scraped.replace(tzinfo=timezone.utc)
                
                # check if cache is still valid
                if (datetime.now(timezone.utc) - last_scraped).days < refresh_days:
                    return profile

    # if force_refresh is True OR cache is old/missing, scrape fresh
    scraped_data = get_scholar_profile(author_id)
    save_author_profile(scraped_data)
    
    # reload from DB to ensure clean format
    clean_profile = load_author_profile(author_id)

    return clean_profile

def guesser(venue: str) -> str:
    """
    Guess if the venue is a conference or journal based on keywords and strong acronyms.
    If a venue has keywords that definetly only belong to conferences then we set the conference_certainty = TRUE
        - Goal here is to avoid false matches due to high token overlap with the journals quality data
    Input: venue string
    Return: "conference", "journal", or "unknown" and boolean for conference quality 
    """
    v = venue.lower()
    conf_keywords = [
        "conference", "conf.", "workshop", "symposium", "proceedings",
        "meeting", "colloquium", "seminar", "summit", "annual"
    ]
    journ_keywords = [
        "journal", "transactions", "trans.", "letters", "magazine",
        "revue", "revista", "annals", "archives", "bulletin", "preprints", "print"
    ]
    conf_acronyms = [
        "icml", "neurips", "nips", "aaai", "ijcai", "cvpr", "iccv", "eccv",
        "kdd", "sdm", "aistats", "emnlp", "acl", "naacl", "eacl", "iclr",
        "icra", "iros", "uai", "ecml", "pkdd"
    ]
    conference_certainty = False
    if any(k in v for k in conf_keywords):
        conference_certainty = True
        return("Conference", conference_certainty)
    if any(a in v for a in conf_acronyms):
        return("Conference", conference_certainty)
    if any(k in v for k in journ_keywords):
        return("Journal", conference_certainty)
    return("Unknown", conference_certainty)

def match_quality(venue: str, is_cs_ai=False):
    """
    For each venue:
      1) guesser(venue) -> hint + conference_confidence
      2) Try exact match OR token overlap >= 0.70 in the hinted dataset(s)
      3) Only if conference_confidence == False: fuzzy fallback (avoid matching false journals)
    Returns:
      (match_type, matched_title, rank, match_score, source)
    """
    # --- guards ---
    if pd.isna(venue) or not isinstance(venue, str) or not venue.strip():
        return ("Error", None, "-", 0.0, "Invalid venue")

    venue_norm = normalize_text(venue)
    if not venue_norm:
        return ("Error", None, "-", 0.0, "Normalization failed")

    venue_tokens = set(venue_norm.split())
    if not venue_tokens:
        return ("Error", None, "-", 0.0, "No tokens")

    hint, conference_confidence = guesser(venue)  
    
    def clean_rank(val):
        if pd.isna(val):
            return "-"
        s = str(val).strip()
        return s if s and s.lower() not in {"nan", "none"} else "-"

    # --- choose search order based on hint + confidence ---
    if hint == "conference":
        search_order = [(conferences, "Conference")]
        # only try journals too if not fully confident it's a conference
        if not conference_confidence:
            search_order.append((journals, "Journal"))
    elif hint == "journal":
        search_order = [(journals, "Journal"), (conferences, "Conference")]
    else:
        search_order = [(conferences, "Conference"), (journals, "Journal")]

    # --- stage 1: exact OR token overlap >= 0.70 ---
    def exact_or_token_match(df: pd.DataFrame, kind: str):
        if df is None or df.empty or "Title_norm" not in df.columns:
            return None

        for _, row in df.iterrows():
            title_raw = row.get("Title")
            title_norm = row.get("Title_norm")

            if pd.isna(title_raw) or pd.isna(title_norm):
                continue

            title_norm = str(title_norm).strip()
            if not title_norm:
                continue

            # Exact normalized match
            if venue_norm == title_norm:
                return (
                    kind,
                    str(title_raw),
                    clean_rank(row.get("rank")),
                    100.0,
                    "DB (Exact)",
                )

            # Token overlap >= 70%
            title_tokens = set(title_norm.split())
            if not title_tokens:
                continue

            overlap = len(venue_tokens & title_tokens) / max(len(venue_tokens), len(title_tokens))
            if overlap >= 0.70:
                return (
                    kind,
                    str(title_raw),
                    clean_rank(row.get("rank")),
                    round(overlap * 100, 2),
                    "DB (Token≥70%)",
                )

        return None

    for df, kind in search_order:
        res = exact_or_token_match(df, kind)
        if res:
            return res

    # --- stage 2: fuzzy ONLY if conference_confidence is False ---
    if conference_confidence is False:
        def best_fuzzy(df: pd.DataFrame, kind: str):
            if df is None or df.empty or "Title" not in df.columns:
                return None

            titles = df["Title"].astype(str).tolist()
            result = process.extractOne(venue, titles, scorer=fuzz.WRatio)
            if not result:
                return None

            match_title, score, _ = result
            row = df[df["Title"].astype(str) == str(match_title)].iloc[0]
            return (
                kind,
                str(match_title),
                clean_rank(row.get("rank")),
                float(score),
                "DB (Fuzzy)",
            )

        candidates = []
        if hint == "conference":
            c = best_fuzzy(conferences, "Conference")
            if c: candidates.append(c)
        elif hint == "journal":
            j = best_fuzzy(journals, "Journal")
            if j: candidates.append(j)
        else:
            c = best_fuzzy(conferences, "Conference")
            if c: candidates.append(c)
            j = best_fuzzy(journals, "Journal")
            if j: candidates.append(j)

        if candidates:
            best = max(candidates, key=lambda x: x[3])
            if best[3] >= 90:  
                return best

    return (hint, None, "-", 0.0, "No match")

def evaluate_author_data_headless(data, cs_ai):

    df = pd.DataFrame(data["publications"])
    
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["citations"] = pd.to_numeric(df["citations"], errors="coerce").fillna(0).astype(int)
    
    # --- OPTIMIZED Venue Matching ---
    if "venue_type" not in df.columns: df["venue_type"] = None
    if "rank" not in df.columns: df["rank"] = None
    if "matched_title" not in df.columns: df["matched_title"] = None
    if "match_score" not in df.columns: df["match_score"] = 0.0
    if "source" not in df.columns: df["source"] = None
        
    needs_match_mask = (df["rank"].isna() | (df["rank"] == "-") | (df["venue_type"].isna()))
    venues_to_match = df.loc[needs_match_mask, "venue"].dropna().unique().tolist()
    
    venue_cache = {}
    
    for venue in venues_to_match:
        venue_cache[venue] = match_quality(venue, cs_ai)
    
    def merge_match(row):
        if row["venue"] in venue_cache:
            return venue_cache[row["venue"]]
        return (row.get("venue_type"), row.get("matched_title"), row.get("rank"), row.get("match_score"), row.get("source"))

    df[["venue_type", "matched_title", "rank", "match_score", "source"]] = df.apply(
        lambda r: pd.Series(merge_match(r)), axis=1
    )

    # --- Calculate Academic Metrics ---
    citations = sorted(df["citations"].tolist(), reverse=True)
    h_index = sum(x >= i + 1 for i, x in enumerate(citations))
    i10_index = sum(x >= 10 for x in citations)
    
    g_index = 0
    for i in range(len(citations)):
        if sum(citations[:i+1]) >= (i+1)**2: 
            g_index = i + 1
    
    min_year = df["year"].min()
    current_year = datetime.now().year
    academic_age = current_year - min_year if pd.notna(min_year) else 1
    if academic_age < 1: academic_age = 1

    # --- Author Cleaning & Network Size ---
    target_name_parts = data["name"].lower().split()
    target_last = target_name_parts[-1]

    all_authors = []
    for auth_str in df["authors"].dropna():
        names = [n.strip() for n in str(auth_str).split(",")]
        clean_names = [n for n in names if "..." not in n and len(n) > 1]
        all_authors.extend(clean_names)
    
    unique_authors = set(all_authors)
    unique_authors = {a for a in unique_authors if target_last not in a.lower()}
    network_size = len(unique_authors)

    # --- Role Logic ---
    def get_role(authors_str):
        if not authors_str: return "Unknown"
        parts_raw = [p.strip().lower() for p in str(authors_str).split(",")]
        has_ellipsis = any("..." in p for p in parts_raw)
        parts = [p for p in parts_raw if "..." not in p]
        
        if not parts: return "Unknown"
        if len(parts) == 1:
            return "Solo Author" if target_last in parts[0] else "Unknown"
        if target_last in parts[0]: return "First Author"
        if not has_ellipsis and target_last in parts[-1]: return "Last Author"
        for p in parts[1:]:
            if target_last in p: return "Co-Author"
        if has_ellipsis: return "Ambiguous"
        return "Unknown"

    df["role"] = df["authors"].apply(get_role)
    
    lead_count = df[df["role"].isin(["Solo Author", "First Author"])].shape[0]
    leadership_score = round((lead_count / len(df)) * 100, 1) if len(df) > 0 else 0

    # --- Recent & Impact Metrics ---
    recent_df = df[df["year"] >= (current_year - 5)]
    recent_p = len(recent_df)
    recent_c = recent_df["citations"].sum()

    total_c = df["citations"].sum()
    max_c = df["citations"].max() if len(df) > 0 else 0
    one_hit = round((max_c / total_c) * 100, 1) if total_c > 0 else 0
    
    res = {
        "id": data["author_id"], 
        "name": data["name"],
        "total_p": len(df), 
        "total_c": int(total_c),
        "h_index": h_index, 
        "i10_index": i10_index, 
        "g_index": g_index,
        "academic_age": int(academic_age),
        "cpp": round(df["citations"].mean(), 1) if len(df) > 0 else 0,
        "leadership_score": leadership_score,
        "network_size": network_size,
        "recent_p": recent_p, 
        "recent_c": int(recent_c),
        "one_hit": one_hit,
        "keywords": extract_top_keywords(df)
    }
    
    return res, df
