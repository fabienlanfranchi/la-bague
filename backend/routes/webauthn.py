# WebAuthn / Passkeys routes for Face ID / Touch ID authentication
# La Bague Impériale

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import base64
import uuid
import os
import logging

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    AuthenticatorAttachment,
    PublicKeyCredentialDescriptor,
    AuthenticatorTransport
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from database import db

logger = logging.getLogger(__name__)

webauthn_router = APIRouter(prefix="/api/webauthn", tags=["WebAuthn"])

# Configuration - utiliser le domaine de production
RP_ID = os.environ.get('WEBAUTHN_RP_ID', 'evento-cigars.vercel.app')
RP_NAME = "La Bague Impériale"
ORIGIN = os.environ.get('WEBAUTHN_ORIGIN', 'https://evento-cigars.vercel.app')

# Stockage temporaire des challenges (en mémoire, expire après 5 minutes)
challenges_store = {}

# ============ MODELS ============

class RegisterOptionsRequest(BaseModel):
    member_id: str

class RegisterVerifyRequest(BaseModel):
    member_id: str
    credential: dict

class AuthenticateOptionsRequest(BaseModel):
    member_id: Optional[str] = None

class AuthenticateVerifyRequest(BaseModel):
    credential: dict

# ============ HELPERS ============

def base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url string"""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    """Decode base64url string to bytes"""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)

# ============ REGISTRATION ============

@webauthn_router.post("/register/options")
async def get_registration_options(request: RegisterOptionsRequest):
    """Génère les options d'enregistrement pour un nouveau passkey"""
    try:
        member = await db.members.find_one({"id": request.member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Membre non trouvé")
        
        # Récupérer les passkeys existants pour les exclure
        existing_passkeys = member.get('passkeys', [])
        exclude_credentials = []
        for pk in existing_passkeys:
            exclude_credentials.append(
                PublicKeyCredentialDescriptor(
                    id=base64url_decode(pk['credential_id']),
                    transports=[AuthenticatorTransport.INTERNAL]
                )
            )
        
        # Générer les options
        user_id = request.member_id.encode('utf-8')
        
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=user_id,
            user_name=member.get('email', member.get('nom_complet', 'Membre')),
            user_display_name=member.get('nom_complet', 'Membre'),
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED
            ),
            exclude_credentials=exclude_credentials if exclude_credentials else None,
            supported_pub_key_algs=[
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256
            ],
            timeout=60000
        )
        
        # Stocker le challenge
        challenge_b64 = base64url_encode(options.challenge)
        challenges_store[request.member_id] = {
            'challenge': challenge_b64,
            'type': 'registration',
            'expires': datetime.now(timezone.utc) + timedelta(minutes=5)
        }
        
        # Convertir en JSON
        options_json = options_to_json(options)
        
        return {
            "success": True,
            "options": options_json
        }
        
    except Exception as e:
        logger.error(f"Erreur génération options registration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@webauthn_router.post("/register/verify")
async def verify_registration(request: RegisterVerifyRequest):
    """Vérifie et enregistre un nouveau passkey"""
    try:
        member = await db.members.find_one({"id": request.member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Membre non trouvé")
        
        # Récupérer le challenge stocké
        stored = challenges_store.get(request.member_id)
        if not stored or stored['type'] != 'registration':
            raise HTTPException(status_code=400, detail="Challenge non trouvé ou expiré")
        
        if stored['expires'] < datetime.now(timezone.utc):
            del challenges_store[request.member_id]
            raise HTTPException(status_code=400, detail="Challenge expiré")
        
        expected_challenge = base64url_decode(stored['challenge'])
        
        # Vérifier la réponse
        verification = verify_registration_response(
            credential=request.credential,
            expected_challenge=expected_challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            require_user_verification=False
        )
        
        # Créer le passkey
        passkey = {
            "id": str(uuid.uuid4()),
            "credential_id": base64url_encode(verification.credential_id),
            "public_key": base64url_encode(verification.credential_public_key),
            "counter": verification.sign_count,
            "transports": ["internal"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "nickname": f"Face ID / Touch ID",
            "last_used": None
        }
        
        # Ajouter au membre
        await db.members.update_one(
            {"id": request.member_id},
            {"$push": {"passkeys": passkey}}
        )
        
        # Nettoyer le challenge
        del challenges_store[request.member_id]
        
        return {
            "success": True,
            "message": "Passkey enregistré avec succès",
            "passkey_id": passkey["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur vérification registration: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur d'enregistrement: {str(e)}")


# ============ AUTHENTICATION ============

@webauthn_router.post("/authenticate/options")
async def get_authentication_options(request: AuthenticateOptionsRequest):
    """Génère les options d'authentification pour un passkey"""
    try:
        allow_credentials = []
        
        if request.member_id:
            # Authentification pour un membre spécifique
            member = await db.members.find_one({"id": request.member_id}, {"_id": 0})
            if not member:
                raise HTTPException(status_code=404, detail="Membre non trouvé")
            
            passkeys = member.get('passkeys', [])
            if not passkeys:
                raise HTTPException(status_code=400, detail="Aucun passkey enregistré")
            
            for pk in passkeys:
                allow_credentials.append(
                    PublicKeyCredentialDescriptor(
                        id=base64url_decode(pk['credential_id']),
                        transports=[AuthenticatorTransport.INTERNAL]
                    )
                )
        
        options = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow_credentials if allow_credentials else None,
            user_verification=UserVerificationRequirement.PREFERRED,
            timeout=60000
        )
        
        # Stocker le challenge
        challenge_b64 = base64url_encode(options.challenge)
        challenge_key = request.member_id or 'discoverable'
        challenges_store[challenge_key] = {
            'challenge': challenge_b64,
            'type': 'authentication',
            'expires': datetime.now(timezone.utc) + timedelta(minutes=5)
        }
        
        options_json = options_to_json(options)
        
        return {
            "success": True,
            "options": options_json
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur génération options authentication: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@webauthn_router.post("/authenticate/verify")
async def verify_authentication(request: AuthenticateVerifyRequest):
    """Vérifie l'authentification par passkey et retourne le membre"""
    try:
        credential = request.credential
        credential_id_b64 = credential.get('id', '')
        
        # Trouver le membre avec ce credential
        member = await db.members.find_one(
            {"passkeys.credential_id": credential_id_b64},
            {"_id": 0}
        )
        
        if not member:
            raise HTTPException(status_code=404, detail="Passkey non reconnu")
        
        # Trouver le passkey spécifique
        passkey = None
        for pk in member.get('passkeys', []):
            if pk['credential_id'] == credential_id_b64:
                passkey = pk
                break
        
        if not passkey:
            raise HTTPException(status_code=404, detail="Passkey non trouvé")
        
        # Récupérer le challenge
        challenge_key = member['id']
        stored = challenges_store.get(challenge_key) or challenges_store.get('discoverable')
        
        if not stored or stored['type'] != 'authentication':
            raise HTTPException(status_code=400, detail="Challenge non trouvé")
        
        if stored['expires'] < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Challenge expiré")
        
        expected_challenge = base64url_decode(stored['challenge'])
        
        # Vérifier la réponse
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            credential_public_key=base64url_decode(passkey['public_key']),
            credential_current_sign_count=passkey['counter'],
            require_user_verification=False
        )
        
        # Mettre à jour le counter et last_used
        await db.members.update_one(
            {"id": member['id'], "passkeys.credential_id": credential_id_b64},
            {
                "$set": {
                    "passkeys.$.counter": verification.new_sign_count,
                    "passkeys.$.last_used": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Nettoyer le challenge
        if challenge_key in challenges_store:
            del challenges_store[challenge_key]
        if 'discoverable' in challenges_store:
            del challenges_store['discoverable']
        
        return {
            "success": True,
            "member": member,
            "message": "Authentification réussie"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur vérification authentication: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur d'authentification: {str(e)}")


# ============ MANAGEMENT ============

@webauthn_router.get("/passkeys/{member_id}")
async def get_passkeys(member_id: str):
    """Récupère la liste des passkeys d'un membre"""
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    passkeys = member.get('passkeys', [])
    
    # Retourner uniquement les infos nécessaires (pas les clés)
    return {
        "passkeys": [
            {
                "id": pk.get('id'),
                "nickname": pk.get('nickname', 'Passkey'),
                "created_at": pk.get('created_at'),
                "last_used": pk.get('last_used')
            }
            for pk in passkeys
        ]
    }


@webauthn_router.delete("/passkeys/{member_id}/{passkey_id}")
async def delete_passkey(member_id: str, passkey_id: str):
    """Supprime un passkey"""
    result = await db.members.update_one(
        {"id": member_id},
        {"$pull": {"passkeys": {"id": passkey_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Passkey non trouvé")
    
    return {"success": True, "message": "Passkey supprimé"}


@webauthn_router.get("/check/{member_id}")
async def check_passkey_available(member_id: str):
    """Vérifie si un membre a des passkeys enregistrés"""
    member = await db.members.find_one({"id": member_id}, {"_id": 0, "passkeys": 1})
    if not member:
        return {"has_passkey": False}
    
    passkeys = member.get('passkeys', [])
    return {
        "has_passkey": len(passkeys) > 0,
        "count": len(passkeys)
    }
