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
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Evenements = () => {
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState({});

  // Formulaire de création
  const [newEvent, setNewEvent] = useState({
    date: '',
    objet: '',
    lieu: '',
    type_sondage: 'repas',
    saison: 13,
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
    const nextLetter = String.fromCharCode(65 + currentList.length); // A, B, C, etc.
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

  // Grouper les événements par saison
  const evenementsParSaison = evenements.reduce((acc, evt) => {
    const saison = evt.saison || 13;
    if (!acc[saison]) acc[saison] = [];
    acc[saison].push(evt);
    return acc;
  }, {});

  // Séparer les événements passés et futurs
  const now = new Date();
  const evenementsFuturs = evenements.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const evenementsPassés = evenements.filter(e => new Date(e.date) < now);

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

      {/* SECTION 1: HISTORIQUE PAR SAISON */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4">
          📚 Historique des événements
        </h2>
        
        <div className="space-y-3">
          {[...Array(13)].map((_, i) => {
            const saisonNum = 13 - i; // De 13 à 1
            const evts = evenementsParSaison[saisonNum] || [];
            const evtsPassés = evts.filter(e => new Date(e.date) < now);
            
            if (evtsPassés.length === 0) return null;

            return (
              <Card key={saisonNum} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader 
                  className="cursor-pointer hover:bg-[#D4A024]/10 transition-all"
                  onClick={() => toggleSeason(saisonNum)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                      {expandedSeasons[saisonNum] ? <ChevronDown className="w-5 h-5 mr-2" /> : <ChevronRight className="w-5 h-5 mr-2" />}
                      Saison {saisonNum} ({2012 + saisonNum}-{2013 + saisonNum})
                    </CardTitle>
                    <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024]">
                      {evtsPassés.length} événement(s)
                    </Badge>
                  </div>
                </CardHeader>
                
                {expandedSeasons[saisonNum] && (
                  <CardContent>
                    <div className="space-y-3">
                      {evtsPassés.map(evt => (
                        <div 
                          key={evt.id}
                          className="bg-black/30 border border-[#D4A024]/20 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-white font-serif font-semibold text-lg mb-2">
                                {evt.objet}
                              </h3>
                              <div className="space-y-1 text-sm text-gray-300">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2 text-[#D4A024]" />
                                  {formatDate(evt.date)}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-2 text-[#D4A024]" />
                                  {evt.lieu}
                                </div>
                                <Badge className="mt-2">
                                  {evt.type_sondage}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CRÉER UN ÉVÉNEMENT */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold text-lg px-8 py-6"
        >
          <Plus className="w-6 h-6 mr-2" />
          Créer un événement
        </Button>
      </div>

      {/* SECTION 3: ÉVÉNEMENTS À VENIR */}
      {evenementsFuturs.length > 0 && (
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-4">
            📅 Événements à venir
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evenementsFuturs.map(evt => (
              <Card key={evt.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif text-white flex items-center justify-between">
                    <span>{evt.objet}</span>
                    <Badge className={
                      evt.statut === 'en cours' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 text-white'
                    }>
                      {evt.statut}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-[#D4A024]" />
                      {formatDate(evt.date)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-[#D4A024]" />
                      {evt.lieu}
                    </div>
                    <Badge className="mt-2">
                      Sondage: {evt.type_sondage}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="mt-4 text-red-400 hover:text-red-300 w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Créer un événement */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full my-8">
            <CardHeader className="border-b border-[#D4A024]/30">
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
            
            <CardContent className="space-y-4 py-6">
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Entrées
                    </label>
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
                      className="bg-[#D4A024]/20 hover:bg-[#D4A024]/30 text-[#D4A024]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter entrée
                    </Button>
                  </div>

                  {/* Plats */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Plats
                    </label>
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
                      className="bg-[#D4A024]/20 hover:bg-[#D4A024]/30 text-[#D4A024]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter plat
                    </Button>
                  </div>

                  {/* Desserts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Desserts
                    </label>
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
                      className="bg-[#D4A024]/20 hover:bg-[#D4A024]/30 text-[#D4A024]"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter dessert
                    </Button>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleCreateEvent}
                  className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
                >
                  Créer l'événement
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Evenements;
