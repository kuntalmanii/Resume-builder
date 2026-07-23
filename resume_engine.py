import os
import json
from pypdf import PdfReader
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

def extract_text_from_pdf(uploaded_file):
    reader = PdfReader(uploaded_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def analyze_resume(resume_text, job_description):
    try:
        client = genai.Client(api_key=API_KEY)
        system_instruction = (
            "You are an expert Applicant Tracking System (ATS). "
            "Analyze the resume against the JD and respond ONLY with a clean valid JSON object."
        )
        prompt = f"""
        Analyze the following resume against the job description.
        Provide the output strictly in this JSON format:
        {{
            "match_percentage": 85,
            "matched_keywords": ["React", "TypeScript"],
            "missing_keywords": ["Docker", "AWS"],
            "formatting_feedback": "The format is highly parseable.",
            "actionable_fixes": ["Add Docker deployment metrics.", "Integrate TypeScript exposure."]
        }}
        JD: {job_description}
        Resume: {resume_text}
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Analysis error: {e}")
        return None

def build_resume(user_details, refinement_note=""):
    try:
        client = genai.Client(api_key=API_KEY)
        system_instruction = (
            "You are an elite, recruiter-grade resume copywriter. "
            "Structure input text into beautiful, impactful Markdown with clear sections: "
            "Name/Contact header, Summary, Skills, Experience, Education. "
            "Use strong action verbs and quantify achievements where possible."
        )
        refine_str = f"\n\nAdditional refinement instruction: {refinement_note}" if refinement_note else ""
        prompt = f"Convert these raw details into a high-tier structured Markdown resume:{refine_str}\n\n{user_details}"
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
        )
        return response.text
    except Exception as e:
        print(f"Build error: {e}")
        return None
