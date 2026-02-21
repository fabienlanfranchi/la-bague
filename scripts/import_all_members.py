#!/usr/bin/env python3
"""
Script pour importer tous les membres de La Bague Impériale
"""

import json
import requests
import sys

BACKEND_URL = "http://0.0.0.0:8001"

def import_all_members():
    """Importer tous les membres depuis members_data.json"""
    
    # Charger les données
    with open('/app/scripts/members_data.json', 'r', encoding='utf-8') as f:
        members_data = json.load(f)
    
    print(f"📋 {len(members_data)} membres à importer\n")
    
    created_count = 0
    updated_count = 0
    errors = []
    
    for member in members_data:
        numero = member['numero_membre']
        nom = member['nom_complet']
        
        try:
            # Vérifier si le membre existe déjà
            response = requests.get(f"{BACKEND_URL}/api/members")
            existing_members = response.json()
            
            existing = next((m for m in existing_members if m['numero_membre'] == numero), None)
            
            if existing:
                # Mettre à jour le membre existant
                response = requests.put(
                    f"{BACKEND_URL}/api/members/{existing['id']}",
                    json=member
                )
                
                if response.status_code == 200:
                    print(f"✅ Mis à jour: N°{numero} - {nom}")
                    updated_count += 1
                else:
                    print(f"⚠️  Erreur mise à jour N°{numero} - {nom}: {response.text}")
                    errors.append(f"N°{numero}: {response.text}")
            else:
                # Créer le nouveau membre
                response = requests.post(
                    f"{BACKEND_URL}/api/members",
                    json=member
                )
                
                if response.status_code == 200:
                    result = response.json()
                    mdp_temp = result.get('temporary_password', f'clubcigare{numero}')
                    print(f"✅ Créé: N°{numero} - {nom} (Mot de passe: {mdp_temp})")
                    created_count += 1
                else:
                    print(f"❌ Erreur création N°{numero} - {nom}: {response.text}")
                    errors.append(f"N°{numero}: {response.text}")
        
        except Exception as e:
            print(f"❌ Exception pour N°{numero} - {nom}: {str(e)}")
            errors.append(f"N°{numero}: {str(e)}")
    
    # Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ DE L'IMPORT")
    print("="*60)
    print(f"✅ Membres créés: {created_count}")
    print(f"🔄 Membres mis à jour: {updated_count}")
    print(f"❌ Erreurs: {len(errors)}")
    
    if errors:
        print("\n⚠️  ERREURS DÉTAILLÉES:")
        for error in errors:
            print(f"  - {error}")
    
    print("\n🎉 Import terminé!")
    print(f"💾 Total en base: {created_count + updated_count} membres")

if __name__ == '__main__':
    import_all_members()
