import os
import serpapi
from dotenv import load_dotenv
from datetime import datetime
from database import init_db, save_author_profile
from name_variations import name_variations

load_dotenv()
api_key = os.getenv('SERPAPI_KEY')
client = serpapi.Client(api_key=api_key)

# HELPER
def get_author_pos(authors: str, title: str, variations: list) -> str:
    # track people found in og authors list
    # might need to add this number to 'title' count later
    authors_list_count = 0
    
    if authors:
        clean_str = authors.replace("...", "")
        indiv_authors = [p.strip().lower() for p in clean_str.split(",") if p.strip()]
        
        authors_list_count = len(indiv_authors)
        
        for i, person in enumerate(indiv_authors):
            if any(v in person for v in variations):
                return str(i + 1) # found in default place directly

    # check title (for publications that list authors in title)
    if title:
        title = title.lower()
        
        for v in variations:
            if v in title:
                # found in title
                match_index = title.find(v)
                text_before = title[:match_index]
                commas_in_title = text_before.count(",")
                
                final_pos = authors_list_count + commas_in_title + 1
                
                return str(final_pos)

    # fallback (hidden behind "...")
    if authors and "..." in authors:
        return f"{authors_list_count}+" 
        
    return "?"

def get_scholar_profile(author_id: str, max_pages: int = 50):
    profile = {
        "author_id": author_id,
        "name": None,
        "variations": [],
        "affiliations": None,
        "metrics": None,
        "co_authors": [],
        "publications": []
    }

    start = 0
    while True:
        result = client.search(
            engine="google_scholar_author",
            author_id=author_id,
            hl="en",
            start=start
        )

        if start == 0:
            author_name = result["author"].get("name")
            profile["name"] = author_name
            profile["variations"] = name_variations(author_name or "")
            profile["affiliations"] = result["author"].get("affiliations")
            profile["metrics"] = result["cited_by"]["table"]
            profile["co_authors"] = [co["name"] for co in result.get("co_authors", [])]

        articles = result.get("articles", [])
        if not articles: 
            break

        for article in articles:
            title = article.get("title", "")
            authors = article.get("authors", "")

            pos = get_author_pos(authors, title, profile["variations"])

            profile["publications"].append({
                "title": title,
                "authors": authors,
                "venue": article.get("publication"),
                "year": article.get("year"),
                "citations": article.get("cited_by", {}).get("value", 0),
                "author_pos": pos
            })

        start += 20
        if start >= max_pages * 20:
            break

    init_db()

    print(f"saving {len(profile['publications'])} publications to supabase...")
    save_author_profile(profile)
    print("profile saved to database.")
    return profile
