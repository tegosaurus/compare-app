import os
from sqlalchemy import create_engine, Table, Column, Integer, Float, String, Text, ForeignKey, MetaData, DateTime, text
from sqlalchemy.dialects.postgresql import JSONB, insert
from dotenv import load_dotenv
from datetime import datetime, timezone
import pandas as pd
import re
import string
import numpy as np

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=1800)
metadata = MetaData()

# TABLES
researchers = Table(
    "researchers", metadata,
    Column("id", String, primary_key=True),
    Column("name", String),
    Column("affiliations", Text),
    Column("metrics", JSONB),
    Column("co_authors", JSONB),
    Column("last_scraped", DateTime(timezone=True)) 
)

publications = Table(
    "publications", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("researcher_id", String, ForeignKey("researchers.id", ondelete="CASCADE")),
    Column("title", Text),
    Column("authors", Text),
    Column("venue", Text),
    Column("year", Integer),
    Column("citations", Integer),
    Column("author_pos", String),
    Column("venue_type", String),  
    Column("rank", String),  
    Column("match_score", Float),  
    Column("source", String)
)

journals_quality = Table(
    "journals_quality", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("Title", Text, index=True),
    Column("Title_norm", Text, index=True),
    Column("rank", String),
    Column("issn", String)
)

conferences_quality = Table(
    "conferences_quality", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("Title", Text, index=True),
    Column("Title_norm", Text, index=True),
    Column("acronym", String, index=True),
    Column("rank", String)
)

def init_db():
    metadata.create_all(engine)

def safe_int(value):
    if value in (None, "", " "): return None
    try: return int(value)
    except: return None

def save_author_profile(profile: dict):
    with engine.begin() as conn:
        # 1. update researcher info 
        stmt = insert(researchers).values(
            id=profile["author_id"],
            name=profile["name"],
            affiliations=profile["affiliations"],
            metrics=profile["metrics"],
            co_authors=profile["co_authors"],
            last_scraped=datetime.now(timezone.utc)
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "name": profile["name"],
                "affiliations": profile["affiliations"],
                "metrics": profile["metrics"],
                "co_authors": profile["co_authors"],
                "last_scraped": datetime.now(timezone.utc)
            }
        )
        conn.execute(stmt)

        # 2. delete old publications
        conn.execute(publications.delete().where(publications.c.researcher_id == profile["author_id"]))

        # 3. insert new publications 
        publication = []
        seen_titles = set()  # checklist to track titles added
        
        for pub in profile["publications"]:
            title = pub.get("title")
            
            # deduplication check
            if not title or title in seen_titles:
                continue 
            seen_titles.add(title)
            
            publication.append({
                "researcher_id": profile["author_id"],
                "title": title,
                "authors": pub.get("authors"),
                "venue": pub.get("venue"),
                "year": safe_int(pub.get("year")), 
                "citations": safe_int(pub.get("citations")) or 0,
                "author_pos": pub.get("author_pos")
            })
            
        if publication:
            conn.execute(publications.insert(), publication)

def load_author_profile(author_id: str):
    with engine.begin() as conn:
        row = conn.execute(researchers.select().where(researchers.c.id == author_id)).fetchone()
        
        if not row: 
            return None

        profile = dict(row._mapping) 
        profile["author_id"] = profile["id"]

        # if DB returns a naive datetime (no timezone), force it to UTC
        if profile.get("last_scraped") and profile["last_scraped"].tzinfo is None:
            profile["last_scraped"] = profile["last_scraped"].replace(tzinfo=timezone.utc)

        # load publications
        # sort by year (newest), then citations (highest), then title (A-Z)
        pubs = conn.execute(
            publications.select()
            .where(publications.c.researcher_id == author_id)
            .order_by(
                publications.c.year.desc().nulls_last(),
                publications.c.citations.desc().nulls_last(),
                publications.c.title.asc()
            )
        ).fetchall()
        profile["publications"] = [dict(p._mapping) for p in pubs]

        return profile
    
def update_publication_venues(author_id: str, df):
    with engine.begin() as conn:
        for _, row in df.iterrows():

            conn.execute(
                publications.update()
                .where(
                    (publications.c.researcher_id == author_id) &
                    (publications.c.title == row["title"])
                )
                .values(
                    venue_type=row.get("venue_type"),
                    rank=row.get("rank"),
                    match_score=row.get("match_score"),
                    source=row.get("source")
                )
            )

# --- uploadButton addition ---

