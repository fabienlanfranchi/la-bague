import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Evenements = () => {
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState({});

  // Formulaire de création
  const [newEvent, setNewEvent] = useState({
    date: '',
    objet: '',
    lieu: '',
    type_sondage: 'repas',
    saison: 13,
    statut: 'à venir',
    options_sondage: {
      entrees: ['Entrée A', 'Entrée B'],
      plats: ['Plat A', 'Plat B'],
      desserts: ['Dessert A', 'Dessert B']
    }
  });

  useEffect(() => {
    loadEvenements();
  }, []);

  const loadEvenements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/evenements`);
      setEvenements(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      if (!newEvent.date || !newEvent.objet || !newEvent.lieu) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const eventData = {
        ...newEvent,
        date: new Date(newEvent.date).toISOString(),
        options_sondage: newEvent.type_sondage === 'repas' ? newEvent.options_sondage : null
      };

      await axios.post(`${API}/evenements`, eventData);
      toast.success('Événement créé avec succès');
      
      setShowCreateModal(false);
      setNewEvent({
        date: '',
        objet: '',
        lieu: '',
        type_sondage: 'repas',
        saison: 13,
        statut: 'à venir',
        options_sondage: {
          entrees: ['Entrée A', 'Entrée B'],
          plats: ['Plat A', 'Plat B'],
          desserts: ['Dessert A', 'Dessert B']
        }
      });
      
      loadEvenements();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de l\'événement');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }

    try {
      await axios.delete(`${API}/evenements/${eventId}`);
      toast.success('Événement supprimé');
      loadEvenements();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleSeason = (saison) => {
    setExpandedSeasons(prev => ({
      ...prev,
      [saison]: !prev[saison]
    }));
  };

  const addOption = (type) => {
    const newOptions = { ...newEvent.options_sondage };
    const currentList = newOptions[type] || [];
    const nextLetter = String.fromCharCode(65 + currentList.length);
    newOptions[type] = [...currentList, `${type.slice(0, -1)} ${nextLetter}`];
    setNewEvent({ ...newEvent, options_sondage: newOptions });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Grouper les événements par saison
  const evenementsParSaison = evenements.reduce((acc, evt) => {
    const saison = evt.saison || 13;
    if (!acc[saison]) acc[saison] = [];
    acc[saison].push(evt);
    return acc;
  }, {});

  // Trouver le prochain événement (statut "à venir")
  const now = new Date();
  const prochainEvenement = evenements
    .filter(e => e.statut === 'à venir' && new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  // Événements historiques (terminés)
  const evenementsHistorique = evenements.filter(e => e.statut === 'terminé');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#D4A024] text-xl font-serif">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Événements
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Gestion des événements et sondages du club
        </p>
      </div>

      {/* SECTION 1: PROCHAIN ÉVÉNEMENT (GRAND FORMAT) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif font-bold text-white">
            📅 Prochain événement
          </h2>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer un événement
          </Button>
        </div>

        {prochainEvenement ? (
          /* Événement existant */
          <Card className="bg-black/40 border-2 border-[#D4A024] backdrop-blur-sm">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-serif text-[#D4A024] mb-2">
                    {prochainEvenement.objet}
                  </CardTitle>
                  <div className="flex items-center space-x-6 text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-[#D4A024]" />
                      <span className="text-lg">{formatDate(prochainEvenement.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-[#D4A024]" />
                      <span className="text-lg font-semibold">{prochainEvenement.lieu}</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                  À venir
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-[#D4A024] font-serif font-semibold mb-2">Type de sondage :</h3>
                  <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024] text-base px-3 py-1">
                    {prochainEvenement.type_sondage}
                  </Badge>
                </div>

                {prochainEvenement.type_sondage === 'repas' && prochainEvenement.options_sondage && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <h4 className="text-white font-semibold mb-2">🥗 Entrées</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        {prochainEvenement.options_sondage.entrees?.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">🍖 Plats</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        {prochainEvenement.options_sondage.plats?.map((p, i) => (
                          <li key={i}>• {p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">🍰 Desserts</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        {prochainEvenement.options_sondage.desserts?.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t border-[#D4A024]/20">
                  <Button
                    className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Voir les réponses
                  </Button>
                  <Button
                    onClick={() => handleDeleteEvent(prochainEvenement.id)}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Carcasse vide */
          <Card className="bg-black/40 border-2 border-[#D4A024]/50 backdrop-blur-sm border-dashed">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 text-[#D4A024]/30 mx-auto mb-4" />
              <h3 className="text-2xl font-serif text-gray-400 mb-2">
                Aucun événement à venir
              </h3>
              <p className="text-gray-500 mb-6">
                Créez un nouvel événement pour planifier le prochain repas du club
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer le prochain événement
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SECTION 2: HISTORIQUE SAISONS (ACCORDÉON UNIQUE) */}
      <div>
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-[#D4A024]/10 transition-all"
            onClick={() => setShowHistorique(!showHistorique)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-serif text-[#D4A024] flex items-center">
                {showHistorique ? <ChevronDown className="w-6 h-6 mr-2" /> : <ChevronRight className="w-6 h-6 mr-2" />}
                📚 Historique Saisons
              </CardTitle>
              <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024]">
                {evenementsHistorique.length} événements
              </Badge>
            </div>
          </CardHeader>
          
          {showHistorique && (
            <CardContent className="pt-4">
              <div className="space-y-4">
                {[...Array(12)].map((_, i) => {
                  const saisonNum = 12 - i; // De 12 à 1
                  const evts = evenementsParSaison[saisonNum] || [];
                  const evtsTermines = evts.filter(e => e.statut === 'terminé').slice(0, 20); // Max 20
                  
                  if (evtsTermines.length === 0) return null;

                  return (
                    <div key={saisonNum}>
                      <div
                        className="flex items-center justify-between p-3 bg-black/30 rounded-lg cursor-pointer hover:bg-[#D4A024]/10"
                        onClick={() => toggleSeason(saisonNum)}
                      >
                        <div className="flex items-center">
                          {expandedSeasons[saisonNum] ? 
                            <ChevronDown className="w-5 h-5 mr-2 text-[#D4A024]" /> : 
                            <ChevronRight className="w-5 h-5 mr-2 text-[#D4A024]" />
                          }
                          <span className="text-white font-serif font-semibold">
                            Saison {saisonNum} ({2012 + saisonNum}-{2013 + saisonNum})
                          </span>
                        </div>
                        <Badge className="bg-[#7A2020]/50 text-[#D4A024]">
                          {evtsTermines.length}
                        </Badge>
                      </div>

                      {expandedSeasons[saisonNum] && (
                        <div className="ml-8 mt-3 space-y-2">
                          {evtsTermines.map(evt => (
                            <div 
                              key={evt.id}
                              className="bg-black/20 border border-[#D4A024]/10 rounded hover:border-[#D4A024]/30 transition-all"
                            >
                              <div className="flex items-center justify-between p-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-white font-serif font-semibold text-lg">
                                      {evt.lieu}
                                    </h4>
                                    <Badge className={
                                      evt.type_sondage === 'repas' 
                                        ? 'bg-gray-700 text-gray-200' 
                                        : 'bg-blue-700 text-blue-200'
                                    }>
                                      {evt.type_sondage}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <p className="text-sm text-gray-400">
                                      {formatDateShort(evt.date)}
                                    </p>
                                    {evt.total_presents && (
                                      <p className="text-sm text-[#D4A024] font-semibold flex items-center">
                                        <Users className="w-3 h-3 mr-1" />
                                        {evt.total_presents} présents
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              {/* Liste des présents (si disponible) */}
                              {evt.presents && evt.presents.length > 0 && (
                                <div className="px-3 pb-3 pt-0">
                                  <div className="bg-black/30 rounded p-2 border-t border-[#D4A024]/10">
                                    <p className="text-xs text-gray-400 mb-1">Membres présents :</p>
                                    <div className="flex flex-wrap gap-1">
                                      {evt.presents.map((nom, i) => (
                                        <span 
                                          key={i}
                                          className="text-xs bg-[#D4A024]/10 text-[#D4A024] px-2 py-0.5 rounded"
                                        >
                                          {nom}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Modal: Créer un événement */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-serif text-[#D4A024]">
                  Créer un événement
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 py-6 overflow-y-auto flex-1">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                <input
                  type="datetime-local"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                />
              </div>

              {/* Objet */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objet *</label>
                <input
                  type="text"
                  value={newEvent.objet}
                  onChange={(e) => setNewEvent({ ...newEvent, objet: e.target.value })}
                  placeholder="Ex: Repas de printemps"
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                />
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lieu *</label>
                <input
                  type="text"
                  value={newEvent.lieu}
                  onChange={(e) => setNewEvent({ ...newEvent, lieu: e.target.value })}
                  placeholder="Ex: Restaurant Le Club"
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                />
              </div>

              {/* Saison */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Saison</label>
                <select
                  value={newEvent.saison}
                  onChange={(e) => setNewEvent({ ...newEvent, saison: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  {[...Array(13)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Saison {i + 1} ({2012 + i + 1}-{2013 + i + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de sondage */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type de sondage *</label>
                <select
                  value={newEvent.type_sondage}
                  onChange={(e) => setNewEvent({ ...newEvent, type_sondage: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  <option value="repas">Repas</option>
                  <option value="apéro">Apéro</option>
                  <option value="libre">Libre</option>
                </select>
              </div>

              {/* Options pour Repas */}
              {newEvent.type_sondage === 'repas' && (
                <div className="space-y-4 bg-black/30 p-4 rounded-lg border border-[#D4A024]/20">
                  <h3 className="text-[#D4A024] font-serif font-semibold">Options du repas</h3>
                  
                  {/* Entrées */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entrées</label>
                    {newEvent.options_sondage.entrees.map((entree, i) => (
                      <input
                        key={i}
                        type="text"
                        value={entree}
                        onChange={(e) => {
                          const newEntrees = [...newEvent.options_sondage.entrees];
                          newEntrees[i] = e.target.value;
                          setNewEvent({
                            ...newEvent,
                            options_sondage: { ...newEvent.options_sondage, entrees: newEntrees }
                          });
                        }}
                        className="w-full px-3 py-2 mb-2 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      />
                    ))}
                    <Button
                      onClick={() => addOption('entrees')}
                      size="sm"
                      type="button"
                      className="bg-[#D4A024]/20 hover:bg-[#D4A024]/30 text-[#D4A024]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter entrée
                    </Button>
                  </div>

                  {/* Plats */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Plats</label>
                    {newEvent.options_sondage.plats.map((plat, i) => (
                      <input
                        key={i}
                        type="text"
                        value={plat}
                        onChange={(e) => {
                          const newPlats = [...newEvent.options_sondage.plats];
                          newPlats[i] = e.target.value;
                          setNewEvent({
                            ...newEvent,
                            options_sondage: { ...newEvent.options_sondage, plats: newPlats }
                          });
                        }}
                        className="w-full px-3 py-2 mb-2 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      />
                    ))}
                    <Button
                      onClick={() => addOption('plats')}
                      size="sm"
                      type="button"
                      className="bg-[#D4A024]/20 hover:bg-[#D4A024]/30 text-[#D4A024]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter plat
                    </Button>
                  </div>

                  {/* Desserts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Desserts</label>
                    {newEvent.options_sondage.desserts.map((dessert, i) => (
                      <input
                        key={i}
                        type="text"
                        value={dessert}
                        onChange={(e) => {
                          const newDesserts = [...newEvent.options_sondage.desserts];
                          newDesserts[i] = e.target.value;
                          setNewEvent({
                            ...newEvent,
                            options_sondage: { ...newEvent.options_sondage, desserts: newDesserts }
                          });
                        }}
                        className="w-full px-3 py-2 mb-2 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      />
                    ))}
                    <Button
                      onClick={() => addOption('desserts')}
                      size="sm"
                      type="button"
                      className="bg-[#D4A024]/20 hover:bg-[#D4A024]/30 text-[#D4A024]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter dessert
                    </Button>
                  </div>
                </div>
              )}

              {/* Boutons */}
              
            </CardContent>
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 flex space-x-3">
              <Button
                onClick={handleCreateEvent}
                type="button"
                className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
              >
                Créer l'événement
              </Button>
              <Button
                onClick={() => setShowCreateModal(false)}
                type="button"
                variant="outline"
                className="flex-1 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
              >
                Annuler
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Evenements;
