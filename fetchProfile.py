import os
import serpapi
from dotenv import load_dotenv
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
        
    return "-"

def get_scholar_profile(author_id: str, max_pages: int = 50, progress_callback=None):
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
    page_size = 100
    total_papers = None

    while True:
        # --- FETCH ---
        result = client.search(
            engine="google_scholar_author",
            author_id=author_id,
            hl="en",
            start=start,
            num=page_size 
        )

        # --- FIRST PAGE SETUP ---
        if start == 0:
            author_name = result["author"].get("name")
            profile["name"] = author_name
            profile["variations"] = name_variations(author_name or "")
            profile["affiliations"] = result["author"].get("affiliations")
            profile["metrics"] = result["cited_by"]["table"]
            profile["co_authors"] = [co["name"] for co in result.get("co_authors", [])]
            
            # Try to grab total count for logging
            if "search_information" in result and "total_results" in result["search_information"]:
                 total_papers = result["search_information"]["total_results"]
                 print(f"--> [DEBUG] Google says this author has approx {total_papers} papers.")

        # --- PROCESS ARTICLES ---
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

        # --- DEBUG PRINT: SEE THE ACTUAL COUNT ---
        current_count = len(profile["publications"])
        print(f"--> [DEBUG] Batch finished. Total papers collected so far: {current_count}")

        # --- UPDATE PROGRESS (REAL MATH) ---
        if progress_callback:
            articles_found = current_count
            
            base = 15
            # If we don't know the total, assume 200. If we passed 200, assume +100 more.
            estimated_total = total_papers if total_papers else 200 
            if articles_found > estimated_total: estimated_total = articles_found + 100
            
            fraction = articles_found / estimated_total
            if fraction > 1: fraction = 1
            
            real_progress = base + int(fraction * 40)
            progress_callback(min(real_progress, 55))

        start += page_size
        
        # Check if we are done 
        if "serpapi_pagination" not in result or "next" not in result["serpapi_pagination"]:
            print("--> [DEBUG] No 'Next' page found. Scraping complete.")
            break
            
        if start >= max_pages * page_size:
            print("--> [DEBUG] Hit max page limit. Stopping.")
            break

    return profile
