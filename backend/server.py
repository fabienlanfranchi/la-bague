from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fonction d'arrondi personnalisée
# - 0.1 à 0.4 → arrondi à l'inférieur
# - 0.5 → on garde
# - 0.6 à 0.9 → arrondi au supérieur
def custom_round(value):
    """Arrondi personnalisé pour les pourcentages"""
    decimal_part = value - int(value)
    decimal_first = round((decimal_part * 10) % 10)
    
    if decimal_first <= 4:
        return math.floor(value)
    elif decimal_first >= 6:
        return math.ceil(value)
    else:  # 0.5
        return round(value, 1)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Add session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get('SESSION_SECRET', secrets.token_hex(32))
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Member Models
class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_membre: int  # Numéro unique du membre
    nom_complet: str
    fonction: str  # Président, Trésorier, etc.
    annee_entree: int
    saison_entree: str  # Printemps, Été, Automne, Hiver
    pourcentage_presences: float = 0.0  # 0 à 100
    etoiles: int = 1  # 1 à 4
    situation_cotisation: int = 0  # 0, 1, 2 ou 3
    autres_infos: str = ""
    saisons_exclues: List[int] = []  # Saisons où le membre était en sommeil (ex: [5, 6, 7])
    
    # Authentification
    email: Optional[str] = None
    password_hash: Optional[str] = None
    temporary_password: str = Field(default="")  # Format: clubcigare{numero}
    is_validated: bool = False
    is_president: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemberCreate(BaseModel):
    numero_membre: int
    nom_complet: str
    fonction: str
    annee_entree: int
    saison_entree: str
    pourcentage_presences: float = 0.0
    etoiles: int = 1
    situation_cotisation: int = 0
    autres_infos: str = ""
    is_president: bool = False


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


# Authentication Models
class LoginRequest(BaseModel):
    # Pour première connexion : nom + prénom + mot de passe temporaire
    nom: Optional[str] = None
    prenom: Optional[str] = None
    temporary_password: Optional[str] = None
    
    # Pour connexions suivantes : email + mot de passe
    email: Optional[EmailStr] = None
    password: Optional[str] = None


class ValidateAccountRequest(BaseModel):
    member_id: str
    email: EmailStr
    password: str
    confirm_password: str


# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def generate_temporary_password(numero_membre: int) -> str:
    return f"labagueimperiale{numero_membre}"


# Get current user from session
async def get_current_user(request: Request):
    member_id = request.session.get('member_id')
    if not member_id:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    # Convert ISO string timestamps
    if isinstance(member.get('created_at'), str):
        member['created_at'] = datetime.fromisoformat(member['created_at'])
    if isinstance(member.get('updated_at'), str):
        member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    
    return member


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "La Bague Impériale - API"}


# ============ AUTHENTICATION ROUTES ============

@api_router.post("/auth/login")
async def login(request: Request, login_data: LoginRequest):
    """
    Login avec :
    - Première connexion : nom + prénom + mot de passe temporaire
    - Connexions suivantes : email + mot de passe
    """
    
    # Connexion avec email + mot de passe
    if login_data.email and login_data.password:
        member = await db.members.find_one({"email": login_data.email}, {"_id": 0})
        
        if not member:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        
        if not member.get('password_hash'):
            raise HTTPException(status_code=401, detail="Compte non validé")
        
        if not verify_password(login_data.password, member['password_hash']):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        
        # Stocker l'ID en session
        request.session['member_id'] = member['id']
        
        # Convert timestamps
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
        
        return {
            "message": "Connexion réussie",
            "member": member,
            "needs_validation": False
        }
    
    # Première connexion avec nom + prénom + mot de passe temporaire
    elif login_data.nom and login_data.prenom and login_data.temporary_password:
        # Rechercher par nom complet
        nom_complet = f"{login_data.prenom} {login_data.nom}"
        nom_complet_inverse = f"{login_data.nom} {login_data.prenom}"
        
        member = await db.members.find_one({
            "$or": [
                {"nom_complet": {"$regex": nom_complet, "$options": "i"}},
                {"nom_complet": {"$regex": nom_complet_inverse, "$options": "i"}}
            ]
        }, {"_id": 0})
        
        if not member:
            raise HTTPException(status_code=401, detail="Membre non trouvé")
        
        # Vérifier le mot de passe temporaire
        if member.get('temporary_password') != login_data.temporary_password:
            raise HTTPException(status_code=401, detail="Mot de passe temporaire incorrect")
        
        # Si déjà validé, demander email/mot de passe
        if member.get('is_validated'):
            raise HTTPException(
                status_code=400, 
                detail="Compte déjà validé. Connectez-vous avec votre email et mot de passe."
            )
        
        # Stocker l'ID en session
        request.session['member_id'] = member['id']
        
        # Convert timestamps
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
        
        return {
            "message": "Première connexion réussie",
            "member": member,
            "needs_validation": True
        }
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Fournir email+mot de passe OU nom+prénom+mot de passe temporaire"
        )


