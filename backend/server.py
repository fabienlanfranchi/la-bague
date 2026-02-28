from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
    return f"clubcigare{numero_membre}"


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
    
    # Vérifier que l'utilisateur est connecté
    current_member = await get_current_user(request)
    
    if current_member['id'] != data.member_id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Vérifier que le compte n'est pas déjà validé
    if current_member.get('is_validated'):
        raise HTTPException(status_code=400, detail="Compte déjà validé")
    
    # Vérifier que les mots de passe correspondent
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")
    
    # Vérifier que l'email n'est pas déjà utilisé
    existing = await db.members.find_one({"email": data.email}, {"_id": 0})
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
    """Obtenir tous les membres"""
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for member in members:
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    
    return members


@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str):
    """Obtenir un membre par ID"""
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
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
    compte_mapping = {
        "Compte": "Compte Bancaire",
        "chèque": "Compte Bancaire",
        "Fabien": "Chez Fabien",
        "Jacques": "Chez Jacques",
        "Enveloppe bar": "Dehors",
        "PayPal": "PayPal"
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
    """Créer un nouvel événement"""
    evt_obj = Evenement(**input.model_dump())
    
    doc = evt_obj.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.evenements.insert_one(doc)
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
    
    # Récupérer toutes les réponses
    reponses = await db.reponses_sondages.find({"evenement_id": evenement_id}, {"_id": 0}).to_list(1000)
    
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
    
    # Récupérer les stats
    reponses = await db.reponses_sondages.find({"evenement_id": evt['id']}, {"_id": 0}).to_list(1000)
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
    """Supprimer un événement"""
    result = await db.evenements.delete_one({"id": evenement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Supprimer aussi toutes les réponses associées
    await db.reponses_sondages.delete_many({"evenement_id": evenement_id})
    
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
    """Créer un événement simplifié (pour l'historique)"""
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
    
    # Récupérer sans _id pour éviter ObjectId
    created_evt = await db.evenements.find_one({"id": evt_obj.id}, {"_id": 0})
    
    return {
        "message": "Événement créé avec succès",
        "evenement": created_evt
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
    # Récupérer l'auteur depuis la session
    session_data = request.session.get("user")
    if not session_data:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    auteur_id = session_data.get("membre_id")
    
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
        # Tous les membres actifs
        membres = await db.membres.find({"statut": "Actif"}, {"id": 1, "_id": 0}).to_list(100)
        destinataires = [m["id"] for m in membres]
    
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
        total_destinataires = await db.membres.count_documents({"statut": "Actif"})
    
    return {
        "message_id": message_id,
        "titre": message.get("titre"),
        "total_destinataires": total_destinataires,
        "total_reponses": len(reponses),
        "taux_reponse": round(len(reponses) / total_destinataires * 100, 1) if total_destinataires > 0 else 0,
        "reponses": reponses
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
