# WebAuthn / Passkeys routes for Face ID / Touch ID authentication
# La Bague Impériale

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
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

RP_NAME = "La Bague Impériale"

# Stockage temporaire des challenges (en mémoire, expire après 5 minutes)
challenges_store = {}

# ============ HELPERS ============

def get_rp_id_and_origin(request: Request):
    """Extrait le RP_ID et l'origine depuis les headers de la requête"""
    from urllib.parse import urlparse
    
    # Priorité 1: Variable d'environnement (plus fiable car Kubernetes modifie les headers)
    env_origin = os.environ.get('WEBAUTHN_ORIGIN')
    if env_origin:
        parsed = urlparse(env_origin)
        return parsed.netloc.split(':')[0], env_origin
    
    # Priorité 2: Header X-Forwarded-Host (set par l'ingress)
    forwarded_host = request.headers.get('x-forwarded-host')
    if forwarded_host:
        rp_id = forwarded_host.split(':')[0]
        proto = request.headers.get('x-forwarded-proto', 'https')
        return rp_id, f"{proto}://{forwarded_host}"
    
    # Priorité 3: Referer header (contient souvent l'URL publique)
    referer = request.headers.get('referer', '')
    if referer and 'emergentagent.com' in referer:
        parsed = urlparse(referer)
        rp_id = parsed.netloc.split(':')[0]
        origin = f"{parsed.scheme}://{parsed.netloc}"
        return rp_id, origin
    
    # Priorité 4: Origin header
    origin = request.headers.get('origin', '')
    if origin and 'emergentagent.com' in origin:
        parsed = urlparse(origin)
        rp_id = parsed.netloc.split(':')[0]
        return rp_id, f"{parsed.scheme}://{parsed.netloc}"
    
    # Fallback: domaine par défaut (la preview Emergent)
    default_domain = 'club-messagerie.preview.emergentagent.com'
    logger.warning(f"WebAuthn: Using fallback domain {default_domain}")
    return default_domain, f"https://{default_domain}"

