#!/usr/bin/env python3
"""
Script d'import de l'historique complet des événements (Saisons 1 à 13)
Pour La Bague Impériale
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os

# Connexion MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client["test_database"]

# Historique complet des événements
EVENTS_HISTORY = [
    # SAISON 1 (2013)
    {"date": "2013-04-18", "objet": "Allegria", "lieu": "Allegria", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-05-07", "objet": "Chez Miko", "lieu": "Chez Miko", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-06-24", "objet": "Côté Plage", "lieu": "Côté Plage", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-07-15", "objet": "Bergerie", "lieu": "Bergerie", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-08-19", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-09-19", "objet": "Restaurant", "lieu": "Restaurant", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-10-28", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-11-18", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2013-12-23", "objet": "Bel Messere", "lieu": "Bel Messere", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2014-01-28", "objet": "Rive Sud", "lieu": "Rive Sud", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2014-02-15", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2014-03-15", "objet": "Bistrot d'Emile", "lieu": "Bistrot d'Emile", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    {"date": "2014-04-15", "objet": "Chemin des Vignobles", "lieu": "Chemin des Vignobles", "type_sondage": "repas", "statut": "terminé", "saison": 1},
    
    # SAISON 2 (2014)
    {"date": "2014-05-01", "objet": "San Carlu", "lieu": "San Carlu", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-06-01", "objet": "Casabianca", "lieu": "Casabianca", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-07-01", "objet": "Jean-Jean", "lieu": "Jean-Jean", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-08-01", "objet": "Roc 72", "lieu": "Roc 72", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-09-22", "objet": "Bistrot d'Emile", "lieu": "Bistrot d'Emile", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-09-06", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-10-24", "objet": "Rive Sud", "lieu": "Rive Sud", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-11-03", "objet": "Albert 1er", "lieu": "Albert 1er", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-11-17", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2014-12-01", "objet": "Comptoir Ajaccien", "lieu": "Comptoir Ajaccien", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-01-15", "objet": "Bel Messere", "lieu": "Bel Messere", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-01-19", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-02-02", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-02-16", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-03-02", "objet": "Albert 1er", "lieu": "Albert 1er", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-03-16", "objet": "Palm Beach", "lieu": "Palm Beach", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-03-31", "objet": "Comptoir", "lieu": "Comptoir", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    {"date": "2015-04-25", "objet": "Palais des congrès", "lieu": "Palais des congrès", "type_sondage": "repas", "statut": "terminé", "saison": 2},
    
    # SAISON 3 (2015)
    {"date": "2015-05-01", "objet": "Restaurant 1 Mai", "lieu": "Restaurant 1 Mai", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-06-14", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-06-29", "objet": "Vela Blanca", "lieu": "Vela Blanca", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-08-05", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-09-01", "objet": "Bistrot d'Emile", "lieu": "Bistrot d'Emile", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-10-30", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-11-19", "objet": "Rive Sud", "lieu": "Rive Sud", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-11-02", "objet": "Albert 1er", "lieu": "Albert 1er", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-11-18", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2015-11-30", "objet": "A conca", "lieu": "A conca", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2016-01-14", "objet": "L'epic", "lieu": "L'epic", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2016-02-22", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    {"date": "2016-04-25", "objet": "Palais des congrès", "lieu": "Palais des congrès", "type_sondage": "repas", "statut": "terminé", "saison": 3},
    
    # SAISON 4 (2016)
    {"date": "2016-05-09", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-05-23", "objet": "Dolce Vita", "lieu": "Dolce Vita", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-06-13", "objet": "A Vela", "lieu": "A Vela", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-06-27", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-07-27", "objet": "Chez Pech", "lieu": "Chez Pech", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-08-24", "objet": "Vela Blanca", "lieu": "Vela Blanca", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-09-21", "objet": "Bistrot D'Emile", "lieu": "Bistrot D'Emile", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-09-05", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-10-19", "objet": "Auberge Ajaccienne", "lieu": "Auberge Ajaccienne", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-11-16", "objet": "Rive sud", "lieu": "Rive sud", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-11-30", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2016-12-19", "objet": "Saint Georges", "lieu": "Saint Georges", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2017-01-18", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2017-02-01", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2017-02-22", "objet": "Côté Plage", "lieu": "Côté Plage", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2017-03-15", "objet": "Albert 1er", "lieu": "Albert 1er", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    {"date": "2017-04-22", "objet": "A Pignata", "lieu": "A Pignata", "type_sondage": "repas", "statut": "terminé", "saison": 4},
    
    # SAISON 5 (2017)
    {"date": "2017-06-03", "objet": "Vela Bianca", "lieu": "Vela Bianca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-06-12", "objet": "Auberge Ajaccienne", "lieu": "Auberge Ajaccienne", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-07-28", "objet": "Poseidon", "lieu": "Poseidon", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-08-26", "objet": "Bistrot Bonaparte", "lieu": "Bistrot Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-09-18", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-10-06", "objet": "Le Directoire", "lieu": "Le Directoire", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-10-16", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-10-30", "objet": "Auberge Ajaccienne", "lieu": "Auberge Ajaccienne", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-11-20", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-11-19", "objet": "Bistrot Bonaparte", "lieu": "Bistrot Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2017-12-04", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-01-22", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-02-05", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-03-16", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-04-09", "objet": "Beym", "lieu": "Beym", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-04-19", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-04-09", "objet": "La Grande Brasserie", "lieu": "La Grande Brasserie", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-04-14", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    {"date": "2018-05-28", "objet": "Chez Miko", "lieu": "Chez Miko", "type_sondage": "repas", "statut": "terminé", "saison": 5},
    
    # SAISON 6 (2018)
    {"date": "2018-06-25", "objet": "A Vela Bianca", "lieu": "A Vela Bianca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-07-23", "objet": "Côté Plage", "lieu": "Côté Plage", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-08-20", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-09-10", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-09-24", "objet": "Directoire", "lieu": "Directoire", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-10-08", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-10-22", "objet": "L'Escala", "lieu": "L'Escala", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-11-17", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-11-26", "objet": "Bistrot Bonaparte", "lieu": "Bistrot Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2018-12-17", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-01-07", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-02-20", "objet": "Roi de Rome", "lieu": "Roi de Rome", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-02-04", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-03-04", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-03-18", "objet": "Le Petit Restaurant", "lieu": "Le Petit Restaurant", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-04-15", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    {"date": "2019-04-27", "objet": "Capo", "lieu": "Capo", "type_sondage": "repas", "statut": "terminé", "saison": 6},
    
    # SAISON 7 (2019)
    {"date": "2019-05-13", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-04-27", "objet": "La Closerie", "lieu": "La Closerie", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-06-26", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-07-25", "objet": "Pech", "lieu": "Pech", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-08-25", "objet": "Basseta", "lieu": "Basseta", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-09-09", "objet": "Bistrot Bonaparte", "lieu": "Bistrot Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-09-23", "objet": "A Calata", "lieu": "A Calata", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-10-14", "objet": "Baronu", "lieu": "Baronu", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-11-04", "objet": "Bistrot Bonaparte", "lieu": "Bistrot Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-05-18", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2019-12-16", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2020-01-13", "objet": "Le Directoire", "lieu": "Le Directoire", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2020-01-27", "objet": "U Baronu", "lieu": "U Baronu", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2020-02-10", "objet": "Patio d'AM", "lieu": "Patio d'AM", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    {"date": "2020-02-24", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 7},
    
    # SAISON 8 (2020)
    {"date": "2020-08-03", "objet": "Moorea", "lieu": "Moorea", "type_sondage": "repas", "statut": "terminé", "saison": 8},
    {"date": "2020-09-07", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 8},
    {"date": "2020-09-21", "objet": "U Baronu", "lieu": "U Baronu", "type_sondage": "repas", "statut": "terminé", "saison": 8},
    {"date": "2020-10-05", "objet": "La Closerie", "lieu": "La Closerie", "type_sondage": "repas", "statut": "terminé", "saison": 8},
    {"date": "2020-10-19", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 8},
    {"date": "2020-11-24", "objet": "Basseta", "lieu": "Basseta", "type_sondage": "repas", "statut": "terminé", "saison": 8},
    
    # SAISON 9 (2021)
    {"date": "2021-08-09", "objet": "Goéland", "lieu": "Goéland", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2021-09-13", "objet": "U Baronu", "lieu": "U Baronu", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2021-09-14", "objet": "L'Escale", "lieu": "L'Escale", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2021-09-18", "objet": "U Baronu", "lieu": "U Baronu", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2021-11-08", "objet": "La Closerie", "lieu": "La Closerie", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2021-04-22", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2021-12-27", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-01-24", "objet": "Directoire", "lieu": "Directoire", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-02-21", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-03-07", "objet": "La Closerie", "lieu": "La Closerie", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-03-28", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-03-11", "objet": "Rive Sud", "lieu": "Rive Sud", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-04-25", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    {"date": "2022-05-01", "objet": "DOLCE VITA", "lieu": "DOLCE VITA", "type_sondage": "repas", "statut": "terminé", "saison": 9},
    
    # SAISON 10 (2022)
    {"date": "2022-06-27", "objet": "Bistrot Bonaparte", "lieu": "Bistrot Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-07-25", "objet": "Auberge Du Prunelli", "lieu": "Auberge Du Prunelli", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-08-23", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-09-19", "objet": "L'Alba", "lieu": "L'Alba", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-10-06", "objet": "A Calata", "lieu": "A Calata", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-10-24", "objet": "Escale", "lieu": "Escale", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-11-07", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-11-21", "objet": "La Closerie", "lieu": "La Closerie", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2022-12-01", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2023-01-23", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2023-01-06", "objet": "Bistro Bonaparte", "lieu": "Bistro Bonaparte", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2023-02-27", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2023-03-20", "objet": "Chez Mani", "lieu": "Chez Mani", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    {"date": "2023-04-22", "objet": "PALAIS DES CONGRÈS", "lieu": "PALAIS DES CONGRÈS", "type_sondage": "repas", "statut": "terminé", "saison": 10},
    
    # SAISON 11 (2023)
    {"date": "2023-05-20", "objet": "Rendez Vous", "lieu": "Rendez Vous", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-06-12", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-06-26", "objet": "Goëland", "lieu": "Goëland", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-07-25", "objet": "Jean Jean", "lieu": "Jean Jean", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-08-31", "objet": "L'Auberge du Prunelli", "lieu": "L'Auberge du Prunelli", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-09-04", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-09-18", "objet": "Les Halles", "lieu": "Les Halles", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-10-02", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-10-16", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-10-30", "objet": "Directoire", "lieu": "Directoire", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-11-12", "objet": "Closerie", "lieu": "Closerie", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2023-12-18", "objet": "St Georges", "lieu": "St Georges", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2024-01-08", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2024-01-22", "objet": "La Grande Brasserie", "lieu": "La Grande Brasserie", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2024-02-05", "objet": "A Conca", "lieu": "A Conca", "type_sondage": "repas", "statut": "terminé", "saison": 11},
    {"date": "2024-02-19", "objet": "L'Orangerie", "lieu": "L'Orangerie", "type_sondage": "repas", "statut