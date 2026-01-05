# Updated
import os
from sqlalchemy import create_engine, Table, Column, Integer, Float, String, Text, ForeignKey, MetaData, DateTime
from sqlalchemy.dialects.postgresql import JSONB, insert
from dotenv import load_dotenv
from datetime import datetime, timezone
import pandas as pd

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

            val_type = row.get("match_type")
            if pd.isna(val_type):
                val_type = row.get("venue_type")

            conn.execute(
                publications.update()
                .where(
                    (publications.c.researcher_id == author_id) &
                    (publications.c.title == row["title"])
                )
                .values(
                    venue_type=val_type,
                    rank=row.get("rank"),
                    match_score=row.get("match_score"),
                    source=row.get("source")
                )
            )
