import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io

from resume_engine import (
    extract_text_from_pdf,
    analyze_resume,
    build_resume,
)

app = FastAPI(title="ResuAI // Next-Gen API Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev/testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

class BuildRequest(BaseModel):
    fullName: str
    email: str
    phone: str
    targetJob: str
    education: str
    skills: str
    workExperience: str
    refinement_note: str = ""

@app.post("/api/upload")
async def upload_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_like = io.BytesIO(content)
        # Call the helper
        text = extract_text_from_pdf(file_like)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    result = analyze_resume(req.resume_text, req.job_description)
    if result is None:
        raise HTTPException(status_code=500, detail="Gemini analysis failed.")
    return result

@app.post("/api/build")
async def build(req: BuildRequest):
    # Format details into raw text
    user_details = f"""
Name: {req.fullName}
Email: {req.email}
Phone: {req.phone}
Target Job: {req.targetJob}

Education:
{req.education}

Skills:
{req.skills}

Experience:
{req.workExperience}
"""
    result = build_resume(user_details, req.refinement_note)
    if result is None:
        raise HTTPException(status_code=500, detail="Gemini build failed.")
    return {"markdown": result}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
