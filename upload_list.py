import pandas as pd
import re
import string
import numpy as np
from database import engine, init_db

def normalize_text(s):
    if not isinstance(s, str): return ""
    s = str(s).lower()
    
    # 1. remove content () & []
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'\[.*?\]', '', s)

    # 2. replace hyphens with spaces
    s = s.replace("-", " ").replace("–", " ")
    
    # 3. remove standard noise
    s = re.sub(r'\b(19|20)\d{2}\b', '', s)
    s = re.sub(r'\b\d+(st|nd|rd|th)\b', '', s)
    s = re.sub(r'\b(pp|vol|no|issue)\.?\s*\d+', '', s)
    s = re.sub(r'\b\d+\b', '', s)
    
    # 4. remove remaining punctuation
    s = s.translate(str.maketrans("", "", string.punctuation))
    
    # 5. collapse spaces
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

        # look for rank columns
        if any(k in c_lower for k in ["core", "icore", "era", "rank", "quartile"]):
            # extract year (default to 0 if missing)
            years = re.findall(r'\d{4}', col)
            year = int(years[0]) if years else 0

            # prefer CORE/ICORE over ERA if years are equal
            if "quartile" in c_lower:
                bonus = 200
            elif "core" in c_lower or "icore" in c_lower:
                bonus = 100
            else:
                bonus = 0

            candidates.append((year + bonus, col, row[col]))

    # sort by score
    candidates.sort(key=lambda x: x[0], reverse=True)
    
    if candidates: 
        return str(candidates[0][2]).strip()
    return "N/A"

def run_upload():
    init_db()

    print("Uploading Conferences...")
    try:
        c1 = pd.read_csv("qualityConferences.csv")
        try:
            c2 = pd.read_csv("qualityConferences-journal.csv")
            all_c = pd.concat([c1, c2], ignore_index=True)
        except:
            all_c = c1

        all_c.replace(["-", "–", ""], np.nan, inplace=True)

        # --- TITLE PRIORITY (GS -> DBLP -> CORE -> ERA) ---
        if "GS Name" in all_c.columns:
            title_col = all_c["GS Name"].fillna(all_c["Conference Name (DBLP)"])
        else:
            title_col = all_c["Conference Name (DBLP)"]

        if "Core Conference Name" in all_c.columns:
            title_col = title_col.fillna(all_c["CORE Conference Name"])

        title_col = title_col.fillna(all_c["ERA Conference Name"])
        
        # --- ACRONYM PRIORITY (Acronym -> DBLP -> ERA) ---
        if "Acronym" in all_c.columns:
            acronym_col = all_c["Acronym"]
        else:
            acronym_col = pd.Series([None] * len(all_c))

        if "Acronym (DBLP)" in all_c.columns:
            acronym_col = acronym_col.fillna(all_c["Acronym (DBLP)"])

        if "ERA Acronym" in all_c.columns:
             acronym_col = acronym_col.fillna(all_c["ERA Acronym"])


        conf_db = pd.DataFrame({
            "Title": title_col,
            "Title_norm": title_col.apply(normalize_text),
            "acronym": acronym_col.str.lower(),
            "rank": all_c.apply(get_latest_rank_dynamic, axis=1) 
        })

        conf_db = conf_db[conf_db["Title_norm"] != ""]

        with engine.begin() as conn:
            conf_db.to_sql("conferences_quality", conn, if_exists="replace", index=False)
        print(f"Successfully uploaded {len(conf_db)} Conferences!")
        
    except Exception as e:
        print(f"Error uploading Conferences: {e}")

    print("Uploading Journals...")
    try:
        jrnl = pd.read_csv("qualityJournal.csv")
        jrnl.replace(["-", "–", ""], np.nan, inplace=True)

        issn_col = jrnl["Print ISSN"].fillna(jrnl["E-ISSN"])

        jrnl_db = pd.DataFrame({
            "Title": jrnl["Title"],
            "Title_norm": jrnl["Title"].apply(normalize_text),
            "rank": jrnl.apply(get_latest_rank_dynamic, axis=1),
            "issn": issn_col
        })

        jrnl_db = jrnl_db[jrnl_db["Title_norm"] != ""]
        
        with engine.begin() as conn:
            jrnl_db.to_sql("journals_quality", conn, if_exists="replace", index=False)
        print(f"Successfully uploaded {len(jrnl_db)} Journals!")
        
    except Exception as e:
        print(f"Error uploading Journals: {e}")

if __name__ == "__main__":
    run_upload()
