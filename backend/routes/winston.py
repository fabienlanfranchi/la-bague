# Winston AI Assistant routes
# La Bague Impériale

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import os
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage
import pymysql.cursors
from database import db, get_mysql_connection
from cigar_knowledge import (
    get_cigar_knowledge, 
    get_cigar_guide_sommaire, 
    get_parcours_sujets, 
    get_winston_internal_knowledge, 
    get_full_winston_knowledge
)

logger = logging.getLogger(__name__)

# Router for Winston endpoints
winston_router = APIRouter(prefix="/api", tags=["Winston AI"])

# Chat sessions storage
chat_sessions = {}

# ============ MODELS ============

class ChatMessageRequest(BaseModel):
    message: str
    user_id: str = "default-user"

class ChatMessageResponse(BaseModel):
    response: str
    session_id: str

# ============ CONTEXT BUILDER ============

async def build_assistant_context(user_id: str) -> str:
    """Construit le contexte complet pour l'assistant IA"""
    
    context_parts = []
    
    # Détecter si c'est le mode président (user_id finit par _president)
    is_president_mode = user_id.endswith('_president')
    actual_user_id = user_id.replace('_president', '') if is_president_mode else user_id
    
    # 1. Informations sur le club
    club_info = """
Tu es Winston, le concierge personnel et assistant IA du club de cigares "La Bague Impériale".
Tu es certifié "Bague Specialist" et tu connais parfaitement le club, ses 35 membres, les événements, les statistiques et tout ce qui concerne les cigares.
Tu dois être élégant, professionnel et utiliser le vouvoiement digne d'un club de cigares prestigieux.

⚠️ RÈGLE ABSOLUE D'APPELLATION :
- Si le membre a la fonction "Président" → Tu l'appelles UNIQUEMENT "Président" ou "Monsieur le Président". JAMAIS son prénom.
- Pour tous les autres membres → Tu utilises leur prénom.
"""
    context_parts.append(club_info)
    
    # 2. Identifier le membre qui parle
    user_data = await db.members.find_one({"id": actual_user_id})
    if not user_data:
        user_data = await db.members.find_one({})
    
    if user_data:
        nom_complet = user_data.get('nom_complet', f"{user_data.get('prenom', '')} {user_data.get('nom', '')}")
        prenom = user_data.get('prenom', nom_complet.split(' ')[0])
        numero_membre = user_data.get('numero_membre', 'N/A')
        fonction = user_data.get('fonction', '').lower() if user_data.get('fonction') else ''
        is_pres_field = user_data.get('is_president', False)
        
        # Détecter si c'est le Président (sur la FONCTION ou le flag is_president)
        is_president_user = (
            'président' in fonction or 
            fonction == 'president' or
            is_pres_field == True
        )
        
        # IMPORTANT: Utiliser le MODE pour déterminer l'appellation
        # Si l'utilisateur est en mode Président (_president dans user_id) ET qu'il est le Président
        # -> Appeler "Président"
        # Sinon (mode Membre) -> Appeler par son prénom même s'il est le Président
        if is_president_mode and is_president_user:
            appellation = "Président"
            membre_info = f"""
⚠️⚠️⚠️ RÈGLE ABSOLUE - MODE PRÉSIDENT ACTIF ⚠️⚠️⚠️
Tu parles au PRÉSIDENT du club "La Bague Impériale" (membre #{numero_membre}) qui est connecté en MODE PRÉSIDENT.

INSTRUCTIONS STRICTES :
- Tu dois TOUJOURS l'appeler "Président" ou "Monsieur le Président"
- Tu ne dois JAMAIS utiliser son prénom ({prenom})
- Tu ne dois JAMAIS dire "Fabien"
- C'est le responsable et fondateur du club
- Traite-le avec le plus grand respect

Exemples corrects: "Bien sûr Président", "Monsieur le Président, voici...", "Président, je vous recommande..."
Exemples INCORRECTS à ne JAMAIS utiliser: "Fabien", "Cher Fabien", "{prenom}"
"""
        else:
            # Mode Membre OU ce n'est pas le Président -> utiliser le prénom
            appellation = prenom
            if is_president_user:
                # C'est le Président mais en mode Membre
                membre_info = f"""
👤 MEMBRE ACTUEL : {nom_complet} (#{numero_membre})
⚠️ ATTENTION : Cette personne est le Président du club, MAIS elle est connectée en MODE MEMBRE.
- Tu dois l'appeler par son PRÉNOM : {appellation}
- Tu ne dois PAS l'appeler "Président" car il n'est pas en mode Président
- Traite-le comme un membre normal du club
- Email : {user_data.get('email', 'N/A')}
"""
            else:
                membre_info = f"""
👤 MEMBRE ACTUEL : {nom_complet} (#{numero_membre})
- Tu t'adresses à lui/elle par son prénom : {appellation}
- Email : {user_data.get('email', 'N/A')}
- Rôle : {user_data.get('role', 'membre')}
- Fonction : {user_data.get('fonction', 'Membre')}
- Statut : {user_data.get('statut', 'actif')}
"""
        context_parts.append(membre_info)
    
    # 3. La collection personnelle du membre
    ma_collection = await db.ma_cigarotheque.find({"user_id": user_id}).to_list(100)
    if ma_collection and user_data:
        nom = user_data.get('nom_complet', user_data.get('prenom', 'ce membre'))
        collection_text = f"\n--- MA CIGARTHÈQUE DE {nom.upper()} ({len(ma_collection)} cigares) ---\n"
        for c in ma_collection:
            note = c.get('note_globale', '')
            puissance = c.get('note_puissance', '')
            collection_text += f"- {c.get('marque', '')} {c.get('gamme', '')} : Note {note}/5, Puissance ressentie {puissance}/5, {c.get('evolution', '')}\n"
            if c.get('note_libre'):
                collection_text += f"  Notes personnelles : {c.get('note_libre')}\n"
        context_parts.append(collection_text)
    
    # 4. Tous les membres du club
    all_members = await db.members.find({}).to_list(100)
    if all_members:
        members_text = f"\n--- LES {len(all_members)} MEMBRES DU CLUB (chacun est UNIQUE) ---\n"
        members_text += "⚠️ RAPPEL : Ne jamais confondre deux membres. Chaque membre a son propre prénom, numéro et goûts.\n"
        
        members_with_presence = [m for m in all_members if m.get('pourcentage_presences')]
        if members_with_presence:
            sorted_by_presence = sorted(members_with_presence, key=lambda x: float(str(x.get('pourcentage_presences', 0)).replace('%', '') or 0), reverse=True)
            members_text += "\n🏆 TOP 5 LES PLUS ASSIDUS :\n"
            for i, m in enumerate(sorted_by_presence[:5], 1):
                nom = m.get('nom_complet', f"{m.get('prenom', '')} {m.get('nom', '')}")
                pres = m.get('pourcentage_presences', 'N/A')
                members_text += f"  {i}. {nom} : {pres}% de présence\n"
        
        members_text += "\n📋 LISTE COMPLÈTE (utilise ces informations pour identifier chaque membre) :\n"
        for m in all_members:
            nom_complet = m.get('nom_complet', f"{m.get('prenom', '')} {m.get('nom', '')}")
            prenom = m.get('prenom', nom_complet.split(' ')[0])
            numero = m.get('numero_membre', '?')
            fonction = m.get('fonction', 'Membre')
            annee = m.get('annee_entree', m.get('date_adhesion', 'N/A'))
            saison = m.get('saison_entree', '')
            presences = m.get('pourcentage_presences', 'N/A')
            etoiles = m.get('etoiles', 0)
            
            members_text += f"- #{numero} {nom_complet} (appeler: '{prenom}'), {fonction}"
            if annee and annee != 'N/A':
                members_text += f", depuis {annee}"
            if saison:
                members_text += f" ({saison})"
            if presences and presences != 'N/A':
                members_text += f", présence: {presences}%"
            if etoiles:
                members_text += f", {etoiles}★"
            members_text += "\n"
        context_parts.append(members_text)
    
    # 5. Collections de tous les membres
    all_collections = await db.ma_cigarotheque.find({}).to_list(500)
    if all_collections:
        collections_by_user = {}
        for c in all_collections:
            uid = c.get('user_id')
            if uid not in collections_by_user:
                collections_by_user[uid] = []
            collections_by_user[uid].append(c)
        
        collections_text = "\n--- CIGARES PRÉFÉRÉS DES MEMBRES ---\n"
        for uid, cigars in collections_by_user.items():
            member = await db.members.find_one({"id": uid})
            if member:
                name = member.get('nom_complet', f"{member.get('prenom', '')} {member.get('nom', '')}")
                top_cigars = sorted(cigars, key=lambda x: float(x.get('note_globale', 0) or 0), reverse=True)[:5]
                if top_cigars:
                    cubains = [c for c in top_cigars if c.get('terroir', '').lower() == 'cuba']
                    non_cubains = [c for c in top_cigars if c.get('terroir', '').lower() != 'cuba' and c.get('terroir')]
                    
                    collections_text += f"\n{name} :\n"
                    if cubains:
                        collections_text += f"  Cubains préférés : "
                        collections_text += ", ".join([f"{c.get('marque', '')} {c.get('gamme', '')} ({c.get('note_globale', '?')}/5)" for c in cubains[:3]])
                        collections_text += "\n"
                    if non_cubains:
                        collections_text += f"  Non-cubains préférés : "
                        collections_text += ", ".join([f"{c.get('marque', '')} {c.get('gamme', '')} - {c.get('terroir', '')} ({c.get('note_globale', '?')}/5)" for c in non_cubains[:3]])
                        collections_text += "\n"
        context_parts.append(collections_text)
    
    # 6. L'Apéro du Club
    apero_cigars = await db.apero_club_cigares.find({}).to_list(50)
    if apero_cigars:
        apero_text = f"\n--- APÉRO DU CLUB ({len(apero_cigars)} cigares) ---\n"
        for c in apero_cigars:
            apero_text += f"- {c.get('marque', '')} {c.get('gamme', '')} (ajouté le {c.get('date_apero', 'N/A')})\n"
        context_parts.append(apero_text)
    
    # 7. Événements récents avec participants
    events = await db.evenements.find({}).sort("date", -1).to_list(20)
    if events:
        events_text = "\n--- ÉVÉNEMENTS DU CLUB (avec participants) ---\n"
        for e in events:
            titre = e.get('objet', e.get('titre', e.get('nom', 'Événement')))
            date = e.get('date', 'N/A')
            lieu = e.get('lieu', '')
            type_evt = e.get('type_sondage', e.get('type', ''))
            event_id = e.get('id', '')
            
            events_text += f"\n📅 {titre}"
            if type_evt:
                events_text += f" ({type_evt})"
            events_text += f"\n   Date: {date}"
            if lieu:
                events_text += f" | Lieu: {lieu}"
            
            if event_id:
                reponses = await db.reponses_evenements.find({
                    "evenement_id": event_id,
                    "present": True
                }).to_list(100)
                
                if reponses:
                    noms_presents = []
                    for r in reponses:
                        membre_id = r.get('membre_id')
                        if membre_id:
                            membre = await db.members.find_one({"id": membre_id})
                            if membre:
                                nom = membre.get('nom_complet', f"{membre.get('prenom', '')} {membre.get('nom', '')}")
                                noms_presents.append(nom)
                    
                    if noms_presents:
                        events_text += f"\n   ✅ Présents ({len(noms_presents)}): {', '.join(noms_presents)}"
            events_text += "\n"
        context_parts.append(events_text)
    
    # 8. Sondages actifs
    sondages = await db.sondages.find({"statut": "actif"}).to_list(10)
    if sondages:
        sondages_text = "\n--- SONDAGES EN COURS ---\n"
        for s in sondages:
            sondages_text += f"- {s.get('titre', 'Sans titre')} (jusqu'au {s.get('date_fin', 'N/A')})\n"
        context_parts.append(sondages_text)
    
    # 9. Quelques cigares du catalogue
    try:
        with get_mysql_connection() as conn:
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            cursor.execute("SELECT COUNT(*) as total FROM cigares")
            total_cigars = cursor.fetchone()['total']
            
            cursor.execute("SELECT DISTINCT pays_fabrication FROM cigares WHERE pays_fabrication IS NOT NULL")
            pays = [r['pays_fabrication'] for r in cursor.fetchall()]
            cursor.execute("SELECT DISTINCT marque FROM cigares WHERE marque IS NOT NULL LIMIT 30")
            marques = [r['marque'] for r in cursor.fetchall()]
            
            catalog_text = f"\n--- CATALOGUE DE CIGARES ({total_cigars} cigares) ---\n"
            catalog_text += f"Pays représentés : {', '.join(pays[:10])}\n"
            catalog_text += f"Marques principales : {', '.join(marques[:15])}...\n"
            context_parts.append(catalog_text)
    except Exception as e:
        logger.error(f"Erreur accès catalogue: {e}")
    
    # 10. Guide du cigare
    full_knowledge = get_full_winston_knowledge()
    context_parts.append(f"\n--- GUIDE DU CIGARE ET CONNAISSANCES INTERNES ---\n{full_knowledge}")
    
    return "\n".join(context_parts)

