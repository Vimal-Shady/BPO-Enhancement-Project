import os
import json
import torch
import smtplib
import ssl
import soundfile as sf
import google.generativeai as genai
import uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, File, UploadFile, Request, BackgroundTasks, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.staticfiles import StaticFiles
from transformers import WhisperProcessor, WhisperForConditionalGeneration, pipeline
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from typing import Optional, Dict, List, Any
from fastapi.middleware.cors import CORSMiddleware


load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
TEMPLATE_FOLDER = "templates"
DATA_FOLDER = "data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)

FAQ_FILE = os.path.join(DATA_FOLDER, "faq.json")
SCHEDULES_FILE = os.path.join(DATA_FOLDER, "schedules.json")

if not os.path.exists(FAQ_FILE):
    with open(FAQ_FILE, "w") as f:
        json.dump({
            "How do I reset my password?": "You can reset your password by clicking on the 'Forgot Password' link on the login page.",
            "What are your business hours?": "Our customer service is available Monday to Friday, 9 AM to 6 PM.",
            "How can I track my order?": "You can track your order by logging into your account and visiting the 'Order History' section."
        }, f)

if not os.path.exists(SCHEDULES_FILE):
    with open(SCHEDULES_FILE, "w") as f:
        json.dump([], f)

model_name = "openai/whisper-small.en"
processor = WhisperProcessor.from_pretrained(model_name)
model = WhisperForConditionalGeneration.from_pretrained(model_name)

sentiment_analyzer = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment", framework="pt")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory=TEMPLATE_FOLDER)

EMAIL_SENDER = os.getenv("E-M-KEY")
EMAIL_PASSWORD = os.getenv("E-KEY")
EMAIL_RECIPIENTS = ["vimalans.cse2023@citchennai.net"]

def load_faq() -> Dict[str, str]:
    """Load FAQ data from JSON file."""
    with open(FAQ_FILE, "r") as f:
        return json.load(f)

def load_schedules() -> List[Dict[str, Any]]:
    """Load schedules data from JSON file."""
    with open(SCHEDULES_FILE, "r") as f:
        return json.load(f)

def save_schedule(schedule: Dict[str, Any]) -> None:
    """Save a new schedule to the JSON file."""
    schedules = load_schedules()
    schedules.append(schedule)
    with open(SCHEDULES_FILE, "w") as f:
        json.dump(schedules, f)

def update_schedule(schedule_id: str, updates: Dict[str, Any]) -> bool:
    """Update an existing schedule by ID."""
    schedules = load_schedules()
    for i, schedule in enumerate(schedules):
        if schedule["id"] == schedule_id:
            schedules[i].update(updates)
            with open(SCHEDULES_FILE, "w") as f:
                json.dump(schedules, f)
            return True
    return False

def send_email(subject: str, email_body: str, schedule_details: Optional[Dict[str, Any]] = None):
    """Send an email with the given subject and body using the HTML template."""
    try:
        with open(os.path.join(TEMPLATE_FOLDER, "email_template.html"), "r", encoding="utf-8") as file:
            email_template = file.read()

        email_content = email_template.replace("{{EMAIL_BODY}}", email_body)
        
        if schedule_details:
            schedule_html = f"""
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                <h3>Your Callback Details:</h3>
                <p><strong>Date:</strong> {schedule_details['date']}</p>
                <p><strong>Time:</strong> {schedule_details['time']}</p>
                <p><strong>Priority:</strong> {schedule_details['priority']}</p>
                <p><strong>Reference ID:</strong> {schedule_details['id']}</p>
            </div>
            """
            email_content = email_content.replace("{{SCHEDULE_DETAILS}}", schedule_html)
        else:
            email_content = email_content.replace("{{SCHEDULE_DETAILS}}", "")

        message = MIMEMultipart()
        message["From"] = EMAIL_SENDER
        message["To"] = ", ".join(EMAIL_RECIPIENTS)
        message["Subject"] = subject
        message.attach(MIMEText(email_content, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, EMAIL_RECIPIENTS, message.as_string())

        print("✔️ Email sent successfully!")
    except Exception as e:
        print(f"❌ Error sending email: {e}")

def get_gemini_response(transcription: str) -> str:
    """Send transcription to Gemini API and retrieve a response."""
    genai.configure(api_key=os.getenv("G-KEY"))

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash", 
        generation_config={"temperature": 0.7, "max_output_tokens": 500}, 
        system_instruction=(
            """You are an AI assistant that interacts with users professionally and empathetically. 
            If the user explicitly requests BPO scheduling, proceed with scheduling and send a confirmation email. 
            Otherwise, engage in polite and respectful conversation, responding appropriately based on the user's emotions. 
            Ensure clarity, professionalism, and a friendly tone in all responses."""
        )
    )

    response = model.generate_content(transcription)
    return response.text if response else "We have received your concern and will address it shortly."

def check_faq(query: str) -> Optional[str]:
    """Check if the query matches any FAQ and return the answer if found."""
    faqs = load_faq()
    for question, answer in faqs.items():
        if query.lower() in question.lower():
            return answer
    return None

def should_schedule_callback(message: str) -> bool:
    """Check if the message indicates a need for scheduling a callback."""
    scheduling_keywords = [
        "schedule", "callback", "call me", "contact me", "talk to agent", 
        "speak to someone", "speak to a representative", "talk to a human",
        "need help", "customer service", "support", "call back"
    ]
    
    return any(keyword in message.lower() for keyword in scheduling_keywords)