def update_quality_list_in_db(df, list_type, mode="replace"):
    """
    Updates the journals_quality or conferences_quality table using smart column detection.
    """
    
    # --- LOGIC PORTED FROM SCRIPT ---
    
    def normalize_text(s):
        if not isinstance(s, str): return ""
        s = str(s).lower()
        s = re.sub(r'\(.*?\)', '', s)
        s = re.sub(r'\[.*?\]', '', s)
        s = s.replace("-", " ").replace("–", " ")
        s = re.sub(r'\b(19|20)\d{2}\b', '', s)
        s = re.sub(r'\b\d+(st|nd|rd|th)\b', '', s)
        s = re.sub(r'\b(pp|vol|no|issue)\.?\s*\d+', '', s)
        s = re.sub(r'\b\d+\b', '', s)
        s = s.translate(str.maketrans("", "", string.punctuation))
        return re.sub(r"\s+", " ", s).strip()

    def get_latest_rank_dynamic(row):
        valid_cols = [c for c in row.index if pd.notna(row[c]) and str(row[c]).strip() not in ["", "-", "nan", "None", "0", "0.0", "N/A", "Unranked"]]
        candidates = []

        for col in valid_cols:
            c_lower = col.lower()
            bad_keywords = ["code", "id", "link", "url", "h5", "index", "metric", "comment", "issn", "isbn", "name", "title", "acronym", "citescore",
                            "sjr", "snip", "categories", "publisher", "type", "open access"]
            if any(bad in c_lower for bad in bad_keywords):
                continue

            if any(k in c_lower for k in ["core", "icore", "era", "rank", "quartile"]):
                years = re.findall(r'\d{4}', col)
                year = int(years[0]) if years else 0
                
                if "quartile" in c_lower: bonus = 200
                elif "core" in c_lower or "icore" in c_lower: bonus = 100
                else: bonus = 0

                candidates.append((year + bonus, col, row[col]))

        candidates.sort(key=lambda x: x[0], reverse=True)
        if candidates: 
            return str(candidates[0][2]).strip()
        return "Unknown"

    # --- PREPARE DATA ---

    # Clean empty strings
    df.replace(["-", "–", ""], np.nan, inplace=True)
    
    # Helper to safely grab a column if it exists
    def get_col(names):
        for n in names:
            if n in df.columns: return df[n]
        return None

    if list_type == "journal":
        target_table = "journals_quality"
        
        # Priority for Title: Title -> Journal Name -> title
        title_col = get_col(["Title", "Journal Name", "title", "journal name"])
        if title_col is None: 
            # If no title column found, we can't proceed
            return 0
        
        # Priority for ISSN
        issn_col = get_col(["Print ISSN", "print issn", "ISSN", "issn"])
        if issn_col is None:
            issn_col = pd.Series([None] * len(df))
        
        # Fill E-ISSN if Print is missing
        e_issn = get_col(["E-ISSN", "e-issn", "eissn"])
        if e_issn is not None:
            issn_col = issn_col.fillna(e_issn)

        final_df = pd.DataFrame({
            "Title": title_col,
            "Title_norm": title_col.apply(normalize_text),
            "rank": df.apply(get_latest_rank_dynamic, axis=1),
            "issn": issn_col
        })

    elif list_type == "conference":
        target_table = "conferences_quality"

        # Grab Primary Title Column (GS Name or DBLP or Title)
        title_col = get_col(["GS Name", "Conference Name (DBLP)", "Title", "title"])
        if title_col is None:
             title_col = pd.Series([None] * len(df))

        # Fill gaps with fallback columns (chaining .fillna)
        for fallback in ["Conference Name (DBLP)", "CORE Conference Name", "ERA Conference Name"]:
            if fallback in df.columns:
                title_col = title_col.fillna(df[fallback])

        # Grab Primary Acronym
        acronym_col = get_col(["Acronym", "acronym"])
        if acronym_col is None:
            acronym_col = pd.Series([None] * len(df))

        # Fill gaps in Acronym
        for fallback in ["Acronym (DBLP)", "ERA Acronym"]:
            if fallback in df.columns:
                acronym_col = acronym_col.fillna(df[fallback])

        final_df = pd.DataFrame({
            "Title": title_col,
            "Title_norm": title_col.apply(normalize_text),
            "acronym": acronym_col.astype(str).str.lower().replace("nan", ""),
            "rank": df.apply(get_latest_rank_dynamic, axis=1)
        })

    # Filter out invalid rows (where Title didn't exist or normalized to empty)
    final_df = final_df[final_df["Title_norm"] != ""]
    
    # Final cleanup for SQL (convert NaN to None)
    final_df = final_df.where(pd.notnull(final_df), None)

    # --- DATABASE INSERT ---
    from database import engine 

    with engine.begin() as conn:
        if mode == "replace":
            conn.execute(text(f"DELETE FROM {target_table}"))
        
        final_df.to_sql(target_table, conn, if_exists="append", index=False)
        
    return len(final_df)