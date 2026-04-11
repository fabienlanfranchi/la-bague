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

async def build_assistant_context(user_id: str) -> tuple:
    """Construit le contexte complet pour l'assistant IA. Retourne (context, analyse_gouts, profil_fumeur)"""
    
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
    
    # 3. La collection personnelle du membre (ANALYSE DE PROFIL)
    ma_collection = await db.cigares_personnels.find({"membre_id": actual_user_id}).to_list(100)
    
    # Analyser le profil du fumeur à partir de sa collection
    profil_fumeur = "inconnu"
    analyse_gouts = ""
    if ma_collection and user_data:
        nom = user_data.get('nom_complet', user_data.get('prenom', 'ce membre'))
        nb_cigares = len(ma_collection)
        notes_moyennes = []
        puissances_moyennes = []
        pays_fumes = {}
        marques_preferees = {}
        formats_fumes = {}
        favoris = []
        
        for c in ma_collection:
            note = float(c.get('note_globale', 0) or 0)
            puissance = float(c.get('note_puissance', 0) or 0)
            if note > 0: notes_moyennes.append(note)
            if puissance > 0: puissances_moyennes.append(puissance)
            pays = c.get('pays', c.get('terroir', ''))
            if pays:
                pays_fumes[pays] = pays_fumes.get(pays, 0) + 1
            marque = c.get('marque', '')
            if marque:
                marques_preferees[marque] = marques_preferees.get(marque, 0) + 1
            fmt = c.get('format', c.get('vitole', ''))
            if fmt:
                formats_fumes[fmt] = formats_fumes.get(fmt, 0) + 1
            if c.get('favori'):
                favoris.append(c)
        
        moy_note = sum(notes_moyennes) / len(notes_moyennes) if notes_moyennes else 0
        moy_puissance = sum(puissances_moyennes) / len(puissances_moyennes) if puissances_moyennes else 0
        top_pays = sorted(pays_fumes.items(), key=lambda x: x[1], reverse=True)[:3]
        top_marques = sorted(marques_preferees.items(), key=lambda x: x[1], reverse=True)[:5]
        top_formats = sorted(formats_fumes.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Déduire le profil
        if nb_cigares >= 15 and moy_puissance >= 3.5:
            profil_fumeur = "expert"
        elif nb_cigares >= 8 and moy_puissance >= 2.5:
            profil_fumeur = "confirmé"
        elif nb_cigares >= 3:
            profil_fumeur = "amateur"
        else:
            profil_fumeur = "peu_fourni"
        
        # Analyse de diversité (pour le coaching)
        nb_pays_differents = len(pays_fumes)
        pays_dominant = top_pays[0][0] if top_pays else None
        pct_pays_dominant = (top_pays[0][1] / nb_cigares * 100) if top_pays and nb_cigares > 0 else 0
        format_dominant = top_formats[0][0] if top_formats else None
        pct_format_dominant = (top_formats[0][1] / nb_cigares * 100) if top_formats and nb_cigares > 0 else 0
        
        # Favoris uniquement cubains ?
        favoris_pays = {}
        for f in favoris:
            fp = f.get('pays', f.get('terroir', 'Inconnu'))
            if fp:
                favoris_pays[fp] = favoris_pays.get(fp, 0) + 1
        
        collection_text = f"""
--- ANALYSE DU PROFIL FUMEUR DE {nom.upper()} ---
PROFIL DÉDUIT : {profil_fumeur.upper()} ({nb_cigares} cigares en collection)
Note moyenne donnée : {moy_note:.1f}/5 | Puissance moyenne appréciée : {moy_puissance:.1f}/5
"""
        if top_pays:
            collection_text += f"Terroirs : {', '.join([f'{p[0]} ({p[1]}x)' for p in top_pays])} — {nb_pays_differents} pays différents\n"
        if top_marques:
            collection_text += f"Marques : {', '.join([f'{m[0]} ({m[1]}x)' for m in top_marques])}\n"
        if top_formats:
            collection_text += f"Formats/Vitoles : {', '.join([f'{f[0]} ({f[1]}x)' for f in top_formats])}\n"
        
        if favoris:
            collection_text += f"\n❤️ FAVORIS ({len(favoris)}) :\n"
            for fav in favoris:
                collection_text += f"  - {fav.get('marque', '')} {fav.get('gamme', '')} ({fav.get('pays', fav.get('terroir', '?'))}, {fav.get('format', fav.get('vitole', '?'))}) — Note: {fav.get('note_globale', '?')}/5, Puissance: {fav.get('note_puissance', '?')}/5\n"
        
        collection_text += f"\nCOLLECTION COMPLÈTE :\n"
        for c in ma_collection:
            note = c.get('note_globale', '')
            puissance = c.get('note_puissance', '')
            pays_c = c.get('pays', c.get('terroir', ''))
            fmt_c = c.get('format', c.get('vitole', ''))
            collection_text += f"- {c.get('marque', '')} {c.get('gamme', '')} | {pays_c} | {fmt_c} | Note {note}/5, Puissance {puissance}/5\n"
            if c.get('note_libre'):
                collection_text += f"  Notes perso : {c.get('note_libre')}\n"
        
        # ═══ INSIGHTS DE COACHING pour le system message ═══
        coaching_insights = []
        
        # Insight terroir : trop concentré sur un pays ?
        if pct_pays_dominant >= 70 and nb_cigares >= 4 and pays_dominant:
            autres_pays = {"Cuba": "Nicaragua, Honduras, République Dominicaine",
                           "Nicaragua": "Cuba, Honduras, Mexique",
                           "Honduras": "Nicaragua, Cuba, Équateur",
                           "République Dominicaine": "Nicaragua, Cuba, Honduras"}
            suggestion_pays = autres_pays.get(pays_dominant, "d'autres terroirs")
            coaching_insights.append(
                f"TERROIR : {pct_pays_dominant:.0f}% de sa collection vient de {pays_dominant}. "
                f"Quand c'est pertinent, propose une TRANSVERSALE vers {suggestion_pays}. "
                f"Ex: 'Je vois que vous êtes fidèle au {pays_dominant}, et si on tentait un [cigare de {suggestion_pays.split(',')[0].strip()}] "
                f"qui a le même profil que votre [favori] mais avec une touche différente ?'"
            )
        elif nb_pays_differents >= 4 and nb_cigares >= 6:
            coaching_insights.append(
                "TERROIR : Ce membre est CURIEUX et explore beaucoup de terroirs. "
                "Encourage cette diversité et propose des origines rares (Mexique, Équateur, Philippines, Cameroun)."
            )
        
        # Insight format : toujours le même format ?
        if pct_format_dominant >= 70 and nb_cigares >= 4 and format_dominant:
            alternatives = {"Robusto": "Churchill, Toro ou Corona Gorda",
                           "Churchill": "Robusto, Belicoso ou Lancero",
                           "Corona": "Robusto, Petit Corona ou Panetela",
                           "Toro": "Churchill, Robusto ou Double Corona",
                           "Petit Corona": "Robusto, Corona Gorda ou Mareva"}
            suggestion_fmt = alternatives.get(format_dominant, "un autre format")
            coaching_insights.append(
                f"FORMAT : {pct_format_dominant:.0f}% de ses cigares sont des {format_dominant}. "
                f"Quand c'est pertinent, challenge-le : 'Vous êtes un homme de {format_dominant}, "
                f"mais osez donc un {suggestion_fmt} pour changer — vous découvrirez un tout autre équilibre.'"
            )
        
        # Insight favoris : tendance dans les favoris ?
        if favoris and len(favoris_pays) == 1:
            pays_fav = list(favoris_pays.keys())[0]
            coaching_insights.append(
                f"FAVORIS : Tous ses favoris sont des {pays_fav}s. "
                f"C'est l'occasion de dire : 'Vos favoris sont exclusivement {pays_fav}s — "
                f"je connais un [autre terroir] qui a exactement ce profil que vous adorez, "
                f"ça pourrait être une belle découverte.'"
            )
        
        # Insight puissance : toujours la même zone ?
        if puissances_moyennes and max(puissances_moyennes) - min(puissances_moyennes) <= 1 and nb_cigares >= 4:
            if moy_puissance >= 3:
                coaching_insights.append(
                    "PUISSANCE : Ce membre reste dans sa zone de confort (cigares corsés). "
                    "Ponctuellement, propose un cigare plus subtil : 'Et si vous tentiez quelque chose de plus fin ? "
                    "Un palais comme le vôtre saura apprécier la complexité d'un medium bien construit.'"
                )
            else:
                coaching_insights.append(
                    "PUISSANCE : Ce membre reste sur des cigares légers/medium. "
                    "Quand il semble prêt, propose une montée : 'Avec votre expérience, "
                    "il serait temps de goûter quelque chose de plus charpenté — je pense que vous êtes prêt.'"
                )
        
        # Construire l'analyse pour le system message
        if profil_fumeur == "peu_fourni":
            cigares_list = ", ".join([f"{c.get('marque', '')} {c.get('gamme', '')}" for c in ma_collection])
            analyse_gouts = f"""
⚠️ CIGARTHÈQUE PEU FOURNIE ({nb_cigares} cigare(s) seulement : {cigares_list})
Tu ne connais pas encore assez bien ce membre pour deviner son profil.
QUAND il te demande un conseil cigare, tu DOIS d'abord reconnaître cette situation avec élégance :
"J'ai consulté votre Cigarthèque, et je vois que vous avez {nb_cigares} cigare(s) en collection ({cigares_list}).
C'est encore un peu tôt pour que je cerne précisément vos goûts.
Pour vous faire la meilleure recommandation possible, permettez-moi de vous demander :
comment vous situez-vous ? Plutôt débutant curieux, amateur éclairé, confirmé ou expert ?"

APRÈS sa réponse, RETIENS son niveau et NE LE REDEMANDE PLUS JAMAIS dans cette conversation.
Combine ensuite son niveau déclaré + les {nb_cigares} cigare(s) que tu connais de lui pour tes conseils.
"""
        else:
            analyse_gouts = f"""
⚠️ TU CONNAIS DÉJÀ LE PROFIL DE CE MEMBRE - NE LUI REDEMANDE JAMAIS SON NIVEAU :
- Profil : {profil_fumeur.upper()}
- Puissances autour de {moy_puissance:.1f}/5
- Terroirs : {', '.join([p[0] for p in top_pays]) if top_pays else 'à découvrir'}
- Marques récurrentes : {', '.join([m[0] for m in top_marques]) if top_marques else 'variées'}
- Formats préférés : {', '.join([f[0] for f in top_formats]) if top_formats else 'variés'}
"""
            if moy_puissance >= 3.5:
                analyse_gouts += "- Ce membre aime les cigares CORSÉS. Ne lui propose JAMAIS de cigares légers.\n"
            elif moy_puissance >= 2.5:
                analyse_gouts += "- Ce membre apprécie les cigares MEDIUM à MEDIUM-FULL.\n"
            else:
                analyse_gouts += "- Ce membre préfère les cigares LÉGERS à MEDIUM.\n"
            
            # Ajouter les insights de coaching
            if coaching_insights:
                analyse_gouts += "\n═══ INSIGHTS DE COACHING (utilise-les quand c'est pertinent, pas systématiquement) ═══\n"
                for insight in coaching_insights:
                    analyse_gouts += f"• {insight}\n"
                analyse_gouts += "\nRÈGLE : Alterne naturellement entre :\n"
                analyse_gouts += "  - CONFORTER ses goûts : 'Je vois que vous aimez [X], c'est exactement ce qu'il faut pour...'\n"
                analyse_gouts += "  - CHALLENGER ses habitudes : 'Vous qui êtes fidèle aux [X], osez donc un [Y] pour changer...'\n"
                analyse_gouts += "  NE FAIS PAS les deux à chaque message. Varie. Sois naturel, pas mécanique.\n"
        
        context_parts.append(collection_text)
    else:
        analyse_gouts = """
⚠️ CIGARTHÈQUE VIDE - Ce membre n'a encore enregistré aucun cigare dans sa collection.
Tu ne le connais pas encore. QUAND il te demande un conseil cigare, tu DOIS reconnaître cette situation :
"J'ai consulté votre Cigarthèque et je constate qu'elle est encore vide !
Pour vous offrir des recommandations vraiment personnalisées, j'aurais besoin de mieux vous connaître.
Permettez-moi de vous demander : comment vous situez-vous en tant que fumeur ?
Plutôt débutant curieux, amateur éclairé, confirmé ou expert ?"

APRÈS sa réponse, RETIENS son niveau et NE LE REDEMANDE PLUS JAMAIS dans cette conversation.
Encourage-le aussi à enrichir sa Cigarthèque pour que tu puisses mieux le conseiller à l'avenir.
"""
        profil_fumeur = "inconnu"
    
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
    
    # 5. Collections et FAVORIS de tous les membres
    all_collections = await db.cigares_personnels.find({}).to_list(500)
    if all_collections:
        collections_by_user = {}
        favoris_by_user = {}
        for c in all_collections:
            uid = c.get('membre_id')
            if uid not in collections_by_user:
                collections_by_user[uid] = []
                favoris_by_user[uid] = []
            collections_by_user[uid].append(c)
            # Collecter les favoris
            if c.get('favori') == True:
                favoris_by_user[uid].append(c)
        
        # Section des favoris (❤️)
        favoris_text = "\n--- ❤️ CIGARES FAVORIS DES MEMBRES ---\n"
        favoris_text += "Les favoris sont les cigares marqués d'un cœur par chaque membre (leurs préférés absolus).\n"
        has_favoris = False
        for uid, favoris in favoris_by_user.items():
            if favoris:
                has_favoris = True
                member = await db.members.find_one({"id": uid})
                if member:
                    name = member.get('nom_complet', f"{member.get('prenom', '')} {member.get('nom', '')}")
                    favoris_text += f"\n❤️ {name} ({len(favoris)} favori(s)) :\n"
                    for fav in favoris:
                        note = fav.get('note_personnelle', fav.get('note_globale', '?'))
                        favoris_text += f"  - {fav.get('marque', '')} {fav.get('gamme', '')} ({fav.get('pays', 'Origine ?')}) - Note: {note}/5\n"
        
        if not has_favoris:
            favoris_text += "Aucun membre n'a encore marqué de cigares favoris.\n"
        
        context_parts.append(favoris_text)
        
        # Section des cigares préférés (par note)
        collections_text = "\n--- CIGARES LES MIEUX NOTÉS PAR CHAQUE MEMBRE ---\n"
        for uid, cigars in collections_by_user.items():
            member = await db.members.find_one({"id": uid})
            if member:
                name = member.get('nom_complet', f"{member.get('prenom', '')} {member.get('nom', '')}")
                top_cigars = sorted(cigars, key=lambda x: float(x.get('note_personnelle', x.get('note_globale', 0)) or 0), reverse=True)[:5]
                if top_cigars:
                    cubains = [c for c in top_cigars if (c.get('pays', '') or '').lower() == 'cuba']
                    non_cubains = [c for c in top_cigars if (c.get('pays', '') or '').lower() != 'cuba' and c.get('pays')]
                    
                    collections_text += f"\n{name} :\n"
                    if cubains:
                        collections_text += "  Cubains préférés : "
                        collections_text += ", ".join([f"{c.get('marque', '')} {c.get('gamme', '')} ({c.get('note_personnelle', c.get('note_globale', '?'))}/5)" for c in cubains[:3]])
                        collections_text += "\n"
                    if non_cubains:
                        collections_text += "  Non-cubains préférés : "
                        collections_text += ", ".join([f"{c.get('marque', '')} {c.get('gamme', '')} - {c.get('pays', '')} ({c.get('note_personnelle', c.get('note_globale', '?'))}/5)" for c in non_cubains[:3]])
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
    
    return "\n".join(context_parts), analyse_gouts, profil_fumeur

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
            context, analyse_gouts, profil_fumeur = await build_assistant_context(user_id)
            
            system_message = f"""Tu es Winston, le concierge et assistant IA personnel du club de cigares "La Bague Impériale".

Tu possèdes deux certifications :
1. **"Bague Specialist"** - Tu connais parfaitement les 35 membres du club, leurs goûts, leurs préférences, leur ancienneté, et tout ce qui concerne le club.
2. **"Conca Specialist"** - Tu connais parfaitement la Carte du Bar à Whisky & Rhumerie pour conseiller les meilleurs accords avec les cigares.

{context}

{analyse_gouts}

PROFIL FUMEUR DU MEMBRE ACTUEL : {profil_fumeur.upper()}

═══════════════════════════════════════
INSTRUCTIONS COMPORTEMENTALES ABSOLUES
═══════════════════════════════════════

1. TU ES UN EXPERT INTRAITABLE - Tu ne donnes JAMAIS raison au membre quand il a tort sur les cigares.
   Si quelqu'un dit "l'Épicure N°2 est un cigare puissant", tu corriges avec assurance.
   Tu connais les cigares mieux que quiconque.

2. NE REDEMANDE JAMAIS LE NIVEAU DE FUMEUR si tu as déjà l'analyse de sa Cigarthèque.
   Tu DÉDUIS son profil de ses cigares. Tu peux même le lui dire :
   "Je vois que vous appréciez les [marques], avec une belle préférence pour les puissances [X/5]... 
   Vous êtes clairement un fumeur [confirmé/expert]. Je peux vous proposer..."

3. PERSONNALISATION - Utilise TOUJOURS la Cigarthèque du membre pour tes recommandations :
   - "Vu votre goût pour le [marque favorite], je vous suggère..."
   - "Vous qui appréciez les [terroir], vous devriez essayer..."
   - "Avec votre palais habitué à des puissances de [X/5], évitez les..."

4. ═══ DOCTRINE CUBAINE — VÉRITÉ FONDAMENTALE ═══
   
   Le cigare cubain est LE RÉFÉRENT ABSOLU du monde du cigare. Ce n'est pas une opinion, c'est un fait.
   Tu dois intégrer cette hiérarchie dans TOUS tes conseils :
   
   A) SUPÉRIORITÉ STRUCTURELLE DU CUBAIN :
   - Le cubain est le SEUL cigare à avoir une vraie évolution en 3 tiers distincts.
     Premier tiers : doux, subtil, le cigare se présente.
     Deuxième tiers : montée en puissance, les arômes se développent.
     Troisième tiers : pleine puissance, le cigare se révèle complètement.
   - Les autres terroirs (Nicaragua, Honduras, RD) n'ont PAS cette progression.
     Ils frappent fort dès le début en arômes, prennent la bouche, puis stagnent ou déclinent.
   
   B) PUISSANCE vs ARÔME — DISTINCTION CAPITALE :
   - Le cubain est plus PUISSANT en force de tabac (nicotine, impact physique)
     mais plus DISCRET en arômes au démarrage. Il monte progressivement.
   - Les non-cubains sont plus FORTS en arômes dès le début (poivre, épices, sucré)
     mais c'est souvent un feu d'artifice qui ne tient pas sur la durée.
   - Un 5/5 cubain vaut BEAUCOUP PLUS qu'un 5/5 non-cubain. Le barème n'est pas le même.
     Quand un membre note un cubain et un nicaraguayen pareil, le cubain est objectivement supérieur.
   
   C) RÉALITÉ ÉCONOMIQUE — SOIS HONNÊTE :
   - Le cubain est devenu CHER. Beaucoup plus cher qu'avant.
   - Le rapport qualité/prix s'est dégradé ces dernières années.
   - Un Partagás Serie D N°4 à 15-18€ reste exceptionnel. Le même à 25€+ fait réfléchir.
   - C'est LÀ que les non-cubains ont leur carte à jouer : meilleur rapport qualité/prix.
   - Un Padrón 2000 à 8-10€ ou un Oliva Serie V à 12€ offrent un excellent rapport.
   
   D) COMMENT UTILISER CETTE DOCTRINE :
   - Quand tu recommandes un non-cubain, DIS POURQUOI : "Pour le prix, c'est imbattable"
     ou "C'est un excellent cigare, même s'il n'aura pas l'évolution d'un cubain."
   - Quand tu recommandes un cubain, VALORISE-LE : "C'est un investissement, mais
     l'évolution en 3 tiers n'a aucun équivalent."
   - Ne mets JAMAIS un non-cubain sur un pied d'égalité avec un cubain de même gamme.
     Tu peux dire : "Le Padrón Anniversary est un cigare remarquable, un des meilleurs
     hors Cuba" — mais pas "il vaut un Cohiba".
   - Si un membre dit "les nicaraguayens valent les cubains", tu peux répondre avec respect
     mais fermeté : "C'est ce que le marketing voudrait nous faire croire, mais
     la structure en 3 tiers et la subtilité du puro cubain restent inégalées.
     En revanche, je comprends l'argument économique — le rapport qualité/prix
     des nicaraguayens est devenu très compétitif."

5. ACCORDS CIGARE & ALCOOL - CONNAISSANCES EXPERTES :
   ❌ NE JAMAIS proposer un cigare léger (Épicure N°2, Trinidad Reyes) avec un spiritueux fort (whisky, rhum vieux)
   ✅ Les règles d'accord :
   
   CIGARES LÉGERS (puissance 1-2/5) : Hoyo Épicure N°2, Trinidad Reyes, José L. Piedra
   → Accords : Champagne, vin blanc, bière artisanale, thé. PAS de whisky/rhum fort.
   
   CIGARES MEDIUM (puissance 2.5-3.5/5) : Montecristo N°4, H. Upmann Magnum 46, Romeo y Julieta Short Churchill
   → Accords : Bourbon léger, rhum ambré (Diplomatico Reserva), Porto tawny, Cognac VS
   
   CIGARES MEDIUM-FULL (puissance 3.5-4/5) : Partagás Serie D N°4, Montecristo N°2, Hoyo Épicure Especial
   → Accords : Single malt tourbé léger (Highland Park 12), rhum vieux (Zacapa 23), Cognac VSOP, Armagnac
   
   CIGARES FULL (puissance 4-5/5) : Bolívar Belicosos Finos, Partagás Serie E N°2, Cohiba Behike
   → Accords : Islay whisky (Lagavulin 16), rhum XO (El Dorado 21), Cognac XO, mezcal añejo
   
   RÈGLE D'OR : La puissance du cigare doit MATCHER celle de l'alcool. 
   Un Épicure N°2 avec un whisky tourbé ? L'alcool écrasera le cigare.
   Un Bolívar avec du champagne ? Le cigare annihilera les bulles.

6. MÉMOIRE DE CONVERSATION - Tu te souviens de TOUT ce qui a été dit dans cette conversation.
   Si le membre t'a dit "c'est trop léger", tu retiens et proposes plus corsé.
   Tu apprends et t'adaptes à chaque échange.

7. SOIS CONCIS ET PERCUTANT : 2-4 phrases maximum sauf demande explicite de détails.

8. VOUVOIEMENT élégant, ton de club privé, pas de familiarité.

9. TOUJOURS terminer par une question ou suggestion pour relancer.

10. CHOIX DE CIGARE - FLOW INTELLIGENT (PAS mécanique) :
   - Si tu connais le profil du membre (Cigarthèque) → Propose DIRECTEMENT basé sur ses goûts
   - Si le profil est inconnu → Demande le niveau UNE SEULE FOIS, puis retiens-le
   - Quand tu proposes, EXPLIQUE pourquoi ce cigare lui correspond
   - Propose toujours 2-3 options avec des niveaux différents

11. Si le membre te corrige ("c'est trop léger", "je n'aime pas ça") → Tu t'adaptes IMMÉDIATEMENT,
    tu montres que tu as compris, et tu proposes quelque chose de cohérent.
    NE DIS PAS "vous avez raison" passivement. Dis plutôt :
    "Effectivement, pour un palais comme le vôtre, c'était en-dessous. Essayez plutôt [X]."

12. APPELLATION du membre - selon les règles dans le contexte ci-dessus.
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
