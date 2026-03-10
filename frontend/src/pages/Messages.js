import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Send,
  Users,
  CreditCard,
  X,
  Check,
  Clock,
  Save,
  FileText,
  Edit3,
  AlertCircle,
  UserPlus,
  UserMinus,
  Calendar,
  Bell,
  ScrollText,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Templates de messages prédéfinis
const MESSAGE_TEMPLATES = [
  {
    id: 'rappel_cotisation',
    titre: 'Rappel de cotisation',
    icon: CreditCard,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    defaultMessage: `Cher membre,

Nous vous rappelons que votre cotisation pour la saison en cours n'a pas encore été réglée.

Merci de régulariser votre situation dans les meilleurs délais.

Cordialement,
Le Bureau de La Bague Impériale`
  },
  {
    id: 'rappel_sondage',
    titre: 'Rappel de sondage',
    icon: Bell,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    defaultMessage: `Cher membre,

Un sondage est en cours et nous attendons votre réponse.

Merci de répondre rapidement afin de faciliter l'organisation.

Cordialement,
Le Bureau de La Bague Impériale`
  },
  {
    id: 'nouvel_evenement',
    titre: 'Nouvel événement',
    icon: Calendar,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    defaultMessage: `Chers membres,

Un nouvel événement a été programmé !

[Détails de l'événement]

Nous espérons vous y voir nombreux.

Cordialement,
Le Bureau de La Bague Impériale`
  },
  {
    id: 'nouveau_membre',
    titre: 'Annonce nouveau membre',
    icon: UserPlus,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    defaultMessage: `Chers membres,

Nous avons le plaisir de vous annoncer l'arrivée d'un nouveau membre dans notre club !

[Nom du nouveau membre]

Merci de lui réserver un accueil chaleureux.

Cordialement,
Le Bureau de La Bague Impériale`
  },
  {
    id: 'sortie_club',
    titre: 'Annonce sortie du club',
    icon: UserMinus,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    defaultMessage: `Chers membres,

Nous vous informons du départ de notre club de :

[Nom du membre]

Nous lui souhaitons bonne continuation.

Cordialement,
Le Bureau de La Bague Impériale`
  },
  {
    id: 'message_libre',
    titre: 'Message libre',
    icon: MessageSquare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    defaultMessage: ``
  }
];

// Charte du club
const CHARTE_CLUB = `CHARTE DE LA BAGUE IMPÉRIALE

Article 1 - Objet du Club
La Bague Impériale est un club de cigares fondé en 2013, réunissant des passionnés autour de la dégustation de cigares de qualité dans une ambiance conviviale et fraternelle.

Article 2 - Adhésion
L'adhésion au club est soumise à parrainage par un membre actif et validation par le bureau. Tout nouveau membre s'engage à respecter la présente charte.

Article 3 - Cotisation
La cotisation annuelle est fixée par le bureau et doit être réglée en début de saison. Tout retard de paiement pourra entraîner une suspension des droits du membre.

Article 4 - Événements
Le club organise régulièrement des apéros, repas et événements spéciaux. Les membres sont tenus de répondre aux sondages dans les délais impartis et de prévenir en cas d'empêchement.

Article 5 - Comportement
Les membres s'engagent à :
- Respecter les autres membres et le personnel des établissements
- Maintenir une attitude courtoise et conviviale
- Participer activement à la vie du club
- Ne pas divulguer d'informations personnelles sur les autres membres

Article 6 - Confidentialité
Les échanges et informations partagées au sein du club restent confidentiels. Aucun membre ne doit communiquer à l'extérieur sur les activités internes du club sans autorisation.

Article 7 - Sanctions
Tout manquement grave à la présente charte pourra entraîner un avertissement, une suspension temporaire ou une exclusion définitive, sur décision du bureau.

Article 8 - Modification
La présente charte peut être modifiée sur proposition du bureau et après consultation des membres.

Fait à [Ville], le [Date]
Le Bureau de La Bague Impériale`;

