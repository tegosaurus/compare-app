from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Form # <--- UPDATED IMPORTS
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import pandas as pd
import math
import shutil
import os

from logic import extract_author_id, load_or_fetch_author, evaluate_author_data_headless
from database import update_publication_venues, init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Checking database tables...")
    init_db()
    print("Database ready.")

    yield  # app runs here
    
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# --- CORS SETUP ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class AnalyzeRequest(BaseModel):
    url: str
    is_cs_ai: bool = True
    forceRefresh: bool = False

# --- HELPER ---
def clean_nans(value):
    """
    Recursively finds NaN (Not a Number) or Infinity in dictionaries/lists
    and replaces them with None (which becomes 'null' in JSON).
    """
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    if isinstance(value, dict):
        return {k: clean_nans(v) for k, v in value.items()}
    if isinstance(value, list):
        return [clean_nans(v) for v in value]
    return value

# --- ANALYZE ENDPOINT ---
@app.post("/analyze")
async def analyze_researcher(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    # validate & extract id
    aid = extract_author_id(request.url)
    if not aid:
        raise HTTPException(status_code=400, detail="Invalid Google Scholar URL")
    
    # fetch data
    try:
        data = load_or_fetch_author(aid, force_refresh=request.forceRefresh)
    except Exception as e:
        print(f"Scraping Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch researcher data.")

    if not data or not data.get("publications"):
        raise HTTPException(status_code=404, detail="No publications found for this researcher.")

    # run logic
    try:
        metrics, df = evaluate_author_data_headless(data, request.is_cs_ai)
    except Exception as e:
        print(f"Logic Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing data: {str(e)}")

    # database update
    try:
        background_tasks.add_task(update_publication_venues, metrics["id"], df)
    except Exception as e:
        print(f"Database Update Error: {e}")

    df_clean = df.where(pd.notnull(df), None)
    
    raw_response = {
        "status": "success",
        "profile": {
            "name": metrics["name"],
            "id": metrics["id"],
            "academic_age": metrics["academic_age"],
            "affiliations": data.get("affiliations"),
            "last_updated": data.get("last_scraped")
        },
        "metrics": metrics,
        "papers": df_clean.to_dict(orient="records")
    }

    return clean_nans(raw_response)

# --- NEW UPLOAD ENDPOINT ---
@app.post("/upload-quality-list")
async def upload_quality_list(
    file: UploadFile = File(...),
    list_type: str = Form(...),
    mode: str = Form("replace")
):
    """
    Receives a CSV file and processes it to update the quality journal/conference lists.
    """
    try:
        # Save file temporarily
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process CSV 
        df = pd.read_csv(temp_filename)
        
        # --- UPDATED: Call the actual DB function ---
        from database import update_quality_list_in_db  # Import inside function to avoid circular imports
        
        rows_written = update_quality_list_in_db(df, list_type, mode)
        
        # Cleanup
        os.remove(temp_filename)
        
        return {
            "ok": True,
            "table": list_type,
            "rows_written": rows_written,
        }

    except Exception as e:
        if os.path.exists(f"temp_{file.filename}"):
            os.remove(f"temp_{file.filename}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/")
def home():
    return {"message": "ComPARE API is running."}