def create_schedule(query: str, sentiment_label: str) -> Dict[str, Any]:
    """Create a schedule based on sentiment analysis."""
    schedule_id = str(uuid.uuid4())[:8]
    
    if sentiment_label in ["1 star", "2 stars"]:
        priority = "High"
        callback_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    elif sentiment_label in ["3 stars"]:
        priority = "Medium"
        callback_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    else:
        priority = "Low"
        callback_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    
    callback_time = "10:00 AM"
    
    schedule = {
        "id": schedule_id,
        "query": query,
        "date": callback_date,
        "time": callback_time,
        "priority": priority,
        "status": "Pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sentiment": sentiment_label
    }
    
    save_schedule(schedule)
    
    return schedule

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render the client interface."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/bpo", response_class=HTMLResponse)
async def bpo_dashboard(request: Request):
    """Render the BPO dashboard."""
    schedules = load_schedules()
    return templates.TemplateResponse("bpo_dashboard.html", {"request": request, "schedules": schedules})

@app.get("/api/schedules")
async def get_schedules():
    """API endpoint to get all schedules."""
    schedules = load_schedules()
    return JSONResponse(content=schedules)

@app.get("/api/faq")
async def get_faq():
    """API endpoint to get all FAQs."""
    faqs = load_faq()
    return JSONResponse(content=faqs)

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    """Process uploaded audio file and schedule callback based on sentiment."""
    if not file.filename:
        return JSONResponse(content={"error": "No selected file"}, status_code=400)

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        audio_input, sampling_rate = sf.read(file_path)
        input_features = processor(audio_input, sampling_rate=sampling_rate, return_tensors="pt").input_features

        predicted_ids = model.generate(input_features)
        transcription = processor.decode(predicted_ids[0]).replace("<|startoftranscript|>", "").replace("<|notimestamps|>", "").strip()

        sentiment = sentiment_analyzer(transcription)[0]
        
        faq_answer = check_faq(transcription)
        
        if faq_answer:
            return JSONResponse(content={
                "transcription": transcription,
                "sentiment": sentiment,
                "is_faq": True,
                "response": faq_answer
            }, status_code=200)
        
        needs_scheduling = should_schedule_callback(transcription)
        schedule = create_schedule(transcription, sentiment["label"]) if needs_scheduling else None
        
        response_content = get_gemini_response(transcription)
        
        if needs_scheduling and schedule:
            subject = "Callback Scheduled"
            email_body = f"<p>Dear Customer,</p><p>{response_content}</p><p>We have scheduled a callback for you.</p><p>Original Transcription: {transcription}</p>"
            if background_tasks:
                background_tasks.add_task(send_email, subject, email_body, schedule)
        
        return JSONResponse(content={
            "transcription": transcription,
            "sentiment": sentiment,
            "is_faq": False,
            "schedule": schedule,
            "response": response_content
        }, status_code=200)
    
    except Exception as e:
        return JSONResponse(content={"error": f"Error processing audio file: {str(e)}"}, status_code=500)

@app.post("/api/chat")
async def chat(request: Request, background_tasks: BackgroundTasks):
    """Process text chat messages."""
    try:
        form_data = await request.form()
        message = form_data.get("message")
        skip_schedule = form_data.get("skip_schedule", "false").lower() == "true"
        
        if not message:
            return JSONResponse(content={"error": "No message provided"}, status_code=400)
        
        faq_answer = check_faq(message)
        
        sentiment = sentiment_analyzer(message)[0]
        
        if faq_answer:
            return JSONResponse(content={
                "message": message,
                "sentiment": sentiment,
                "is_faq": True,
                "response": faq_answer
            }, status_code=200)
        
        needs_scheduling = should_schedule_callback(message) and not skip_schedule
        schedule = create_schedule(message, sentiment["label"]) if needs_scheduling else None
        
        response_content = get_gemini_response(message)
        
        if needs_scheduling and schedule:
            subject = "Callback Scheduled"
            email_body = f"<p>Dear Customer,</p><p>{response_content}</p><p>We have scheduled a callback for you.</p><p>Your message: {message}</p>"
            if background_tasks:
                background_tasks.add_task(send_email, subject, email_body, schedule)
        
        return JSONResponse(content={
            "message": message,
            "sentiment": sentiment,
            "is_faq": False,
            "schedule": schedule,
            "response": response_content
        }, status_code=200)
    
    except Exception as e:
        return JSONResponse(content={"error": f"Error processing message: {str(e)}"}, status_code=500)

@app.post("/api/update-schedule/{schedule_id}")
async def update_schedule_status(schedule_id: str, request: Request):
    """Update the status of a schedule."""
    try:
        form_data = await request.form()
        status = form_data.get("status")
        notes = form_data.get("notes", "")
        
        if not status:
            return JSONResponse(content={"error": "No status provided"}, status_code=400)
        
        updates = {
            "status": status,
            "notes": notes,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        success = update_schedule(schedule_id, updates)
        
        if success:
            return JSONResponse(content={"success": True, "message": "Schedule updated successfully"})
        else:
            return JSONResponse(content={"error": "Schedule not found"}, status_code=404)
    
    except Exception as e:
        return JSONResponse(content={"error": f"Error updating schedule: {str(e)}"}, status_code=500)

@app.post("/api/add-faq")
async def add_faq(request: Request):
    """Add a new FAQ to the database."""
    try:
        form_data = await request.form()
        question = form_data.get("question")
        answer = form_data.get("answer")
        
        if not question or not answer:
            return JSONResponse(content={"error": "Question and answer are required"}, status_code=400)
        
        faqs = load_faq()
        faqs[question] = answer
        
        with open(FAQ_FILE, "w") as f:
            json.dump(faqs, f)
        
        return JSONResponse(content={"success": True, "message": "FAQ added successfully"})
    
    except Exception as e:
        return JSONResponse(content={"error": f"Error adding FAQ: {str(e)}"}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
