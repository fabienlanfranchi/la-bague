from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Member Models
class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom_complet: str
    fonction: str  # Président, Trésorier, etc.
    annee_entree: int
    saison_entree: str  # Printemps, Été, Automne, Hiver
    pourcentage_presences: float  # 0 à 100
    etoiles: int  # 1 à 4
    situation_cotisation: int  # 0, 1, 2 ou 3
    autres_infos: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemberCreate(BaseModel):
    nom_complet: str
    fonction: str
    annee_entree: int
    saison_entree: str
    pourcentage_presences: float = 0.0
    etoiles: int = 1
    situation_cotisation: int = 0
    autres_infos: str = ""


class MemberUpdate(BaseModel):
    nom_complet: Optional[str] = None
    fonction: Optional[str] = None
    annee_entree: Optional[int] = None
    saison_entree: Optional[str] = None
    pourcentage_presences: Optional[float] = None
    etoiles: Optional[int] = None
    situation_cotisation: Optional[int] = None
    autres_infos: Optional[str] = None


class MemberImport(BaseModel):
    members: List[MemberCreate]


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "La Bague Impériale - API"}


# CREATE - Créer un nouveau membre
@api_router.post("/members", response_model=Member)
async def create_member(input: MemberCreate):
    member_dict = input.model_dump()
    member_obj = Member(**member_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = member_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.members.insert_one(doc)
    return member_obj


# READ - Obtenir tous les membres
@api_router.get("/members", response_model=List[Member])
async def get_members():
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for member in members:
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    
    return members


# READ - Obtenir un membre par ID
@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str):
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Convert ISO string timestamps back to datetime objects
    if isinstance(member.get('created_at'), str):
        member['created_at'] = datetime.fromisoformat(member['created_at'])
    if isinstance(member.get('updated_at'), str):
        member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    
    return member


# UPDATE - Mettre à jour un membre
@api_router.put("/members/{member_id}", response_model=Member)
async def update_member(member_id: str, input: MemberUpdate):
    # Récupérer le membre existant
    existing_member = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    if not existing_member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Préparer les données de mise à jour (seulement les champs fournis)
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Mettre à jour dans MongoDB
    await db.members.update_one(
        {"id": member_id},
        {"$set": update_data}
    )
    
    # Récupérer et retourner le membre mis à jour
    updated_member = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    # Convert ISO string timestamps back to datetime objects
    if isinstance(updated_member.get('created_at'), str):
        updated_member['created_at'] = datetime.fromisoformat(updated_member['created_at'])
    if isinstance(updated_member.get('updated_at'), str):
        updated_member['updated_at'] = datetime.fromisoformat(updated_member['updated_at'])
    
    return updated_member


# DELETE - Supprimer un membre
@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str):
    result = await db.members.delete_one({"id": member_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    return {"message": "Membre supprimé avec succès", "id": member_id}


# IMPORT - Importer plusieurs membres en masse
@api_router.post("/members/import")
async def import_members(input: MemberImport):
    created_members = []
    
    for member_data in input.members:
        member_dict = member_data.model_dump()
        member_obj = Member(**member_dict)
        
        # Convert to dict and serialize datetime to ISO string for MongoDB
        doc = member_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.members.insert_one(doc)
        created_members.append(member_obj)
    
    return {
        "message": f"{len(created_members)} membres importés avec succès",
        "count": len(created_members),
        "members": created_members
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
