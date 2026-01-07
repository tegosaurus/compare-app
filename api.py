from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import pandas as pd
import math, uuid, asyncio
import os
import shutil

from logic import extract_author_id, load_or_fetch_author, evaluate_author_data_headless
from database import update_publication_venues, init_db

job_status_store = {}

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
    """ Recursively replaces NaN/Inf with None for JSON safety. """
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    if isinstance(value, dict):
        return {k: clean_nans(v) for k, v in value.items()}
    if isinstance(value, list):
        return [clean_nans(v) for v in value]
    return value

def update_job_progress(job_id, progress):
    """ Updates the global variable so the frontend can see it. """
    if job_id in job_status_store:
        job_status_store[job_id]["progress"] = progress

def run_analysis_task(job_id: str, url: str, force_refresh: bool, is_cs_ai: bool):
    try:
        def progress_callback(pct):
            update_job_progress(job_id, pct)

        # 1. Start
        progress_callback(5)
        
        aid = extract_author_id(url)
        if not aid:
            raise ValueError("Invalid Google Scholar URL.")

        # 2. Fetch Data (scraping/loading)
        progress_callback(10)
        
        try:
            data = load_or_fetch_author(
                aid, 
                force_refresh=force_refresh, 
                progress_callback=progress_callback
            )
        except TypeError:
            print("Warning: load_or_fetch_author does not accept callback yet.")
            data = load_or_fetch_author(aid, force_refresh=force_refresh)

        if not data or not data.get("publications"):
            raise ValueError("No publications found for this researcher.")

        # 3. Analysis (logic)
        metrics, df = evaluate_author_data_headless(data, is_cs_ai, progress_callback=progress_callback)
        
        # 4. Update Database
        progress_callback(95) 
        update_publication_venues(metrics["id"], df)

        # 5. Prepare Final Response
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

        # 6. Complete
        job_status_store[job_id] = {
            "status": "completed",
            "progress": 100,
            "result": clean_nans(raw_response)
        }

    except Exception as e:
        print(f"Job {job_id} Failed: {e}")
        job_status_store[job_id] = {
            "status": "failed",
            "progress": 100,
            "error": str(e)
        }

# --- ENDPOINTS ---
@app.post("/analyze/start")
async def start_analysis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job_status_store[job_id] = {"status": "pending", "progress": 0}

    background_tasks.add_task(
        run_analysis_task, 
        job_id, 
        request.url, 
        request.forceRefresh, 
        request.is_cs_ai
    )

    return {"job_id": job_id}

@app.get("/analyze/status/{job_id}")
async def get_status(job_id: str):
    status = job_status_store.get(job_id)
    if not status:
        return {"status": "not_found"}
    return status

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
