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
  Save,
  Table,
  List,
  Download,
  Upload
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
  
  // Mode d'affichage : 'list' (accordéon) ou 'table' (tableau)
  const [viewMode, setViewMode] = useState('list');
  const [selectedSeason, setSelectedSeason] = useState(13);
  
  // État pour l'édition en mode tableau
  const [tableEditData, setTableEditData] = useState({});
  
  // État pour afficher la liste des répondants
  const [showRepondantsModal, setShowRepondantsModal] = useState(false);
  const [repondantsData, setRepondantsData] = useState({ evenement: null, reponses: [], membres: [] });
  const [loadingRepondants, setLoadingRepondants] = useState(false);
  
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

  // Charger les réponses d'un événement pour voir qui a répondu quoi
  const loadRepondants = async (evenement) => {
    setLoadingRepondants(true);
    setShowRepondantsModal(true);
    try {
      // Charger les réponses pour cet événement
      const reponsesRes = await axios.get(`${API}/reponses-sondages/${evenement.id}`);
      const reponsesData = reponsesRes.data || {};
      const reponses = reponsesData.reponses || [];
      
      // Charger la liste des membres
      const membresRes = await axios.get(`${API}/members`);
      const membres = membresRes.data || [];
      
      // Associer les noms aux réponses
      const reponsesAvecNoms = reponses.map(r => {
        const membre = membres.find(m => m.id === r.membre_id);
        return {
          ...r,
          nom_complet: membre?.nom_complet || 'Inconnu'
        };
      });
      
      setRepondantsData({
        evenement,
        reponses: reponsesAvecNoms,
        membres
      });
    } catch (error) {
      console.error('Erreur chargement répondants:', error);
      toast.error('Erreur lors du chargement des répondants');
    } finally {
      setLoadingRepondants(false);
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

  // Fonctions pour le mode tableau
  const handleTableCellChange = (eventId, field, value) => {
    setTableEditData(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value,
        modified: true
      }
    }));
  };

  const saveTableRow = async (eventId) => {
    const changes = tableEditData[eventId];
    if (!changes || !changes.modified) return;

    try {
      const updateData = {};
      if (changes.lieu !== undefined) updateData.lieu = changes.lieu;
      if (changes.date !== undefined) {
        const dateWithTime = new Date(changes.date + 'T12:00:00');
        updateData.date = dateWithTime.toISOString();
      }
      if (changes.type_sondage !== undefined) updateData.type_sondage = changes.type_sondage;
      if (changes.total_presents !== undefined) updateData.total_presents = parseInt(changes.total_presents) || 0;

      await axios.put(`${API}/evenements/${eventId}`, updateData);
      
      setTableEditData(prev => ({
        ...prev,
        [eventId]: { ...prev[eventId], modified: false }
      }));
      
      toast.success('Événement modifié');
      loadEvenements();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const saveAllTableChanges = async () => {
    const modifiedEvents = Object.entries(tableEditData).filter(([_, data]) => data.modified);
    
    if (modifiedEvents.length === 0) {
      toast.info('Aucune modification à enregistrer');
      return;
    }

    let successCount = 0;
    for (const [eventId, changes] of modifiedEvents) {
      try {
        const updateData = {};
        if (changes.lieu !== undefined) updateData.lieu = changes.lieu;
        if (changes.date !== undefined) {
          const dateWithTime = new Date(changes.date + 'T12:00:00');
          updateData.date = dateWithTime.toISOString();
        }
        if (changes.type_sondage !== undefined) updateData.type_sondage = changes.type_sondage;
        if (changes.total_presents !== undefined) updateData.total_presents = parseInt(changes.total_presents) || 0;

        await axios.put(`${API}/evenements/${eventId}`, updateData);
        successCount++;
      } catch (error) {
        console.error('Erreur pour', eventId, error);
      }
    }

    setTableEditData({});
    toast.success(`${successCount} événement(s) modifié(s)`);
    loadEvenements();
  };

  const getTableValue = (evt, field) => {
    if (tableEditData[evt.id] && tableEditData[evt.id][field] !== undefined) {
      return tableEditData[evt.id][field];
    }
    if (field === 'date') {
      return new Date(evt.date).toISOString().split('T')[0];
    }
    return evt[field] || '';
  };

  const isRowModified = (eventId) => {
    return tableEditData[eventId]?.modified;
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
                  <Button 
                    onClick={() => loadRepondants(prochainEvenement)}
                    className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                    data-testid="voir-reponses-btn"
                  >
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

      {/* SECTION 2: HISTORIQUE SAISONS (ACCORDÉON / TABLEAU) */}
      <div>
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader className="border-b border-[#D4A024]/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-2xl font-serif text-[#D4A024] flex items-center">
                📚 Historique Saisons
              </CardTitle>
              
              <div className="flex items-center space-x-3">
                {/* Badge nombre total */}
                <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024]">
                  {evenementsHistorique.length} événements
                </Badge>
                
                {/* Toggle Vue */}
                <div className="flex bg-black/40 rounded-lg p-1 border border-[#D4A024]/30">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 ${viewMode === 'list' ? 'bg-[#D4A024] text-[#7A2020]' : 'text-[#D4A024] hover:bg-[#D4A024]/20'}`}
                    data-testid="view-mode-list"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Liste
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1 ${viewMode === 'table' ? 'bg-[#D4A024] text-[#7A2020]' : 'text-[#D4A024] hover:bg-[#D4A024]/20'}`}
                    data-testid="view-mode-table"
                  >
                    <Table className="w-4 h-4 mr-1" />
                    Tableau
                  </Button>
                </div>
              </div>
            </div>

            {/* Sélecteur de saison pour le mode tableau */}
            {viewMode === 'table' && (
              <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
                {/* Titre de la saison bien visible */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {/* Bouton précédent */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSeason(s => Math.max(1, s - 1))}
                      disabled={selectedSeason <= 1}
                      className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </Button>
                    
                    {/* Titre de la saison */}
                    <div className="text-center">
                      <h3 className="text-2xl font-serif font-bold text-[#D4A024]">
                        Saison {selectedSeason}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {2012 + selectedSeason} - {2013 + selectedSeason}
                      </p>
                    </div>
                    
                    {/* Bouton suivant */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSeason(s => Math.min(13, s + 1))}
                      disabled={selectedSeason >= 13}
                      className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Sélecteur rapide de saison */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Aller à :</span>
                    <div className="flex flex-wrap gap-1">
                      {[13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                        <button
                          key={num}
                          onClick={() => setSelectedSeason(num)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                            selectedSeason === num 
                              ? 'bg-[#D4A024] text-[#7A2020]' 
                              : 'bg-black/30 text-[#D4A024]/70 hover:bg-[#D4A024]/20 hover:text-[#D4A024]'
                          }`}
                          data-testid={`season-btn-${num}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Stats de la saison + bouton enregistrer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-400">
                      <span className="text-[#D4A024] font-bold">
                        {(evenementsParSaison[selectedSeason] || []).filter(e => e.statut === 'terminé').length}
                      </span> événement(s)
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">
                      Total présences : <span className="text-[#D4A024] font-bold">
                        {(evenementsParSaison[selectedSeason] || []).filter(e => e.statut === 'terminé').reduce((sum, e) => sum + (e.total_presents || 0), 0)}
                      </span>
                    </span>
                  </div>
                  
                  {/* Bouton sauvegarder toutes les modifications */}
                  {Object.values(tableEditData).some(d => d.modified) && (
                    <Button
                      onClick={saveAllTableChanges}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      data-testid="save-all-changes"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer tout ({Object.values(tableEditData).filter(d => d.modified).length})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          
          {/* VUE TABLEAU */}
          {viewMode === 'table' && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="events-table">
                  <thead className="bg-black/40">
                    <tr className="border-b border-[#D4A024]/30">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#D4A024] w-10">#</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#D4A024] min-w-[200px]">Lieu</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#D4A024] w-36">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[#D4A024] w-32">Type</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-[#D4A024] w-24">Présences</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-[#D4A024] w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(evenementsParSaison[selectedSeason] || [])
                      .filter(e => e.statut === 'terminé')
                      .map((evt, idx) => (
                        <tr 
                          key={evt.id}
                          className={`border-b border-[#D4A024]/10 hover:bg-[#D4A024]/5 transition-colors ${isRowModified(evt.id) ? 'bg-yellow-900/20' : ''}`}
                          data-testid={`table-row-${evt.id}`}
                        >
                          <td className="px-3 py-2 text-gray-500 text-sm">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={getTableValue(evt, 'lieu')}
                              onChange={(e) => handleTableCellChange(evt.id, 'lieu', e.target.value)}
                              className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#D4A024]/30 focus:border-[#D4A024] rounded text-white text-sm transition-colors"
                              data-testid={`table-lieu-${evt.id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={getTableValue(evt, 'date')}
                              onChange={(e) => handleTableCellChange(evt.id, 'date', e.target.value)}
                              className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#D4A024]/30 focus:border-[#D4A024] rounded text-white text-sm transition-colors"
                              data-testid={`table-date-${evt.id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={getTableValue(evt, 'type_sondage')}
                              onChange={(e) => handleTableCellChange(evt.id, 'type_sondage', e.target.value)}
                              className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#D4A024]/30 focus:border-[#D4A024] rounded text-white text-sm transition-colors"
                              data-testid={`table-type-${evt.id}`}
                            >
                              <option value="repas" className="bg-[#7A2020]">Repas</option>
                              <option value="apero" className="bg-[#7A2020]">Apéro</option>
                              <option value="anniversaire" className="bg-[#7A2020]">Anniversaire</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={getTableValue(evt, 'total_presents')}
                              onChange={(e) => handleTableCellChange(evt.id, 'total_presents', e.target.value)}
                              className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#D4A024]/30 focus:border-[#D4A024] rounded text-[#D4A024] text-sm text-center font-bold transition-colors"
                              data-testid={`table-presents-${evt.id}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {isRowModified(evt.id) && (
                                <Button
                                  onClick={() => saveTableRow(evt.id)}
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                                  title="Enregistrer"
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                onClick={(e) => handleDeleteEvent(evt.id, e)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    
                    {/* Ligne d'ajout */}
                    {addingToSeason === selectedSeason ? (
                      <tr className="border-b border-[#D4A024]/30 bg-[#D4A024]/10">
                        <td className="px-3 py-2 text-gray-500 text-sm">+</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={newEventForm.lieu}
                            onChange={(e) => setNewEventForm({...newEventForm, lieu: e.target.value})}
                            placeholder="Nom du lieu"
                            className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={newEventForm.date}
                            onChange={(e) => setNewEventForm({...newEventForm, date: e.target.value})}
                            className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={newEventForm.type_sondage}
                            onChange={(e) => setNewEventForm({...newEventForm, type_sondage: e.target.value})}
                            className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                          >
                            <option value="repas">Repas</option>
                            <option value="apero">Apéro</option>
                            <option value="anniversaire">Anniversaire</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={newEventForm.total_presents}
                            onChange={(e) => setNewEventForm({...newEventForm, total_presents: e.target.value})}
                            className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-[#D4A024] text-sm text-center font-bold"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              onClick={(e) => saveNewEvent(selectedSeason, e)}
                              size="sm"
                              className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              title="Ajouter"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={cancelAdding}
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-300"
                              title="Annuler"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr 
                        className="border-b border-[#D4A024]/10 hover:bg-[#D4A024]/5 cursor-pointer transition-colors"
                        onClick={() => startAddingToSeason(selectedSeason)}
                      >
                        <td colSpan={6} className="px-3 py-3 text-center text-[#D4A024]/60 hover:text-[#D4A024]">
                          <Plus className="w-4 h-4 inline mr-2" />
                          Ajouter un événement
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}

          {/* VUE LISTE (ACCORDÉON) */}
          {viewMode === 'list' && (
            <>
              <CardHeader 
                className="cursor-pointer hover:bg-[#D4A024]/10 transition-all border-t border-[#D4A024]/20"
                onClick={() => setShowHistorique(!showHistorique)}
              >
                <div className="flex items-center">
                  {showHistorique ? <ChevronDown className="w-5 h-5 mr-2 text-[#D4A024]" /> : <ChevronRight className="w-5 h-5 mr-2 text-[#D4A024]" />}
                  <span className="text-gray-300">Cliquez pour {showHistorique ? 'réduire' : 'déplier'} les saisons</span>
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
                                  
                                  {/* Nombre de présents (cliquable pour voir la liste) */}
                                  <div 
                                    className="flex items-center space-x-2 bg-[#D4A024]/20 px-4 py-2 rounded-lg cursor-pointer hover:bg-[#D4A024]/30 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadRepondants(evt);
                                    }}
                                    title="Cliquer pour voir les répondants"
                                    data-testid={`presents-count-${evt.id}`}
                                  >
                                    <Users className="w-5 h-5 text-[#D4A024]" />
                                    <span className="text-[#D4A024] font-bold text-xl">
                                      {evt.total_presents || 0}
                                    </span>
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
            </>
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
                <div className="flex items-center space-x-3">
                  <div 
                    className={`flex-1 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                      newEvent.saison === 13 
                        ? 'bg-[#D4A024] text-[#7A2020] font-bold' 
                        : 'bg-black/40 border border-[#D4A024]/30 text-gray-400 hover:border-[#D4A024]/50'
                    }`}
                    onClick={() => setNewEvent({ ...newEvent, saison: 13 })}
                  >
                    <div className="text-center">
                      <span className="text-lg">Saison 13</span>
                      <span className="text-sm ml-2 opacity-75">(2025-2026)</span>
                    </div>
                  </div>
                  <div 
                    className={`flex-1 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                      newEvent.saison === 14 
                        ? 'bg-[#D4A024] text-[#7A2020] font-bold' 
                        : 'bg-black/40 border border-[#D4A024]/30 text-gray-400 hover:border-[#D4A024]/50'
                    }`}
                    onClick={() => setNewEvent({ ...newEvent, saison: 14 })}
                  >
                    <div className="text-center">
                      <span className="text-lg">Saison 14</span>
                      <span className="text-sm ml-2 opacity-75">(2026-2027)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type de sondage info */}
              <div className="bg-black/20 p-4 rounded border border-[#D4A024]/20 space-y-3">
                <div>
                  <p className="text-sm text-gray-400">
                    💡 Type de sondage : 
                    {newEvent.objet_type === 'repas' ? (
                      <span className="text-[#D4A024] ml-2">Complet (Présence + Choix des plats)</span>
                    ) : (
                      <span className="text-blue-400 ml-2">Simple (Présence oui/non uniquement)</span>
                    )}
                  </p>
                </div>
                
                {/* Information sur la date limite du sondage */}
                <div className="pt-3 border-t border-[#D4A024]/10">
                  <p className="text-sm font-semibold text-[#D4A024] mb-2">⏰ Date limite du sondage :</p>
                  <div className="space-y-1 text-xs text-gray-400">
                    {newEvent.objet_type === 'repas' && (
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                        <strong>Repas :</strong>&nbsp;Minuit (00h00) le jour suivant
                      </p>
                    )}
                    {newEvent.objet_type === 'apéro' && (
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        <strong>Apéro :</strong>&nbsp;19h00 le jour de l'événement
                      </p>
                    )}
                    {newEvent.objet_type === 'anniversaire' && (
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        <strong>Anniversaire :</strong>&nbsp;Minuit le jour de l'événement
                      </p>
                    )}
                    {newEvent.objet_type === 'autre' && (
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                        <strong>Autre :</strong>&nbsp;21h30 le jour de l'événement (par défaut)
                      </p>
                    )}
                  </div>
                </div>
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

      {/* MODAL LISTE DES RÉPONDANTS */}
      {showRepondantsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1C1917] border-2 border-[#D4A024] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-serif text-white">
                    Réponses au sondage
                  </CardTitle>
                  {repondantsData.evenement && (
                    <p className="text-gray-400 text-sm mt-1">
                      {repondantsData.evenement.objet} - {formatDateShort(repondantsData.evenement.date)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowRepondantsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto py-4">
              {loadingRepondants ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-[#D4A024] border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-400 mt-4">Chargement...</p>
                </div>
              ) : repondantsData.reponses.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Aucune réponse pour le moment</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Résumé */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-black/30 rounded-lg">
                    <span className="text-gray-300">Total réponses</span>
                    <div className="flex items-center space-x-4">
                      <Badge className="bg-green-600 text-white">
                        {repondantsData.reponses.filter(r => r.present).length} Présents
                      </Badge>
                      <Badge className="bg-red-600 text-white">
                        {repondantsData.reponses.filter(r => !r.present).length} Absents
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Liste des présents */}
                  {repondantsData.reponses.filter(r => r.present).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-green-400 font-semibold mb-2 flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Présents ({repondantsData.reponses.filter(r => r.present).length})
                      </h4>
                      <div className="space-y-1">
                        {repondantsData.reponses.filter(r => r.present).map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded">
                            <span className="text-white">{r.nom_complet}</span>
                            {/* Afficher les choix du repas si c'est un sondage repas */}
                            {r.choix_entree || r.choix_plat || r.choix_dessert ? (
                              <div className="flex space-x-2 text-xs">
                                {r.choix_entree && <Badge className="bg-amber-600/50">{r.choix_entree}</Badge>}
                                {r.choix_plat && <Badge className="bg-blue-600/50">{r.choix_plat}</Badge>}
                                {r.choix_dessert && <Badge className="bg-purple-600/50">{r.choix_dessert}</Badge>}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Liste des absents */}
                  {repondantsData.reponses.filter(r => !r.present).length > 0 && (
                    <div>
                      <h4 className="text-red-400 font-semibold mb-2 flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        Absents ({repondantsData.reponses.filter(r => !r.present).length})
                      </h4>
                      <div className="space-y-1">
                        {repondantsData.reponses.filter(r => !r.present).map((r, idx) => (
                          <div key={idx} className="flex items-center p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <span className="text-gray-400">{r.nom_complet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30">
              <Button
                onClick={() => setShowRepondantsModal(false)}
                className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
              >
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Evenements;