const Messages = () => {
  const { isAdmin } = useUser();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [showCharteModal, setShowCharteModal] = useState(false);
  const [editingCharte, setEditingCharte] = useState(false);
  const [charteContent, setCharteContent] = useState(CHARTE_CLUB);
  const [sending, setSending] = useState(false);
  const [membres, setMembres] = useState([]);
  const [selectedMembres, setSelectedMembres] = useState([]);
  const [sendToAll, setSendToAll] = useState(true);

  // URL WhatsApp du groupe
  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/IYYdAQJFPXq9OMsIaAyaUB";

  // Fonction pour copier le texte dans le presse-papier
  const copyToClipboard = async (text, templateName = '') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(templateName ? `"${templateName}" copié !` : 'Message copié !');
    } catch (err) {
      // Fallback pour les navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(templateName ? `"${templateName}" copié !` : 'Message copié !');
    }
  };

  useEffect(() => {
    loadMembres();
  }, []);

  const loadMembres = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembres(response.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setMessageTitle(template.titre);
    setMessageContent(template.defaultMessage);
  };

  const closeTemplate = () => {
    setSelectedTemplate(null);
    setMessageContent('');
    setMessageTitle('');
    setSelectedMembres([]);
    setSendToAll(true);
  };

  const sendMessage = async () => {
    if (!messageContent.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }

    setSending(true);
    try {
      const destinataires = sendToAll 
        ? membres.map(m => m.id)
        : selectedMembres;

      await axios.post(`${API}/messages`, {
        type: selectedTemplate?.id || 'message_libre',
        titre: messageTitle || 'Message du club',
        contenu: messageContent,
        destinataires: destinataires
      });

      toast.success('Message envoyé avec succès !');
      closeTemplate();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  // Redirection si pas admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="bg-black/40 border-2 border-red-500/30 p-8">
          <p className="text-red-400">Accès réservé à l'administrateur</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
            Messages
          </h1>
          <p className="text-[#D4A024] text-lg font-serif">
            Gestion des communications du club
          </p>
        </div>
        
        {/* Lien WhatsApp */}
        <a 
          href="https://chat.whatsapp.com/IYYdAQJFPXq9OMsIaAyaUB"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-serif rounded-md transition-colors"
          data-testid="whatsapp-btn"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Discussion WhatsApp
        </a>
      </div>

      {/* Templates de messages */}
      <div>
        <h2 className="text-xl font-serif text-white mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-[#D4A024]" />
          Messages pré-enregistrés
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MESSAGE_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className={`bg-black/40 border-2 ${template.borderColor} backdrop-blur-sm transition-all hover:scale-[1.02]`}
              >
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-4 flex-1 cursor-pointer"
                      onClick={() => selectTemplate(template)}
                    >
                      <div className={`p-3 rounded-lg ${template.bgColor}`}>
                        <Icon className={`w-6 h-6 ${template.color}`} />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{template.titre}</h3>
                        <p className="text-gray-400 text-sm">Cliquez pour utiliser</p>
                      </div>
                    </div>
                    {template.defaultMessage && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(template.defaultMessage, template.titre);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-[#D4A024] hover:bg-[#D4A024]/20 hover:text-[#D4A024]"
                        data-testid={`copy-template-${template.id}`}
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charte du club */}
      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-white flex items-center justify-between">
            <div className="flex items-center">
              <ScrollText className="w-5 h-5 mr-2 text-[#D4A024]" />
              Charte du Club
            </div>
            <Button
              onClick={() => setShowCharteModal(true)}
              variant="outline"
              className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Voir / Modifier
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            La charte définit les règles et valeurs du club. Elle peut être partagée avec les nouveaux membres.
          </p>
        </CardContent>
      </Card>

      {/* Modal Template sélectionné */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1C1917] border-2 border-[#D4A024] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {React.createElement(selectedTemplate.icon, {
                    className: `w-6 h-6 ${selectedTemplate.color}`
                  })}
                  <CardTitle className="text-xl font-serif text-white">
                    {selectedTemplate.titre}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  onClick={closeTemplate}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto py-6 space-y-4">
              {/* Titre du message */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Titre du message</label>
                <Input
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="bg-black/30 border-[#D4A024]/30 text-white"
                  placeholder="Titre..."
                />
              </div>
              
              {/* Contenu du message */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Contenu du message</label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="bg-black/30 border-[#D4A024]/30 text-white min-h-[250px]"
                  placeholder="Rédigez votre message..."
                />
              </div>
              
              {/* Destinataires */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Destinataires</label>
                <div className="flex items-center space-x-4 mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToAll}
                      onChange={(e) => setSendToAll(e.target.checked)}
                      className="w-4 h-4 accent-[#D4A024]"
                    />
                    <span className="text-white">Tous les membres ({membres.length})</span>
                  </label>
                </div>
                
                {!sendToAll && (
                  <div className="max-h-40 overflow-y-auto bg-black/30 rounded-lg p-3 space-y-2">
                    {membres.map((membre) => (
                      <label key={membre.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMembres.includes(membre.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembres([...selectedMembres, membre.id]);
                            } else {
                              setSelectedMembres(selectedMembres.filter(id => id !== membre.id));
                            }
                          }}
                          className="w-4 h-4 accent-[#D4A024]"
                        />
                        <span className="text-gray-300">{membre.nom_complet}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 flex space-x-3">
              <Button
                onClick={() => copyToClipboard(messageContent)}
                disabled={!messageContent.trim()}
                variant="outline"
                className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                data-testid="copy-message-btn"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copier
              </Button>
              <Button
                onClick={sendMessage}
                disabled={sending || !messageContent.trim()}
                className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
              >
                {sending ? (
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                Envoyer
              </Button>
              <Button
                onClick={closeTemplate}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Annuler
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Charte */}
      {showCharteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1C1917] border-2 border-[#D4A024] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b border-[#D4A024]/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white flex items-center">
                  <ScrollText className="w-5 h-5 mr-2 text-[#D4A024]" />
                  Charte du Club
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setEditingCharte(!editingCharte)}
                    variant="outline"
                    size="sm"
                    className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    {editingCharte ? 'Aperçu' : 'Modifier'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCharteModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto py-6">
              {editingCharte ? (
                <Textarea
                  value={charteContent}
                  onChange={(e) => setCharteContent(e.target.value)}
                  className="bg-black/30 border-[#D4A024]/30 text-white min-h-[500px] font-mono text-sm"
                />
              ) : (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-300 font-serif text-sm leading-relaxed">
                    {charteContent}
                  </pre>
                </div>
              )}
            </CardContent>
            
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30 flex space-x-3">
              <Button
                onClick={() => copyToClipboard(charteContent, 'Charte du Club')}
                variant="outline"
                className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                data-testid="copy-charte-btn"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copier
              </Button>
              {editingCharte && (
                <Button
                  onClick={() => {
                    toast.success('Charte sauvegardée');
                    setEditingCharte(false);
                  }}
                  className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Sauvegarder
                </Button>
              )}
              <Button
                onClick={() => setShowCharteModal(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
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

export default Messages;