@api_router.post("/auth/validate-account")
async def validate_account(request: Request, data: ValidateAccountRequest):
    """Valider le compte en ajoutant email et mot de passe"""
    
    # Récupérer le membre directement par ID (pas besoin d'être connecté)
    member = await db.members.find_one({"id": data.member_id}, {"_id": 0})
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Vérifier que le compte n'est pas déjà validé
    if member.get('is_validated') or member.get('compte_valide'):
        raise HTTPException(status_code=400, detail="Compte déjà validé")
    
    # Vérifier que les mots de passe correspondent
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")
    
    # Vérifier que l'email n'est pas déjà utilisé par un autre membre
    existing = await db.members.find_one({"email": data.email, "id": {"$ne": data.member_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Mettre à jour le membre
    password_hash = hash_password(data.password)
    
    await db.members.update_one(
        {"id": data.member_id},
        {
            "$set": {
                "email": data.email,
                "password_hash": password_hash,
                "is_validated": True,
                "compte_valide": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Récupérer le membre mis à jour
    updated_member = await db.members.find_one({"id": data.member_id}, {"_id": 0})
    
    # Convert timestamps
    if isinstance(updated_member.get('created_at'), str):
        updated_member['created_at'] = datetime.fromisoformat(updated_member['created_at'])
    if isinstance(updated_member.get('updated_at'), str):
        updated_member['updated_at'] = datetime.fromisoformat(updated_member['updated_at'])
    
    return {
        "message": "Compte validé avec succès",
        "member": updated_member
    }


@api_router.get("/auth/me")
async def get_me(request: Request):
    """Obtenir l'utilisateur connecté"""
    member = await get_current_user(request)
    return member


@api_router.post("/auth/logout")
async def logout(request: Request):
    """Déconnexion"""
    request.session.clear()
    return {"message": "Déconnexion réussie"}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Mot de passe oublié - retourne un rappel"""
    # Chercher le membre par email
    member = await db.members.find_one({"email": data.email}, {"_id": 0})
    
    if member:
        # En production, on enverrait un email
        # Pour l'instant, on retourne juste un message générique
        prenom = member.get('prenom', member.get('nom_complet', '').split()[0]).lower()
        numero = member.get('numero_membre', '')
        
        return {
            "message": f"Rappel : votre mot de passe par défaut est {prenom}{numero}",
            "hint": f"{prenom}{numero}"
        }
    
    # Message générique pour ne pas révéler si l'email existe
    return {"message": "Si cet email existe, vous recevrez un rappel."}


# ============ MEMBERS ROUTES ============

@api_router.post("/members", response_model=Member)
async def create_member(input: MemberCreate):
    """Créer un nouveau membre avec mot de passe temporaire"""
    
    # Vérifier que le numéro n'existe pas déjà
    existing = await db.members.find_one({"numero_membre": input.numero_membre}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ce numéro de membre existe déjà")
    
    member_dict = input.model_dump()
    
    # Générer le mot de passe temporaire
    temporary_password = generate_temporary_password(input.numero_membre)
    member_dict['temporary_password'] = temporary_password
    
    member_obj = Member(**member_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = member_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.members.insert_one(doc)
    return member_obj


@api_router.get("/members", response_model=List[Member])
async def get_members():
    """Obtenir tous les membres avec % de présence et étoiles calculés dynamiquement
    
    IMPORTANT: Les stats ne comptent qu'à partir de la saison d'entrée du membre
    et excluent les saisons où le membre était en sommeil (saisons_exclues)
    """
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    
    # Récupérer toutes les présences et configs pour calculer les vrais %
    all_presences = await db.presences_membres.find({}, {"_id": 0}).to_list(10000)
    all_configs = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
    
    # Créer des dictionnaires pour accès rapide
    configs_dict = {c["saison"]: c for c in all_configs}
    presences_by_membre = {}
    for p in all_presences:
        membre_id = p["membre_id"]
        if membre_id not in presences_by_membre:
            presences_by_membre[membre_id] = []
        presences_by_membre[membre_id].append(p)
    
    # Fonction pour calculer les étoiles selon le %
    def calculate_stars(percentage):
        if percentage >= 75:
            return 4
        elif percentage >= 50:
            return 3
        elif percentage >= 25:
            return 2
        else:
            return 1
    
    # Fonction pour obtenir la première saison d'un membre
    def get_premiere_saison(member):
        # Calculer la saison d'entrée à partir de l'année d'entrée
        # Saison 1 = 2013, Saison 2 = 2014, etc.
        annee_entree = member.get("annee_entree", 2013)
        return annee_entree - 2012
    
    # Calculer le % réel et les étoiles pour chaque membre
    for member in members:
        membre_presences = presences_by_membre.get(member["id"], [])
        premiere_saison = get_premiere_saison(member)
        saisons_exclues = set(member.get("saisons_exclues", []))
        
        total_presences = 0
        total_events = 0
        
        for p in membre_presences:
            saison = p["saison"]
            # IGNORER les saisons avant l'entrée du membre
            if saison < premiere_saison:
                continue
            # IGNORER les saisons exclues (membre en sommeil)
            if saison in saisons_exclues:
                continue
                
            config = configs_dict.get(saison, {})
            
            total_presences += p.get("presences_aperos", 0) + p.get("presences_repas", 0) + p.get("presences_anniversaires", 0)
            total_events += config.get("nb_aperos", 0) + config.get("nb_repas", 0) + config.get("nb_anniversaires", 0)
        
        # Ajouter aussi les événements des saisons où le membre n'a pas encore de données de présence
        # mais où il aurait dû être compté (saisons après son entrée, hors saisons exclues)
        for saison, config in configs_dict.items():
            if saison >= premiere_saison and saison not in saisons_exclues:
                # Vérifier si on a déjà compté cette saison
                saison_already_counted = any(p["saison"] == saison for p in membre_presences if p["saison"] >= premiere_saison and p["saison"] not in saisons_exclues)
                if not saison_already_counted:
                    # Ajouter les événements de cette saison (présences = 0)
                    total_events += config.get("nb_aperos", 0) + config.get("nb_repas", 0) + config.get("nb_anniversaires", 0)
        
        # Mettre à jour le pourcentage calculé
        if total_events > 0:
            member["pourcentage_presences"] = custom_round(total_presences / total_events * 100)
            # Calculer les étoiles automatiquement
            member["etoiles"] = calculate_stars(member["pourcentage_presences"])
        # Si pas de données de présence, garder les anciennes valeurs (données importées)
        
        # Convert ISO string timestamps back to datetime objects
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    
    return members


@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str):
    """Obtenir un membre par ID avec % de présence et étoiles calculés"""
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Calculer le % réel de présence
    presences = await db.presences_membres.find({"membre_id": member_id}, {"_id": 0}).to_list(100)
    configs = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
    configs_dict = {c["saison"]: c for c in configs}
    
    total_presences = 0
    total_events = 0
    
    for p in presences:
        saison = p["saison"]
        config = configs_dict.get(saison, {})
        
        total_presences += p.get("presences_aperos", 0) + p.get("presences_repas", 0) + p.get("presences_anniversaires", 0)
        total_events += config.get("nb_aperos", 0) + config.get("nb_repas", 0) + config.get("nb_anniversaires", 0)
    
    if total_events > 0:
        member["pourcentage_presences"] = custom_round(total_presences / total_events * 100)
        # Calculer les étoiles automatiquement
        pct = member["pourcentage_presences"]
        if pct >= 75:
            member["etoiles"] = 4
        elif pct >= 50:
            member["etoiles"] = 3
        elif pct >= 25:
            member["etoiles"] = 2
        else:
            member["etoiles"] = 1
    
    # Convert ISO string timestamps back to datetime objects
    if isinstance(member.get('created_at'), str):
        member['created_at'] = datetime.fromisoformat(member['created_at'])
    if isinstance(member.get('updated_at'), str):
        member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    
    return member


@api_router.put("/members/{member_id}", response_model=Member)
async def update_member(member_id: str, input: MemberUpdate):
    """Mettre à jour un membre"""
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


@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str):
    """Supprimer un membre"""
    result = await db.members.delete_one({"id": member_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    return {"message": "Membre supprimé avec succès", "id": member_id}


@api_router.post("/members/import")
async def import_members(input: MemberImport):
    """Importer plusieurs membres en masse"""
    created_members = []
    
    for member_data in input.members:
        member_dict = member_data.model_dump()
        
        # Générer le mot de passe temporaire
        temporary_password = generate_temporary_password(member_data.numero_membre)
        member_dict['temporary_password'] = temporary_password
        
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


# ============ COMPTABILITÉ - MODELS ============

class Compte(BaseModel):
    """Compte bancaire, caisse, etc."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str  # Ex: "Compte bancaire principal", "Caisse"
    type: str  # "banque", "caisse", "autre"
    solde: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CompteCreate(BaseModel):
    nom: str
    type: str
    solde: float = 0.0


class Categorie(BaseModel):
    """Catégorie de transaction"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str  # Ex: "Cotisations", "Repas", "Matériel"
    type: str  # "recette" ou "dépense"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CategorieCreate(BaseModel):
    nom: str
    type: str


class Transaction(BaseModel):
    """Transaction financière (mouvement)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    type: str  # "recette" ou "dépense"
    membre_id: Optional[str] = None  # Membre concerné
    objet: str  # "cotisation", "dette", "album", "tickets", "habits", "autres"
    montant: float
    endroit: str  # "Compte", "chèque", "Fabien", "Jacques", "Enveloppe bar", "PayPal"
    detail: str = ""  # Détail libre ou format spécial pour dette
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionCreate(BaseModel):
    date: Optional[datetime] = None
    type: str
    membre_id: Optional[str] = None
    objet: str
    montant: float
    endroit: str
    detail: str = ""


class CotisationPayment(BaseModel):
    """Paiement de cotisation par un membre"""
    membre_id: str
    montant: float
    compte_id: str
    nombre_saisons: int = 1  # Nombre de saisons payées
    description: Optional[str] = None


# ============ DETTES - MODELS ============

class Dette(BaseModel):
    """Dette d'un membre (argent dû au club)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    membre_id: str
    montant: float
    cause: str  # Ex: "tombola", "repas", etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DetteCreate(BaseModel):
    membre_id: str
    montant: float
    cause: str


# ============ ÉVÉNEMENTS - MODELS ============

class OptionsSondageRepas(BaseModel):
    """Options pour un sondage de type Repas"""
    entrees: List[str] = ["Entrée A", "Entrée B"]
    plats: List[str] = ["Plat A", "Plat B"]
    desserts: List[str] = ["Dessert A", "Dessert B"]


class Evenement(BaseModel):
    """Événement du club avec sondage"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime
    objet: str  # "Repas de printemps", "Apéro été", etc.
    lieu: str
    type_sondage: str  # "repas", "apéro", "libre"
    statut: str = "à venir"  # "à venir", "en cours", "terminé"
    saison: int  # 1-13
    total_presents: int = 0  # Nombre de présents (pour historique)
    options_sondage: Optional[dict] = None  # Pour "repas": {entrees: [], plats: [], desserts: []}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EvenementCreate(BaseModel):
    date: datetime
    objet: str
    lieu: str
    type_sondage: str
    saison: int
    options_sondage: Optional[dict] = None


class ReponseSondage(BaseModel):
    """Réponse d'un membre à un sondage d'événement"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    evenement_id: str
    membre_id: str
    present: bool
    choix_entree: Optional[str] = None  # Pour type "repas"
    choix_plat: Optional[str] = None
    choix_dessert: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReponseSondageCreate(BaseModel):
    membre_id: str
    present: bool
    choix_entree: Optional[str] = None
    choix_plat: Optional[str] = None
    choix_dessert: Optional[str] = None


# ============ MESSAGES & NOTIFICATIONS - MODELS ============

class SondageTemplate(BaseModel):
    """Template de sondage prédéfini"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str  # "Resto", "Anniversaire", "Apéro", "Album", "Autre"
    description: Optional[str] = None
    type_sondage: str  # "repas", "simple", "album", "libre"
    questions: List[dict] = []  # [{question: str, type: "oui_non" | "choix_multiple" | "choix_unique", options: []}]
    actif: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Message(BaseModel):
    """Message/Annonce du président"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "annonce", "rappel_sondage", "rappel_cotisation", "sondage"
    titre: str
    contenu: str
    auteur_id: str  # ID du membre qui envoie (président)
    destinataires: List[str] = []  # Liste des membre_id, vide = tous
    evenement_id: Optional[str] = None  # Lié à un événement si applicable
    sondage_template_id: Optional[str] = None  # Template de sondage utilisé
    date_limite: Optional[datetime] = None  # Pour les sondages
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MessageCreate(BaseModel):
    type: str
    titre: str
    contenu: str
    destinataires: List[str] = []
    evenement_id: Optional[str] = None
    sondage_template_id: Optional[str] = None
    date_limite: Optional[datetime] = None


class MessageTemplate(BaseModel):
    """Template de message réutilisable"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str
    type: str = "annonce"
    titre: str
    contenu: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Notification(BaseModel):
    """Notification pour un membre (badge rouge)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    membre_id: str
    type: str  # "message", "sondage", "rappel_cotisation"
    message_id: Optional[str] = None
    titre: str
    lu: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReponseSondageMessage(BaseModel):
    """Réponse d'un membre à un sondage de message"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_id: str
    membre_id: str
    reponses: dict  # {question_id: reponse}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ COMPTABILITÉ - ROUTES ============

# -------- COMPTES --------

@api_router.get("/comptes", response_model=List[Compte])
async def get_comptes():
    """Obtenir tous les comptes"""
    comptes = await db.comptes.find({}, {"_id": 0}).to_list(1000)
    
    for compte in comptes:
        if isinstance(compte.get('created_at'), str):
            compte['created_at'] = datetime.fromisoformat(compte['created_at'])
        if isinstance(compte.get('updated_at'), str):
            compte['updated_at'] = datetime.fromisoformat(compte['updated_at'])
    
    return comptes


@api_router.post("/comptes", response_model=Compte)
async def create_compte(input: CompteCreate):
    """Créer un nouveau compte"""
    compte_obj = Compte(**input.model_dump())
    
    doc = compte_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.comptes.insert_one(doc)
    return compte_obj


@api_router.delete("/comptes/{compte_id}")
async def delete_compte(compte_id: str):
    """Supprimer un compte"""
    result = await db.comptes.delete_one({"id": compte_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    return {"message": "Compte supprimé avec succès"}


# -------- CATÉGORIES --------

@api_router.get("/categories", response_model=List[Categorie])
async def get_categories():
    """Obtenir toutes les catégories"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    
    return categories


@api_router.post("/categories", response_model=Categorie)
async def create_categorie(input: CategorieCreate):
    """Créer une nouvelle catégorie"""
    categorie_obj = Categorie(**input.model_dump())
    
    doc = categorie_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.categories.insert_one(doc)
    return categorie_obj


# -------- TRANSACTIONS --------

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions():
    """Obtenir toutes les transactions"""
    transactions = await db.transactions.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    for trans in transactions:
        if isinstance(trans.get('date'), str):
            trans['date'] = datetime.fromisoformat(trans['date'])
        if isinstance(trans.get('created_at'), str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    
    return transactions


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(input: TransactionCreate):
    """Créer un nouveau mouvement"""
    # Créer la transaction
    trans_dict = input.model_dump()
    if trans_dict['date'] is None:
        trans_dict['date'] = datetime.now(timezone.utc)
    
    trans_obj = Transaction(**trans_dict)
    
    doc = trans_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    
    # Trouver le compte correspondant à l'endroit
    # Le mapping permet de normaliser les noms de comptes
    compte_mapping = {
        "Compte": "Compte Bancaire",
        "Compte Bancaire": "Compte Bancaire",
        "chèque": "Compte Bancaire",
        "Fabien": "Chez Fabien",
        "Chez Fabien": "Chez Fabien",
        "Jacques": "Chez Jacques",
        "Chez Jacques": "Chez Jacques",
        "Enveloppe bar": "Dehors",
        "Bar": "Dehors",
        "Dehors": "Dehors",
        "PayPal": "PayPal",
        "Asso Connect": "Asso Connect"
    }
    
    compte_nom = compte_mapping.get(trans_obj.endroit, trans_obj.endroit)
    compte = await db.comptes.find_one({"nom": compte_nom}, {"_id": 0})
    
    if compte:
        # Mettre à jour le solde du compte
        if trans_obj.type == "recette":
            nouveau_solde = compte['solde'] + trans_obj.montant
        else:  # dépense
            nouveau_solde = compte['solde'] - trans_obj.montant
        
        await db.comptes.update_one(
            {"nom": compte_nom},
            {
                "$set": {
                    "solde": nouveau_solde,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    # Si c'est une cotisation, mettre à jour le membre
    if trans_obj.objet == "cotisation" and trans_obj.membre_id:
        membre = await db.members.find_one({"id": trans_obj.membre_id}, {"_id": 0})
        if membre and trans_obj.type == "recette":
            # Réduire la situation_cotisation
            nouvelle_situation = max(0, membre['situation_cotisation'] - 1)
            await db.members.update_one(
                {"id": trans_obj.membre_id},
                {
                    "$set": {
                        "situation_cotisation": nouvelle_situation,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    
    return trans_obj


@api_router.post("/transactions/cotisation")
async def payer_cotisation(input: CotisationPayment):
    """
    Enregistrer un paiement de cotisation.
    Met automatiquement à jour :
    - Le solde du compte
    - La situation_cotisation du membre
    - Crée une transaction
    """
    # Vérifier que le membre existe
    membre = await db.members.find_one({"id": input.membre_id}, {"_id": 0})
    if not membre:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Vérifier que le compte existe
    compte = await db.comptes.find_one({"id": input.compte_id}, {"_id": 0})
    if not compte:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    # Créer la transaction
    description = input.description or f"Cotisation - {membre['nom_complet']} - {input.nombre_saisons} saison(s)"
    
    trans_obj = Transaction(
        type="recette",
        montant=input.montant,
        categorie="Cotisations",
        description=description,
        compte_id=input.compte_id,
        membre_id=input.membre_id
    )
    
    doc = trans_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    
    # Mettre à jour le solde du compte
    nouveau_solde = compte['solde'] + input.montant
    await db.comptes.update_one(
        {"id": input.compte_id},
        {
            "$set": {
                "solde": nouveau_solde,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Mettre à jour la situation_cotisation du membre (réduire le nombre de saisons dues)
    nouvelle_situation = max(0, membre['situation_cotisation'] - input.nombre_saisons)
    await db.members.update_one(
        {"id": input.membre_id},
        {
            "$set": {
                "situation_cotisation": nouvelle_situation,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": "Cotisation enregistrée avec succès",
        "transaction": trans_obj,
        "nouvelle_situation_cotisation": nouvelle_situation,
        "nouveau_solde_compte": nouveau_solde
    }


@api_router.get("/transactions/summary")
async def get_transactions_summary():
    """Obtenir le résumé financier"""
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    comptes = await db.comptes.find({}, {"_id": 0}).to_list(1000)
    
    # Calculer les totaux
    total_recettes = sum(t['montant'] for t in transactions if t['type'] == 'recette')
    total_depenses = sum(t['montant'] for t in transactions if t['type'] == 'dépense')
    solde_total = sum(c['solde'] for c in comptes)
    
    # Cotisations en attente
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    cotisations_en_attente = sum(m['situation_cotisation'] for m in members)
    
    return {
        "solde_total": solde_total,
        "total_recettes": total_recettes,
        "total_depenses": total_depenses,
        "nombre_transactions": len(transactions),
        "nombre_comptes": len(comptes),
        "cotisations_en_attente": cotisations_en_attente
    }


@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    """Supprimer une transaction (et ajuster le solde du compte)"""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    # Trouver le compte correspondant
    compte_mapping = {
        "Compte": "Compte Bancaire",
        "chèque": "Compte Bancaire",
        "Fabien": "Chez Fabien",
        "Jacques": "Chez Jacques",
        "Enveloppe bar": "Dehors",
        "PayPal": "PayPal"
    }
    
    compte_nom = compte_mapping.get(transaction['endroit'], transaction['endroit'])
    compte = await db.comptes.find_one({"nom": compte_nom}, {"_id": 0})
    
    if compte:
        # Ajuster le solde du compte (inverser la transaction)
        if transaction['type'] == "recette":
            nouveau_solde = compte['solde'] - transaction['montant']
        else:  # dépense
            nouveau_solde = compte['solde'] + transaction['montant']
        
        await db.comptes.update_one(
            {"nom": compte_nom},
            {
                "$set": {
                    "solde": nouveau_solde,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    # Supprimer la transaction
    await db.transactions.delete_one({"id": transaction_id})
    
    return {"message": "Transaction supprimée avec succès"}


# ============ VIREMENTS ENTRE COMPTES ============

class VirementInput(BaseModel):
    compte_source: str
    compte_destination: str
    montant: float
    description: Optional[str] = "Virement interne"

@api_router.post("/virements")
async def effectuer_virement(input: VirementInput):
    """Effectuer un virement entre deux comptes"""
    
    if input.montant <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être positif")
    
    if input.compte_source == input.compte_destination:
        raise HTTPException(status_code=400, detail="Les comptes source et destination doivent être différents")
    
    # Vérifier que les deux comptes existent (Dehors est un compte virtuel)
    compte_source = None
    compte_dest = None
    
    if input.compte_source == 'Dehors':
        # Dehors est virtuel, on calcule son solde depuis les dettes
        dettes = await db.dettes.find({}, {"_id": 0}).to_list(1000)
        total_dettes = sum(d.get('montant', 0) for d in dettes)
        compte_source = {"nom": "Dehors", "solde": total_dettes}
    else:
        compte_source = await db.comptes.find_one({"nom": input.compte_source}, {"_id": 0})
    
    if input.compte_destination == 'Dehors':
        compte_dest = {"nom": "Dehors", "solde": 0}
    else:
        compte_dest = await db.comptes.find_one({"nom": input.compte_destination}, {"_id": 0})
    
    if not compte_source:
        raise HTTPException(status_code=404, detail=f"Compte source '{input.compte_source}' non trouvé")
    if not compte_dest:
        raise HTTPException(status_code=404, detail=f"Compte destination '{input.compte_destination}' non trouvé")
    
    # Vérifier que le compte source a suffisamment de fonds
    if compte_source['solde'] < input.montant:
        raise HTTPException(
            status_code=400, 
            detail=f"Solde insuffisant sur {input.compte_source} ({compte_source['solde']}€ disponible)"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Créer une transaction de sortie (du compte source)
    trans_sortie = {
        "id": str(uuid.uuid4()),
        "date": now,
        "type": "dépense",
        "membre_id": None,
        "objet": "virement",
        "montant": input.montant,
        "endroit": input.compte_source,
        "detail": f"Virement vers {input.compte_destination}: {input.description}",
        "created_at": now,
        "updated_at": now
    }
    
    # Créer une transaction d'entrée (sur le compte destination)
    trans_entree = {
        "id": str(uuid.uuid4()),
        "date": now,
        "type": "recette",
        "membre_id": None,
        "objet": "virement",
        "montant": input.montant,
        "endroit": input.compte_destination,
        "detail": f"Virement depuis {input.compte_source}: {input.description}",
        "created_at": now,
        "updated_at": now
    }
    
    # Insérer les transactions
    await db.transactions.insert_one(trans_sortie)
    await db.transactions.insert_one(trans_entree)
    
    # Mettre à jour les soldes des comptes (sauf Dehors qui est virtuel)
    if input.compte_source != 'Dehors':
        await db.comptes.update_one(
            {"nom": input.compte_source},
            {"$inc": {"solde": -input.montant}, "$set": {"updated_at": now}}
        )
    if input.compte_destination != 'Dehors':
        await db.comptes.update_one(
            {"nom": input.compte_destination},
            {"$inc": {"solde": input.montant}, "$set": {"updated_at": now}}
        )
    
    return {
        "message": "Virement effectué avec succès",
        "montant": input.montant,
        "de": input.compte_source,
        "vers": input.compte_destination,
        "nouveau_solde_source": compte_source['solde'] - input.montant,
        "nouveau_solde_destination": compte_dest['solde'] + input.montant
    }


# ============ DETTES - ROUTES ============

@api_router.get("/dettes", response_model=List[Dette])
async def get_dettes():
    """Obtenir toutes les dettes"""
    dettes = await db.dettes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for dette in dettes:
        if isinstance(dette.get('created_at'), str):
            dette['created_at'] = datetime.fromisoformat(dette['created_at'])
        if isinstance(dette.get('updated_at'), str):
            dette['updated_at'] = datetime.fromisoformat(dette['updated_at'])
    
    return dettes


@api_router.get("/dettes/membre/{membre_id}", response_model=List[Dette])
async def get_dettes_membre(membre_id: str):
    """Obtenir les dettes d'un membre spécifique"""
    dettes = await db.dettes.find({"membre_id": membre_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for dette in dettes:
        if isinstance(dette.get('created_at'), str):
            dette['created_at'] = datetime.fromisoformat(dette['created_at'])
        if isinstance(dette.get('updated_at'), str):
            dette['updated_at'] = datetime.fromisoformat(dette['updated_at'])
    
    return dettes


@api_router.post("/dettes", response_model=Dette)
async def create_dette(input: DetteCreate):
    """Créer une nouvelle dette pour un membre"""
    # Vérifier que le membre existe
    membre = await db.members.find_one({"id": input.membre_id}, {"_id": 0})
    if not membre:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    dette_obj = Dette(**input.model_dump())
    
    doc = dette_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.dettes.insert_one(doc)
    
    return dette_obj


@api_router.delete("/dettes/{dette_id}")
async def delete_dette(dette_id: str):
    """Supprimer une dette (marquée comme réglée)"""
    result = await db.dettes.delete_one({"id": dette_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dette non trouvée")
    
    return {"message": "Dette marquée comme réglée"}


# ============ ÉVÉNEMENTS - ROUTES ============

@api_router.get("/evenements", response_model=List[Evenement])
async def get_evenements():
    """Obtenir tous les événements"""
    evenements = await db.evenements.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    for evt in evenements:
        if isinstance(evt.get('date'), str):
            evt['date'] = datetime.fromisoformat(evt['date'])
        if isinstance(evt.get('created_at'), str):
            evt['created_at'] = datetime.fromisoformat(evt['created_at'])
    
    return evenements


@api_router.post("/evenements", response_model=Evenement)
async def create_evenement(input: EvenementCreate):
    """Créer un nouvel événement
    
    AUTOMATISATION: Met à jour automatiquement le nombre d'événements de la saison
    """
    now = datetime.now(timezone.utc).isoformat()
    evt_obj = Evenement(**input.model_dump())
    
    doc = evt_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.evenements.insert_one(doc)
    
    # ========== AUTOMATISATION: Mettre à jour la config de la saison ==========
    if evt_obj.saison and evt_obj.type_sondage:
        type_field_map = {
            "apero": "nb_aperos",
            "apéro": "nb_aperos",
            "repas": "nb_repas",
            "anniversaire": "nb_anniversaires"
        }
        config_field = type_field_map.get(evt_obj.type_sondage.lower())
        
        if config_field:
            # Vérifier si la config de saison existe
            saison_config = await db.saisons_config.find_one({"saison": evt_obj.saison})
            
            if saison_config:
                # Incrémenter le compteur
                await db.saisons_config.update_one(
                    {"saison": evt_obj.saison},
                    {"$inc": {config_field: 1}, "$set": {"updated_at": now}}
                )
            else:
                # Créer la config avec 1 événement
                new_config = {
                    "id": str(uuid.uuid4()),
                    "saison": evt_obj.saison,
                    "nb_aperos": 1 if config_field == "nb_aperos" else 0,
                    "nb_repas": 1 if config_field == "nb_repas" else 0,
                    "nb_anniversaires": 1 if config_field == "nb_anniversaires" else 0,
                    "created_at": now,
                    "updated_at": now
                }
                await db.saisons_config.insert_one(new_config)
    # ========== FIN AUTOMATISATION ==========
    
    return evt_obj


@api_router.get("/evenements/{evenement_id}")
async def get_evenement(evenement_id: str):
    """Obtenir un événement spécifique"""
    evt = await db.evenements.find_one({"id": evenement_id}, {"_id": 0})
    if not evt:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    if isinstance(evt.get('date'), str):
        evt['date'] = datetime.fromisoformat(evt['date'])
    if isinstance(evt.get('created_at'), str):
        evt['created_at'] = datetime.fromisoformat(evt['created_at'])
    
    return evt


@api_router.get("/evenements/{evenement_id}/stats")
async def get_evenement_stats(evenement_id: str):
    """Obtenir les statistiques d'un événement"""
    evt = await db.evenements.find_one({"id": evenement_id}, {"_id": 0})
    if not evt:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Récupérer toutes les réponses (chercher dans les deux collections)
    reponses_s = await db.reponses_sondages.find({"evenement_id": evenement_id}, {"_id": 0}).to_list(1000)
    reponses_e = await db.reponses_evenements.find({"evenement_id": evenement_id}, {"_id": 0}).to_list(1000)
    reponses = reponses_s + reponses_e
    
    # Récupérer tous les membres
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    total_membres = len(members)
    
    # Calculer les stats
    presents = [r for r in reponses if r['present']]
    absents = [r for r in reponses if not r['present']]
    non_repondus = total_membres - len(reponses)
    
    stats = {
        "evenement": evt,
        "total_membres": total_membres,
        "presents": len(presents),
        "absents": len(absents),
        "non_repondus": non_repondus,
        "reponses": reponses
    }
    
    # Si c'est un repas, compter les choix
    if evt.get('type_sondage') == 'repas' and presents:
        from collections import Counter
        
        entrees_count = Counter([r.get('choix_entree') for r in presents if r.get('choix_entree')])
        plats_count = Counter([r.get('choix_plat') for r in presents if r.get('choix_plat')])
        desserts_count = Counter([r.get('choix_dessert') for r in presents if r.get('choix_dessert')])
        
        stats['choix'] = {
            'entrees': dict(entrees_count),
            'plats': dict(plats_count),
            'desserts': dict(desserts_count)
        }
    
    return stats


@api_router.post("/evenements/{evenement_id}/reponse")
async def repondre_sondage(evenement_id: str, input: ReponseSondageCreate):
    """Répondre au sondage d'un événement"""
    # Vérifier que l'événement existe
    evt = await db.evenements.find_one({"id": evenement_id}, {"_id": 0})
    if not evt:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Vérifier si le membre a déjà répondu
    existing = await db.reponses_sondages.find_one({
        "evenement_id": evenement_id,
        "membre_id": input.membre_id
    }, {"_id": 0})
    
    reponse_obj = ReponseSondage(
        evenement_id=evenement_id,
        **input.model_dump()
    )
    
    doc = reponse_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    if existing:
        # Mettre à jour la réponse existante
        await db.reponses_sondages.update_one(
            {"evenement_id": evenement_id, "membre_id": input.membre_id},
            {"$set": doc}
        )
    else:
        # Créer une nouvelle réponse
        await db.reponses_sondages.insert_one(doc)
    
    return {"message": "Réponse enregistrée avec succès", "reponse": reponse_obj}


@api_router.get("/evenements/statut/en-cours")
async def get_evenement_en_cours():
    """Obtenir l'événement en cours (pour le Dashboard)"""
    # Chercher un événement avec statut "en cours"
    evt = await db.evenements.find_one({"statut": "en cours"}, {"_id": 0})
    
    if not evt:
        return None
    
    if isinstance(evt.get('date'), str):
        evt['date'] = datetime.fromisoformat(evt['date'])
    if isinstance(evt.get('created_at'), str):
        evt['created_at'] = datetime.fromisoformat(evt['created_at'])
    
    # Récupérer les stats (chercher dans les deux collections)
    reponses_s = await db.reponses_sondages.find({"evenement_id": evt['id']}, {"_id": 0}).to_list(1000)
    reponses_e = await db.reponses_evenements.find({"evenement_id": evt['id']}, {"_id": 0}).to_list(1000)
    reponses = reponses_s + reponses_e
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    
    presents = [r for r in reponses if r['present']]
    absents = [r for r in reponses if not r['present']]
    
    stats = {
        "evenement": evt,
        "presents": len(presents),
        "absents": len(absents),
        "non_repondus": len(members) - len(reponses)
    }
    
    # Si repas, ajouter les choix
    if evt.get('type_sondage') == 'repas' and presents:
        from collections import Counter
        
        entrees_count = Counter([r.get('choix_entree') for r in presents if r.get('choix_entree')])
        plats_count = Counter([r.get('choix_plat') for r in presents if r.get('choix_plat')])
        desserts_count = Counter([r.get('choix_dessert') for r in presents if r.get('choix_dessert')])
        
        stats['choix'] = {
            'entrees': dict(entrees_count),
            'plats': dict(plats_count),
            'desserts': dict(desserts_count)
        }
    
    return stats


@api_router.delete("/evenements/{evenement_id}")
async def delete_evenement(evenement_id: str):
    """Supprimer un événement
    
    AUTOMATISATION: Décrémente automatiquement le nombre d'événements de la saison
    et supprime les présences associées des membres
    """
    # Récupérer l'événement avant de le supprimer
    existing = await db.evenements.find_one({"id": evenement_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    evt_saison = existing.get("saison", 13)
    evt_type = existing.get("type_sondage", "").lower()
    
    # Supprimer l'événement
    result = await db.evenements.delete_one({"id": evenement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Supprimer toutes les réponses associées (chercher dans les deux collections)
    reponses_sondages = await db.reponses_sondages.find({"evenement_id": evenement_id}, {"_id": 0}).to_list(1000)
    reponses_evenements = await db.reponses_evenements.find({"evenement_id": evenement_id}, {"_id": 0}).to_list(1000)
    
    # Combiner toutes les réponses
    reponses = reponses_sondages + reponses_evenements
    
    # Supprimer des deux collections
    await db.reponses_sondages.delete_many({"evenement_id": evenement_id})
    await db.reponses_evenements.delete_many({"evenement_id": evenement_id})
    
    # ========== AUTOMATISATION : DÉCRÉMENTER LES STATS ==========
    
    # 1. Décrémenter le nombre d'événements de cette saison
    type_field_map = {
        "apero": "nb_aperos",
        "apéro": "nb_aperos",
        "repas": "nb_repas",
        "anniversaire": "nb_anniversaires"
    }
    field_to_update = type_field_map.get(evt_type)
    
    if field_to_update:
        # Récupérer la config actuelle
        config = await db.saisons_config.find_one({"saison": evt_saison})
        if config:
            current_count = config.get(field_to_update, 0)
            new_count = max(0, current_count - 1)  # Jamais négatif
            await db.saisons_config.update_one(
                {"saison": evt_saison},
                {"$set": {field_to_update: new_count}}
            )
    
    # 2. Décrémenter les présences des membres qui avaient répondu "présent"
    presence_field_map = {
        "apero": "presences_aperos",
        "apéro": "presences_aperos",
        "repas": "presences_repas",
        "anniversaire": "presences_anniversaires"
    }
    presence_field = presence_field_map.get(evt_type)
    
    if presence_field:
        for reponse in reponses:
            if reponse.get("present"):
                membre_id = reponse.get("membre_id")
                if membre_id:
                    # Décrémenter la présence du membre
                    membre_presence = await db.presences_membres.find_one({
                        "membre_id": membre_id,
                        "saison": evt_saison
                    })
                    if membre_presence:
                        current_pres = membre_presence.get(presence_field, 0)
                        new_pres = max(0, current_pres - 1)
                        await db.presences_membres.update_one(
                            {"membre_id": membre_id, "saison": evt_saison},
                            {"$set": {presence_field: new_pres}}
                        )
    
    # ========== FIN AUTOMATISATION ==========
    
    return {"message": "Événement supprimé avec succès"}


# ============ ÉVÉNEMENTS - ÉDITION COMPLÈTE ============

class EvenementUpdate(BaseModel):
    """Mise à jour complète d'un événement"""
    date: Optional[datetime] = None
    lieu: Optional[str] = None
    type_sondage: Optional[str] = None  # "repas", "apero", "anniversaire"
    total_presents: Optional[int] = None
    objet: Optional[str] = None


@api_router.put("/evenements/{evenement_id}")
async def update_evenement(evenement_id: str, input: EvenementUpdate):
    """Mettre à jour un événement (tous les champs éditables)"""
    existing = await db.evenements.find_one({"id": evenement_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Préparer les données de mise à jour (seulement les champs fournis)
    update_data = {}
    
    if input.date is not None:
        update_data['date'] = input.date.isoformat()
    if input.lieu is not None:
        update_data['lieu'] = input.lieu
    if input.type_sondage is not None:
        update_data['type_sondage'] = input.type_sondage
        # Mettre à jour l'objet automatiquement selon le type
        type_to_objet = {
            'repas': 'Repas',
            'apero': 'Apéro',
            'anniversaire': 'Anniversaire'
        }
        update_data['objet'] = type_to_objet.get(input.type_sondage, input.type_sondage.capitalize())
    if input.total_presents is not None:
        update_data['total_presents'] = input.total_presents
    if input.objet is not None:
        update_data['objet'] = input.objet
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Mettre à jour dans MongoDB
    await db.evenements.update_one(
        {"id": evenement_id},
        {"$set": update_data}
    )
    
    # Récupérer et retourner l'événement mis à jour
    updated_evt = await db.evenements.find_one({"id": evenement_id}, {"_id": 0})
    
    if isinstance(updated_evt.get('date'), str):
        updated_evt['date'] = datetime.fromisoformat(updated_evt['date'])
    if isinstance(updated_evt.get('created_at'), str):
        updated_evt['created_at'] = datetime.fromisoformat(updated_evt['created_at'])
    
    return updated_evt


class EvenementCreateSimple(BaseModel):
    """Création simplifiée d'un événement historique"""
    date: datetime
    lieu: str
    type_sondage: str  # "repas", "apero", "anniversaire"
    total_presents: int = 0
    saison: int


@api_router.post("/evenements/simple")
async def create_evenement_simple(input: EvenementCreateSimple):
    """Créer un événement simplifié (pour l'historique)
    
    AUTOMATISATION: Met à jour automatiquement le nombre d'événements de la saison
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Déterminer l'objet selon le type
    type_to_objet = {
        'repas': 'Repas',
        'apero': 'Apéro',
        'anniversaire': 'Anniversaire'
    }
    objet = type_to_objet.get(input.type_sondage, input.type_sondage.capitalize())
    
    evt_obj = Evenement(
        date=input.date,
        objet=objet,
        lieu=input.lieu,
        type_sondage=input.type_sondage,
        saison=input.saison,
        statut='terminé'
    )
    
    doc = evt_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['total_presents'] = input.total_presents
    
    await db.evenements.insert_one(doc)
    
    # ========== AUTOMATISATION: Mettre à jour la config de la saison ==========
    type_field_map = {
        "apero": "nb_aperos",
        "apéro": "nb_aperos",
        "repas": "nb_repas",
        "anniversaire": "nb_anniversaires"
    }
    config_field = type_field_map.get(input.type_sondage.lower())
    
    if config_field:
        # Vérifier si la config de saison existe
        saison_config = await db.saisons_config.find_one({"saison": input.saison})
        
        if saison_config:
            # Incrémenter le compteur
            await db.saisons_config.update_one(
                {"saison": input.saison},
                {"$inc": {config_field: 1}, "$set": {"updated_at": now}}
            )
        else:
            # Créer la config avec 1 événement
            new_config = {
                "id": str(uuid.uuid4()),
                "saison": input.saison,
                "nb_aperos": 1 if config_field == "nb_aperos" else 0,
                "nb_repas": 1 if config_field == "nb_repas" else 0,
                "nb_anniversaires": 1 if config_field == "nb_anniversaires" else 0,
                "created_at": now,
                "updated_at": now
            }
            await db.saisons_config.insert_one(new_config)
    # ========== FIN AUTOMATISATION ==========
    
    # Récupérer sans _id pour éviter ObjectId
    created_evt = await db.evenements.find_one({"id": evt_obj.id}, {"_id": 0})
    
    return {
        "message": "Événement créé avec succès",
        "evenement": created_evt
    }


# ============ RÉPONSES AUX SONDAGES D'ÉVÉNEMENTS ============

class ReponseSondageEvenement(BaseModel):
    evenement_id: str
    membre_id: str
    present: bool
    choix_entree: Optional[str] = None
    choix_plat: Optional[str] = None
    choix_dessert: Optional[str] = None


@api_router.post("/reponses-sondages")
async def submit_reponse_sondage(input: ReponseSondageEvenement):
    """Soumettre ou mettre à jour une réponse au sondage d'un événement
    
    AUTOMATISATION DES STATISTIQUES:
    - Met à jour automatiquement les présences du membre dans la saison correspondante
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Récupérer le nom du membre
    membre = await db.members.find_one({"id": input.membre_id}, {"nom_complet": 1, "_id": 0})
    membre_nom = membre.get("nom_complet", "Un membre") if membre else "Un membre"
    
    # Récupérer les infos de l'événement
    evenement = await db.evenements.find_one({"id": input.evenement_id}, {"objet": 1, "date": 1, "type_sondage": 1, "saison": 1, "_id": 0})
    evt_objet = evenement.get("objet", "l'événement") if evenement else "l'événement"
    evt_type = evenement.get("type_sondage", "").lower() if evenement else ""
    evt_saison = evenement.get("saison") if evenement else None
    
    # Vérifier si une réponse existe déjà
    existing = await db.reponses_evenements.find_one({
        "evenement_id": input.evenement_id,
        "membre_id": input.membre_id
    })
    
    old_present = existing.get("present", False) if existing else False
    action_text = "a modifié sa réponse" if existing else "a répondu"
    reponse_text = "PRÉSENT" if input.present else "ABSENT"
    
    if existing:
        # Mise à jour
        await db.reponses_evenements.update_one(
            {"evenement_id": input.evenement_id, "membre_id": input.membre_id},
            {"$set": {
                "present": input.present,
                "choix_entree": input.choix_entree,
                "choix_plat": input.choix_plat,
                "choix_dessert": input.choix_dessert,
                "updated_at": now
            }}
        )
    else:
        # Nouvelle réponse
        doc = {
            "id": str(uuid.uuid4()),
            "evenement_id": input.evenement_id,
            "membre_id": input.membre_id,
            "present": input.present,
            "choix_entree": input.choix_entree,
            "choix_plat": input.choix_plat,
            "choix_dessert": input.choix_dessert,
            "created_at": now,
            "updated_at": now
        }
        await db.reponses_evenements.insert_one(doc)
    
    # ========== AUTOMATISATION DES STATISTIQUES DE PRÉSENCE ==========
    if evt_saison and evt_type:
        # Déterminer le champ de présence à mettre à jour
        type_field_map = {
            "apero": "presences_aperos",
            "apéro": "presences_aperos",
            "repas": "presences_repas",
            "anniversaire": "presences_anniversaires"
        }
        presence_field = type_field_map.get(evt_type)
        
        if presence_field:
            # Récupérer ou créer l'enregistrement de présence du membre pour cette saison
            membre_presence = await db.presences_membres.find_one({
                "membre_id": input.membre_id,
                "saison": evt_saison
            })
            
            if not membre_presence:
                # Créer un nouvel enregistrement
                membre_presence = {
                    "id": str(uuid.uuid4()),
                    "membre_id": input.membre_id,
                    "saison": evt_saison,
                    "presences_aperos": 0,
                    "presences_repas": 0,
                    "presences_anniversaires": 0,
                    "created_at": now,
                    "updated_at": now
                }
                await db.presences_membres.insert_one(membre_presence)
            
            # Calculer le delta de présence
            # Si nouvelle réponse: +1 si présent
            # Si modification: +1 si passe à présent, -1 si passe à absent
            if not existing:
                # Nouvelle réponse
                if input.present:
                    delta = 1
                else:
                    delta = 0  # Absent = on ne compte pas
            else:
                # Modification
                if input.present and not old_present:
                    delta = 1  # Passe de absent à présent
                elif not input.present and old_present:
                    delta = -1  # Passe de présent à absent
                else:
                    delta = 0  # Pas de changement
            
            if delta != 0:
                # Mettre à jour les présences du membre
                current_value = membre_presence.get(presence_field, 0)
                new_value = max(0, current_value + delta)  # Jamais négatif
                
                await db.presences_membres.update_one(
                    {"membre_id": input.membre_id, "saison": evt_saison},
                    {"$set": {
                        presence_field: new_value,
                        "updated_at": now
                    }}
                )
    # ========== FIN AUTOMATISATION ==========
    
    # Créer une notification pour l'admin (président)
    president = await db.members.find_one({"fonction": "Président"}, {"id": 1, "_id": 0})
    if president:
        notif = {
            "id": str(uuid.uuid4()),
            "membre_id": president["id"],
            "type": "reponse_sondage",
            "titre": f"📊 {membre_nom} {action_text}",
            "contenu": f"{membre_nom} {action_text} au sondage pour {evt_objet} : {reponse_text}",
            "evenement_id": input.evenement_id,
            "repondant_id": input.membre_id,
            "lu": False,
            "created_at": now
        }
        await db.notifications.insert_one(notif)
    
    return {"message": "Réponse mise à jour" if existing else "Réponse enregistrée", "action": "updated" if existing else "created"}


@api_router.get("/reponses-sondages/{evenement_id}/{membre_id}")
async def get_reponse_membre(evenement_id: str, membre_id: str):
    """Récupérer la réponse d'un membre à un événement"""
    reponse = await db.reponses_evenements.find_one({
        "evenement_id": evenement_id,
        "membre_id": membre_id
    }, {"_id": 0})
    
    if not reponse:
        raise HTTPException(status_code=404, detail="Réponse non trouvée")
    
    return reponse


@api_router.get("/reponses-sondages/{evenement_id}")
async def get_reponses_evenement(evenement_id: str):
    """Récupérer toutes les réponses à un événement"""
    reponses = await db.reponses_evenements.find(
        {"evenement_id": evenement_id}, 
        {"_id": 0}
    ).to_list(100)
    
    # Compter les présents/absents
    presents = len([r for r in reponses if r.get("present")])
    absents = len([r for r in reponses if not r.get("present")])
    
    return {
        "evenement_id": evenement_id,
        "total_reponses": len(reponses),
        "presents": presents,
        "absents": absents,
        "reponses": reponses
    }


# ============ TEMPLATES DE SONDAGES - ROUTES ============

@api_router.get("/sondage-templates")
async def get_sondage_templates():
    """Liste tous les templates de sondages"""
    templates = await db.sondage_templates.find({}, {"_id": 0}).to_list(100)
    return templates


@api_router.post("/sondage-templates")
async def create_sondage_template(template: SondageTemplate):
    """Créer un nouveau template de sondage"""
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sondage_templates.insert_one(doc)
    return {"message": "Template créé", "template": {**doc, "_id": None}}


@api_router.put("/sondage-templates/{template_id}")
async def update_sondage_template(template_id: str, update: dict):
    """Mettre à jour un template"""
    await db.sondage_templates.update_one({"id": template_id}, {"$set": update})
    updated = await db.sondage_templates.find_one({"id": template_id}, {"_id": 0})
    return updated


@api_router.delete("/sondage-templates/{template_id}")
async def delete_sondage_template(template_id: str):
    """Supprimer un template"""
    await db.sondage_templates.delete_one({"id": template_id})
    return {"message": "Template supprimé"}


# ============ MESSAGES - ROUTES ============

@api_router.get("/messages")
async def get_messages(membre_id: Optional[str] = None):
    """Liste les messages (tous ou pour un membre spécifique)"""
    query = {}
    if membre_id:
        # Messages pour ce membre ou pour tous
        query = {"$or": [{"destinataires": membre_id}, {"destinataires": []}]}
    
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages


@api_router.post("/messages")
async def create_message(input: MessageCreate, request: Request):
    """Créer et envoyer un message"""
    # Récupérer l'auteur depuis la session (ou utiliser un ID par défaut en mode démo)
    session_data = request.session.get("user")
    auteur_id = None
    
    if session_data:
        auteur_id = session_data.get("membre_id")
    
    # Mode démo : si pas de session, utiliser le premier admin (président)
    if not auteur_id:
        president = await db.members.find_one({"fonction": "Président"}, {"id": 1, "_id": 0})
        if president:
            auteur_id = president["id"]
        else:
            # Fallback: premier membre
            first_member = await db.members.find_one({}, {"id": 1, "_id": 0})
            auteur_id = first_member["id"] if first_member else "system"
    
    message = Message(
        type=input.type,
        titre=input.titre,
        contenu=input.contenu,
        auteur_id=auteur_id,
        destinataires=input.destinataires,
        evenement_id=input.evenement_id,
        sondage_template_id=input.sondage_template_id,
        date_limite=input.date_limite
    )
    
    doc = message.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('date_limite'):
        doc['date_limite'] = doc['date_limite'].isoformat()
    
    await db.messages.insert_one(doc)
    
    # Créer des notifications pour les destinataires
    if input.destinataires:
        destinataires = input.destinataires
    else:
        # Tous les membres (actifs ou non - tous reçoivent les messages)
        members_list = await db.members.find({}, {"id": 1, "_id": 0}).to_list(100)
        destinataires = [m["id"] for m in members_list]
    
    for membre_id in destinataires:
        notif = Notification(
            membre_id=membre_id,
            type="message" if input.type == "annonce" else input.type,
            message_id=message.id,
            titre=input.titre
        )
        notif_doc = notif.model_dump()
        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
        await db.notifications.insert_one(notif_doc)
    
    return {"message": "Message envoyé", "id": message.id, "notifications_envoyees": len(destinataires)}


@api_router.get("/messages/{message_id}")
async def get_message(message_id: str):
    """Récupérer un message par ID"""
    message = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    return message


@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    """Supprimer un message"""
    await db.messages.delete_one({"id": message_id})
    await db.notifications.delete_many({"message_id": message_id})
    return {"message": "Message supprimé"}


# ============ TEMPLATES DE MESSAGES - ROUTES ============

@api_router.get("/message-templates")
async def get_message_templates():
    """Liste tous les templates de messages"""
    templates = await db.message_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return templates


@api_router.post("/message-templates")
async def create_message_template(template: MessageTemplate):
    """Créer un nouveau template de message"""
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.message_templates.insert_one(doc)
    return {"message": "Template créé", "id": template.id}


@api_router.put("/message-templates/{template_id}")
async def update_message_template(template_id: str, update: dict):
    """Mettre à jour un template"""
    await db.message_templates.update_one({"id": template_id}, {"$set": update})
    return {"message": "Template mis à jour"}


@api_router.delete("/message-templates/{template_id}")
async def delete_message_template(template_id: str):
    """Supprimer un template"""
    await db.message_templates.delete_one({"id": template_id})
    return {"message": "Template supprimé"}


# ============ NOTIFICATIONS - ROUTES ============

@api_router.get("/notifications/{membre_id}")
async def get_notifications(membre_id: str, non_lues: bool = False):
    """Récupérer les notifications d'un membre"""
    query = {"membre_id": membre_id}
    if non_lues:
        query["lu"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifications


@api_router.get("/notifications/{membre_id}/count")
async def get_notification_count(membre_id: str):
    """Compter les notifications non lues"""
    count = await db.notifications.count_documents({"membre_id": membre_id, "lu": False})
    return {"count": count}


@api_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str):
    """Marquer une notification comme lue"""
    await db.notifications.update_one({"id": notif_id}, {"$set": {"lu": True}})
    return {"message": "Notification marquée comme lue"}


@api_router.put("/notifications/{membre_id}/read-all")
async def mark_all_notifications_read(membre_id: str):
    """Marquer toutes les notifications d'un membre comme lues"""
    result = await db.notifications.update_many(
        {"membre_id": membre_id, "lu": False},
        {"$set": {"lu": True}}
    )
    return {"message": f"{result.modified_count} notifications marquées comme lues"}


# ============ RÉPONSES AUX SONDAGES (MESSAGES) - ROUTES ============

@api_router.get("/sondage-reponses/{message_id}")
async def get_sondage_reponses(message_id: str):
    """Récupérer toutes les réponses à un sondage"""
    reponses = await db.sondage_reponses.find({"message_id": message_id}, {"_id": 0}).to_list(100)
    return reponses


@api_router.post("/sondage-reponses/{message_id}")
async def submit_sondage_reponse(message_id: str, membre_id: str, reponses: dict):
    """Soumettre ou mettre à jour une réponse à un sondage"""
    existing = await db.sondage_reponses.find_one({
        "message_id": message_id,
        "membre_id": membre_id
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Mise à jour
        await db.sondage_reponses.update_one(
            {"id": existing["id"]},
            {"$set": {"reponses": reponses, "updated_at": now}}
        )
        return {"message": "Réponse mise à jour"}
    else:
        # Nouvelle réponse
        reponse = ReponseSondageMessage(
            message_id=message_id,
            membre_id=membre_id,
            reponses=reponses
        )
        doc = reponse.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.sondage_reponses.insert_one(doc)
        
        # Marquer la notification comme lue
        await db.notifications.update_one(
            {"message_id": message_id, "membre_id": membre_id},
            {"$set": {"lu": True}}
        )
        
        return {"message": "Réponse enregistrée"}


@api_router.get("/sondage-reponses/{message_id}/stats")
async def get_sondage_stats(message_id: str):
    """Statistiques d'un sondage (pour le dashboard admin)"""
    message = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    reponses = await db.sondage_reponses.find({"message_id": message_id}, {"_id": 0}).to_list(100)
    
    # Compter les destinataires
    if message.get("destinataires"):
        total_destinataires = len(message["destinataires"])
    else:
        total_destinataires = await db.members.count_documents({})
    
    return {
        "message_id": message_id,
        "titre": message.get("titre"),
        "total_destinataires": total_destinataires,
        "total_reponses": len(reponses),
        "taux_reponse": custom_round(len(reponses) / total_destinataires * 100) if total_destinataires > 0 else 0,
        "reponses": reponses
    }



# ============ SONDAGES GÉNÉRIQUES - MODELS & ROUTES ============

class SondageGenerique(BaseModel):
    """Sondage générique (non lié à un événement)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: List[str]
    status: str = "active"  # "active" ou "terminé"
    created_by: Optional[str] = None  # ID du créateur (président)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SondageGeneriqueCreate(BaseModel):
    question: str
    options: List[str]


class VoteSondage(BaseModel):
    """Vote d'un membre sur un sondage"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sondage_id: str
    membre_id: str
    option_index: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.get("/sondages-generiques")
async def get_sondages_generiques():
    """Liste tous les sondages génériques avec leurs votes"""
    sondages = await db.sondages_generiques.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Pour chaque sondage, calculer les votes
    for sondage in sondages:
        votes = await db.votes_sondages.find({"sondage_id": sondage["id"]}, {"_id": 0}).to_list(1000)
        
        # Compter les votes par option
        vote_counts = [0] * len(sondage.get("options", []))
        for vote in votes:
            idx = vote.get("option_index", 0)
            if 0 <= idx < len(vote_counts):
                vote_counts[idx] += 1
        
        sondage["votes"] = vote_counts
        sondage["total_votes"] = sum(vote_counts)
        
        # Convertir datetime
        if isinstance(sondage.get('created_at'), str):
            sondage['created_at'] = datetime.fromisoformat(sondage['created_at'])
    
    return sondages


@api_router.post("/sondages-generiques")
async def create_sondage_generique(input: SondageGeneriqueCreate):
    """Créer un nouveau sondage générique"""
    if len(input.options) < 2:
        raise HTTPException(status_code=400, detail="Au moins 2 options sont requises")
    
    sondage = SondageGenerique(**input.model_dump())
    
    doc = sondage.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.sondages_generiques.insert_one(doc)
    
    # Récupérer le sondage sans _id
    created = await db.sondages_generiques.find_one({"id": sondage.id}, {"_id": 0})
    created["votes"] = [0] * len(input.options)
    created["total_votes"] = 0
    
    return {"message": "Sondage créé avec succès", "sondage": created}


@api_router.delete("/sondages-generiques/{sondage_id}")
async def delete_sondage_generique(sondage_id: str):
    """Supprimer un sondage générique et ses votes"""
    result = await db.sondages_generiques.delete_one({"id": sondage_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sondage non trouvé")
    
    # Supprimer aussi les votes associés
    await db.votes_sondages.delete_many({"sondage_id": sondage_id})
    
    return {"message": "Sondage supprimé avec succès"}


@api_router.post("/sondages-generiques/{sondage_id}/vote")
async def voter_sondage_generique(sondage_id: str, membre_id: str, option_index: int):
    """Voter sur un sondage générique"""
    # Vérifier que le sondage existe
    sondage = await db.sondages_generiques.find_one({"id": sondage_id}, {"_id": 0})
    if not sondage:
        raise HTTPException(status_code=404, detail="Sondage non trouvé")
    
    # Vérifier que l'option existe
    if option_index < 0 or option_index >= len(sondage.get("options", [])):
        raise HTTPException(status_code=400, detail="Option invalide")
    
    # Vérifier si le membre a déjà voté
    existing_vote = await db.votes_sondages.find_one({
        "sondage_id": sondage_id,
        "membre_id": membre_id
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing_vote:
        # Mettre à jour le vote
        await db.votes_sondages.update_one(
            {"id": existing_vote["id"]},
            {"$set": {"option_index": option_index, "updated_at": now}}
        )
        return {"message": "Vote mis à jour"}
    else:
        # Nouveau vote
        vote = VoteSondage(
            sondage_id=sondage_id,
            membre_id=membre_id,
            option_index=option_index
        )
        doc = vote.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.votes_sondages.insert_one(doc)
        return {"message": "Vote enregistré"}


@api_router.get("/sondages-generiques/{sondage_id}/mon-vote/{membre_id}")
async def get_mon_vote_sondage(sondage_id: str, membre_id: str):
    """Récupérer le vote d'un membre sur un sondage"""
    vote = await db.votes_sondages.find_one({
        "sondage_id": sondage_id,
        "membre_id": membre_id
    }, {"_id": 0})
    
    if vote:
        return {"hasVoted": True, "option_index": vote.get("option_index")}
    return {"hasVoted": False, "option_index": None}


# ============ STATISTIQUES & PRÉSENCES - MODELS ============

class SaisonConfig(BaseModel):
    """Configuration d'une saison (nombre d'événements par type)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    saison: int  # 1 à 14+
    nb_aperos: int = 0
    nb_repas: int = 0
    nb_anniversaires: int = 0
    # Champs manuels pour stats historiques (saisons 1-12)
    # Présences totales des membres pour la saison (saisie manuelle)
    presences_membres_aperos: Optional[int] = None  # Total présences aux apéros
    presences_membres_repas: Optional[int] = None   # Total présences aux repas
    presences_membres_anniversaires: Optional[int] = None  # Total présences aux anniversaires
    nb_membres_manuel: Optional[int] = None  # Nombre de membres actifs cette saison
    is_manuel: bool = False  # True = utiliser les valeurs manuelles pour les saisons historiques
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SaisonConfigCreate(BaseModel):
    saison: int
    nb_aperos: int = 0
    nb_repas: int = 0
    nb_anniversaires: int = 0


class SaisonConfigUpdate(BaseModel):
    nb_aperos: Optional[int] = None
    nb_repas: Optional[int] = None
    nb_anniversaires: Optional[int] = None


class PresenceMembre(BaseModel):
    """Présences d'un membre pour une saison donnée"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    membre_id: str  # Lié au compte membre
    saison: int
    presences_aperos: int = 0
    presences_repas: int = 0
    presences_anniversaires: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PresenceMembreCreate(BaseModel):
    membre_id: str
    saison: int
    presences_aperos: int = 0
    presences_repas: int = 0
    presences_anniversaires: int = 0


class PresenceMembreUpdate(BaseModel):
    presences_aperos: Optional[int] = None
    presences_repas: Optional[int] = None
    presences_anniversaires: Optional[int] = None


class PresenceBulkUpdate(BaseModel):
    """Pour mise à jour en masse d'une saison entière"""
    saison: int
    presences: List[dict]  # [{membre_id, presences_aperos, presences_repas, presences_anniversaires}]


# ============ STATISTIQUES - ROUTES ============

# -------- CONFIG SAISONS (nombre d'événements) --------

@api_router.get("/saisons-config")
async def get_saisons_config():
    """Récupérer la config de toutes les saisons"""
    configs = await db.saisons_config.find({}, {"_id": 0}).sort("saison", 1).to_list(100)
    return configs


@api_router.get("/saisons-config/{saison}")
async def get_saison_config(saison: int):
    """Récupérer la config d'une saison"""
    config = await db.saisons_config.find_one({"saison": saison}, {"_id": 0})
    if not config:
        # Créer une config vide si elle n'existe pas
        config = {
            "id": str(uuid.uuid4()),
            "saison": saison,
            "nb_aperos": 0,
            "nb_repas": 0,
            "nb_anniversaires": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.saisons_config.insert_one(config)
    return config


@api_router.post("/saisons-config")
async def create_saison_config(input: SaisonConfigCreate):
    """Créer ou mettre à jour la config d'une saison"""
    existing = await db.saisons_config.find_one({"saison": input.saison})
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Mise à jour
        await db.saisons_config.update_one(
            {"saison": input.saison},
            {"$set": {
                "nb_aperos": input.nb_aperos,
                "nb_repas": input.nb_repas,
                "nb_anniversaires": input.nb_anniversaires,
                "updated_at": now
            }}
        )
    else:
        # Création
        doc = {
            "id": str(uuid.uuid4()),
            "saison": input.saison,
            "nb_aperos": input.nb_aperos,
            "nb_repas": input.nb_repas,
            "nb_anniversaires": input.nb_anniversaires,
            "created_at": now,
            "updated_at": now
        }
        await db.saisons_config.insert_one(doc)
    
    config = await db.saisons_config.find_one({"saison": input.saison}, {"_id": 0})
    return config


@api_router.put("/saisons-config/{saison}")
async def update_saison_config(saison: int, input: SaisonConfigUpdate):
    """Mettre à jour la config d'une saison"""
    existing = await db.saisons_config.find_one({"saison": saison})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Saison non trouvée")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.saisons_config.update_one({"saison": saison}, {"$set": update_data})
    
    config = await db.saisons_config.find_one({"saison": saison}, {"_id": 0})
    return config



class SaisonManualStatsUpdate(BaseModel):
    """Mise à jour des stats manuelles pour une saison historique"""
    presences_membres_aperos: Optional[int] = None
    presences_membres_repas: Optional[int] = None
    presences_membres_anniversaires: Optional[int] = None
    nb_membres_manuel: Optional[int] = None


@api_router.post("/saisons-config/{saison}/manual-stats")
async def update_saison_manual_stats(saison: int, input: SaisonManualStatsUpdate):
    """Mettre à jour les stats manuelles d'une saison (pour saisons 1-12)
    
    Ces stats permettent de renseigner les données historiques quand
    les membres actuels n'étaient pas tous présents.
    """
    existing = await db.saisons_config.find_one({"saison": saison})
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["is_manuel"] = True
    update_data["updated_at"] = now
    
    if existing:
        await db.saisons_config.update_one({"saison": saison}, {"$set": update_data})
    else:
        # Créer la config si elle n'existe pas
        new_config = {
            "id": str(uuid.uuid4()),
            "saison": saison,
            "nb_aperos": 0,
            "nb_repas": 0,
            "nb_anniversaires": 0,
            **update_data,
            "created_at": now
        }
        await db.saisons_config.insert_one(new_config)
    
    config = await db.saisons_config.find_one({"saison": saison}, {"_id": 0})
    return config



# -------- PRÉSENCES MEMBRES --------

@api_router.get("/presences")
async def get_all_presences():
    """Récupérer toutes les présences"""
    presences = await db.presences_membres.find({}, {"_id": 0}).to_list(10000)
    return presences


@api_router.get("/presences/saison/{saison}")
async def get_presences_by_saison(saison: int):
    """Récupérer les présences pour une saison"""
    presences = await db.presences_membres.find({"saison": saison}, {"_id": 0}).to_list(100)
    
    # Récupérer la config de la saison
    config = await db.saisons_config.find_one({"saison": saison}, {"_id": 0})
    
    return {
        "saison": saison,
        "config": config,
        "presences": presences
    }


@api_router.get("/presences/membre/{membre_id}")
async def get_presences_by_membre(membre_id: str):
    """Récupérer les présences d'un membre (toutes saisons depuis son entrée)
    
    IMPORTANT: Ne compte que les saisons à partir de l'entrée du membre
    et exclut les saisons où il était en sommeil
    """
    # Récupérer les infos du membre pour connaître sa date d'entrée et saisons exclues
    membre = await db.members.find_one({"id": membre_id}, {"_id": 0, "annee_entree": 1, "saisons_exclues": 1})
    if not membre:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Calculer la première saison du membre (Saison 1 = 2013)
    annee_entree = membre.get("annee_entree", 2013)
    premiere_saison = annee_entree - 2012
    saisons_exclues = set(membre.get("saisons_exclues", []))
    
    presences = await db.presences_membres.find({"membre_id": membre_id}, {"_id": 0}).sort("saison", 1).to_list(100)
    
    # Récupérer toutes les configs de saisons
    configs = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
    configs_dict = {c["saison"]: c for c in configs}
    
    # Calculer les statistiques - UNIQUEMENT pour les saisons >= premiere_saison et hors saisons exclues
    stats = []
    total_aperos = 0
    total_repas = 0
    total_anniversaires = 0
    total_events_aperos = 0
    total_events_repas = 0
    total_events_anniversaires = 0
    
    # Ensemble des saisons déjà traitées
    saisons_traitees = set()
    
    for p in presences:
        saison = p["saison"]
        
        # IGNORER les saisons avant l'entrée du membre
        if saison < premiere_saison:
            continue
        # IGNORER les saisons exclues (membre en sommeil)
        if saison in saisons_exclues:
            continue
            
        saisons_traitees.add(saison)
        config = configs_dict.get(saison, {})
        
        nb_aperos = config.get("nb_aperos", 0)
        nb_repas = config.get("nb_repas", 0)
        nb_anniversaires = config.get("nb_anniversaires", 0)
        
        pres_aperos = p.get("presences_aperos", 0)
        pres_repas = p.get("presences_repas", 0)
        pres_anniversaires = p.get("presences_anniversaires", 0)
        
        # Accumuler pour le total
        total_aperos += pres_aperos
        total_repas += pres_repas
        total_anniversaires += pres_anniversaires
        total_events_aperos += nb_aperos
        total_events_repas += nb_repas
        total_events_anniversaires += nb_anniversaires
        
        # Calculer les % par saison
        pct_aperos = custom_round(pres_aperos / nb_aperos * 100) if nb_aperos > 0 else 0
        pct_repas = custom_round(pres_repas / nb_repas * 100) if nb_repas > 0 else 0
        pct_anniversaires = custom_round(pres_anniversaires / nb_anniversaires * 100) if nb_anniversaires > 0 else 0
        
        total_pres = pres_aperos + pres_repas + pres_anniversaires
        total_events = nb_aperos + nb_repas + nb_anniversaires
        pct_global = custom_round(total_pres / total_events * 100) if total_events > 0 else 0
        
        stats.append({
            "saison": saison,
            "presences_aperos": pres_aperos,
            "nb_aperos": nb_aperos,
            "pct_aperos": pct_aperos,
            "presences_repas": pres_repas,
            "nb_repas": nb_repas,
            "pct_repas": pct_repas,
            "presences_anniversaires": pres_anniversaires,
            "nb_anniversaires": nb_anniversaires,
            "pct_anniversaires": pct_anniversaires,
            "pct_global_saison": pct_global
        })
    
    # Ajouter les saisons où le membre n'a pas de données mais devrait être compté
    for saison, config in sorted(configs_dict.items()):
        if saison >= premiere_saison and saison not in saisons_traitees and saison not in saisons_exclues:
            nb_aperos = config.get("nb_aperos", 0)
            nb_repas = config.get("nb_repas", 0)
            nb_anniversaires = config.get("nb_anniversaires", 0)
            
            # Ajouter aux totaux (avec 0 présences)
            total_events_aperos += nb_aperos
            total_events_repas += nb_repas
            total_events_anniversaires += nb_anniversaires
            
            total_events = nb_aperos + nb_repas + nb_anniversaires
            if total_events > 0:
                stats.append({
                    "saison": saison,
                    "presences_aperos": 0,
                    "nb_aperos": nb_aperos,
                    "pct_aperos": 0,
                    "presences_repas": 0,
                    "nb_repas": nb_repas,
                    "pct_repas": 0,
                    "presences_anniversaires": 0,
                    "nb_anniversaires": nb_anniversaires,
                    "pct_anniversaires": 0,
                    "pct_global_saison": 0
                })
    
    # Trier par saison
    stats.sort(key=lambda x: x["saison"])
    
    # Calculer les totaux généraux
    total_all_pres = total_aperos + total_repas + total_anniversaires
    total_all_events = total_events_aperos + total_events_repas + total_events_anniversaires
    
    return {
        "membre_id": membre_id,
        "premiere_saison": premiere_saison,
        "saisons_exclues": list(saisons_exclues),
        "par_saison": stats,
        "totaux": {
            "presences_aperos": total_aperos,
            "total_aperos": total_events_aperos,
            "pct_aperos": custom_round(total_aperos / total_events_aperos * 100) if total_events_aperos > 0 else 0,
            "presences_repas": total_repas,
            "total_repas": total_events_repas,
            "pct_repas": custom_round(total_repas / total_events_repas * 100) if total_events_repas > 0 else 0,
            "presences_anniversaires": total_anniversaires,
            "total_anniversaires": total_events_anniversaires,
            "pct_anniversaires": custom_round(total_anniversaires / total_events_anniversaires * 100) if total_events_anniversaires > 0 else 0,
            "presences_total": total_all_pres,
            "events_total": total_all_events,
            "pct_global": custom_round(total_all_pres / total_all_events * 100) if total_all_events > 0 else 0
        }
    }


@api_router.post("/presences")
async def create_or_update_presence(input: PresenceMembreCreate):
    """Créer ou mettre à jour les présences d'un membre pour une saison"""
    existing = await db.presences_membres.find_one({
        "membre_id": input.membre_id,
        "saison": input.saison
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Mise à jour
        await db.presences_membres.update_one(
            {"membre_id": input.membre_id, "saison": input.saison},
            {"$set": {
                "presences_aperos": input.presences_aperos,
                "presences_repas": input.presences_repas,
                "presences_anniversaires": input.presences_anniversaires,
                "updated_at": now
            }}
        )
    else:
        # Création
        doc = {
            "id": str(uuid.uuid4()),
            "membre_id": input.membre_id,
            "saison": input.saison,
            "presences_aperos": input.presences_aperos,
            "presences_repas": input.presences_repas,
            "presences_anniversaires": input.presences_anniversaires,
            "created_at": now,
            "updated_at": now
        }
        await db.presences_membres.insert_one(doc)
    
    presence = await db.presences_membres.find_one(
        {"membre_id": input.membre_id, "saison": input.saison}, 
        {"_id": 0}
    )
    return presence


@api_router.put("/presences/{membre_id}/{saison}")
async def update_presence(membre_id: str, saison: int, input: PresenceMembreUpdate):
    """Mettre à jour les présences d'un membre pour une saison"""
    existing = await db.presences_membres.find_one({
        "membre_id": membre_id,
        "saison": saison
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Enregistrement de présence non trouvé")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.presences_membres.update_one(
        {"membre_id": membre_id, "saison": saison},
        {"$set": update_data}
    )
    
    presence = await db.presences_membres.find_one(
        {"membre_id": membre_id, "saison": saison}, 
        {"_id": 0}
    )
    return presence


@api_router.post("/presences/bulk")
async def bulk_update_presences(input: PresenceBulkUpdate):
    """Mise à jour en masse des présences pour une saison"""
    saison = input.saison
    now = datetime.now(timezone.utc).isoformat()
    
    updated_count = 0
    created_count = 0
    
    for p in input.presences:
        membre_id = p.get("membre_id")
        if not membre_id:
            continue
        
        existing = await db.presences_membres.find_one({
            "membre_id": membre_id,
            "saison": saison
        })
        
        if existing:
            await db.presences_membres.update_one(
                {"membre_id": membre_id, "saison": saison},
                {"$set": {
                    "presences_aperos": p.get("presences_aperos", 0),
                    "presences_repas": p.get("presences_repas", 0),
                    "presences_anniversaires": p.get("presences_anniversaires", 0),
                    "updated_at": now
                }}
            )
            updated_count += 1
        else:
            doc = {
                "id": str(uuid.uuid4()),
                "membre_id": membre_id,
                "saison": saison,
                "presences_aperos": p.get("presences_aperos", 0),
                "presences_repas": p.get("presences_repas", 0),
                "presences_anniversaires": p.get("presences_anniversaires", 0),
                "created_at": now,
                "updated_at": now
            }
            await db.presences_membres.insert_one(doc)
            created_count += 1
    
    return {
        "message": f"Mise à jour terminée",
        "saison": saison,
        "updated": updated_count,
        "created": created_count
    }


@api_router.delete("/presences/{membre_id}/{saison}")
async def delete_presence(membre_id: str, saison: int):
    """Supprimer les présences d'un membre pour une saison"""
    result = await db.presences_membres.delete_one({
        "membre_id": membre_id,
        "saison": saison
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enregistrement non trouvé")
    
    return {"message": "Présences supprimées"}


# -------- STATISTIQUES GLOBALES --------

@api_router.get("/statistiques/global")
async def get_statistiques_globales():
    """Statistiques globales de tous les membres
    
    IMPORTANT: Ne compte que les saisons à partir de l'entrée de chaque membre
    et exclut les saisons où ils étaient en sommeil
    """
    # Récupérer tous les membres
    members = await db.members.find({}, {"_id": 0, "id": 1, "nom_complet": 1, "numero_membre": 1, "annee_entree": 1, "saisons_exclues": 1}).to_list(100)
    
    # Récupérer toutes les présences
    presences = await db.presences_membres.find({}, {"_id": 0}).to_list(10000)
    
    # Récupérer toutes les configs de saisons
    configs = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
    configs_dict = {c["saison"]: c for c in configs}
    
    # Regrouper les présences par membre
    presences_by_membre = {}
    for p in presences:
        membre_id = p["membre_id"]
        if membre_id not in presences_by_membre:
            presences_by_membre[membre_id] = []
        presences_by_membre[membre_id].append(p)
    
    # Calculer les stats pour chaque membre
    stats = []
    for member in members:
        membre_id = member["id"]
        membre_presences = presences_by_membre.get(membre_id, [])
        
        # Calculer la première saison du membre (Saison 1 = 2013)
        annee_entree = member.get("annee_entree", 2013)
        premiere_saison = annee_entree - 2012
        saisons_exclues = set(member.get("saisons_exclues", []))
        
        total_aperos = 0
        total_repas = 0
        total_anniversaires = 0
        total_events_aperos = 0
        total_events_repas = 0
        total_events_anniversaires = 0
        
        saisons_traitees = set()
        
        for p in membre_presences:
            saison = p["saison"]
            
            # IGNORER les saisons avant l'entrée du membre
            if saison < premiere_saison:
                continue
            # IGNORER les saisons exclues
            if saison in saisons_exclues:
                continue
                
            saisons_traitees.add(saison)
            config = configs_dict.get(saison, {})
            
            total_aperos += p.get("presences_aperos", 0)
            total_repas += p.get("presences_repas", 0)
            total_anniversaires += p.get("presences_anniversaires", 0)
            total_events_aperos += config.get("nb_aperos", 0)
            total_events_repas += config.get("nb_repas", 0)
            total_events_anniversaires += config.get("nb_anniversaires", 0)
        
        # Ajouter les événements des saisons non traitées mais après l'entrée (hors exclues)
        for saison, config in configs_dict.items():
            if saison >= premiere_saison and saison not in saisons_traitees and saison not in saisons_exclues:
                total_events_aperos += config.get("nb_aperos", 0)
                total_events_repas += config.get("nb_repas", 0)
                total_events_anniversaires += config.get("nb_anniversaires", 0)
        
        total_pres = total_aperos + total_repas + total_anniversaires
        total_events = total_events_aperos + total_events_repas + total_events_anniversaires
        
        stats.append({
            "membre_id": membre_id,
            "nom_complet": member["nom_complet"],
            "numero_membre": member["numero_membre"],
            "annee_entree": member.get("annee_entree"),
            "premiere_saison": premiere_saison,
            "saisons_exclues": list(saisons_exclues),
            "presences_aperos": total_aperos,
            "total_aperos": total_events_aperos,
            "pct_aperos": custom_round(total_aperos / total_events_aperos * 100) if total_events_aperos > 0 else 0,
            "presences_repas": total_repas,
            "total_repas": total_events_repas,
            "pct_repas": custom_round(total_repas / total_events_repas * 100) if total_events_repas > 0 else 0,
            "presences_anniversaires": total_anniversaires,
            "total_anniversaires": total_events_anniversaires,
            "pct_anniversaires": custom_round(total_anniversaires / total_events_anniversaires * 100) if total_events_anniversaires > 0 else 0,
            "presences_total": total_pres,
            "events_total": total_events,
            "pct_global": custom_round(total_pres / total_events * 100) if total_events > 0 else 0
        })
    
    # Trier par % global décroissant
    stats.sort(key=lambda x: x["pct_global"], reverse=True)
    
    return {
        "membres": stats,
        "saisons_config": configs
    }


@api_router.get("/statistiques/saisons-resume")
async def get_statistiques_saisons_resume():
    """Statistiques résumées par saison avec MOYENNES de présence par type d'événement
    
    Pour les saisons ≤12: utilise les données manuelles si disponibles
    Pour les saisons ≥13: calcule automatiquement depuis les données de présence
    
    Retourne les moyennes de présences par événement (plus pertinent que les %)
    """
    # Récupérer toutes les configs de saisons
    configs = await db.saisons_config.find({}, {"_id": 0}).sort("saison", 1).to_list(100)
    
    # Récupérer tous les membres
    members = await db.members.find({}, {"_id": 0, "id": 1, "annee_entree": 1, "saisons_exclues": 1}).to_list(100)
    
    # Récupérer toutes les présences
    presences = await db.presences_membres.find({}, {"_id": 0}).to_list(10000)
    
    # Regrouper les présences par saison
    presences_by_saison = {}
    for p in presences:
        saison = p["saison"]
        if saison not in presences_by_saison:
            presences_by_saison[saison] = []
        presences_by_saison[saison].append(p)
    
    # Calculer les stats pour chaque saison
    stats = []
    for config in configs:
        saison = config["saison"]
        nb_aperos = config.get("nb_aperos", 0)
        nb_repas = config.get("nb_repas", 0)
        nb_anniversaires = config.get("nb_anniversaires", 0)
        total_events = nb_aperos + nb_repas + nb_anniversaires
        
        if total_events == 0:
            continue
        
        is_manuel = config.get("is_manuel", False)
        
        # Pour les saisons historiques avec données manuelles
        if is_manuel and saison <= 12:
            # Utiliser les données manuelles
            total_pres_aperos = config.get("presences_membres_aperos", 0) or 0
            total_pres_repas = config.get("presences_membres_repas", 0) or 0
            total_pres_anniversaires = config.get("presences_membres_anniversaires", 0) or 0
            nb_membres_actifs = config.get("nb_membres_manuel", 0) or 0
        else:
            # Calcul automatique depuis les données de présence
            # Trouver les membres actifs cette saison
            membres_actifs = []
            for m in members:
                premiere_saison = m.get("annee_entree", 2013) - 2012
                saisons_exclues = m.get("saisons_exclues", [])
                if saison >= premiere_saison and saison not in saisons_exclues:
                    membres_actifs.append(m["id"])
            
            # Calculer les présences totales
            total_pres_aperos = 0
            total_pres_repas = 0
            total_pres_anniversaires = 0
            
            saison_presences = presences_by_saison.get(saison, [])
            for p in saison_presences:
                if p["membre_id"] in membres_actifs:
                    total_pres_aperos += p.get("presences_aperos", 0)
                    total_pres_repas += p.get("presences_repas", 0)
                    total_pres_anniversaires += p.get("presences_anniversaires", 0)
            
            nb_membres_actifs = len(membres_actifs)
        
        total_pres = total_pres_aperos + total_pres_repas + total_pres_anniversaires
        
        # Calculer les MOYENNES de présence par événement
        # Moyenne = Total présences / Nombre d'événements
        moy_aperos = round(total_pres_aperos / nb_aperos, 1) if nb_aperos > 0 else 0
        moy_repas = round(total_pres_repas / nb_repas, 1) if nb_repas > 0 else 0
        moy_anniversaires = round(total_pres_anniversaires / nb_anniversaires, 1) if nb_anniversaires > 0 else 0
        moy_global = round(total_pres / total_events, 1) if total_events > 0 else 0
        
        stats.append({
            "saison": saison,
            "annee_debut": 2012 + saison,
            "annee_fin": 2013 + saison,
            "nb_aperos": nb_aperos,
            "nb_repas": nb_repas,
            "nb_anniversaires": nb_anniversaires,
            "total_events": total_events,
            "membres_actifs": nb_membres_actifs,
            # Présences totales (pour saisie manuelle)
            "presences_membres_aperos": total_pres_aperos,
            "presences_membres_repas": total_pres_repas,
            "presences_membres_anniversaires": total_pres_anniversaires,
            "presences_total": total_pres,
            # Moyennes de présence par événement
            "moy_aperos": moy_aperos,
            "moy_repas": moy_repas,
            "moy_anniversaires": moy_anniversaires,
            "moy_global": moy_global,
            # Indicateur si données manuelles
            "is_manuel": is_manuel and saison <= 12
        })
    
    return stats


@api_router.get("/statistiques/moyennes-dashboard")
async def get_statistiques_moyennes_dashboard():
    """Moyennes de présence pour le Dashboard admin
    
    Calcul basé sur les données historiques du tableau Stats Saisons:
    - % Global = Total présences / (Σ nb_événements × nb_membres par saison) × 100
    - Moyenne globale = Total présences / Total événements
    - Moyenne repas = Total présences repas / Total repas
    """
    CURRENT_SEASON = 13
    
    # Récupérer toutes les configs de saisons (contient les données manuelles pour S1-12)
    configs = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
    configs_dict = {c["saison"]: c for c in configs}
    
    # Récupérer tous les membres
    members = await db.members.find({}, {"_id": 0, "id": 1, "annee_entree": 1, "saisons_exclues": 1}).to_list(100)
    
    # Récupérer toutes les présences
    presences = await db.presences_membres.find({}, {"_id": 0}).to_list(10000)
    
    # Regrouper les présences par saison ET par membre
    presences_by_saison = {}
    presences_by_saison_membre = {}
    for p in presences:
        saison = p["saison"]
        membre_id = p["membre_id"]
        if saison not in presences_by_saison:
            presences_by_saison[saison] = []
        presences_by_saison[saison].append(p)
        key = (saison, membre_id)
        presences_by_saison_membre[key] = p
    
    # ========== CALCULS GLOBAUX (toutes saisons) ==========
    # Totaux pour les moyennes
    total_pres_global = 0
    total_events_global = 0
    total_pres_repas_global = 0
    total_nb_repas_global = 0
    
    # Totaux pour le % (présences / présences possibles)
    total_pres_possible_global = 0  # = Σ (nb_événements × nb_membres) par saison
    
    # Variables pour la saison actuelle
    total_pres_current = 0
    total_events_current = 0
    total_pres_repas_current = 0
    total_nb_repas_current = 0
    nb_membres_current = 0
    
    for saison, config in configs_dict.items():
        nb_aperos = config.get("nb_aperos", 0)
        nb_repas = config.get("nb_repas", 0)
        nb_anniversaires = config.get("nb_anniversaires", 0)
        total_events_saison = nb_aperos + nb_repas + nb_anniversaires
        
        if total_events_saison == 0:
            continue
        
        is_manuel = config.get("is_manuel", False)
        
        if is_manuel and saison <= 12:
            # DONNÉES MANUELLES pour les saisons historiques
            pres_aperos = config.get("presences_membres_aperos", 0) or 0
            pres_repas = config.get("presences_membres_repas", 0) or 0
            pres_anniv = config.get("presences_membres_anniversaires", 0) or 0
            pres_total = pres_aperos + pres_repas + pres_anniv
            nb_membres_saison = config.get("nb_membres_manuel", 0) or 0
        else:
            # CALCUL AUTOMATIQUE pour les saisons récentes (13+)
            # Trouver les membres actifs cette saison
            membres_actifs = []
            for m in members:
                premiere_saison = m.get("annee_entree", 2013) - 2012
                saisons_exclues = m.get("saisons_exclues", [])
                if saison >= premiere_saison and saison not in saisons_exclues:
                    membres_actifs.append(m["id"])
            
            nb_membres_saison = len(membres_actifs)
            
            # Calculer les présences
            pres_aperos = 0
            pres_repas = 0
            pres_anniv = 0
            saison_presences = presences_by_saison.get(saison, [])
            for p in saison_presences:
                if p["membre_id"] in membres_actifs:
                    pres_aperos += p.get("presences_aperos", 0)
                    pres_repas += p.get("presences_repas", 0)
                    pres_anniv += p.get("presences_anniversaires", 0)
            pres_total = pres_aperos + pres_repas + pres_anniv
        
        # Ajouter aux totaux GLOBAUX
        total_pres_global += pres_total
        total_events_global += total_events_saison
        total_pres_repas_global += pres_repas
        total_nb_repas_global += nb_repas
        
        # Présences possibles = événements × membres actifs cette saison
        if nb_membres_saison > 0:
            total_pres_possible_global += total_events_saison * nb_membres_saison
        
        # Si c'est la saison actuelle
        if saison == CURRENT_SEASON:
            total_pres_current = pres_total
            total_events_current = total_events_saison
            total_pres_repas_current = pres_repas
            total_nb_repas_current = nb_repas
            nb_membres_current = nb_membres_saison
    
    # ========== CALCUL DES RÉSULTATS ==========
    
    # % de présence global = présences réelles / présences possibles × 100
    pct_global = round(total_pres_global / total_pres_possible_global * 100, 1) if total_pres_possible_global > 0 else 0
    
    # Moyenne de présence par événement (tous types)
    moy_global = round(total_pres_global / total_events_global, 1) if total_events_global > 0 else 0
    
    # Moyenne de présence aux repas
    moy_repas_global = round(total_pres_repas_global / total_nb_repas_global, 1) if total_nb_repas_global > 0 else 0
    
    # Calculs pour la saison actuelle
    pres_possible_current = total_events_current * nb_membres_current if nb_membres_current > 0 else 0
    pct_current = round(total_pres_current / pres_possible_current * 100, 1) if pres_possible_current > 0 else 0
    moy_current = round(total_pres_current / total_events_current, 1) if total_events_current > 0 else 0
    moy_repas_current = round(total_pres_repas_current / total_nb_repas_current, 1) if total_nb_repas_current > 0 else 0
    
    return {
        # Stats GLOBALES (toutes saisons)
        "pct_global": pct_global,
        "moy_global": moy_global,
        "moy_repas_global": moy_repas_global,
        "total_events_global": total_events_global,
        "total_presences_global": total_pres_global,
        "total_pres_possible_global": total_pres_possible_global,
        # Stats SAISON ACTUELLE
        "pct_saison_actuelle": pct_current,
        "moy_saison_actuelle": moy_current,
        "moy_repas_saison": moy_repas_current,
        "saison_actuelle": CURRENT_SEASON,
        "total_events_saison": total_events_current,
        "total_presences_saison": total_pres_current,
        "nb_membres_actifs_saison": nb_membres_current
    }




@api_router.get("/statistiques/saison/{saison}")
async def get_statistiques_saison(saison: int):
    """Statistiques pour une saison spécifique avec tous les membres"""
    # Récupérer tous les membres
    members = await db.members.find({}, {"_id": 0, "id": 1, "nom_complet": 1, "numero_membre": 1, "annee_entree": 1}).to_list(100)
    
    # Récupérer la config de la saison
    config = await db.saisons_config.find_one({"saison": saison}, {"_id": 0})
    if not config:
        config = {
            "saison": saison,
            "nb_aperos": 0,
            "nb_repas": 0,
            "nb_anniversaires": 0
        }
    
    # Récupérer les présences de cette saison
    presences = await db.presences_membres.find({"saison": saison}, {"_id": 0}).to_list(100)
    presences_dict = {p["membre_id"]: p for p in presences}
    
    # Construire les stats pour chaque membre
    stats = []
    for member in members:
        membre_id = member["id"]
        presence = presences_dict.get(membre_id, {})
        
        pres_aperos = presence.get("presences_aperos", 0)
        pres_repas = presence.get("presences_repas", 0)
        pres_anniversaires = presence.get("presences_anniversaires", 0)
        
        nb_aperos = config.get("nb_aperos", 0)
        nb_repas = config.get("nb_repas", 0)
        nb_anniversaires = config.get("nb_anniversaires", 0)
        
        total_pres = pres_aperos + pres_repas + pres_anniversaires
        total_events = nb_aperos + nb_repas + nb_anniversaires
        
        stats.append({
            "membre_id": membre_id,
            "nom_complet": member["nom_complet"],
            "numero_membre": member["numero_membre"],
            "presences_aperos": pres_aperos,
            "presences_repas": pres_repas,
            "presences_anniversaires": pres_anniversaires,
            "pct_aperos": custom_round(pres_aperos / nb_aperos * 100) if nb_aperos > 0 else 0,
            "pct_repas": custom_round(pres_repas / nb_repas * 100) if nb_repas > 0 else 0,
            "pct_anniversaires": custom_round(pres_anniversaires / nb_anniversaires * 100) if nb_anniversaires > 0 else 0,
            "pct_global": custom_round(total_pres / total_events * 100) if total_events > 0 else 0
        })
    
    # Trier par numéro de membre
    stats.sort(key=lambda x: x["numero_membre"])
    
    return {
        "saison": saison,
        "config": config,
        "membres": stats
    }


# ============ ADMIN - ÉDITION COMPLÈTE DES MEMBRES ============

class MemberFullUpdate(BaseModel):
    """Mise à jour complète d'un membre par l'admin"""
    numero_membre: Optional[int] = None
    nom_complet: Optional[str] = None
    fonction: Optional[str] = None
    annee_entree: Optional[int] = None
    saison_entree: Optional[str] = None
    pourcentage_presences: Optional[float] = None
    etoiles: Optional[int] = None
    situation_cotisation: Optional[int] = None
    autres_infos: Optional[str] = None
    email: Optional[str] = None
    is_president: Optional[bool] = None
    is_validated: Optional[bool] = None
    saisons_exclues: Optional[List[int]] = None  # Saisons où le membre était en sommeil


@api_router.put("/admin/members/{member_id}")
async def admin_update_member(member_id: str, input: MemberFullUpdate):
    """Mise à jour complète d'un membre par l'admin (tous les champs)"""
    existing = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Préparer les données de mise à jour
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Mettre à jour
    await db.members.update_one({"id": member_id}, {"$set": update_data})
    
    # Récupérer le membre mis à jour
    updated = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    return updated


# ============ EXPORT / IMPORT - SAUVEGARDE DES DONNÉES ============

@api_router.get("/export/all")
async def export_all_data():
    """Exporter toutes les données de l'application pour sauvegarde"""
    try:
        # Récupérer toutes les collections importantes
        members = await db.members.find({}, {"_id": 0}).to_list(10000)
        presences = await db.presences_membres.find({}, {"_id": 0}).to_list(100000)
        saisons_config = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
        events = await db.events.find({}, {"_id": 0}).to_list(10000)
        transactions = await db.transactions.find({}, {"_id": 0}).to_list(100000)
        comptes = await db.comptes.find({}, {"_id": 0}).to_list(100)
        messages = await db.messages.find({}, {"_id": 0}).to_list(10000)
        notifications = await db.notifications.find({}, {"_id": 0}).to_list(100000)
        reponses_sondages = await db.reponses_sondages.find({}, {"_id": 0}).to_list(100000)
        message_templates = await db.message_templates.find({}, {"_id": 0}).to_list(1000)
        
        export_data = {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "version": "1.0",
            "data": {
                "members": members,
                "presences_membres": presences,
                "saisons_config": saisons_config,
                "events": events,
                "transactions": transactions,
                "comptes": comptes,
                "messages": messages,
                "notifications": notifications,
                "reponses_sondages": reponses_sondages,
                "message_templates": message_templates
            },
            "counts": {
                "members": len(members),
                "presences_membres": len(presences),
                "saisons_config": len(saisons_config),
                "events": len(events),
                "transactions": len(transactions),
                "comptes": len(comptes),
                "messages": len(messages),
                "notifications": len(notifications),
                "reponses_sondages": len(reponses_sondages),
                "message_templates": len(message_templates)
            }
        }
        
        return export_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


class ImportData(BaseModel):
    export_date: str
    version: str
    data: dict
    counts: dict


@api_router.post("/import/all")
async def import_all_data(import_data: ImportData):
    """Importer les données depuis une sauvegarde (REMPLACE les données existantes)"""
    try:
        data = import_data.data
        results = {}
        
        # Importer chaque collection
        collections_map = {
            "members": db.members,
            "presences_membres": db.presences_membres,
            "saisons_config": db.saisons_config,
            "events": db.events,
            "transactions": db.transactions,
            "comptes": db.comptes,
            "messages": db.messages,
            "notifications": db.notifications,
            "reponses_sondages": db.reponses_sondages,
            "message_templates": db.message_templates
        }
        
        for collection_name, collection in collections_map.items():
            if collection_name in data and data[collection_name]:
                # Supprimer les données existantes
                await collection.delete_many({})
                # Insérer les nouvelles données
                await collection.insert_many(data[collection_name])
                results[collection_name] = len(data[collection_name])
            else:
                results[collection_name] = 0
        
        return {
            "message": "Import réussi",
            "import_date": import_data.export_date,
            "imported_counts": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")


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


@app.on_event("startup")
async def init_sondage_templates():
    """Initialiser les templates de sondages par défaut"""
    existing = await db.sondage_templates.count_documents({})
    if existing == 0:
        templates = [
            {
                "id": str(uuid.uuid4()),
                "nom": "Resto",
                "description": "Sondage pour un repas au restaurant",
                "type_sondage": "repas",
                "questions": [
                    {"id": "presence", "question": "Serez-vous présent ?", "type": "oui_non", "options": ["Oui", "Non"]},
                    {"id": "entree", "question": "Choix de l'entrée", "type": "choix_unique", "options": []},
                    {"id": "plat", "question": "Choix du plat", "type": "choix_unique", "options": []},
                    {"id": "dessert", "question": "Choix du dessert", "type": "choix_unique", "options": []}
                ],
                "actif": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "nom": "Apéro",
                "description": "Sondage pour un apéro",
                "type_sondage": "simple",
                "questions": [
                    {"id": "presence", "question": "Serez-vous présent ?", "type": "oui_non", "options": ["Oui", "Non"]}
                ],
                "actif": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "nom": "Anniversaire",
                "description": "Sondage pour un anniversaire du club",
                "type_sondage": "simple",
                "questions": [
                    {"id": "presence", "question": "Serez-vous présent ?", "type": "oui_non", "options": ["Oui", "Non"]}
                ],
                "actif": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "nom": "Album",
                "description": "Sondage pour commander l'album photo",
                "type_sondage": "album",
                "questions": [
                    {"id": "commande", "question": "Souhaitez-vous commander l'album ?", "type": "oui_non", "options": ["Oui", "Non"]},
                    {"id": "quantite", "question": "Combien d'exemplaires ?", "type": "choix_unique", "options": ["1", "2", "3", "4", "5"]}
                ],
                "actif": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "nom": "Autre",
                "description": "Sondage personnalisé",
                "type_sondage": "libre",
                "questions": [],
                "actif": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.sondage_templates.insert_many(templates)
        logger.info("Templates de sondages initialisés")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
