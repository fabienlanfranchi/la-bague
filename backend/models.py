# Shared models for La Bague Impériale
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import math
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============ HELPER FUNCTIONS ============

def custom_round(value):
    """Arrondi personnalisé pour les pourcentages"""
    decimal_part = value - int(value)
    decimal_first = round((decimal_part * 10) % 10)
    
    if decimal_first <= 4:
        return math.floor(value)
    elif decimal_first >= 6:
        return math.ceil(value)
    else:
        return round(value, 1)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def generate_temporary_password(numero_membre: int) -> str:
    return f"labagueimperiale{numero_membre}"

def generate_default_password(prenom: str, numero_membre: int) -> str:
    import unicodedata
    import re
    prenom_clean = prenom.lower().strip()
    prenom_clean = unicodedata.normalize('NFD', prenom_clean)
    prenom_clean = ''.join(c for c in prenom_clean if unicodedata.category(c) != 'Mn')
    prenom_clean = re.sub(r'[^a-z]', '', prenom_clean)
    return f"{prenom_clean}labague{numero_membre}"

# ============ MEMBER MODELS ============

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_membre: int
    nom_complet: str
    fonction: str
    annee_entree: int
    saison_entree: str
    pourcentage_presences: float = 0.0
    etoiles: int = 1
    situation_cotisation: int = 0
    autres_infos: str = ""
    saisons_exclues: List[int] = []
    telephone: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None
    temporary_password: str = Field(default="")
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
    email: Optional[str] = None
    telephone: Optional[str] = None
    is_president: Optional[bool] = None
    saisons_exclues: Optional[List[int]] = None

class MemberImport(BaseModel):
    members: List[MemberCreate]

# ============ AUTH MODELS ============

class LoginRequest(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    temporary_password: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class ValidateAccountRequest(BaseModel):
    member_id: str
    email: EmailStr
    password: str
    confirm_password: str
    use_temp_password: bool = False

class ActivateAccountRequest(BaseModel):
    prenom: str
    nom: str
    numero_membre: int

class CreatePasswordRequest(BaseModel):
    member_id: str
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    membre_id: str
    current_password: str
    new_password: str

class DemandeMotDePasse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    membre_id: str
    membre_nom: str
    membre_email: str
    statut: str = "en_attente"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    traite_at: Optional[datetime] = None

# ============ CHAT MODELS ============

class ChatMessageRequest(BaseModel):
    message: str
    user_id: str = "default-user"

class ChatMessageResponse(BaseModel):
    response: str
    user_id: str
