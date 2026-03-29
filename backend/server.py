from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, File, UploadFile, Query
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import uuid
import json
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "scholars-dating"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Validate Oxford email
def validate_oxford_email(email: str) -> bool:
    valid_domains = ["ox.ac.uk", "oxford.ac.uk"]
    email_lower = email.lower()
    return any(email_lower.endswith(f"@{domain}") or email_lower.endswith(f".{domain}") for domain in valid_domains)

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    name: str
    bio: Optional[str] = ""
    college: Optional[str] = ""
    major: Optional[str] = ""
    year: Optional[int] = None
    interests: Optional[List[str]] = []
    photos: Optional[List[str]] = []
    age: Optional[int] = None
    gender: Optional[str] = ""
    looking_for: Optional[str] = ""

class SwipeAction(BaseModel):
    target_user_id: str
    action: str  # "like" or "pass"

class MessageCreate(BaseModel):
    match_id: str
    content: str

class EventCreate(BaseModel):
    title: str
    description: str
    location: str
    date: str
    college: Optional[str] = ""
    image_url: Optional[str] = ""

class IcebreakerRequest(BaseModel):
    match_id: str

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Auth Endpoints
@api_router.post("/auth/register")
async def register(user: UserRegister):
    email = user.email.lower()
    if not validate_oxford_email(email):
        raise HTTPException(status_code=400, detail="Must use an Oxford University email (@ox.ac.uk)")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(user.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user.name,
        "role": "user",
        "bio": "",
        "college": "",
        "major": "",
        "year": None,
        "interests": [],
        "photos": [],
        "age": None,
        "gender": "",
        "looking_for": "",
        "profile_complete": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response_data = {"id": user_id, "email": email, "name": user.name, "profile_complete": False}
    response = Response(content=str(response_data).replace("'", '"').replace("True", "true").replace("False", "false"), media_type="application/json")
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return response

@api_router.post("/auth/login")
async def login(user: UserLogin, request: Request):
    email = user.email.lower()
    identifier = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        if datetime.fromisoformat(attempt["locked_until"]) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    db_user = await db.users.find_one({"email": email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        if attempt:
            new_count = attempt.get("count", 0) + 1
            update = {"$set": {"count": new_count}}
            if new_count >= 5:
                update["$set"]["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            await db.login_attempts.update_one({"identifier": identifier}, update)
        else:
            await db.login_attempts.insert_one({"identifier": identifier, "count": 1})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(db_user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response_data = {
        "id": user_id,
        "email": db_user["email"],
        "name": db_user["name"],
        "profile_complete": db_user.get("profile_complete", False),
        "college": db_user.get("college", ""),
        "major": db_user.get("major", ""),
        "photos": db_user.get("photos", [])
    }
    import json
    response = Response(content=json.dumps(response_data), media_type="application/json")
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return response

@api_router.post("/auth/logout")
async def logout():
    response = Response(content='{"success": true}', media_type="application/json")
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    response.delete_cookie("refresh_token", path="/", secure=True, samesite="none")
    return response

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(payload["sub"], user["email"])
        response = Response(content='{"success": true}', media_type="application/json")
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
        return response
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Profile Endpoints
@api_router.put("/profile")
async def update_profile(profile: UserProfile, request: Request):
    user = await get_current_user(request)
    update_data = profile.model_dump(exclude_unset=True)
    update_data["profile_complete"] = bool(update_data.get("college") and update_data.get("major"))
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_data})
    return {"success": True, "profile_complete": update_data["profile_complete"]}

@api_router.get("/profile/{user_id}")
async def get_profile(user_id: str, request: Request):
    await get_current_user(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = user_id
    return user

# Photo Upload
@api_router.post("/upload/photo")
async def upload_photo(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/photos/{user['_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"path": result["path"]}

@api_router.get("/files/{path:path}")
async def get_file(path: str, request: Request, auth: str = Query(None)):
    if not auth:
        try:
            await get_current_user(request)
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

# Discovery/Matching Endpoints
@api_router.get("/discover")
async def discover_users(request: Request, college: str = None, major: str = None, year: int = None):
    user = await get_current_user(request)
    user_id = user["_id"]
    swiped_ids = await db.swipes.find({"user_id": user_id}, {"target_id": 1}).to_list(1000)
    swiped_ids = [s["target_id"] for s in swiped_ids]
    query = {
        "_id": {"$ne": ObjectId(user_id), "$nin": [ObjectId(s) for s in swiped_ids]},
        "profile_complete": True
    }
    if college:
        query["college"] = college
    if major:
        query["major"] = major
    if year:
        query["year"] = year
    if user.get("looking_for"):
        query["gender"] = user["looking_for"]
    profiles = await db.users.find(query, {"_id": 1, "name": 1, "bio": 1, "college": 1, "major": 1, "year": 1, "interests": 1, "photos": 1, "age": 1, "gender": 1}).to_list(50)
    for p in profiles:
        p["id"] = str(p["_id"])
        del p["_id"]
    return profiles

@api_router.post("/swipe")
async def swipe(action: SwipeAction, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    target_id = action.target_user_id
    await db.swipes.insert_one({
        "user_id": user_id,
        "target_id": target_id,
        "action": action.action,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    if action.action == "like":
        reverse = await db.swipes.find_one({"user_id": target_id, "target_id": user_id, "action": "like"})
        if reverse:
            match_id = str(uuid.uuid4())
            await db.matches.insert_one({
                "id": match_id,
                "user1_id": user_id,
                "user2_id": target_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"matched": True, "match_id": match_id}
    return {"matched": False}

@api_router.get("/matches")
async def get_matches(request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    matches = await db.matches.find({"$or": [{"user1_id": user_id}, {"user2_id": user_id}]}).to_list(100)
    result = []
    for m in matches:
        other_id = m["user2_id"] if m["user1_id"] == user_id else m["user1_id"]
        other_user = await db.users.find_one({"_id": ObjectId(other_id)}, {"_id": 0, "password_hash": 0})
        if other_user:
            other_user["id"] = other_id
            last_msg = await db.messages.find_one({"match_id": m["id"]}, sort=[("created_at", -1)])
            result.append({
                "match_id": m["id"],
                "user": other_user,
                "last_message": last_msg.get("content") if last_msg else None,
                "created_at": m["created_at"]
            })
    return result

# Chat Endpoints
@api_router.get("/messages/{match_id}")
async def get_messages(match_id: str, request: Request):
    user = await get_current_user(request)
    match = await db.matches.find_one({"id": match_id})
    if not match or (match["user1_id"] != user["_id"] and match["user2_id"] != user["_id"]):
        raise HTTPException(status_code=403, detail="Not part of this match")
    messages = await db.messages.find({"match_id": match_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return messages

@api_router.post("/messages")
async def send_message(msg: MessageCreate, request: Request):
    user = await get_current_user(request)
    match = await db.matches.find_one({"id": msg.match_id})
    if not match or (match["user1_id"] != user["_id"] and match["user2_id"] != user["_id"]):
        raise HTTPException(status_code=403, detail="Not part of this match")
    message_doc = {
        "id": str(uuid.uuid4()),
        "match_id": msg.match_id,
        "sender_id": user["_id"],
        "sender_name": user["name"],
        "content": msg.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message_doc)
    return {"id": message_doc["id"], "success": True}

# AI Icebreaker
@api_router.post("/ai/icebreaker")
async def generate_icebreaker(req: IcebreakerRequest, request: Request):
    user = await get_current_user(request)
    match = await db.matches.find_one({"id": req.match_id})
    if not match or (match["user1_id"] != user["_id"] and match["user2_id"] != user["_id"]):
        raise HTTPException(status_code=403, detail="Not part of this match")
    other_id = match["user2_id"] if match["user1_id"] == user["_id"] else match["user1_id"]
    other_user = await db.users.find_one({"_id": ObjectId(other_id)})
    if not other_user:
        raise HTTPException(status_code=404, detail="Match user not found")
    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"icebreaker-{req.match_id}-{uuid.uuid4()}",
            system_message="You are a charming, witty dating assistant helping Oxford University students start conversations. Generate 3 unique, clever icebreaker messages based on the match's profile. Keep them playful, intellectual, and Oxford-appropriate. Each icebreaker should be 1-2 sentences max."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        interests = ", ".join(other_user.get("interests", [])) or "not specified"
        prompt = f"""Generate 3 icebreaker messages for starting a conversation with this person:
Name: {other_user.get('name', 'Unknown')}
College: {other_user.get('college', 'Unknown')}
Major: {other_user.get('major', 'Unknown')}
Bio: {other_user.get('bio', 'No bio')}
Interests: {interests}

Format as a JSON array of 3 strings, like: ["message1", "message2", "message3"]"""
        response = await chat.send_message(UserMessage(text=prompt))
        import json
        try:
            start = response.find("[")
            end = response.rfind("]") + 1
            icebreakers = json.loads(response[start:end])
        except Exception:
            icebreakers = [response]
        return {"icebreakers": icebreakers}
    except Exception as e:
        logger.error(f"AI icebreaker error: {e}")
        return {"icebreakers": ["Hey! I noticed you're at {0}. How are you finding it?".format(other_user.get('college', 'Oxford')), "What got you interested in {0}?".format(other_user.get('major', 'your field')), "I see we matched! What's keeping you busy this term?"]}

# Events Endpoints
@api_router.get("/events")
async def get_events(request: Request, college: str = None):
    await get_current_user(request)
    query = {"date": {"$gte": datetime.now(timezone.utc).isoformat()}}
    if college:
        query["college"] = college
    events = await db.events.find(query, {"_id": 0}).sort("date", 1).to_list(50)
    return events

@api_router.post("/events")
async def create_event(event: EventCreate, request: Request):
    user = await get_current_user(request)
    event_doc = {
        "id": str(uuid.uuid4()),
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "date": event.date,
        "college": event.college,
        "image_url": event.image_url,
        "created_by": user["_id"],
        "created_by_name": user["name"],
        "attendees": [user["_id"]],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    return {"id": event_doc["id"], "success": True}

@api_router.post("/events/{event_id}/attend")
async def attend_event(event_id: str, request: Request):
    user = await get_current_user(request)
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user["_id"] in event.get("attendees", []):
        await db.events.update_one({"id": event_id}, {"$pull": {"attendees": user["_id"]}})
        return {"attending": False}
    else:
        await db.events.update_one({"id": event_id}, {"$push": {"attendees": user["_id"]}})
        return {"attending": True}

# Colleges list (for filters)
OXFORD_COLLEGES = [
    "All Souls", "Balliol", "Brasenose", "Christ Church", "Corpus Christi",
    "Exeter", "Green Templeton", "Harris Manchester", "Hertford", "Jesus",
    "Keble", "Kellogg", "Lady Margaret Hall", "Linacre", "Lincoln", "Magdalen",
    "Mansfield", "Merton", "New College", "Nuffield", "Oriel", "Pembroke",
    "Queen's", "Reuben", "St Anne's", "St Antony's", "St Catherine's",
    "St Cross", "St Edmund Hall", "St Hilda's", "St Hugh's", "St John's",
    "St Peter's", "Somerville", "Trinity", "University", "Wadham", "Wolfson", "Worcester"
]

MAJORS = [
    "Archaeology", "Biochemistry", "Biology", "Chemistry", "Classics", "Computer Science",
    "Earth Sciences", "Economics", "Engineering", "English", "Fine Art", "Geography",
    "History", "History of Art", "Law", "Materials Science", "Mathematics", "Medicine",
    "Modern Languages", "Music", "Oriental Studies", "Philosophy", "Physics",
    "Politics", "PPE", "Psychology", "Theology"
]

@api_router.get("/colleges")
async def get_colleges():
    return OXFORD_COLLEGES

@api_router.get("/majors")
async def get_majors():
    return MAJORS

@api_router.get("/")
async def root():
    return {"message": "Scholars Dating API", "version": "1.0.0"}

# Include the router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.matches.create_index("user1_id")
    await db.matches.create_index("user2_id")
    await db.swipes.create_index([("user_id", 1), ("target_id", 1)])
    await seed_admin()
    await seed_demo_profiles()

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ox.ac.uk")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "bio": "",
            "college": "",
            "major": "",
            "year": None,
            "interests": [],
            "photos": [],
            "age": None,
            "gender": "",
            "looking_for": "",
            "profile_complete": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    Path("/app/memory").mkdir(parents=True, exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n\n## Demo Users\n- Email: emma@ox.ac.uk / Password: demo123\n- Email: james@ox.ac.uk / Password: demo123\n")

async def seed_demo_profiles():
    demo_users = [
        {
            "email": "emma@ox.ac.uk",
            "password_hash": hash_password("demo123"),
            "name": "Emma Watson",
            "role": "user",
            "bio": "Aspiring barrister with a passion for literature and punting on the Cherwell.",
            "college": "Balliol",
            "major": "PPE",
            "year": 3,
            "interests": ["Reading", "Theatre", "Rowing", "Philosophy"],
            "photos": ["https://images.unsplash.com/photo-1543269865-ae68c7862de4?w=400"],
            "age": 21,
            "gender": "female",
            "looking_for": "male",
            "profile_complete": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "email": "james@ox.ac.uk",
            "password_hash": hash_password("demo123"),
            "name": "James Chen",
            "role": "user",
            "bio": "Quantum physics enthusiast. Can explain Schrödinger's cat over a pint at the Turf Tavern.",
            "college": "Magdalen",
            "major": "Physics",
            "year": 4,
            "interests": ["Science", "Music", "Chess", "Hiking"],
            "photos": ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"],
            "age": 22,
            "gender": "male",
            "looking_for": "female",
            "profile_complete": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "email": "sophia@ox.ac.uk",
            "password_hash": hash_password("demo123"),
            "name": "Sophia Laurent",
            "role": "user",
            "bio": "Art historian by day, amateur chef by night. Let's discuss Vermeer over homemade croissants.",
            "college": "Christ Church",
            "major": "History of Art",
            "year": 2,
            "interests": ["Art", "Cooking", "Photography", "Travel"],
            "photos": ["https://images.unsplash.com/photo-1584695930358-3255ec241088?w=400"],
            "age": 20,
            "gender": "female",
            "looking_for": "male",
            "profile_complete": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "email": "oliver@ox.ac.uk",
            "password_hash": hash_password("demo123"),
            "name": "Oliver Hughes",
            "role": "user",
            "bio": "Medical student who believes in work-life balance. Find me at the Bodleian or the boat club.",
            "college": "Exeter",
            "major": "Medicine",
            "year": 5,
            "interests": ["Medicine", "Rowing", "Cooking", "Wine"],
            "photos": ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"],
            "age": 23,
            "gender": "male",
            "looking_for": "female",
            "profile_complete": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    for user in demo_users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            logger.info(f"Demo user seeded: {user['email']}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