def base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url string"""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    """Decode base64url string to bytes"""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)

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

# ============ REGISTRATION ============

@webauthn_router.post("/register/options")
async def get_registration_options(request: Request, data: RegisterOptionsRequest):
    """Génère les options d'enregistrement pour un nouveau passkey"""
    try:
        rp_id, origin = get_rp_id_and_origin(request)
        logger.info(f"WebAuthn register options - RP_ID: {rp_id}, Origin: {origin}")
        
        member = await db.members.find_one({"id": data.member_id}, {"_id": 0})
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
        user_id = data.member_id.encode('utf-8')
        
        options = generate_registration_options(
            rp_id=rp_id,
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
        
        # Stocker le challenge avec le rp_id et origin pour la vérification
        challenge_b64 = base64url_encode(options.challenge)
        challenges_store[data.member_id] = {
            'challenge': challenge_b64,
            'type': 'registration',
            'rp_id': rp_id,
            'origin': origin,
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
async def verify_registration(request: Request, data: RegisterVerifyRequest):
    """Vérifie et enregistre un nouveau passkey"""
    try:
        member = await db.members.find_one({"id": data.member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Membre non trouvé")
        
        # Récupérer le challenge stocké
        stored = challenges_store.get(data.member_id)
        if not stored or stored['type'] != 'registration':
            raise HTTPException(status_code=400, detail="Challenge non trouvé ou expiré")
        
        if stored['expires'] < datetime.now(timezone.utc):
            del challenges_store[data.member_id]
            raise HTTPException(status_code=400, detail="Challenge expiré")
        
        expected_challenge = base64url_decode(stored['challenge'])
        rp_id = stored['rp_id']
        origin = stored['origin']
        
        logger.info(f"WebAuthn verify registration - RP_ID: {rp_id}, Origin: {origin}")
        
        # Vérifier la réponse
        verification = verify_registration_response(
            credential=data.credential,
            expected_challenge=expected_challenge,
            expected_origin=origin,
            expected_rp_id=rp_id,
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
            "nickname": "Face ID / Touch ID",
            "last_used": None,
            "rp_id": rp_id  # Stocker le rp_id pour la vérification ultérieure
        }
        
        # Ajouter au membre
        await db.members.update_one(
            {"id": data.member_id},
            {"$push": {"passkeys": passkey}}
        )
        
        # Nettoyer le challenge
        del challenges_store[data.member_id]
        
        return {
            "success": True,
            "message": "Face ID / Touch ID activé avec succès !",
            "passkey_id": passkey["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur vérification registration: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur d'enregistrement: {str(e)}")


# ============ AUTHENTICATION ============

@webauthn_router.post("/authenticate/options")
async def get_authentication_options(request: Request, data: AuthenticateOptionsRequest = None):
    """Génère les options d'authentification pour un passkey"""
    try:
        rp_id, origin = get_rp_id_and_origin(request)
        logger.info(f"WebAuthn auth options - RP_ID: {rp_id}, Origin: {origin}")
        
        allow_credentials = []
        
        # Si on a un member_id, chercher ses passkeys
        if data and data.member_id:
            member = await db.members.find_one({"id": data.member_id}, {"_id": 0})
            if member:
                passkeys = member.get('passkeys', [])
                for pk in passkeys:
                    # Vérifier que le passkey est pour ce domaine
                    if pk.get('rp_id', rp_id) == rp_id:
                        allow_credentials.append(
                            PublicKeyCredentialDescriptor(
                                id=base64url_decode(pk['credential_id']),
                                transports=[AuthenticatorTransport.INTERNAL]
                            )
                        )
        
        # Si pas de credentials spécifiques, chercher tous les passkeys pour ce domaine
        if not allow_credentials:
            async for member in db.members.find({"passkeys": {"$exists": True, "$ne": []}}, {"_id": 0, "passkeys": 1, "id": 1}):
                for pk in member.get('passkeys', []):
                    if pk.get('rp_id', rp_id) == rp_id:
                        allow_credentials.append(
                            PublicKeyCredentialDescriptor(
                                id=base64url_decode(pk['credential_id']),
                                transports=[AuthenticatorTransport.INTERNAL]
                            )
                        )
        
        options = generate_authentication_options(
            rp_id=rp_id,
            allow_credentials=allow_credentials if allow_credentials else None,
            user_verification=UserVerificationRequirement.PREFERRED,
            timeout=60000
        )
        
        # Stocker le challenge
        challenge_b64 = base64url_encode(options.challenge)
        challenge_key = (data.member_id if data and data.member_id else 'discoverable') + f"_{rp_id}"
        challenges_store[challenge_key] = {
            'challenge': challenge_b64,
            'type': 'authentication',
            'rp_id': rp_id,
            'origin': origin,
            'expires': datetime.now(timezone.utc) + timedelta(minutes=5)
        }
        
        options_json = options_to_json(options)
        
        return {
            "success": True,
            "options": options_json
        }
        
    except Exception as e:
        logger.error(f"Erreur génération options authentication: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@webauthn_router.post("/authenticate/verify")
async def verify_authentication(request: Request, response: Response, data: AuthenticateVerifyRequest):
    """Vérifie l'authentification par passkey et retourne le membre"""
    try:
        rp_id, origin = get_rp_id_and_origin(request)
        credential = data.credential
        credential_id_b64 = credential.get('id', '')
        
        logger.info(f"WebAuthn verify auth - RP_ID: {rp_id}, Origin: {origin}")
        
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
        challenge_key = f"{member['id']}_{rp_id}"
        stored = challenges_store.get(challenge_key) or challenges_store.get(f"discoverable_{rp_id}")
        
        if not stored or stored['type'] != 'authentication':
            raise HTTPException(status_code=400, detail="Challenge non trouvé")
        
        if stored['expires'] < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Challenge expiré")
        
        expected_challenge = base64url_decode(stored['challenge'])
        
        # Vérifier la réponse
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_origin=origin,
            expected_rp_id=rp_id,
            credential_public_key=base64url_decode(passkey['public_key']),
            credential_current_sign_count=passkey.get('counter', 0),
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
        if f"discoverable_{rp_id}" in challenges_store:
            del challenges_store[f"discoverable_{rp_id}"]
        
        # Poser le cookie JWT serveur-autoritaire + retourner le token dans le body
        access_token = None
        try:
            from server import _set_member_cookie as _set_lbi_cookie, create_member_jwt as _create_lbi_jwt
            _set_lbi_cookie(response, member['id'])
            access_token = _create_lbi_jwt(member['id'])
        except Exception as _e:
            logger.warning(f"Impossible de poser le cookie JWT: {_e}")
        
        return {
            "success": True,
            "member": member,
            "access_token": access_token,
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
