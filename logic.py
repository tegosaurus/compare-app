import re
import string
import pandas as pd
import collections
from rapidfuzz import process, fuzz
from datetime import datetime, timezone

from database import engine, load_author_profile, save_author_profile
from fetchProfile import get_scholar_profile

# --- GLOBAL HELPERS ---

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

# --- GLOBAL INITIALIZATION (runs once at startup) ---
print("Loading Faculty Quality Data...")
journals, conferences = load_quality_data()

def get_lookup_dicts(journals_df, conferences_df):
    lookup = {}
    
    # process journals
    if "Title_norm" in journals_df.columns:
        for _, row in journals_df.iterrows():
            norm = row["Title_norm"]
            lookup[norm] = ("Journal", row["Title"], get_rank_from_row(row))
            
    # process conferences
    if "Title_norm" in conferences_df.columns:
        for _, row in conferences_df.iterrows():
            norm = row["Title_norm"]
            lookup[norm] = ("Conference", row["Title"], get_rank_from_row(row))
            
    return lookup

lookup_map = get_lookup_dicts(journals, conferences)


# --- CORE LOGIC FUNCTIONS ---

def extract_author_id(url):
    if "scholar.google" not in url: return None
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
    v = venue.lower()
    if any(k in v for k in ["conference", "conf.", "proc.", "proceedings", "workshop", "symposium", "neurips", "cvpr", "iccv", "icml"]): return "conference"
    if any(k in v for k in ["journal", "transactions", "trans.", "letters", "magazine"]): return "journal"
    return "unknown"

def match_quality(venue, is_cs_ai=False):
    if pd.isna(venue) or not isinstance(venue, str) or venue.strip() == "":
        return None, None, None, 0, "None"
    
    venue_norm = normalize_text(venue)
    if not venue_norm: return "Unranked", None, "-", 0, "Failed"

    # exact match
    if venue_norm in lookup_map:
        kind, title, rank = lookup_map[venue_norm]
        return kind, title, rank, 100.0, "Exact Match"

    # acronyms
    venue_acronym_match = re.search(r'\b([A-Z]{3,})\b', venue)
    if venue_acronym_match:
        acronym = venue_acronym_match.group(1).lower()
        if "acronym" in conferences.columns:
            match = conferences[conferences["acronym"] == acronym]
            if not match.empty:
                row = match.iloc[0]
                return "Conference", row["Title"], get_rank_from_row(row), 100.0, "Acronym"

    # fuzzy logic
    hint = guesser(venue)
    
    def search_table(df, kind_label):
        matches = df[df["Title_norm"].str.contains(venue_norm, regex=False, na=False)]
        if not matches.empty:
            best_row = matches.loc[matches["Title_norm"].str.len().idxmin()]
            return (kind_label, best_row["Title"], get_rank_from_row(best_row), 95.0, "Substring")
            
        match = process.extractOne(venue_norm, df["Title_norm"].tolist(), scorer=fuzz.WRatio, score_cutoff=85)
        if match:
            norm_title, score, idx = match
            row = df.iloc[idx]
            return (kind_label, row["Title"], get_rank_from_row(row), score, "Fuzzy")
        return None

    best_match = None
    if hint == "conference":
        best_match = search_table(conferences, "Conference")
    elif hint == "journal":
        best_match = search_table(journals, "Journal")
    else:
        match_c = search_table(conferences, "Conference")
        match_j = search_table(journals, "Journal")
        score_c = match_c[3] if match_c else 0
        score_j = match_j[3] if match_j else 0
        
        if score_c == 0 and score_j == 0: best_match = None
        elif score_c >= score_j: best_match = match_c
        else: best_match = match_j

    if best_match: return best_match
    return "Unranked", None, "-", 0, "Failed"

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