# ============ ROUTES ============

@winston_router.post("/assistant/chat", response_model=ChatMessageResponse)
async def chat_with_assistant(request: ChatMessageRequest):
    """Envoie un message à l'assistant IA et reçoit une réponse"""
    try:
        user_id = request.user_id
        session_id = f"chat_{user_id}"
        
        # IMPORTANT: Toujours reconstruire le contexte pour le Président 
        # pour s'assurer que les instructions d'appellation sont respectées
        is_president_mode = user_id.endswith('_president')
        if is_president_mode and session_id in chat_sessions:
            # Supprimer la session pour forcer la reconstruction du contexte
            del chat_sessions[session_id]
        
        if session_id not in chat_sessions:
            context = await build_assistant_context(user_id)
            
            system_message = f"""Tu es Winston, le concierge et assistant IA personnel du club de cigares "La Bague Impériale".

Tu possèdes deux certifications :
1. **"Bague Specialist"** - Tu connais parfaitement les 35 membres du club, leurs goûts, leurs préférences, leur ancienneté, et tout ce qui concerne le club.
2. **"Conca Specialist"** - Tu connais parfaitement la Carte du Bar à Whisky & Rhumerie pour conseiller les meilleurs accords avec les cigares.

Tu maîtrises :
- Les 35 membres du club, leurs goûts, leurs préférences, leur historique
- Le Guide du Cigare complet (terroirs, formats, marques, dégustation)
- Les conseils d'association : quel alcool avec quel cigare, quel moment de la journée
- La carte complète du bar (whiskies, rhums, cognacs)

{context}

INSTRUCTIONS IMPORTANTES :
1. Tu t'appelles Winston et tu te présentes comme le concierge du club
2. Tu vouvoies les membres avec élégance (pas de tutoiement)
3. Tu connais parfaitement tous les 35 membres du club, leurs préférences et leur historique
4. DIFFÉRENCIATION DES MEMBRES - RÈGLE ABSOLUE :
   - Chaque membre est UNIQUE avec son propre prénom, nom, numéro, goûts et historique
   - NE JAMAIS confondre deux membres - vérifie toujours le contexte pour savoir QUI te parle
   - Si tu parles au PRÉSIDENT du club → Tu l'appelles UNIQUEMENT "Président" ou "Monsieur le Président". Tu ne dois JAMAIS utiliser son prénom.
   - Pour tous les autres membres : utilise leur PRÉNOM tel qu'indiqué dans le contexte
   - Quand on te demande les goûts d'un membre, consulte SA Cigarthèque personnelle (pas celle d'un autre)
5. Tu peux recommander des cigares basés sur les goûts de chaque membre
6. Tu utilises le Guide du Cigare pour répondre aux questions techniques
7. Tu peux comparer les goûts entre membres si on te le demande
8. Quand on te demande une recommandation, base-toi sur les cigares bien notés par le membre
9. Tu conseilles sur les accords cigare & alcool (quel whisky, quel rhum, quel cognac)
10. Tu conseilles sur le moment idéal pour fumer (matin, après-midi, soir)
11. Si on te demande à quoi tu sers, propose des exemples de questions
12. SOIS CONCIS ET RAPIDE : Réponds en 2-4 phrases maximum sauf si on te demande explicitement plus de détails
13. ACCOMPAGNE LES DÉBUTANTS avec des suggestions de thèmes
14. Tu proposes les 4 PARCOURS INITIATIQUES selon le niveau
15. Tu connais le sommaire "TOUT SUR LE CIGARE" en 11 parties
16. Tu es INTRAITABLE sur tes connaissances
17. TOUJOURS terminer par une question ou une suggestion pour relancer la conversation
18. CHOIX DE CIGARE - FLOW GUIDÉ STRICT :
   Tu dois suivre ce flow ÉTAPE PAR ÉTAPE sans sauter d'étape et sans te re-présenter :
   
   **ÉTAPE 1 - NIVEAU** : Demander son profil de fumeur (Débutant/Amateur/Confirmé/Expert)
   
   **ÉTAPE 2 - MOMENT** : Quand l'utilisateur RÉPOND avec son niveau (ex: "3", "confirmé", "amateur"), 
   tu dois DIRECTEMENT enchaîner avec la question du MOMENT sans te re-présenter :
   "Parfait ! Et dans quel contexte souhaitez-vous le déguster ?
   1️⃣ Matin tranquille
   2️⃣ Journée / Pause
   3️⃣ Apéro (alcool léger, vin, bière)
   4️⃣ Digestif (whisky, rhum, cognac)"
   
   **ÉTAPE 3 - RECOMMANDATION** : Quand il répond le moment, tu proposes 3 options :
   - 🟢 **Choix sûr** : valeur refuge
   - 🟡 **Choix expressif** : légère montée
   - 🔴 **Choix ambitieux** : seulement si le profil le permet
   
   RÈGLE ABSOLUE : Quand un utilisateur répond "1", "2", "3", "4", "débutant", "amateur", "confirmé", "expert",
   c'est une RÉPONSE au flow "Choix de cigare". Tu dois CONTINUER le flow, pas te re-présenter !
19. CONSEIL CADEAU - Pour un cigare à offrir
20. NAVIGATION DANS L'APPLICATION - Tu connais parfaitement l'application
21. QUESTIONS SUR LE CLUB
22. CIGARTHÈQUE DES MEMBRES
23. PRÉSENCE AUX ÉVÉNEMENTS
"""
            
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            chat_sessions[session_id] = chat
        
        chat = chat_sessions[session_id]
        
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        if hasattr(response, 'text'):
            response = response.text
        elif hasattr(response, 'content'):
            response = response.content
        else:
            response = str(response)
        
        return ChatMessageResponse(
            response=response,
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Erreur assistant IA: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur de l'assistant: {str(e)}")


@winston_router.post("/assistant/reset")
async def reset_chat_session(user_id: str):
    """Réinitialise la session de chat d'un utilisateur"""
    session_id = f"chat_{user_id}"
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    return {"message": "Session réinitialisée", "session_id": session_id}


@winston_router.get("/assistant/history/{user_id}")
async def get_chat_history(user_id: str):
    """Récupère l'historique de chat d'un utilisateur depuis MongoDB"""
    try:
        history = await db.chat_history.find(
            {"user_id": user_id}
        ).sort("timestamp", 1).to_list(100)
        
        for h in history:
            h['_id'] = str(h['_id'])
        
        return history
    except Exception as e:
        logger.error(f"Erreur récupération historique: {e}")
        return []


@winston_router.post("/assistant/save-message")
async def save_chat_message(user_id: str, role: str, content: str):
    """Sauvegarde un message dans l'historique MongoDB"""
    try:
        message = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_history.insert_one(message)
        return {"success": True}
    except Exception as e:
        logger.error(f"Erreur sauvegarde message: {e}")
        return {"success": False}


@winston_router.get("/guide-cigare/sommaire")
async def get_guide_sommaire():
    """Retourne le sommaire du guide 'Tout sur le cigare'"""
    return {
        "sommaire": get_cigar_guide_sommaire(),
        "parties": [
            {"numero": 1, "titre": "Bases, structure, vocabulaire fondamental et histoire"},
            {"numero": 2, "titre": "Choisir un cigare en pratique"},
            {"numero": 3, "titre": "Lexique utile du cigare"},
            {"numero": 4, "titre": "Parler cigare correctement"},
            {"numero": 5, "titre": "Les grandes marques et leur réputation"},
            {"numero": 6, "titre": "Les pays du cigare et leurs terroirs"},
            {"numero": 7, "titre": "Fabrication du cigare"},
            {"numero": 8, "titre": "Les modules et origine de leurs noms"},
            {"numero": 9, "titre": "Défauts du cigare, causes et corrections"},
            {"numero": 10, "titre": "Les accessoires"},
            {"numero": 11, "titre": "Parcours cigare : débutant, amateur, confirmé, expert"}
        ],
        "parcours": [
            {"id": 1, "titre": "Parcours initiatique - Débuter sans se tromper", "niveau": "débutant"},
            {"id": 2, "titre": "Progresser comme amateur", "niveau": "amateur"},
            {"id": 3, "titre": "Affiner son palais de confirmé", "niveau": "confirmé"},
            {"id": 4, "titre": "Ce qui peut encore surprendre un expert", "niveau": "expert"}
        ]
    }


@winston_router.get("/guide-cigare/partie/{numero}")
async def get_guide_partie(numero: int):
    """Retourne une partie spécifique du guide"""
    import re
    guide = get_cigar_knowledge()
    
    pattern = rf"## Partie {numero} - (.+?)(?=## Partie {numero + 1}|$)"
    match = re.search(pattern, guide, re.DOTALL)
    
    if match:
        return {
            "numero": numero,
            "contenu": match.group(0).strip()
        }
    else:
        raise HTTPException(status_code=404, detail=f"Partie {numero} non trouvée")


@winston_router.get("/guide-cigare/parcours")
async def get_parcours_cigare():
    """Retourne les sujets de parcours proposés par Winston"""
    return {
        "parcours": get_parcours_sujets(),
        "sujets": [
            {
                "id": 1, 
                "titre": "Parcours initiatique - Débuter sans se tromper",
                "description": "Pour les nouveaux venus qui veulent découvrir le cigare sans faux pas.",
                "niveau": "débutant"
            },
            {
                "id": 2, 
                "titre": "Progresser comme amateur",
                "description": "Pour ceux qui ont déjà les bases et veulent affiner leur culture.",
                "niveau": "amateur"
            },
            {
                "id": 3, 
                "titre": "Affiner son palais de confirmé",
                "description": "Pour les amateurs expérimentés qui veulent maîtriser les subtilités.",
                "niveau": "confirmé"
            },
            {
                "id": 4, 
                "titre": "Ce qui peut encore surprendre un expert",
                "description": "Pour les connaisseurs qui cherchent de nouveaux angles et perspectives.",
                "niveau": "expert"
            }
        ]
    }
