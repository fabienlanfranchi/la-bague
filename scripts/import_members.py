#!/usr/bin/env python3
"""
Script d'import de membres depuis un fichier CSV

Format CSV attendu:
nom_complet,fonction,annee_entree,saison_entree,pourcentage_presences,etoiles,situation_cotisation,autres_infos

Exemple:
Jean Dupont,Président,2020,Printemps,85.5,4,0,Membre fondateur
Marie Martin,Trésorier,2021,Été,92.3,4,0,
"""

import csv
import json
import sys
import requests
import os
from pathlib import Path

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://0.0.0.0:8001')
API_URL = f'{BACKEND_URL}/api/members/import'


def read_csv(filepath):
    """Lit un fichier CSV et retourne une liste de membres"""
    members = []
    
    with open(filepath, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            # Valider et convertir les données
            try:
                member = {
                    'nom_complet': row['nom_complet'].strip(),
                    'fonction': row['fonction'].strip(),
                    'annee_entree': int(row['annee_entree']),
                    'saison_entree': row['saison_entree'].strip(),
                    'pourcentage_presences': float(row['pourcentage_presences']),
                    'etoiles': int(row['etoiles']),
                    'situation_cotisation': int(row['situation_cotisation']),
                    'autres_infos': row.get('autres_infos', '').strip(),
                }
                
                # Validation des valeurs
                if member['etoiles'] < 1 or member['etoiles'] > 4:
                    print(f"⚠️  Avertissement: {member['nom_complet']} - étoiles doit être entre 1 et 4")
                    member['etoiles'] = max(1, min(4, member['etoiles']))
                
                if member['situation_cotisation'] < 0 or member['situation_cotisation'] > 3:
                    print(f"⚠️  Avertissement: {member['nom_complet']} - situation_cotisation doit être entre 0 et 3")
                    member['situation_cotisation'] = max(0, min(3, member['situation_cotisation']))
                
                members.append(member)
                
            except (ValueError, KeyError) as e:
                print(f"❌ Erreur lors de la lecture de la ligne: {row}")
                print(f"   Détails: {e}")
                continue
    
    return members


def import_members(members):
    """Envoie les membres à l'API pour import"""
    try:
        payload = {'members': members}
        
        print(f"\n📤 Envoi de {len(members)} membres à l'API...")
        print(f"   URL: {API_URL}")
        
        response = requests.post(API_URL, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print(f"\n✅ Succès! {result.get('count', 0)} membres importés")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Erreur lors de l'import:")
        print(f"   {e}")
        if hasattr(e.response, 'text'):
            print(f"   Réponse: {e.response.text}")
        return False


def create_example_csv(filepath='example_members.csv'):
    """Crée un fichier CSV d'exemple"""
    example_data = [
        {
            'nom_complet': 'Jean Dupont',
            'fonction': 'Président',
            'annee_entree': 2020,
            'saison_entree': 'Printemps',
            'pourcentage_presences': 85.5,
            'etoiles': 4,
            'situation_cotisation': 0,
            'autres_infos': 'Membre fondateur',
        },
        {
            'nom_complet': 'Marie Martin',
            'fonction': 'Trésorier',
            'annee_entree': 2021,
            'saison_entree': 'Été',
            'pourcentage_presences': 92.3,
            'etoiles': 4,
            'situation_cotisation': 0,
            'autres_infos': 'Excellente assiduité',
        },
        {
            'nom_complet': 'Pierre Durand',
            'fonction': 'Secrétaire',
            'annee_entree': 2021,
            'saison_entree': 'Automne',
            'pourcentage_presences': 78.0,
            'etoiles': 3,
            'situation_cotisation': 1,
            'autres_infos': '',
        },
    ]
    
    with open(filepath, 'w', encoding='utf-8', newline='') as csvfile:
        fieldnames = [
            'nom_complet', 'fonction', 'annee_entree', 'saison_entree',
            'pourcentage_presences', 'etoiles', 'situation_cotisation', 'autres_infos'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(example_data)
    
    print(f"✅ Fichier d'exemple créé: {filepath}")


def main():
    print("=" * 60)
    print("  Script d'Import de Membres - La Bague Impériale")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print(f"  python {sys.argv[0]} <fichier.csv>")
        print(f"  python {sys.argv[0]} --example    (crée un fichier d'exemple)")
        print("\nFormat CSV attendu:")
        print("  nom_complet,fonction,annee_entree,saison_entree,pourcentage_presences,etoiles,situation_cotisation,autres_infos")
        sys.exit(1)
    
    if sys.argv[1] == '--example':
        create_example_csv()
        sys.exit(0)
    
    csv_file = sys.argv[1]
    
    if not Path(csv_file).exists():
        print(f"\n❌ Erreur: Le fichier '{csv_file}' n'existe pas")
        sys.exit(1)
    
    # Lire le CSV
    print(f"\n📖 Lecture du fichier: {csv_file}")
    members = read_csv(csv_file)
    
    if not members:
        print("\n⚠️  Aucun membre à importer")
        sys.exit(1)
    
    print(f"\n✅ {len(members)} membres lus avec succès")
    
    # Afficher un aperçu
    print("\n📋 Aperçu des membres à importer:")
    for i, member in enumerate(members[:3], 1):
        print(f"   {i}. {member['nom_complet']} - {member['fonction']}")
    if len(members) > 3:
        print(f"   ... et {len(members) - 3} autres")
    
    # Confirmer l'import
    response = input(f"\n❓ Importer ces {len(members)} membres? (o/n): ")
    if response.lower() != 'o':
        print("\n🚫 Import annulé")
        sys.exit(0)
    
    # Importer
    success = import_members(members)
    
    if success:
        print("\n🎉 Import terminé avec succès!")
        sys.exit(0)
    else:
        print("\n❌ L'import a échoué")
        sys.exit(1)


if __name__ == '__main__':
    main()
