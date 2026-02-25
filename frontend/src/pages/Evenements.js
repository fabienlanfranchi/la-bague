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
  Clock,
  Edit3,
  Save
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
  
  // État pour l'édition
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    lieu: '',
    date: '',
    type_sondage: 'repas',
    total_presents: 0
  });

  // État pour ajout d'événement dans une saison
  const [addingToSeason, setAddingToSeason] = useState(null);
  const [newEventForm, setNewEventForm] = useState({
    lieu: '',
    date: '',
    type_sondage: 'repas',
    total_presents: 0
  });

  // Formulaire de création (événement à venir)
  const [newEvent, setNewEvent] = useState({
    date: '',
    objet_type: 'repas',
    objet_texte: '',
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
      if (!newEvent.date || !newEvent.lieu) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      let objet = '';
      if (newEvent.objet_type === 'autre') {
        if (!newEvent.objet_texte) {
          toast.error('Veuillez renseigner un objet');
          return;
        }
        objet = newEvent.objet_texte;
      } else {
        objet = newEvent.objet_type.charAt(0).toUpperCase() + newEvent.objet_type.slice(1);
      }

      const type_sondage = newEvent.objet_type === 'repas' ? 'repas' : 'simple';

      const eventData = {
        date: new Date(newEvent.date).toISOString(),
        objet: objet,
        lieu: newEvent.lieu,
        type_sondage: type_sondage,
        statut: newEvent.statut,
        saison: newEvent.saison,
        options_sondage: type_sondage === 'repas' ? newEvent.options_sondage : null
      };

      await axios.post(`${API}/evenements`, eventData);
      toast.success('Événement créé avec succès');
      
      setShowCreateModal(false);
      setNewEvent({
        date: '',
        objet_type: 'repas',
        objet_texte: '',
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

  const handleDeleteEvent = async (eventId, e) => {
    if (e) e.stopPropagation();
    
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

  // ÉDITION D'UN ÉVÉNEMENT
  const startEditing = (evt, e) => {
    if (e) e.stopPropagation();
    setEditingEvent(evt.id);
    
    // Convertir la date pour l'input
    const dateObj = new Date(evt.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    
    setEditForm({
      lieu: evt.lieu || '',
      date: dateStr,
      type_sondage: evt.type_sondage || 'repas',
      total_presents: evt.total_presents || 0
    });
  };

  const cancelEditing = (e) => {
    if (e) e.stopPropagation();
    setEditingEvent(null);
    setEditForm({
      lieu: '',
      date: '',
      type_sondage: 'repas',
      total_presents: 0
    });
  };

  const saveEdit = async (eventId, e) => {
    if (e) e.stopPropagation();
    
    try {
      // Construire la date avec heure midi pour éviter les problèmes de timezone
      const dateWithTime = new Date(editForm.date + 'T12:00:00');
      
      await axios.put(`${API}/evenements/${eventId}`, {
        lieu: editForm.lieu,
        date: dateWithTime.toISOString(),
        type_sondage: editForm.type_sondage,
        total_presents: parseInt(editForm.total_presents) || 0
      });
      
      toast.success('Événement modifié');
      setEditingEvent(null);
      loadEvenements();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  // AJOUT D'UN ÉVÉNEMENT DANS UNE SAISON
  const startAddingToSeason = (saisonNum, e) => {
    if (e) e.stopPropagation();
    setAddingToSeason(saisonNum);
    setNewEventForm({
      lieu: '',
      date: '',
      type_sondage: 'repas',
      total_presents: 0
    });
  };

  const cancelAdding = (e) => {
    if (e) e.stopPropagation();
    setAddingToSeason(null);
  };

  const saveNewEvent = async (saisonNum, e) => {
    if (e) e.stopPropagation();
    
    if (!newEventForm.lieu || !newEventForm.date) {
      toast.error('Veuillez remplir le lieu et la date');
      return;
    }

    try {
      const dateWithTime = new Date(newEventForm.date + 'T12:00:00');
      
      await axios.post(`${API}/evenements/simple`, {
        lieu: newEventForm.lieu,
        date: dateWithTime.toISOString(),
        type_sondage: newEventForm.type_sondage,
        total_presents: parseInt(newEventForm.total_presents) || 0,
        saison: saisonNum
      });
      
      toast.success('Événement ajouté');
      setAddingToSeason(null);
      loadEvenements();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast.error('Erreur lors de l\'ajout');
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
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Grouper les événements par saison et trier par date
  const evenementsParSaison = evenements.reduce((acc, evt) => {
    const saison = evt.saison || 13;
    if (!acc[saison]) acc[saison] = [];
    acc[saison].push(evt);
    return acc;
  }, {});

  // Trier chaque saison par date (du premier au dernier de l'année)
  Object.keys(evenementsParSaison).forEach(saison => {
    evenementsParSaison[saison].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  // Trouver le prochain événement (statut "à venir")
  const now = new Date();
  const prochainEvenement = evenements
    .filter(e => e.statut === 'à venir' && new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  // Événements historiques (terminés)
  const evenementsHistorique = evenements.filter(e => e.statut === 'terminé');

  // Badge de type avec couleur
  const getTypeBadge = (type) => {
    const styles = {
      'repas': 'bg-gray-700 text-gray-200',
      'apero': 'bg-blue-700 text-blue-200',
      'anniversaire': 'bg-red-700 text-red-200'
    };
    const labels = {
      'repas': 'Repas',
      'apero': 'Apéro',
      'anniversaire': 'Anniversaire'
    };
    return (
      <Badge className={styles[type] || 'bg-gray-600 text-gray-200'}>
        {labels[type] || type}
      </Badge>
    );
  };

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
            data-testid="create-event-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer un événement
          </Button>
        </div>

        {prochainEvenement ? (
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
                  <Button className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif">
                    <Users className="w-4 h-4 mr-2" />
                    Voir les réponses
                  </Button>
                  <Button
                    onClick={(e) => handleDeleteEvent(prochainEvenement.id, e)}
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

      {/* SECTION 2: HISTORIQUE SAISONS (ACCORDÉON) */}
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
                {[...Array(13)].map((_, i) => {
                  const saisonNum = 13 - i; // De 13 à 1
                  const evts = evenementsParSaison[saisonNum] || [];
                  const evtsTermines = evts.filter(e => e.statut === 'terminé');

                  return (
                    <div key={saisonNum} data-testid={`season-${saisonNum}`}>
                      {/* En-tête de la saison */}
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
                          {evtsTermines.length} événement{evtsTermines.length > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Contenu de la saison */}
                      {expandedSeasons[saisonNum] && (
                        <div className="ml-4 mt-3 space-y-2">
                          {/* Liste des événements */}
                          {evtsTermines.map((evt, idx) => (
                            <div 
                              key={evt.id}
                              className="bg-black/20 border border-[#D4A024]/10 rounded hover:border-[#D4A024]/30 transition-all"
                              data-testid={`event-${evt.id}`}
                            >
                              {editingEvent === evt.id ? (
                                /* MODE ÉDITION */
                                <div className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {/* Lieu */}
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Lieu</label>
                                      <input
                                        type="text"
                                        value={editForm.lieu}
                                        onChange={(e) => setEditForm({...editForm, lieu: e.target.value})}
                                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                        data-testid={`edit-lieu-${evt.id}`}
                                      />
                                    </div>
                                    {/* Date */}
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Date (jj/mm/aa)</label>
                                      <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                        data-testid={`edit-date-${evt.id}`}
                                      />
                                    </div>
                                    {/* Type */}
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Type</label>
                                      <select
                                        value={editForm.type_sondage}
                                        onChange={(e) => setEditForm({...editForm, type_sondage: e.target.value})}
                                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                        data-testid={`edit-type-${evt.id}`}
                                      >
                                        <option value="repas">Repas</option>
                                        <option value="apero">Apéro</option>
                                        <option value="anniversaire">Anniversaire</option>
                                      </select>
                                    </div>
                                    {/* Nombre de présences */}
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Présences</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={editForm.total_presents}
                                        onChange={(e) => setEditForm({...editForm, total_presents: e.target.value})}
                                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                        data-testid={`edit-presents-${evt.id}`}
                                      />
                                    </div>
                                  </div>
                                  {/* Boutons */}
                                  <div className="flex space-x-2 pt-2">
                                    <Button
                                      onClick={(e) => saveEdit(evt.id, e)}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      data-testid={`save-edit-${evt.id}`}
                                    >
                                      <Save className="w-4 h-4 mr-1" />
                                      Enregistrer
                                    </Button>
                                    <Button
                                      onClick={cancelEditing}
                                      size="sm"
                                      variant="outline"
                                      className="border-gray-500 text-gray-300 hover:bg-gray-800"
                                    >
                                      Annuler
                                    </Button>
                                    <Button
                                      onClick={(e) => handleDeleteEvent(evt.id, e)}
                                      size="sm"
                                      variant="outline"
                                      className="border-red-600 text-red-400 hover:bg-red-900/20 ml-auto"
                                      data-testid={`delete-event-${evt.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* MODE AFFICHAGE */
                                <div className="flex items-center justify-between p-3">
                                  <div className="flex items-center space-x-4 flex-1">
                                    {/* Numéro */}
                                    <span className="text-gray-500 text-sm w-6">#{idx + 1}</span>
                                    {/* Lieu */}
                                    <h4 className="text-white font-serif font-semibold min-w-[150px]">
                                      {evt.lieu}
                                    </h4>
                                    {/* Date */}
                                    <span className="text-gray-400 text-sm min-w-[80px]">
                                      {formatDateShort(evt.date)}
                                    </span>
                                    {/* Type */}
                                    {getTypeBadge(evt.type_sondage)}
                                  </div>
                                  
                                  {/* Nombre de présents (cliquable) */}
                                  <div 
                                    className="flex items-center space-x-2 bg-[#D4A024]/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-[#D4A024]/30 transition-all"
                                    onClick={(e) => startEditing(evt, e)}
                                    title="Cliquer pour modifier"
                                    data-testid={`presents-count-${evt.id}`}
                                  >
                                    <Users className="w-5 h-5 text-[#D4A024]" />
                                    <span className="text-[#D4A024] font-bold text-xl">
                                      {evt.total_presents || 0}
                                    </span>
                                    <Edit3 className="w-4 h-4 text-[#D4A024]/60" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* FORMULAIRE AJOUT D'ÉVÉNEMENT */}
                          {addingToSeason === saisonNum ? (
                            <div 
                              className="bg-[#D4A024]/10 border-2 border-dashed border-[#D4A024]/50 rounded p-4 space-y-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <h5 className="text-[#D4A024] font-serif font-semibold">Nouvel événement</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Lieu */}
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Lieu *</label>
                                  <input
                                    type="text"
                                    value={newEventForm.lieu}
                                    onChange={(e) => setNewEventForm({...newEventForm, lieu: e.target.value})}
                                    placeholder="Ex: Le Cigare Volant"
                                    className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                    data-testid={`new-event-lieu-${saisonNum}`}
                                  />
                                </div>
                                {/* Date */}
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Date *</label>
                                  <input
                                    type="date"
                                    value={newEventForm.date}
                                    onChange={(e) => setNewEventForm({...newEventForm, date: e.target.value})}
                                    className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                    data-testid={`new-event-date-${saisonNum}`}
                                  />
                                </div>
                                {/* Type */}
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                                  <select
                                    value={newEventForm.type_sondage}
                                    onChange={(e) => setNewEventForm({...newEventForm, type_sondage: e.target.value})}
                                    className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                    data-testid={`new-event-type-${saisonNum}`}
                                  >
                                    <option value="repas">Repas</option>
                                    <option value="apero">Apéro</option>
                                    <option value="anniversaire">Anniversaire</option>
                                  </select>
                                </div>
                                {/* Nombre */}
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Présences</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={newEventForm.total_presents}
                                    onChange={(e) => setNewEventForm({...newEventForm, total_presents: e.target.value})}
                                    className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                                    data-testid={`new-event-presents-${saisonNum}`}
                                  />
                                </div>
                              </div>
                              {/* Boutons */}
                              <div className="flex space-x-2 pt-2">
                                <Button
                                  onClick={(e) => saveNewEvent(saisonNum, e)}
                                  size="sm"
                                  className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]"
                                  data-testid={`save-new-event-${saisonNum}`}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Ajouter
                                </Button>
                                <Button
                                  onClick={cancelAdding}
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-500 text-gray-300 hover:bg-gray-800"
                                >
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* BOUTON AJOUTER */
                            <Button
                              onClick={(e) => startAddingToSeason(saisonNum, e)}
                              variant="outline"
                              className="w-full border-dashed border-[#D4A024]/30 text-[#D4A024]/60 hover:text-[#D4A024] hover:border-[#D4A024]/50 hover:bg-[#D4A024]/5"
                              data-testid={`add-event-to-season-${saisonNum}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter un événement à la Saison {saisonNum}
                            </Button>
                          )}
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

      {/* Modal: Créer un événement (à venir) */}
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
                  data-testid="create-event-date"
                />
              </div>

              {/* Objet */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objet *</label>
                <select
                  value={newEvent.objet_type}
                  onChange={(e) => setNewEvent({ ...newEvent, objet_type: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  data-testid="create-event-type"
                >
                  <option value="repas">Repas</option>
                  <option value="apéro">Apéro</option>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="autre">Autre (texte libre)</option>
                </select>
              </div>

              {newEvent.objet_type === 'autre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Précisez l'objet *</label>
                  <input
                    type="text"
                    value={newEvent.objet_texte}
                    onChange={(e) => setNewEvent({ ...newEvent, objet_texte: e.target.value })}
                    placeholder="Ex: Sortie cigare, Dégustation..."
                    className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  />
                </div>
              )}

              {/* Lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lieu *</label>
                <input
                  type="text"
                  value={newEvent.lieu}
                  onChange={(e) => setNewEvent({ ...newEvent, lieu: e.target.value })}
                  placeholder="Ex: Restaurant Le Club"
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  data-testid="create-event-lieu"
                />
              </div>

              {/* Saison */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Saison</label>
                <select
                  value={newEvent.saison}
                  onChange={(e) => setNewEvent({ ...newEvent, saison: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  data-testid="create-event-saison"
                >
                  {[...Array(13)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Saison {i + 1} ({2012 + i + 1}-{2013 + i + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de sondage info */}
              <div className="bg-black/20 p-3 rounded border border-[#D4A024]/20">
                <p className="text-sm text-gray-400">
                  💡 Type de sondage : 
                  {newEvent.objet_type === 'repas' ? (
                    <span className="text-[#D4A024] ml-2">Complet (Présence + Choix des plats)</span>
                  ) : (
                    <span className="text-blue-400 ml-2">Simple (Présence oui/non uniquement)</span>
                  )}
                </p>
              </div>

              {/* Options pour Repas */}
              {newEvent.objet_type === 'repas' && (
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
            </CardContent>
            
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 flex space-x-3">
              <Button
                onClick={handleCreateEvent}
                type="button"
                className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
                data-testid="submit-create-event"
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
