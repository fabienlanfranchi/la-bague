import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Bell,
  Calendar,
  Users,
  CreditCard,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  CheckCheck,
  Save,
  FileText,
  Edit3,
  Forward,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Messages = () => {
  const { user, isAdmin, currentMember } = useUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [membres, setMembres] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageStats, setMessageStats] = useState(null);
  
  // Notifications pour la vue membre
  const [notifications, setNotifications] = useState([]);
  const [readMessages, setReadMessages] = useState(new Set());
  
  // Templates de messages (pour admin)
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Formulaire de création
  const [newMessage, setNewMessage] = useState({
    type: 'annonce',
    titre: '',
    contenu: '',
    destinataires: [],
    evenement_id: null,
    sondage_template_id: null,
    date_limite: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Charger les notifications pour le membre
  useEffect(() => {
    const loadNotifications = async () => {
      if (currentMember?.id && !isAdmin) {
        try {
          const response = await axios.get(`${API}/notifications/${currentMember.id}`);
          setNotifications(response.data);
          // Marquer les messages déjà lus
          const read = new Set(response.data.filter(n => n.lu).map(n => n.message_id));
          setReadMessages(read);
        } catch (error) {
          console.error('Erreur notifications:', error);
        }
      }
    };
    loadNotifications();
  }, [currentMember, isAdmin]);

  // Charger les templates de messages (admin)
  useEffect(() => {
    const loadMessageTemplates = async () => {
      if (isAdmin) {
        try {
          const response = await axios.get(`${API}/message-templates`);
          setMessageTemplates(response.data);
        } catch (error) {
          // Pas grave si pas de templates
          console.log('Pas de templates de messages');
        }
      }
    };
    loadMessageTemplates();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [messagesRes, templatesRes, membresRes, evenementsRes] = await Promise.all([
        axios.get(`${API}/messages`),
        axios.get(`${API}/sondage-templates`),
        axios.get(`${API}/members`),
        axios.get(`${API}/evenements`)
      ]);
      setMessages(messagesRes.data);
      setTemplates(templatesRes.data);
      setMembres(membresRes.data);
      setEvenements(evenementsRes.data.filter(e => e.statut === 'à venir'));
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMessage = async () => {
    if (!newMessage.titre || !newMessage.contenu) {
      toast.error('Veuillez remplir le titre et le contenu');
      return;
    }

    try {
      const payload = {
        ...newMessage,
        date_limite: newMessage.date_limite ? new Date(newMessage.date_limite).toISOString() : null
      };

      const response = await axios.post(`${API}/messages`, payload);
      toast.success(`Message envoyé à ${response.data.notifications_envoyees} membre(s)`);
      setShowCreateModal(false);
      setNewMessage({
        type: 'annonce',
        titre: '',
        contenu: '',
        destinataires: [],
        evenement_id: null,
        sondage_template_id: null,
        date_limite: ''
      });
      loadData();
    } catch (error) {
      console.error('Erreur création:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Supprimer ce message ?')) return;

    try {
      await axios.delete(`${API}/messages/${messageId}`);
      toast.success('Message supprimé');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Marquer un message comme lu (vue membre)
  const markAsRead = async (messageId) => {
    if (!currentMember?.id) return;
    
    // Trouver la notification correspondante
    const notif = notifications.find(n => n.message_id === messageId);
    if (notif && !notif.lu) {
      try {
        await axios.put(`${API}/notifications/${notif.id}/read`);
        setReadMessages(prev => new Set([...prev, messageId]));
        setNotifications(prev => prev.map(n => 
          n.id === notif.id ? { ...n, lu: true } : n
        ));
        toast.success('Message marqué comme lu');
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  // Marquer tous les messages comme lus (vue membre)
  const markAllAsRead = async () => {
    if (!currentMember?.id) return;
    
    try {
      await axios.put(`${API}/notifications/${currentMember.id}/read-all`);
      setReadMessages(new Set(messages.map(m => m.id)));
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      toast.success('Tous les messages marqués comme lus');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Sauvegarder un template de message (admin)
  const saveMessageTemplate = async () => {
    if (!newMessage.titre || !newMessage.contenu) {
      toast.error('Veuillez remplir le titre et le contenu');
      return;
    }

    try {
      const templateData = {
        nom: newMessage.titre,
        type: newMessage.type,
        titre: newMessage.titre,
        contenu: newMessage.contenu
      };

      if (editingTemplate) {
        await axios.put(`${API}/message-templates/${editingTemplate.id}`, templateData);
        toast.success('Template mis à jour');
      } else {
        await axios.post(`${API}/message-templates`, templateData);
        toast.success('Template sauvegardé');
      }

      // Recharger les templates
      const response = await axios.get(`${API}/message-templates`);
      setMessageTemplates(response.data);
      setEditingTemplate(null);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Charger un template dans le formulaire
  const loadTemplate = (template) => {
    setNewMessage({
      ...newMessage,
      type: template.type || 'annonce',
      titre: template.titre,
      contenu: template.contenu
    });
    setShowTemplatesModal(false);
    toast.success(`Template "${template.nom}" chargé`);
  };

  // Supprimer un template
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    
    try {
      await axios.delete(`${API}/message-templates/${templateId}`);
      setMessageTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template supprimé');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Sélectionner/désélectionner tous les membres
  const selectAllMembers = () => {
    setNewMessage({
      ...newMessage,
      destinataires: membres.map(m => m.id)
    });
  };

  const deselectAllMembers = () => {
    setNewMessage({
      ...newMessage,
      destinataires: []
    });
  };

  const viewMessageStats = async (message) => {
    setSelectedMessage(message);
    if (message.type === 'sondage' || message.sondage_template_id) {
      try {
        const response = await axios.get(`${API}/sondage-reponses/${message.id}/stats`);
        setMessageStats(response.data);
      } catch (error) {
        console.error('Erreur stats:', error);
      }
    } else {
      setMessageStats(null);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'annonce': 'Annonce',
      'rappel_sondage': 'Rappel sondage',
      'rappel_cotisation': 'Rappel cotisation',
      'sondage': 'Sondage'
    };
    return labels[type] || type;
  };

  const getTypeBadge = (type) => {
    const styles = {
      'annonce': 'bg-blue-600 text-white',
      'rappel_sondage': 'bg-yellow-600 text-white',
      'rappel_cotisation': 'bg-red-600 text-white',
      'sondage': 'bg-green-600 text-white'
    };
    return <Badge className={styles[type] || 'bg-gray-600'}>{getTypeLabel(type)}</Badge>;
  };

  // Renvoyer un message existant
  const handleResendMessage = (msg) => {
    setNewMessage({
      type: msg.type,
      titre: msg.titre,
      contenu: msg.contenu,
      destinataires: [], // Vide pour permettre de choisir de nouveaux destinataires
      evenement_id: msg.evenement_id || null,
      sondage_template_id: msg.sondage_template_id || null,
      date_limite: ''
    });
    setShowCreateModal(true);
    toast.info('Message chargé - Choisissez les nouveaux destinataires');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#D4A024] text-xl font-serif">Chargement...</div>
      </div>
    );
  }

  // ============ VUE ADMIN ============
  if (isAdmin) {
    return (
      <div className="space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
              Messages
            </h1>
            <p className="text-[#D4A024] text-lg font-serif">
              Annonces et communications aux membres
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
            data-testid="create-message-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau message
          </Button>
        </div>

        {/* Raccourcis rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            onClick={() => {
              setNewMessage({ ...newMessage, type: 'annonce', titre: '', contenu: '' });
              setShowCreateModal(true);
            }}
            variant="outline"
            className="h-20 border-[#D4A024]/30 text-[#D4A024] hover:bg-[#D4A024]/10 flex flex-col items-center justify-center"
          >
            <MessageSquare className="w-6 h-6 mb-1" />
            <span>Annonce</span>
          </Button>
          <Button
            onClick={() => {
              setNewMessage({ ...newMessage, type: 'rappel_cotisation', titre: 'Rappel cotisation', contenu: 'Bonjour,\n\nNous vous rappelons que votre cotisation pour la saison en cours est en attente de règlement.\n\nMerci de régulariser votre situation.' });
              setShowCreateModal(true);
            }}
            variant="outline"
            className="h-20 border-red-600/30 text-red-400 hover:bg-red-900/10 flex flex-col items-center justify-center"
          >
            <CreditCard className="w-6 h-6 mb-1" />
            <span>Rappel cotisation</span>
          </Button>
          <Button
            onClick={() => {
              setNewMessage({ ...newMessage, type: 'rappel_sondage', titre: 'Rappel : Répondez au sondage', contenu: 'Bonjour,\n\nNous vous rappelons de répondre au sondage pour le prochain événement.\n\nMerci de votre participation.' });
              setShowCreateModal(true);
            }}
            variant="outline"
            className="h-20 border-yellow-600/30 text-yellow-400 hover:bg-yellow-900/10 flex flex-col items-center justify-center"
          >
            <Bell className="w-6 h-6 mb-1" />
            <span>Rappel sondage</span>
          </Button>
          <Button
            onClick={() => {
              setNewMessage({ ...newMessage, type: 'sondage', titre: '', contenu: '' });
              setShowCreateModal(true);
            }}
            variant="outline"
            className="h-20 border-green-600/30 text-green-400 hover:bg-green-900/10 flex flex-col items-center justify-center"
          >
            <Users className="w-6 h-6 mb-1" />
            <span>Nouveau sondage</span>
          </Button>
        </div>

        {/* Liste des messages */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-[#D4A024]">
              Historique des messages ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucun message envoyé</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-[#D4A024]/10 hover:border-[#D4A024]/30 transition-all cursor-pointer"
                    onClick={() => viewMessageStats(msg)}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        {getTypeBadge(msg.type)}
                        <h4 className="text-white font-semibold">{msg.titre}</h4>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-1">{msg.contenu}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatDate(msg.created_at)}
                        {msg.destinataires?.length > 0 
                          ? ` • ${msg.destinataires.length} destinataire(s)`
                          : ' • Tous les membres'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#D4A024] hover:bg-[#D4A024]/20"
                        onClick={(e) => { e.stopPropagation(); viewMessageStats(msg); }}
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-400 hover:bg-blue-900/20"
                        onClick={(e) => { e.stopPropagation(); handleResendMessage(msg); }}
                        title="Renvoyer ce message"
                      >
                        <Forward className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-900/20"
                        onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal création de message */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[90vh] flex flex-col">
              <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-serif text-[#D4A024]">
                    {newMessage.type === 'sondage' ? 'Créer un sondage' : 'Nouveau message'}
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
                {/* Type de message */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['annonce', 'rappel_cotisation', 'rappel_sondage', 'sondage'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewMessage({ ...newMessage, type })}
                        className={`px-3 py-2 rounded text-sm transition-all ${
                          newMessage.type === type
                            ? 'bg-[#D4A024] text-[#7A2020] font-bold'
                            : 'bg-black/30 text-gray-300 hover:bg-black/50'
                        }`}
                      >
                        {getTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Titre *</label>
                  <input
                    type="text"
                    value={newMessage.titre}
                    onChange={(e) => setNewMessage({ ...newMessage, titre: e.target.value })}
                    placeholder="Titre du message"
                    className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                    data-testid="message-titre"
                  />
                </div>

                {/* Contenu */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Contenu *</label>
                  <textarea
                    value={newMessage.contenu}
                    onChange={(e) => setNewMessage({ ...newMessage, contenu: e.target.value })}
                    placeholder="Contenu du message..."
                    rows={5}
                    className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white resize-none"
                    data-testid="message-contenu"
                  />
                </div>

                {/* Lier à un événement */}
                {(newMessage.type === 'sondage' || newMessage.type === 'rappel_sondage') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Événement lié</label>
                    <select
                      value={newMessage.evenement_id || ''}
                      onChange={(e) => setNewMessage({ ...newMessage, evenement_id: e.target.value || null })}
                      className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                    >
                      <option value="">-- Aucun --</option>
                      {evenements.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.objet} - {new Date(evt.date).toLocaleDateString('fr-FR')} ({evt.lieu})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Template de sondage */}
                {newMessage.type === 'sondage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type de sondage</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {templates.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => setNewMessage({ ...newMessage, sondage_template_id: tmpl.id })}
                          className={`px-3 py-3 rounded text-sm transition-all border ${
                            newMessage.sondage_template_id === tmpl.id
                              ? 'bg-[#D4A024] text-[#7A2020] font-bold border-[#D4A024]'
                              : 'bg-black/30 text-gray-300 hover:bg-black/50 border-[#D4A024]/30'
                          }`}
                        >
                          {tmpl.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date limite */}
                {newMessage.type === 'sondage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date limite de réponse</label>
                    <input
                      type="datetime-local"
                      value={newMessage.date_limite}
                      onChange={(e) => setNewMessage({ ...newMessage, date_limite: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Par défaut : 21h30 le jour de l'événement
                    </p>
                  </div>
                )}

                {/* Destinataires */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Destinataires
                      <span className="text-gray-500 ml-2">(vide = tous les membres)</span>
                    </label>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllMembers}
                        className="text-xs border-green-600/50 text-green-400 hover:bg-green-900/20"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Tous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={deselectAllMembers}
                        className="text-xs border-gray-600/50 text-gray-400 hover:bg-gray-900/20"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Aucun
                      </Button>
                    </div>
                  </div>
                  
                  {/* Compteur de sélection */}
                  <div className="flex items-center justify-between mb-2 px-2">
                    <span className="text-sm text-gray-400">
                      {membres.length} membre(s) au total
                    </span>
                    {newMessage.destinataires.length > 0 && (
                      <Badge className="bg-[#D4A024] text-[#7A2020]">
                        {newMessage.destinataires.length} sélectionné(s)
                      </Badge>
                    )}
                  </div>
                  
                  {/* Liste des membres - Plus grande */}
                  <div className="h-64 overflow-y-auto bg-black/30 rounded-lg border border-[#D4A024]/20 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {membres.map((membre) => (
                        <label
                          key={membre.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                            newMessage.destinataires.includes(membre.id)
                              ? 'bg-[#D4A024]/20 border border-[#D4A024]/50'
                              : 'bg-black/20 border border-transparent hover:bg-[#D4A024]/10 hover:border-[#D4A024]/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newMessage.destinataires.includes(membre.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewMessage({
                                  ...newMessage,
                                  destinataires: [...newMessage.destinataires, membre.id]
                                });
                              } else {
                                setNewMessage({
                                  ...newMessage,
                                  destinataires: newMessage.destinataires.filter(id => id !== membre.id)
                                });
                              }
                            }}
                            className="w-4 h-4 rounded border-[#D4A024]/50 text-[#D4A024] focus:ring-[#D4A024]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-white text-sm font-medium block truncate">
                              {membre.nom_complet}
                            </span>
                          </div>
                          {membre.situation_cotisation > 0 && (
                            <Badge className="bg-red-600 text-xs flex-shrink-0">Cotisation due</Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 space-y-3">
                {/* Boutons de template */}
                <div className="flex space-x-2">
                  <Button
                    onClick={saveMessageTemplate}
                    size="sm"
                    variant="outline"
                    className="border-blue-600/50 text-blue-400 hover:bg-blue-900/20"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Sauvegarder comme template
                  </Button>
                  <Button
                    onClick={() => setShowTemplatesModal(true)}
                    size="sm"
                    variant="outline"
                    className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Charger un template
                  </Button>
                </div>
                
                {/* Boutons d'action */}
                <div className="flex space-x-3">
                  <Button
                    onClick={handleCreateMessage}
                    className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
                    data-testid="send-message-btn"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer
                  </Button>
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    className="flex-1 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Templates de messages */}
        {showTemplatesModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-lg w-full max-h-[70vh] flex flex-col">
              <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-serif text-[#D4A024]">
                    Templates de messages
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTemplatesModal(false)}
                    className="text-[#D4A024] hover:bg-[#D4A024]/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-4 overflow-y-auto flex-1">
                {messageTemplates.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    Aucun template sauvegardé.<br />
                    Créez un message puis cliquez sur "Sauvegarder comme template".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messageTemplates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="flex items-center justify-between p-3 bg-black/30 rounded border border-[#D4A024]/10 hover:border-[#D4A024]/30"
                      >
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-sm">{tmpl.nom}</h4>
                          <p className="text-gray-400 text-xs line-clamp-1">{tmpl.contenu}</p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => loadTemplate(tmpl)}
                            className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]"
                          >
                            Utiliser
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTemplate(tmpl.id)}
                            className="text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal détails message / stats sondage */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[80vh] flex flex-col">
              <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      {getTypeBadge(selectedMessage.type)}
                    </div>
                    <CardTitle className="text-xl font-serif text-white">
                      {selectedMessage.titre}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setSelectedMessage(null); setMessageStats(null); }}
                    className="text-[#D4A024] hover:bg-[#D4A024]/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="py-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-gray-400 text-sm mb-1">Contenu</h4>
                    <p className="text-white whitespace-pre-wrap">{selectedMessage.contenu}</p>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Envoyé le {formatDate(selectedMessage.created_at)}</span>
                    {selectedMessage.date_limite && (
                      <span>• Limite : {formatDate(selectedMessage.date_limite)}</span>
                    )}
                  </div>

                  {/* Liste des destinataires */}
                  <div className="bg-black/30 rounded-lg p-4 border border-[#D4A024]/20">
                    <h4 className="text-[#D4A024] font-semibold mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Destinataires
                      {selectedMessage.destinataires?.length > 0 ? (
                        <Badge className="ml-2 bg-[#D4A024] text-[#7A2020]">
                          {selectedMessage.destinataires.length} membre(s)
                        </Badge>
                      ) : (
                        <Badge className="ml-2 bg-blue-600 text-white">
                          Tous les membres ({membres.length})
                        </Badge>
                      )}
                    </h4>
                    
                    <div className="max-h-48 overflow-y-auto">
                      {selectedMessage.destinataires?.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedMessage.destinataires.map((destId) => {
                            const membre = membres.find(m => m.id === destId);
                            return (
                              <div 
                                key={destId}
                                className="flex items-center space-x-2 p-2 bg-black/20 rounded"
                              >
                                <div className="w-2 h-2 bg-[#D4A024] rounded-full"></div>
                                <span className="text-white text-sm truncate">
                                  {membre?.nom_complet || destId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {membres.map((membre) => (
                            <div 
                              key={membre.id}
                              className="flex items-center space-x-2 p-2 bg-black/20 rounded"
                            >
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-white text-sm truncate">
                                {membre.nom_complet}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats du sondage */}
                  {messageStats && (
                    <div className="bg-black/30 rounded-lg p-4 mt-4">
                      <h4 className="text-[#D4A024] font-semibold mb-3">Statistiques du sondage</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-white">{messageStats.total_destinataires}</p>
                          <p className="text-gray-400 text-sm">Destinataires</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-[#D4A024]">{messageStats.total_reponses}</p>
                          <p className="text-gray-400 text-sm">Réponses</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-400">{messageStats.taux_reponse}%</p>
                          <p className="text-gray-400 text-sm">Taux</p>
                        </div>
                      </div>

                      {/* Liste des répondants */}
                      {messageStats.reponses?.length > 0 && (
                        <div>
                          <h5 className="text-gray-300 text-sm mb-2">Réponses reçues :</h5>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {messageStats.reponses.map((rep, idx) => {
                              const membre = membres.find(m => m.id === rep.membre_id);
                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded">
                                  <span className="text-white text-sm">{membre?.nom_complet || rep.membre_id}</span>
                                  <Check className="w-4 h-4 text-green-400" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ============ VUE MEMBRE ============
  const unreadCount = notifications.filter(n => !n.lu).length;
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
            Messages
          </h1>
          <p className="text-[#D4A024] text-lg font-serif">
            Annonces et communications du club
          </p>
        </div>
        
        {/* Bouton "Tout lu" */}
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
            data-testid="mark-all-read-btn"
          >
            <CheckCheck className="w-5 h-5 mr-2" />
            Tout marquer comme lu ({unreadCount})
          </Button>
        )}
      </div>

      {/* Liste des messages pour le membre */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucun message pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((msg) => {
            const isRead = readMessages.has(msg.id);
            
            return (
              <Card
                key={msg.id}
                className={`bg-black/40 border-2 backdrop-blur-sm transition-all ${
                  isRead 
                    ? 'border-[#D4A024]/20 opacity-80' 
                    : 'border-[#D4A024]/50 hover:border-[#D4A024]'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Indicateur non lu */}
                      {!isRead && (
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Non lu" />
                      )}
                      {getTypeBadge(msg.type)}
                      <CardTitle className={`text-lg font-serif ${isRead ? 'text-gray-400' : 'text-white'}`}>
                        {msg.titre}
                      </CardTitle>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 text-sm">{formatDate(msg.created_at)}</span>
                      {/* Bouton œil pour marquer comme lu */}
                      {!isRead ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(msg.id)}
                          className="text-[#D4A024] hover:bg-[#D4A024]/20"
                          title="Marquer comme lu"
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-600" title="Lu" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`whitespace-pre-wrap ${isRead ? 'text-gray-500' : 'text-gray-300'}`}>
                    {msg.contenu}
                  </p>
                  
                  {msg.date_limite && (
                    <div className="mt-3 flex items-center text-yellow-400 text-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      Date limite : {formatDate(msg.date_limite)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Messages;
