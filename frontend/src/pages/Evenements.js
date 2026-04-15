import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Upload,
  Image,
  MessageCircle,
  Send,
  RefreshCw,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Evenements = () => {
  const { isAdmin, currentMember } = useUser();
  
  // SÉCURITÉ: Vérifier à la fois isAdmin ET is_president pour les actions admin
  const hasAdminAccess = isAdmin && currentMember?.is_president === true;
  
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState({});
  
  // Mode d'affichage : 'list' (accordéon) ou 'table' (tableau éditable)
  // Tableau par défaut pour permettre l'édition facile des présences
  const [viewMode, setViewMode] = useState('table');
  const [selectedSeason, setSelectedSeason] = useState(13);
  
  // État pour l'édition en mode tableau
  const [tableEditData, setTableEditData] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  
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
  
  // État pour la modal d'édition
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalEvent, setEditModalEvent] = useState(null);
  const [editModalForm, setEditModalForm] = useState({
    objet: '',
    lieu: '',
    date: '',
    type_sondage: 'repas',
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

  // État pour l'upload d'image
  const [eventImage, setEventImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Info préliminaire (avant création événement officiel)
  const [prochainEvenementInfo, setProchainEvenementInfo] = useState(null);

  useEffect(() => {
    loadEvenements();
    loadProchainEvenementInfo();
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

  const loadProchainEvenementInfo = async () => {
    try {
      const response = await axios.get(`${API}/prochain-evenement-info`);
      setProchainEvenementInfo(response.data?.info || null);
    } catch (error) {
      setProchainEvenementInfo(null);
    }
  };

  // Upload d'image pour un événement
  const handleImageUpload = async (evenementId, file) => {
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/evenements/${evenementId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Image uploadée !');
      loadEvenements();
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Supprimer l'image d'un événement
  const handleDeleteImage = async (evenementId) => {
    try {
      await axios.delete(`${API}/evenements/${evenementId}/image`);
      toast.success('Image supprimée');
      loadEvenements();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Charger les réponses d'un événement pour voir qui a répondu quoi
  const loadRepondants = async (evenement) => {
    setLoadingRepondants(true);
    setShowRepondantsModal(true);
    try {
      // Charger les réponses ET les réponses manuelles pour cet événement
      const [reponsesRes, manuellesRes, membresRes] = await Promise.all([
        axios.get(`${API}/reponses-sondages/${evenement.id}`),
        axios.get(`${API}/reponses-manuelles/${evenement.id}`),
        axios.get(`${API}/members`)
      ]);
      const reponses = reponsesRes.data?.reponses || [];
      const manuelles = manuellesRes.data || [];
      const membres = membresRes.data || [];
      
      // Associer les noms aux réponses normales
      const reponsesAvecNoms = reponses.map(r => {
        const membre = membres.find(m => m.id === r.membre_id);
        return {
          ...r,
          nom_complet: membre?.nom_complet || 'Inconnu'
        };
      });
      
      // Ajouter les réponses manuelles (membres sans accès + invités)
      // en évitant les doublons (un membre_manuel peut déjà être dans reponses_evenements)
      const membreIdsDejaPresents = new Set(reponses.map(r => r.membre_id));
      const manuellesUniques = manuelles.filter(m => 
        !m.membre_id || !membreIdsDejaPresents.has(m.membre_id)
      );
      
      const manuellesAvecNoms = manuellesUniques.map(r => ({
        ...r,
        nom_complet: r.nom,
        is_manual: true
      }));
      
      setRepondantsData({
        evenement,
        reponses: [...reponsesAvecNoms, ...manuellesAvecNoms],
        membres
      });
    } catch (error) {
      console.error('Erreur chargement répondants:', error);
      toast.error('Erreur lors du chargement des répondants');
    } finally {
      setLoadingRepondants(false);
    }
  };

  // ==================== FONCTIONS WHATSAPP ====================
  
  // Formater la date en "Lundi 15 Avril"
  const formatDateComplete = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let formatted = date.toLocaleDateString('fr-FR', options);
    // Mettre la première lettre en majuscule
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Formater l'heure
  const formatHeure = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // URL de production de l'app
  const APP_BASE_URL = 'https://labagueimperiale.optizioni.app';

  // Construire le message WhatsApp pour un événement
  const buildEventWhatsAppMessage = (event) => {
    const dateFormatted = formatDateComplete(event.date);
    const heure = formatHeure(event.date);
    
    let objetText = '';
    const objet = event.objet?.toLowerCase() || '';
    const lieu = event.lieu || '';
    
    if (objet.includes('repas') || event.type_sondage === 'repas') {
      objetText = `🍽️ *Repas du Club* au ${lieu}`;
    } else if (objet.includes('apéro') || objet.includes('apero')) {
      objetText = `🥃 *Apéro du Club* à ${lieu} de ${heure} à 21h`;
    } else if (objet.includes('anniversaire')) {
      objetText = `🎂 *Anniversaire du Club* à ${lieu}`;
    } else {
      objetText = `🎩 *${event.objet || 'Événement'}* à ${lieu}`;
    }
    
    const appUrl = `${APP_BASE_URL}/dashboard`;
    
    const message = `🎩 *La Bague Impériale*

📅 *${dateFormatted}* à ${heure}

${objetText}

👉 Répondre : ${appUrl}

_Merci de confirmer votre présence !_`;

    return message;
  };

  // Message complet de l'événement (avec menu entier) pour les membres sans accès
  const buildFullEventMessage = (event) => {
    const dateFormatted = formatDateComplete(event.date);
    const heure = formatHeure(event.date);
    
    let objetText = '';
    const objet = event.objet?.toLowerCase() || '';
    const lieu = event.lieu || '';
    
    if (objet.includes('repas') || event.type_sondage === 'repas') {
      objetText = `🍽️ *Repas du Club* au ${lieu}`;
    } else if (objet.includes('apéro') || objet.includes('apero')) {
      objetText = `🥃 *Apéro du Club* à ${lieu}`;
    } else if (objet.includes('anniversaire')) {
      objetText = `🎂 *Anniversaire du Club* à ${lieu}`;
    } else {
      objetText = `🎩 *${event.objet || 'Événement'}* à ${lieu}`;
    }
    
    const appUrl = `${APP_BASE_URL}/dashboard`;
    
    let message = `🎩 *La Bague Impériale*
━━━━━━━━━━━━━━━━━━━━

📅 *${dateFormatted}* à ${heure}

${objetText}`;

    // Récupérer les options du menu (dans options_sondage ou directement sur l'event)
    const entrees = event.options_sondage?.entrees || event.entrees || [];
    const plats = event.options_sondage?.plats || event.plats || [];
    const desserts = event.options_sondage?.desserts || event.desserts || [];

    // Ajouter le menu si c'est un repas
    if (event.type_sondage === 'repas') {
      message += `

🍽️ *MENU AU CHOIX*
━━━━━━━━━━━━━━━━━━━━`;
      
      if (entrees.length > 0) {
        message += `

🥗 *Entrées :*`;
        entrees.forEach((entree, idx) => {
          message += `
  ${idx + 1}. ${entree}`;
        });
      }
      
      if (plats.length > 0) {
        message += `

🍖 *Plats :*`;
        plats.forEach((plat, idx) => {
          message += `
  ${idx + 1}. ${plat}`;
        });
      }
      
      if (desserts.length > 0) {
        message += `

🍰 *Desserts :*`;
        desserts.forEach((dessert, idx) => {
          message += `
  ${idx + 1}. ${dessert}`;
        });
      }
    }

    message += `

━━━━━━━━━━━━━━━━━━━━
👉 *Répondre sur l'app :* ${appUrl}

_Merci de confirmer votre présence et vos choix de menu !_`;

    return message;
  };

  // Envoyer l'événement complet (pour membres sans accès)
  const shareFullEvent = async (event) => {
    const message = buildFullEventMessage(event);
    
    // Utiliser l'API Web Share native si disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: `La Bague Impériale - ${event.objet}`,
          text: message,
        });
        toast.success('Événement partagé !');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    
    // Fallback: copier dans le presse-papier
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Événement copié ! Collez-le dans WhatsApp pour l\'envoyer');
    } catch (err) {
      toast.error('Erreur de partage');
    }
  };

  // Partager un événement sur WhatsApp
  const shareEventToWhatsApp = async (event) => {
    const message = buildEventWhatsAppMessage(event);
    
    // Utiliser l'API Web Share native si disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: `La Bague Impériale - ${event.objet}`,
          text: message,
        });
        toast.success('Partagé !');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    
    // Fallback: copier dans le presse-papier
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Message copié ! Collez-le dans WhatsApp');
    } catch (err) {
      toast.error('Erreur de partage');
    }
  };

  // Relancer les non-répondants
  const relancerNonRepondants = async (event) => {
    const message = buildEventWhatsAppMessage(event);
    const relanceMessage = `⚠️ *RELANCE* ⚠️

${message}

_Vous n'avez pas encore répondu. Merci de confirmer rapidement !_`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `RELANCE - La Bague Impériale`,
          text: relanceMessage,
        });
        toast.success('Relance partagée !');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    
    try {
      await navigator.clipboard.writeText(relanceMessage);
      toast.success('Message de relance copié ! Collez-le dans WhatsApp');
    } catch (err) {
      toast.error('Erreur de partage');
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

  // MODAL D'ÉDITION D'UN ÉVÉNEMENT
  const openEditModal = (evt) => {
    setEditModalEvent(evt);
    const dateObj = new Date(evt.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    
    setEditModalForm({
      objet: evt.objet || '',
      lieu: evt.lieu || '',
      date: dateStr,
      type_sondage: evt.type_sondage || 'repas',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditModalEvent(null);
  };

  const saveEditModal = async () => {
    if (!editModalEvent) return;
    
    try {
      const dateWithTime = new Date(editModalForm.date + 'T19:00:00');
      
      await axios.put(`${API}/evenements/${editModalEvent.id}`, {
        objet: editModalForm.objet,
        lieu: editModalForm.lieu,
        date: dateWithTime.toISOString(),
        type_sondage: editModalForm.type_sondage,
      });
      
      toast.success('Événement modifié avec succès');
      closeEditModal();
      loadEvenements();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur lors de la modification');
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
      const dateWithTime = new Date(editForm.date + 'T19:00:00');
      
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
      const dateWithTime = new Date(newEventForm.date + 'T19:00:00');
      
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
        const dateWithTime = new Date(changes.date + 'T19:00:00');
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

    setSavingAll(true);
    let successCount = 0;
    for (const [eventId, changes] of modifiedEvents) {
      try {
        const updateData = {};
        if (changes.lieu !== undefined) updateData.lieu = changes.lieu;
        if (changes.date !== undefined) {
          const dateWithTime = new Date(changes.date + 'T19:00:00');
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

    // Nettoyer les modifications sans recharger toute la page
    setTableEditData({});
    
    // Mettre à jour localement les événements modifiés
    setEvenements(prev => prev.map(evt => {
      const changes = modifiedEvents.find(([id]) => id === evt.id);
      if (changes) {
        const [_, data] = changes;
        return {
          ...evt,
          lieu: data.lieu !== undefined ? data.lieu : evt.lieu,
          date: data.date !== undefined ? new Date(data.date + 'T19:00:00').toISOString() : evt.date,
          type_sondage: data.type_sondage !== undefined ? data.type_sondage : evt.type_sondage,
          total_presents: data.total_presents !== undefined ? parseInt(data.total_presents) || 0 : evt.total_presents,
        };
      }
      return evt;
    }));
    
    setSavingAll(false);
    toast.success(`✅ ${successCount} événement(s) modifié(s) pour la saison ${selectedSeason}`);
  };

  // Compter les modifications en attente
  const pendingChangesCount = Object.values(tableEditData).filter(d => d.modified).length;

  // Changer de saison avec confirmation si modifications non sauvegardées
  const changeSeason = (newSeason) => {
    if (pendingChangesCount > 0) {
      if (!window.confirm(`⚠️ Vous avez ${pendingChangesCount} modification(s) non sauvegardée(s).\n\nVoulez-vous vraiment changer de saison ?\nLes modifications seront perdues.`)) {
        return;
      }
      // Annuler les modifications
      setTableEditData({});
    }
    setSelectedSeason(newSeason);
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
          {hasAdminAccess && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
              data-testid="create-event-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer un événement
            </Button>
          )}
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
                      <h4 className="text-white font-semibold mb-2 text-lg">🥗 Entrées</h4>
                      <div className="text-gray-200 text-base space-y-2">
                        {prochainEvenement.options_sondage.entrees?.map((e, i) => (
                          <div key={i}>
                            {i > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                            <p>{e}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2 text-lg">🍖 Plats</h4>
                      <div className="text-gray-200 text-base space-y-2">
                        {prochainEvenement.options_sondage.plats?.map((p, i) => (
                          <div key={i}>
                            {i > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                            <p>{p}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2 text-lg">🍰 Desserts</h4>
                      <div className="text-gray-200 text-base space-y-2">
                        {prochainEvenement.options_sondage.desserts?.map((d, i) => (
                          <div key={i}>
                            {i > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                            <p>{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Image de l'événement (visible par tous, modifiable par admin) */}
                <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Image className="w-4 h-4 mr-2 text-[#D4A024]" />
                    Image de l'événement
                  </h4>
                  
                  {prochainEvenement.image_url ? (
                    <div className="relative">
                      <img 
                        src={prochainEvenement.image_url} 
                        alt={prochainEvenement.objet}
                        className="max-h-64 object-contain rounded-lg border border-[#D4A024]/30 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(prochainEvenement.image_url, '_blank')}
                        title="Cliquer pour agrandir"
                      />
                      {hasAdminAccess && (
                        <Button
                          onClick={() => handleDeleteImage(prochainEvenement.id)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ) : hasAdminAccess ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#D4A024]/50 rounded-lg cursor-pointer hover:bg-[#D4A024]/10 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-[#D4A024] mb-2" />
                        <p className="text-sm text-gray-400">
                          {uploadingImage ? 'Upload en cours...' : 'Cliquer pour ajouter une image'}
                        </p>
                        <p className="text-xs text-gray-500">(Menu, affiche, etc.)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(prochainEvenement.id, file);
                        }}
                      />
                    </label>
                  ) : (
                    <p className="text-gray-500 text-sm italic">Aucune image</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-[#D4A024]/20">
                  {/* Bouton "Envoyer l'événement" - VISIBLE PAR TOUS (Admin ET Membres) */}
                  <Button
                    onClick={() => shareFullEvent(prochainEvenement)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="envoyer-event-btn"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Envoyer l'événement
                  </Button>
                  
                  {/* Bouton "Voir les réponses" - ADMIN UNIQUEMENT */}
                  {hasAdminAccess && (
                    <Button 
                      onClick={() => loadRepondants(prochainEvenement)}
                      className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                      data-testid="voir-reponses-btn"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Voir les réponses
                    </Button>
                  )}
                  {hasAdminAccess && (
                    <>
                      <Button
                        onClick={() => shareEventToWhatsApp(prochainEvenement)}
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-900/20"
                        data-testid="share-event-btn"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoi infos
                      </Button>
                      <Button
                        onClick={() => relancerNonRepondants(prochainEvenement)}
                        variant="outline"
                        className="border-orange-500 text-orange-400 hover:bg-orange-900/20"
                        data-testid="relance-event-btn"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Relance
                      </Button>
                      <Button
                        onClick={() => openEditModal(prochainEvenement)}
                        variant="outline"
                        className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                        data-testid="modifier-event-btn"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        onClick={(e) => handleDeleteEvent(prochainEvenement.id, e)}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : prochainEvenementInfo && prochainEvenementInfo.actif ? (
          <Card className="bg-black/40 border-2 border-cyan-600/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Badge className="bg-cyan-600 text-white text-sm mb-4">
                {prochainEvenementInfo.type_evenement === 'repas' ? 'Repas' : 'Apéro'}
              </Badge>
              <h3 className="text-2xl font-serif text-white mb-3">
                {prochainEvenementInfo.type_evenement === 'repas' ? 'Prochain Repas' : 'Prochain Apéro'}
              </h3>
              <p className="text-[#D4A024] text-lg mb-1">
                {new Date(prochainEvenementInfo.date + 'T19:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-gray-300 text-lg mb-4">
                {prochainEvenementInfo.lieu}
              </p>
              <p className="text-gray-500 text-sm">
                Plus d'informations à venir... Le sondage sera ouvert une fois l'événement créé.
              </p>
              {hasAdminAccess && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Créer l'événement officiel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-black/40 border-2 border-[#D4A024]/50 backdrop-blur-sm border-dashed">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 text-[#D4A024]/30 mx-auto mb-4" />
              <h3 className="text-2xl font-serif text-gray-400 mb-2">
                Aucun événement à venir
              </h3>
              {hasAdminAccess ? (
                <>
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
                </>
              ) : (
                <p className="text-gray-500">
                  Le président n'a pas encore créé de prochain événement
                </p>
              )}
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-4">
                    {/* Bouton précédent */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeSeason(Math.max(1, selectedSeason - 1))}
                      disabled={selectedSeason <= 1}
                      className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </Button>
                    
                    {/* Titre de la saison */}
                    <div className="text-center">
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#D4A024]">
                        Saison {selectedSeason}
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {2012 + selectedSeason} - {2013 + selectedSeason}
                      </p>
                    </div>
                    
                    {/* Bouton suivant */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeSeason(Math.min(13, selectedSeason + 1))}
                      disabled={selectedSeason >= 13}
                      className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Sélecteur rapide de saison */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">Aller à :</span>
                    <div className="flex flex-wrap gap-1 justify-center max-w-[280px] sm:max-w-none">
                      {[13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                        <button
                          key={num}
                          onClick={() => changeSeason(num)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-xs sm:text-sm font-medium transition-colors ${
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
                  
                  {/* Bouton sauvegarder toutes les modifications - TOUJOURS VISIBLE */}
                  <div className="flex items-center gap-3">
                    {pendingChangesCount > 0 && (
                      <span className="text-yellow-400 text-sm animate-pulse">
                        ⚠️ {pendingChangesCount} modification(s) non sauvegardée(s)
                      </span>
                    )}
                    <Button
                      onClick={saveAllTableChanges}
                      disabled={pendingChangesCount === 0 || savingAll}
                      className={`${pendingChangesCount > 0 
                        ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                        : 'bg-gray-600'} text-white font-bold px-6`}
                      data-testid="save-all-changes"
                    >
                      {savingAll ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Sauvegarder la saison {pendingChangesCount > 0 && `(${pendingChangesCount})`}
                        </>
                      )}
                    </Button>
                  </div>
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
                      <th className="px-3 py-3 text-left text-sm font-semibold text-[#D4A024] w-10">#</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-[#D4A024] min-w-[200px]">Lieu</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-[#D4A024] w-36">Date</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-[#D4A024] w-32">Type</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold text-[#D4A024] w-24">Présences</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold text-[#D4A024] w-20">Actions</th>
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
                              onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'lieu', e.target.value)}
                              readOnly={!hasAdminAccess}
                              className={`w-full px-2 py-1 bg-transparent border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024]' : 'cursor-default'} rounded text-white text-sm transition-colors`}
                              data-testid={`table-lieu-${evt.id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={getTableValue(evt, 'date')}
                              onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'date', e.target.value)}
                              readOnly={!hasAdminAccess}
                              className={`w-full px-2 py-1 bg-transparent border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024]' : 'cursor-default'} rounded text-white text-sm transition-colors`}
                              data-testid={`table-date-${evt.id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={getTableValue(evt, 'type_sondage')}
                              onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'type_sondage', e.target.value)}
                              disabled={!hasAdminAccess}
                              className={`w-full px-2 py-1 bg-transparent border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024]' : 'cursor-default'} rounded text-white text-sm transition-colors`}
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
                              onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'total_presents', e.target.value)}
                              readOnly={!hasAdminAccess}
                              className={`w-full px-2 py-1 bg-transparent border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024]' : 'cursor-default'} rounded text-[#D4A024] text-sm text-center font-bold transition-colors`}
                              data-testid={`table-presents-${evt.id}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {isRowModified(evt.id) && (
                                <span className="text-yellow-400 text-xs" title="Modification en attente">
                                  ✏️
                                </span>
                              )}
                              {hasAdminAccess && (
                                <Button
                                  onClick={(e) => handleDeleteEvent(evt.id, e)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
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
                    ) : hasAdminAccess ? (
                      <tr 
                        className="border-b border-[#D4A024]/10 hover:bg-[#D4A024]/5 cursor-pointer transition-colors"
                        onClick={() => startAddingToSeason(selectedSeason)}
                      >
                        <td colSpan={6} className="px-3 py-3 text-center text-[#D4A024]/60 hover:text-[#D4A024]">
                          <Plus className="w-4 h-4 inline mr-2" />
                          Ajouter un événement
                        </td>
                      </tr>
                    ) : null}
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
                              className={`border rounded transition-all ${
                                isRowModified(evt.id) 
                                  ? 'bg-yellow-900/20 border-yellow-500/50' 
                                  : 'bg-black/20 border-[#D4A024]/10 hover:border-[#D4A024]/30'
                              }`}
                              data-testid={`event-${evt.id}`}
                            >
                              {/* MODE ÉDITION DIRECT - Tous les champs éditables */}
                              <div className="flex items-center justify-between p-2 sm:p-3 gap-2">
                                <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
                                  {/* Numéro */}
                                  <span className="text-gray-500 text-xs w-5 shrink-0">#{idx + 1}</span>
                                  
                                  {/* Lieu - éditable seulement pour admin */}
                                  <input
                                    type="text"
                                    value={getTableValue(evt, 'lieu')}
                                    onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'lieu', e.target.value)}
                                    readOnly={!hasAdminAccess}
                                    className={`font-serif font-semibold w-16 sm:w-24 px-1 py-0.5 rounded text-xs sm:text-sm bg-transparent text-white border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024] focus:bg-black/30' : 'cursor-default'}`}
                                    data-testid={`list-lieu-${evt.id}`}
                                  />
                                  
                                  {/* Date - éditable seulement pour admin */}
                                  <input
                                    type="date"
                                    value={getTableValue(evt, 'date')}
                                    onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'date', e.target.value)}
                                    readOnly={!hasAdminAccess}
                                    className={`w-24 sm:w-28 px-1 py-0.5 rounded text-xs bg-transparent text-gray-400 border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024] focus:bg-black/30' : 'cursor-default'}`}
                                    data-testid={`list-date-${evt.id}`}
                                  />
                                  
                                  {/* Type - éditable seulement pour admin (caché sur mobile) */}
                                  <select
                                    value={getTableValue(evt, 'type_sondage')}
                                    onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'type_sondage', e.target.value)}
                                    disabled={!hasAdminAccess}
                                    className={`hidden sm:block w-20 px-1 py-0.5 rounded text-xs bg-transparent text-gray-400 border border-transparent ${hasAdminAccess ? 'hover:border-[#D4A024]/30 focus:border-[#D4A024] focus:bg-black/30' : 'cursor-default'}`}
                                    data-testid={`list-type-${evt.id}`}
                                  >
                                    <option value="repas">Repas</option>
                                    <option value="apero">Apéro</option>
                                    <option value="anniversaire">Anniv.</option>
                                  </select>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Présences - éditable seulement pour admin */}
                                  <div className="flex items-center bg-[#D4A024]/20 px-2 py-1 rounded">
                                    <Users className="w-3 h-3 sm:w-4 sm:h-4 text-[#D4A024] mr-1" />
                                    <input
                                      type="number"
                                      min="0"
                                      value={getTableValue(evt, 'total_presents')}
                                      onChange={(e) => hasAdminAccess && handleTableCellChange(evt.id, 'total_presents', e.target.value)}
                                      readOnly={!hasAdminAccess}
                                      className={`w-8 sm:w-10 text-center font-bold text-base sm:text-lg bg-transparent text-[#D4A024] border-none focus:outline-none ${!hasAdminAccess ? 'cursor-default' : ''}`}
                                      data-testid={`list-presents-${evt.id}`}
                                    />
                                  </div>
                                  
                                  {/* Indicateur modifié */}
                                  {isRowModified(evt.id) && (
                                    <span className="text-yellow-400 text-xs">✏️</span>
                                  )}
                                  
                                  {/* Supprimer */}
                                  {hasAdminAccess && (
                                    <Button
                                      onClick={(e) => handleDeleteEvent(evt.id, e)}
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-6 w-6 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Bouton Sauvegarder la saison (vue liste) */}
                          {pendingChangesCount > 0 && (
                            <div className="flex justify-end mt-3">
                              <Button
                                onClick={saveAllTableChanges}
                                disabled={savingAll}
                                className="bg-green-600 hover:bg-green-700 text-white animate-pulse"
                              >
                                {savingAll ? (
                                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</>
                                ) : (
                                  <><Save className="w-4 h-4 mr-2" />Sauvegarder ({pendingChangesCount})</>
                                )}
                              </Button>
                            </div>
                          )}

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
                                  <label className="block text-base text-gray-400 mb-1">Lieu *</label>
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
                                  <label className="block text-base text-gray-400 mb-1">Date *</label>
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
                                  <label className="block text-base text-gray-400 mb-1">Type</label>
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
                                  <label className="block text-base text-gray-400 mb-1">Présences</label>
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
                          ) : hasAdminAccess ? (
                            /* BOUTON AJOUTER (Admin seulement) */
                            <Button
                              onClick={(e) => startAddingToSeason(saisonNum, e)}
                              variant="outline"
                              className="w-full border-dashed border-[#D4A024]/30 text-[#D4A024]/60 hover:text-[#D4A024] hover:border-[#D4A024]/50 hover:bg-[#D4A024]/5"
                              data-testid={`add-event-to-season-${saisonNum}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter un événement à la Saison {saisonNum}
                            </Button>
                          ) : null}
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
                  <p className="text-base text-gray-400">
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
                  <div className="space-y-1 text-base text-gray-400">
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
                        value={entree === `Entrée ${String.fromCharCode(65 + i)}` ? '' : entree}
                        placeholder={`Ex: Salade César, Foie gras...`}
                        onChange={(e) => {
                          const newEntrees = [...newEvent.options_sondage.entrees];
                          newEntrees[i] = e.target.value || `Entrée ${String.fromCharCode(65 + i)}`;
                          setNewEvent({
                            ...newEvent,
                            options_sondage: { ...newEvent.options_sondage, entrees: newEntrees }
                          });
                        }}
                        onFocus={(e) => {
                          if (entree === `Entrée ${String.fromCharCode(65 + i)}`) {
                            const newEntrees = [...newEvent.options_sondage.entrees];
                            newEntrees[i] = '';
                            setNewEvent({
                              ...newEvent,
                              options_sondage: { ...newEvent.options_sondage, entrees: newEntrees }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 mb-2 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm placeholder:text-gray-500"
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
                        value={plat === `Plat ${String.fromCharCode(65 + i)}` ? '' : plat}
                        placeholder={`Ex: Filet de bœuf, Loup grillé...`}
                        onChange={(e) => {
                          const newPlats = [...newEvent.options_sondage.plats];
                          newPlats[i] = e.target.value || `Plat ${String.fromCharCode(65 + i)}`;
                          setNewEvent({
                            ...newEvent,
                            options_sondage: { ...newEvent.options_sondage, plats: newPlats }
                          });
                        }}
                        onFocus={(e) => {
                          if (plat === `Plat ${String.fromCharCode(65 + i)}`) {
                            const newPlats = [...newEvent.options_sondage.plats];
                            newPlats[i] = '';
                            setNewEvent({
                              ...newEvent,
                              options_sondage: { ...newEvent.options_sondage, plats: newPlats }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 mb-2 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm placeholder:text-gray-500"
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
                        value={dessert === `Dessert ${String.fromCharCode(65 + i)}` ? '' : dessert}
                        placeholder={`Ex: Tarte aux fruits, Fondant chocolat...`}
                        onChange={(e) => {
                          const newDesserts = [...newEvent.options_sondage.desserts];
                          newDesserts[i] = e.target.value || `Dessert ${String.fromCharCode(65 + i)}`;
                          setNewEvent({
                            ...newEvent,
                            options_sondage: { ...newEvent.options_sondage, desserts: newDesserts }
                          });
                        }}
                        onFocus={(e) => {
                          if (dessert === `Dessert ${String.fromCharCode(65 + i)}`) {
                            const newDesserts = [...newEvent.options_sondage.desserts];
                            newDesserts[i] = '';
                            setNewEvent({
                              ...newEvent,
                              options_sondage: { ...newEvent.options_sondage, desserts: newDesserts }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 mb-2 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm placeholder:text-gray-500"
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
            
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 space-y-3">
              <div className="flex space-x-3">
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
              
              {/* Bouton WhatsApp - visible seulement si les champs obligatoires sont remplis */}
              {newEvent.date && newEvent.lieu && (
                <Button
                  onClick={() => {
                    // Créer un objet événement temporaire pour le partage
                    let objet = newEvent.objet_type === 'autre' ? newEvent.objet_texte : newEvent.objet_type;
                    objet = objet.charAt(0).toUpperCase() + objet.slice(1);
                    
                    const tempEvent = {
                      date: newEvent.date,
                      objet: objet,
                      lieu: newEvent.lieu,
                      type_sondage: newEvent.objet_type === 'repas' ? 'repas' : 'simple'
                    };
                    shareEventToWhatsApp(tempEvent);
                  }}
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  data-testid="whatsapp-create-event"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Partager sur WhatsApp Bague Impériale
                </Button>
              )}
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
                            <div className="flex items-center gap-2">
                              <span className="text-white">{r.nom_complet}</span>
                              {r.is_manual && (
                                <Badge className="bg-blue-600/50 text-xs">Manuel</Badge>
                              )}
                            </div>
                            {/* Afficher les choix du repas si c'est un sondage repas */}
                            {r.choix_entree || r.choix_plat || r.choix_dessert ? (
                              <div className="flex space-x-2 text-sm">
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
                            {r.is_manual && (
                              <Badge className="bg-blue-600/50 text-xs ml-2">Manuel</Badge>
                            )}
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

      {/* MODAL ÉDITION D'UN ÉVÉNEMENT */}
      {showEditModal && editModalEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1C1917] border-2 border-[#D4A024] w-full max-w-lg">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white">
                  Modifier l'événement
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="py-6 space-y-4">
              {/* Objet */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Objet / Description</label>
                <Input
                  value={editModalForm.objet}
                  onChange={(e) => setEditModalForm({ ...editModalForm, objet: e.target.value })}
                  className="bg-black/30 border-[#D4A024]/30 text-white"
                  placeholder="Ex: Repas de mars"
                />
              </div>
              
              {/* Date */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Date</label>
                <Input
                  type="date"
                  value={editModalForm.date}
                  onChange={(e) => setEditModalForm({ ...editModalForm, date: e.target.value })}
                  className="bg-black/30 border-[#D4A024]/30 text-white"
                />
              </div>
              
              {/* Lieu */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Lieu</label>
                <Input
                  value={editModalForm.lieu}
                  onChange={(e) => setEditModalForm({ ...editModalForm, lieu: e.target.value })}
                  className="bg-black/30 border-[#D4A024]/30 text-white"
                  placeholder="Ex: Restaurant XYZ"
                />
              </div>
              
              {/* Type */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Type d'événement</label>
                <select
                  value={editModalForm.type_sondage}
                  onChange={(e) => setEditModalForm({ ...editModalForm, type_sondage: e.target.value })}
                  className="w-full bg-black/30 border border-[#D4A024]/30 text-white rounded-md px-3 py-2"
                >
                  <option value="repas">Repas</option>
                  <option value="apero">Apéro</option>
                  <option value="anniversaire">Anniversaire</option>
                </select>
              </div>
            </CardContent>
            
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 flex space-x-3">
              <Button
                onClick={saveEditModal}
                className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
              >
                Enregistrer
              </Button>
              <Button
                onClick={closeEditModal}
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
