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

// Charte du club - Version officielle
const CHARTE_CLUB = `IL ÉTAIT UNE FOIS LA BAGUE IMPÉRIALE
Charte du Club

« Douze ans que nous partageons nos cigares avec le ciel, à nous les cigares, à lui la fumée »

LA BAGUE IMPÉRIALE...

L'idée de créer notre club de cigare est née à l'A Conca D'Oru.
Au départ, la volonté de réunir notre petit groupe d'une façon régulière et symbolique autour d'un repas, pour partager notre passion naissante pour les puros, nous a donné envie d'élargir notre cercle et de partager ces moments avec d'autres personnes ayant le même état d'esprit. La Bague Impériale voyait le jour.

Cela nous permet depuis quelques années de nous réunir deux fois par mois pour passer un moment convivial, entre amis ou connaissances, partageant la même passion ou le même attrait pour le cigare.

DÉSIRER ÊTRE « BAGUÉ »...

Aimer partager de bons moments avec des amis, aimer se faire plaisir lors de bons restos, aimer refaire le monde autour d'un bon cognac sont des choses normales et compréhensibles... Mais il ne s'agit pas que de ça...

Être ami de plusieurs membres, être un bon vivant, être une personne agréable et intéressante est quelque chose de non négligeable... Mais ce n'est pas ce qui importe le plus...

Ce sont principalement les passionnés de cigares, ceux désireux de les apprécier et les curieux de les découvrir, qui pourront être bagués...

ÊTRE « BAGUÉ »...

Les « passionnés » ont l'occasion de partager leurs cigares lors de bons moments, échangeant leur passion avec des connaissances, des copains, des amis... des « bagués »...

Les « désireux » ont l'occasion d'apprécier leurs puros dans les meilleures conditions, après un repas, avec un bon digestif, avec de bonnes personnes...

Les « curieux » ont les moyens, lors des apéros, de découvrir les robustos, les coronas, les pirámides, de faire connaissance avec les cigares, leurs marques, leurs terroirs, leurs histoires...

« Ceux qui aiment partager, se faire plaisir, refaire le monde » apprécieront les restos, les apéros, les ateliers, les quiz, les cigares... Et finalement, s'il ne s'agissait que de ça...?

« Les amis, les bons vivants, les personnes agréables et intéressantes » adoreront les sorties en bateau, les tombolas, les anniversaires, les moments de fraternité... Au final, c'est peut-être ce qui importe le plus...

EN CONTREPARTIE...

Les membres du bureau accomplissent un travail remarquable, font preuve d'un incroyable dévouement au Club depuis la création de La Bague, ce qui demande un investissement conséquent afin de pouvoir proposer, à chaque fois, des évènements originaux, et qui, nous l'espérons, plaisent à tout le monde.

Au-delà de la cotisation annuelle, au-delà de la passion du cigare qui nous caractérise tous, nous demandons à chaque membre un minimum d'implication, et cela passe aussi par l'assiduité aux évènements.

Bien entendu, nous sommes conscients que chacun puisse avoir un empêchement, et il n'est pas question ici d'imposer une présence obligatoire. La participation aux évènements du Club est, et doit rester, un plaisir.

Néanmoins, les raisons invoquées ne relèvent pas toujours d'impératifs insurmontables, et sont parfois difficiles à comprendre pour ceux qui donnent de leur temps pour organiser chaque événement et faire en sorte que chacun y prenne du plaisir.

De même, nous encourageons chaque membre à nous faire part de ses critiques ou de ce qui ne lui convient pas au sein du Club.

Pour résumer, le succès du Club dépend aussi, et surtout, de l'implication de ses membres.

« La Bague Impériale ? N'y voyez pas un club d'amis, mais plutôt un club d'amis qui aiment le cigare. »
— Winston Churchill (discours à l'A Conca D'Oru, nov. 2016)`;

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
        
        {/* Liens WhatsApp */}
        <div className="flex flex-col sm:flex-row gap-2">
          <a 
            href="https://chat.whatsapp.com/IYYdAQJFPXq9OMsIaAyaUB"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "https://chat.whatsapp.com/IYYdAQJFPXq9OMsIaAyaUB";
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-serif rounded-md transition-colors"
            data-testid="whatsapp-membres-btn"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            WhatsApp Membres
          </a>
          <a 
            href="https://chat.whatsapp.com/EIveu9mxnGSGOW1Gg78lwp"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "https://chat.whatsapp.com/EIveu9mxnGSGOW1Gg78lwp";
            }}
            className="inline-flex items-center px-4 py-2 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold rounded-md transition-colors"
            data-testid="whatsapp-bureau-btn"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            WhatsApp Bureau
          </a>
        </div>
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
