import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, TrendingUp, Star, Calendar, DollarSign, MessageSquare, Download, X, Bell, RefreshCw, Check, CheckCircle, ScrollText, ChevronDown, ChevronUp, UserPlus, Trash2, CreditCard, Key, Eye, EyeOff, Copy, ExternalLink, Phone, Send } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Fonction pour extraire le mot-clé principal d'un plat
// Utilisée pour le résumé après validation du choix
const extractKeyword = (platComplet) => {
  if (!platComplet) return '';
  
  // Mots-clés d'ingrédients principaux à rechercher
  const ingredients = [
    // Viandes
    'agneau', 'veau', 'boeuf', 'bœuf', 'porc', 'échine', 'filet', 'côte', 'entrecôte',
    'poulet', 'canard', 'magret', 'foie gras', 'volaille',
    // Poissons & fruits de mer
    'langoustine', 'langoustines', 'homard', 'langouste', 'crevette', 'crevettes',
    'loup', 'bar', 'daurade', 'dorade', 'thon', 'saumon', 'cabillaud', 'maigre',
    'moules', 'huîtres', 'saint-jacques', 'coquilles',
    // Préparations
    'risotto', 'ravioli', 'raviolis', 'tartare', 'carpaccio', 'crudo',
    'salade', 'velouté', 'soupe', 'mousse', 'tarte', 'fondant', 'macaron',
    // Autres
    'truffe', 'fraises', 'chocolat', 'framboise', 'citron'
  ];
  
  const platLower = platComplet.toLowerCase();
  
  // Chercher le premier ingrédient trouvé
  for (const ingredient of ingredients) {
    if (platLower.includes(ingredient)) {
      // Capitaliser la première lettre
      return ingredient.charAt(0).toUpperCase() + ingredient.slice(1);
    }
  }
  
  // Si aucun ingrédient trouvé, prendre les 2-3 premiers mots
  const mots = platComplet.split(/[,\s]+/).filter(m => m.length > 2);
  return mots.slice(0, 2).join(' ');
};

// ============ CHARTE DU CLUB ============
const CHARTE_CLUB = {
  titre: "Il était une fois La Bague Impériale",
  sousTitre: "Charte du Club",
  citation: "« Douze ans que nous partageons nos cigares avec le ciel, à nous les cigares, à lui la fumée »",
  sections: [
    {
      titre: "La Bague Impériale...",
      contenu: `L'idée de créer notre club de cigare est née à l'A Conca D'Oru.
Au départ, la volonté de réunir notre petit groupe d'une façon régulière et symbolique autour d'un repas, pour partager notre passion naissante pour les puros, nous a donné envie d'élargir notre cercle et de partager ces moments avec d'autres personnes ayant le même état d'esprit. La Bague Impériale voyait le jour.

Cela nous permet depuis quelques années de nous réunir deux fois par mois pour passer un moment convivial, entre amis ou connaissances, partageant la même passion ou le même attrait pour le cigare.`
    },
    {
      titre: "Désirer être « bagué »...",
      contenu: `Aimer partager de bons moments avec des amis, aimer se faire plaisir lors de bons restos, aimer refaire le monde autour d'un bon cognac sont des choses normales et compréhensibles... Mais il ne s'agit pas que de ça...

Être ami de plusieurs membres, être un bon vivant, être une personne agréable et intéressante est quelque chose de non négligeable... Mais ce n'est pas ce qui importe le plus...

Ce sont principalement les passionnés de cigares, ceux désireux de les apprécier et les curieux de les découvrir, qui pourront être bagués...`
    },
    {
      titre: "Être « bagué »...",
      contenu: `Les « passionnés » ont l'occasion de partager leurs cigares lors de bons moments, échangeant leur passion avec des connaissances, des copains, des amis... des « bagués »...

Les « désireux » ont l'occasion d'apprécier leurs puros dans les meilleures conditions, après un repas, avec un bon digestif, avec de bonnes personnes...

Les « curieux » ont les moyens, lors des apéros, de découvrir les robustos, les coronas, les pirámides, de faire connaissance avec les cigares, leurs marques, leurs terroirs, leurs histoires...

« Ceux qui aiment partager, se faire plaisir, refaire le monde » apprécieront les restos, les apéros, les ateliers, les quiz, les cigares... Et finalement, s'il ne s'agissait que de ça...?

« Les amis, les bons vivants, les personnes agréables et intéressantes » adoreront les sorties en bateau, les tombolas, les anniversaires, les moments de fraternité... Au final, c'est peut-être ce qui importe le plus...`
    },
    {
      titre: "En contrepartie...",
      contenu: `Les membres du bureau accomplissent un travail remarquable, font preuve d'un incroyable dévouement au Club depuis la création de La Bague, ce qui demande un investissement conséquent afin de pouvoir proposer, à chaque fois, des évènements originaux, et qui, nous l'espérons, plaisent à tout le monde.

Au-delà de la cotisation annuelle, au-delà de la passion du cigare qui nous caractérise tous, nous demandons à chaque membre un minimum d'implication, et cela passe aussi par l'assiduité aux évènements.

Bien entendu, nous sommes conscients que chacun puisse avoir un empêchement, et il n'est pas question ici d'imposer une présence obligatoire. La participation aux évènements du Club est, et doit rester, un plaisir.

Néanmoins, les raisons invoquées ne relèvent pas toujours d'impératifs insurmontables, et sont parfois difficiles à comprendre pour ceux qui donnent de leur temps pour organiser chaque événement et faire en sorte que chacun y prenne du plaisir.

De même, nous encourageons chaque membre à nous faire part de ses critiques ou de ce qui ne lui convient pas au sein du Club.

Pour résumer, le succès du Club dépend aussi, et surtout, de l'implication de ses membres.`
    }
  ],
  citationFinale: "« La Bague Impériale ? N'y voyez pas un club d'amis, mais plutôt un club d'amis qui aiment le cigare. »",
  auteur: "— Winston Churchill (discours à l'A Conca D'Oru, nov. 2016)"
};

// Composant Charte du Club
const CharteClub = ({ defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
      <CardHeader 
        className="cursor-pointer hover:bg-[#D4A024]/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
            <ScrollText className="w-6 h-6 mr-3" />
            {CHARTE_CLUB.titre}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-[#D4A024]">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
        <p className="text-gray-400 italic text-base mt-1">{CHARTE_CLUB.citation}</p>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {CHARTE_CLUB.sections.map((section, idx) => (
              <div key={idx} className="border-l-2 border-[#D4A024]/30 pl-4">
                <h3 className="text-lg font-serif font-semibold text-[#D4A024] mb-2">
                  {section.titre}
                </h3>
                <div className="text-gray-300 leading-relaxed whitespace-pre-line text-base">
                  {section.contenu}
                </div>
              </div>
            ))}
            
            {/* Citation finale */}
            <div className="mt-8 pt-6 border-t border-[#D4A024]/20 text-center">
              <p className="text-[#D4A024] italic text-lg font-serif">
                {CHARTE_CLUB.citationFinale}
              </p>
              <p className="text-gray-400 mt-2 text-base">
                {CHARTE_CLUB.auteur}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ============ COMPOSANT DASHBOARD MEMBRE ============
const DashboardMembre = ({ prochainEvenement, prochainEvenementInfo, currentMember }) => {
  const [reponse, setReponse] = useState(null); // null, 'oui', 'non'
  const [reponseEnvoyee, setReponseEnvoyee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingReponse, setExistingReponse] = useState(null);
  
  // Choix de menu pour les repas
  const [choixEntree, setChoixEntree] = useState(null);
  const [choixPlat, setChoixPlat] = useState(null);
  const [choixDessert, setChoixDessert] = useState(null);
  
  // Afficher le menu avant de répondre
  const [showMenuPreview, setShowMenuPreview] = useState(false);
  
  // Messages non lus
  const [messagesNonLus, setMessagesNonLus] = useState([]);
  const [messageOuvert, setMessageOuvert] = useState(null);
  
  // Stats personnelles
  const [statsPerso, setStatsPerso] = useState(null);

  // Charger les messages non lus et les stats perso
  useEffect(() => {
    const loadMemberData = async () => {
      if (!currentMember?.id) return;
      
      try {
        // Charger les notifications (messages non lus)
        const notifResponse = await axios.get(`${API}/notifications/${currentMember.id}`);
        const notifications = notifResponse.data || [];
        
        // Filtrer les non lus et récupérer les messages correspondants
        const nonLusNotifs = notifications.filter(n => !n.lu && n.message_id);
        
        if (nonLusNotifs.length > 0) {
          // Charger les détails des messages
          const messagesResponse = await axios.get(`${API}/messages`);
          const allMessages = messagesResponse.data || [];
          
          const messagesAvecNotif = nonLusNotifs.map(notif => {
            const msg = allMessages.find(m => m.id === notif.message_id);
            return msg ? { ...msg, notif_id: notif.id } : null;
          }).filter(Boolean);
          
          setMessagesNonLus(messagesAvecNotif);
        }
        
        // Charger les stats personnelles pour la saison 13
        const statsResponse = await axios.get(`${API}/statistiques/saison/13`);
        const statsData = statsResponse.data;
        
        if (statsData && statsData.membres) {
          const membreStats = statsData.membres.find(m => m.membre_id === currentMember.id);
          if (membreStats) {
            setStatsPerso({
              ...membreStats,
              config: statsData.config
            });
          }
        }
      } catch (error) {
        console.error('Erreur chargement données membre:', error);
      }
    };
    
    loadMemberData();
  }, [currentMember]);

  // Charger la réponse existante du membre
  useEffect(() => {
    const loadExistingReponse = async () => {
      if (!prochainEvenement?.id || !currentMember?.id) return;
      
      try {
        // Chercher les réponses au sondage de cet événement
        const response = await axios.get(`${API}/reponses-sondages/${prochainEvenement.id}/${currentMember.id}`);
        if (response.data) {
          setExistingReponse(response.data);
          setReponse(response.data.present ? 'oui' : 'non');
          setReponseEnvoyee(true);
          // Charger les choix de menu existants
          if (response.data.choix_entree) setChoixEntree(response.data.choix_entree);
          if (response.data.choix_plat) setChoixPlat(response.data.choix_plat);
          if (response.data.choix_dessert) setChoixDessert(response.data.choix_dessert);
        }
      } catch (error) {
        // Pas de réponse existante, c'est normal
        console.log('Pas de réponse existante');
      }
    };
    
    loadExistingReponse();
  }, [prochainEvenement, currentMember]);

  // Ouvrir un message et le marquer comme lu
  const openMessage = async (msg) => {
    setMessageOuvert(msg);
    
    // Marquer comme lu via l'API
    if (msg.notif_id) {
      try {
        await axios.put(`${API}/notifications/${msg.notif_id}/read`);
        // Retirer le message de la liste des non lus
        setMessagesNonLus(prev => prev.filter(m => m.id !== msg.id));
      } catch (error) {
        console.error('Erreur marquage lu:', error);
      }
    }
  };

  // Fermer le message
  const closeMessage = () => {
    setMessageOuvert(null);
  };

  // Formater la date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculer la date limite du sondage selon le type d'événement
  const getDateLimiteSondage = (evenement) => {
    if (!evenement) return null;
    const dateEvt = new Date(evenement.date);
    
    if (evenement.type_sondage === 'repas' || evenement.objet?.toLowerCase().includes('repas')) {
      // Repas : minuit (00:00 du jour suivant) pour pouvoir consulter les réponses en cas de conflit
      dateEvt.setDate(dateEvt.getDate() + 1);
      dateEvt.setHours(0, 0, 0, 0);
      return dateEvt;
    } else if (evenement.type_sondage === 'apero' || evenement.objet?.toLowerCase().includes('apéro')) {
      dateEvt.setHours(19, 0, 0, 0);
      return dateEvt;
    } else if (evenement.type_sondage === 'anniversaire' || evenement.objet?.toLowerCase().includes('anniversaire')) {
      dateEvt.setHours(23, 59, 59, 0);
      return dateEvt;
    }
    dateEvt.setHours(21, 30, 0, 0);
    return dateEvt;
  };

  const dateLimite = getDateLimiteSondage(prochainEvenement);
  const now = new Date();
  const sondageActif = dateLimite && now < dateLimite;

  const formatDateLimite = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Envoyer la réponse au sondage
  const handleSubmitReponse = async () => {
    if (!reponse || !currentMember?.id || !prochainEvenement?.id) {
      toast.error('Veuillez sélectionner une réponse');
      return;
    }

    // Si c'est un repas et présent, vérifier les choix de menu
    const isRepas = prochainEvenement.type_sondage === 'repas';
    if (isRepas && reponse === 'oui') {
      if (!choixEntree || !choixPlat || !choixDessert) {
        toast.error('Veuillez sélectionner vos choix de menu');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        evenement_id: prochainEvenement.id,
        membre_id: currentMember.id,
        present: reponse === 'oui'
      };
      
      // Ajouter les choix de menu si présent à un repas
      if (isRepas && reponse === 'oui') {
        payload.choix_entree = choixEntree;
        payload.choix_plat = choixPlat;
        payload.choix_dessert = choixDessert;
      }
      
      await axios.post(`${API}/reponses-sondages`, payload);
      
      setReponseEnvoyee(true);
      toast.success('Votre réponse a été enregistrée !');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-white mb-2">
          Bienvenue à La Bague Impériale
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Votre espace membre {currentMember?.nom_complet && `- ${currentMember.nom_complet}`}
        </p>
      </div>

      {/* MESSAGES NON LUS */}
      {messagesNonLus.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-serif text-white flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-red-400" />
            Messages non lus ({messagesNonLus.length})
          </h2>
          {messagesNonLus.map((msg) => (
            <Card 
              key={msg.id}
              onClick={() => openMessage(msg)}
              className="bg-black/40 border-2 border-red-500/50 backdrop-blur-sm cursor-pointer hover:border-red-400 transition-all"
              data-testid={`unread-message-${msg.id}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mt-2" />
                    <div>
                      <h3 className="text-white font-semibold">{msg.titre}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2 mt-1">{msg.contenu}</p>
                      <p className="text-gray-500 text-xs mt-2">{formatDate(msg.created_at)}</p>
                    </div>
                  </div>
                  <Badge className="bg-red-600 text-white text-xs">
                    Non lu
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL MESSAGE COMPLET */}
      {messageOuvert && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeMessage}
        >
          <Card 
            className="bg-[#1C1917] border-2 border-[#D4A024] w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white">
                  {messageOuvert.titre}
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={closeMessage}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <p className="text-gray-500 text-sm mt-2">
                {formatDate(messageOuvert.created_at)}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-200 whitespace-pre-wrap text-base leading-relaxed">
                {messageOuvert.contenu}
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={closeMessage}
                  className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                >
                  Fermer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STATS PERSONNELLES SAISON 13 */}
      {statsPerso && (
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-[#D4A024]" />
              Vos statistiques - Saison 13
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* % Global Saison */}
              <div className="bg-black/30 rounded-lg p-4 text-center border border-[#D4A024]/20">
                <p className="text-gray-400 text-base mb-1">Présence saison</p>
                <p className="text-3xl font-bold text-[#D4A024]">{statsPerso.pct_global}%</p>
              </div>
              
              {/* Apéros */}
              <div className="bg-black/30 rounded-lg p-4 text-center border border-amber-500/20">
                <p className="text-gray-400 text-base mb-1">Apéros</p>
                <p className="text-2xl font-bold text-amber-400">
                  {statsPerso.presences_aperos}/{statsPerso.config?.nb_aperos || 0}
                </p>
                <p className="text-amber-400/70 text-base">{statsPerso.pct_aperos}%</p>
              </div>
              
              {/* Repas */}
              <div className="bg-black/30 rounded-lg p-4 text-center border border-blue-500/20">
                <p className="text-gray-400 text-base mb-1">Repas</p>
                <p className="text-2xl font-bold text-blue-400">
                  {statsPerso.presences_repas}/{statsPerso.config?.nb_repas || 0}
                </p>
                <p className="text-blue-400/70 text-base">{statsPerso.pct_repas}%</p>
              </div>
              
              {/* Anniversaires */}
              <div className="bg-black/30 rounded-lg p-4 text-center border border-purple-500/20">
                <p className="text-gray-400 text-base mb-1">Anniversaires</p>
                <p className="text-2xl font-bold text-purple-400">
                  {statsPerso.presences_anniversaires}/{statsPerso.config?.nb_anniversaires || 0}
                </p>
                <p className="text-purple-400/70 text-base">{statsPerso.pct_anniversaires}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SONDAGE EN COURS */}
      {prochainEvenement && (
        <Card className={`bg-black/40 border-2 backdrop-blur-sm ${
          reponseEnvoyee 
            ? 'border-green-500' 
            : sondageActif 
              ? 'border-yellow-500/50' 
              : 'border-red-500/50'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-serif text-white flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-[#D4A024]" />
                Prochain événement
              </CardTitle>
              {reponseEnvoyee ? (
                <Badge className="bg-green-600 text-white flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Réponse envoyée
                </Badge>
              ) : sondageActif ? (
                <Badge className="bg-yellow-600 text-white animate-pulse">
                  En attente de réponse
                </Badge>
              ) : (
                <Badge className="bg-red-600 text-white">
                  Sondage fermé
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Détails de l'événement */}
            <div className="bg-black/30 rounded-lg p-4 border border-[#D4A024]/20">
              <h3 className="text-xl font-serif text-[#D4A024] mb-2">
                {prochainEvenement.objet}
              </h3>
              <div className="space-y-2 text-gray-300">
                <p className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-[#D4A024]" />
                  {new Date(prochainEvenement.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="flex items-center">
                  <span className="mr-2">📍</span>
                  {prochainEvenement.lieu}
                </p>
              </div>
              
              {/* Image de l'événement (menu, affiche, etc.) */}
              {prochainEvenement.image_url && (
                <div className="mt-4">
                  <img 
                    src={prochainEvenement.image_url} 
                    alt={prochainEvenement.objet}
                    className="w-full max-h-64 object-contain rounded-lg border border-[#D4A024]/30 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(prochainEvenement.image_url, '_blank')}
                    title="Cliquer pour agrandir"
                  />
                </div>
              )}
            </div>

            {/* Date limite du sondage */}
            {dateLimite && (
              <div className={`rounded-lg p-3 border ${
                reponseEnvoyee
                  ? 'bg-green-900/20 border-green-600/30'
                  : sondageActif 
                    ? 'bg-yellow-900/20 border-yellow-600/30' 
                    : 'bg-red-900/20 border-red-600/30'
              }`}>
                <p className={`text-sm flex items-center ${
                  reponseEnvoyee
                    ? 'text-green-400'
                    : sondageActif 
                      ? 'text-yellow-400' 
                      : 'text-red-400'
                }`}>
                  {reponseEnvoyee ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Vous avez répondu : <strong className="ml-1">{reponse === 'oui' ? 'PRÉSENT' : 'ABSENT'}</strong>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      {sondageActif 
                        ? `Date limite : ${formatDateLimite(dateLimite)}`
                        : `Sondage clôturé depuis le ${formatDateLimite(dateLimite)}`
                      }
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Formulaire de sondage */}
            {sondageActif && (
              <div className={`rounded-lg p-4 border ${
                reponseEnvoyee 
                  ? 'bg-green-900/20 border-green-500/50' 
                  : 'bg-[#D4A024]/10 border-[#D4A024]/30'
              }`}>
                <h4 className={`font-semibold mb-4 flex items-center ${
                  reponseEnvoyee ? 'text-green-400' : 'text-[#D4A024]'
                }`}>
                  {reponseEnvoyee ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Réponse enregistrée
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Votre réponse
                    </>
                  )}
                </h4>
                
                {/* Présence */}
                <div className="mb-4">
                  <p className="text-white mb-3">Serez-vous présent ?</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { setReponse('oui'); setReponseEnvoyee(false); }}
                      className={`flex-1 transition-all duration-200 ${
                        reponse === 'oui'
                          ? 'bg-green-600 border-green-500 text-white font-bold shadow-lg shadow-green-500/30'
                          : 'border-green-600/50 text-green-400 hover:bg-green-900/30'
                      }`}
                    >
                      <Check className={`w-5 h-5 mr-2 flex-shrink-0 ${reponse === 'oui' ? 'animate-bounce' : ''}`} />
                      OUI, je serai présent
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setReponse('non'); setReponseEnvoyee(false); }}
                      className={`flex-1 transition-all duration-200 ${
                        reponse === 'non'
                          ? 'bg-red-600 border-red-500 text-white font-bold shadow-lg shadow-red-500/30'
                          : 'border-red-600/50 text-red-400 hover:bg-red-900/30'
                      }`}
                    >
                      <X className={`w-5 h-5 mr-2 flex-shrink-0 ${reponse === 'non' ? 'animate-bounce' : ''}`} />
                      NON, absent
                    </Button>
                  </div>
                  
                  {/* Bouton Voir Menu (avant de répondre) */}
                  {prochainEvenement.type_sondage === 'repas' && !reponse && prochainEvenement.options_sondage && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowMenuPreview(!showMenuPreview)}
                        className="w-full border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/10"
                        data-testid="voir-menu-btn"
                      >
                        <span className="mr-2">🍽️</span>
                        {showMenuPreview ? 'Masquer le menu' : 'Voir le menu'}
                      </Button>
                    </div>
                  )}
                  
                  {/* Aperçu du menu (avant de répondre) */}
                  {prochainEvenement.type_sondage === 'repas' && showMenuPreview && !reponse && prochainEvenement.options_sondage && (
                    <div className="mt-4 p-4 bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg space-y-4">
                      <h5 className="text-[#D4A024] font-semibold flex items-center text-lg">
                        <span className="mr-2">📋</span>
                        Menu du repas
                      </h5>
                      
                      {prochainEvenement.options_sondage.entrees && prochainEvenement.options_sondage.entrees.length > 0 && (
                        <div>
                          <p className="text-base text-gray-400 font-medium mb-2">Entrées :</p>
                          <div className="space-y-2">
                            {prochainEvenement.options_sondage.entrees.map((e, i) => (
                              <div key={i}>
                                {i > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                                <p className="text-white text-lg">{e}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {prochainEvenement.options_sondage.plats && prochainEvenement.options_sondage.plats.length > 0 && (
                        <div>
                          <p className="text-base text-gray-400 font-medium mb-2">Plats :</p>
                          <div className="space-y-2">
                            {prochainEvenement.options_sondage.plats.map((p, i) => (
                              <div key={i}>
                                {i > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                                <p className="text-white text-lg">{p}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {prochainEvenement.options_sondage.desserts && prochainEvenement.options_sondage.desserts.length > 0 && (
                        <div>
                          <p className="text-base text-gray-400 font-medium mb-2">Desserts :</p>
                          <div className="space-y-2">
                            {prochainEvenement.options_sondage.desserts.map((d, i) => (
                              <div key={i}>
                                {i > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                                <p className="text-white text-lg">{d}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Choix de menu pour les repas */}
                {prochainEvenement.type_sondage === 'repas' && reponse === 'oui' && prochainEvenement.options_sondage && (
                  <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-4">
                    <h5 className="text-blue-400 font-semibold flex items-center text-lg">
                      <span className="mr-2">🍽️</span>
                      Vos choix de menu
                    </h5>
                    
                    {/* Entrées */}
                    {prochainEvenement.options_sondage.entrees && prochainEvenement.options_sondage.entrees.length > 0 && (
                      <div>
                        <p className="text-base text-gray-400 mb-2 font-medium">Entrée :</p>
                        <div className="space-y-2">
                          {prochainEvenement.options_sondage.entrees.map((entree, idx) => (
                            <div key={idx}>
                              {idx > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                              <Button
                                variant="outline"
                                onClick={() => { setChoixEntree(entree); setReponseEnvoyee(false); }}
                                className={`w-full text-left whitespace-normal h-auto py-3 px-4 transition-all text-base ${
                                  choixEntree === entree
                                    ? 'bg-amber-600 border-amber-500 text-white'
                                    : 'border-amber-600/50 text-amber-400 hover:bg-amber-900/30'
                                }`}
                              >
                                {entree}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Plats */}
                    {prochainEvenement.options_sondage.plats && prochainEvenement.options_sondage.plats.length > 0 && (
                      <div>
                        <p className="text-base text-gray-400 mb-2 font-medium">Plat :</p>
                        <div className="space-y-2">
                          {prochainEvenement.options_sondage.plats.map((plat, idx) => (
                            <div key={idx}>
                              {idx > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                              <Button
                                variant="outline"
                                onClick={() => { setChoixPlat(plat); setReponseEnvoyee(false); }}
                                className={`w-full text-left whitespace-normal h-auto py-3 px-4 transition-all text-base ${
                                  choixPlat === plat
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'border-blue-600/50 text-blue-400 hover:bg-blue-900/30'
                                }`}
                              >
                                {plat}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Desserts */}
                    {prochainEvenement.options_sondage.desserts && prochainEvenement.options_sondage.desserts.length > 0 && (
                      <div>
                        <p className="text-base text-gray-400 mb-2 font-medium">Dessert :</p>
                        <div className="space-y-2">
                          {prochainEvenement.options_sondage.desserts.map((dessert, idx) => (
                            <div key={idx}>
                              {idx > 0 && <p className="text-[#D4A024] font-bold text-center my-2">OU</p>}
                              <Button
                                variant="outline"
                                onClick={() => { setChoixDessert(dessert); setReponseEnvoyee(false); }}
                                className={`w-full text-left whitespace-normal h-auto py-3 px-4 transition-all text-base ${
                                  choixDessert === dessert
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'border-purple-600/50 text-purple-400 hover:bg-purple-900/30'
                                }`}
                              >
                                {dessert}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirmation visuelle */}
                {reponseEnvoyee && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                    <p className="text-green-400 text-center font-semibold flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Votre réponse "{reponse === 'oui' ? 'PRÉSENT' : 'ABSENT'}" a été enregistrée !
                    </p>
                    {reponse === 'oui' && prochainEvenement?.type_sondage === 'repas' && (choixEntree || choixPlat || choixDessert) && (
                      <div className="mt-3 pt-3 border-t border-green-500/30">
                        <p className="text-green-300 text-center text-sm mb-2">Votre menu :</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {choixEntree && (
                            <Badge className="bg-amber-600/80 text-white">
                              {extractKeyword(choixEntree)}
                            </Badge>
                          )}
                          {choixPlat && (
                            <Badge className="bg-blue-600/80 text-white">
                              {extractKeyword(choixPlat)}
                            </Badge>
                          )}
                          {choixDessert && (
                            <Badge className="bg-purple-600/80 text-white">
                              {extractKeyword(choixDessert)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-green-400/70 text-center text-sm mt-2">
                      Vous pouvez modifier votre réponse jusqu'à la date limite
                    </p>
                  </div>
                )}

                {/* Bouton d'envoi */}
                <Button 
                  onClick={handleSubmitReponse}
                  disabled={!reponse || loading}
                  className={`w-full font-bold transition-all duration-200 ${
                    reponseEnvoyee
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]'
                  }`}
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  ) : reponseEnvoyee ? (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  ) : (
                    <MessageSquare className="w-5 h-5 mr-2" />
                  )}
                  {reponseEnvoyee ? 'Modifier ma réponse' : 'Enregistrer ma réponse'}
                </Button>
              </div>
            )}

            {/* Message si sondage fermé */}
            {!sondageActif && (
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <p className="text-gray-400">
                  Le sondage pour cet événement est terminé.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pas d'événement */}
      {!prochainEvenement && prochainEvenementInfo && (
        <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader className="border-b border-cyan-500/30">
            <CardTitle className="text-lg font-serif text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-cyan-400" />
              Prochain événement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-serif">
                {prochainEvenementInfo.type_evenement === 'repas' ? '🍽️ Repas' : '🥂 Apéro'}
              </Badge>
              <span className="text-gray-400 text-sm">
                {new Date(prochainEvenementInfo.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/20">
              <p className="text-gray-300 flex items-center">
                <span className="text-cyan-400 mr-2">📍</span>
                {prochainEvenementInfo.lieu}
              </p>
            </div>
            
            <p className="text-gray-500 text-sm italic text-center">
              Plus d'informations à venir...
            </p>
          </CardContent>
        </Card>
      )}

      {!prochainEvenement && !prochainEvenementInfo && (
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardContent className="py-8 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun événement à venir</p>
            <p className="text-gray-500 text-sm mt-1">Vous serez notifié dès qu'un événement sera programmé</p>
          </CardContent>
        </Card>
      )}

      {/* Charte du Club */}
      <CharteClub defaultExpanded={false} />
    </div>
  );
};


const Dashboard = () => {
  const { isAdmin, currentMember } = useUser();
  const [members, setMembers] = useState([]);
  const [prochainEvenement, setProchainEvenement] = useState(null);
  const [prochainEvenementInfo, setProchainEvenementInfo] = useState(null); // Info préliminaire (avant création événement)
  const [nonRepondants, setNonRepondants] = useState([]);
  const [loadingRelance, setLoadingRelance] = useState(false);
  const [showRelanceModal, setShowRelanceModal] = useState(false);  // Modal de relance WhatsApp
  const [stats, setStats] = useState({
    totalMembers: 0,
    avgPresenceGlobal: 0,
    avgPresenceSeason: 0,
    currentSeason: 'Saison 13 - 2025',
    membersByStars: { 4: 0, 3: 0, 2: 0, 1: 0 },
    cotisationsEnAttente: 0,
    totalSaisonsDues: 0,
    // Moyennes de présence par événement
    moyPresenceGlobal: 0,
    moyPresenceSaison: 0,
    moyRepasGlobal: 0,
    moyRepasSaison: 0,
    nbMembresActifsSaison: 0,
  });

  // Fonction pour calculer les étoiles selon le pourcentage de présence
  const getStarsFromPercentage = (percentage) => {
    if (percentage >= 75) return 4;
    if (percentage >= 50) return 3;
    if (percentage >= 25) return 2;
    return 1;
  };

  const [nextEvent, setNextEvent] = useState({
    date: '15 Mars 2025',
    type: 'Repas',
    sondageResults: {
      presents: 28,
      absents: 7,
      entreeA: 15,
      entreeB: 13,
      platA: 18,
      platB: 8,
      platC: 2,
    }
  });

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  
  // États pour les réponses manuelles (invités/membres sans accès)
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [manualResponses, setManualResponses] = useState([]);
  const [newManualResponse, setNewManualResponse] = useState({
    nom: '',
    type: 'invite', // 'invite' ou 'membre_manuel'
    membre_id: '', // ID du membre si type = membre_manuel
    present: true,
    choix_entree: '',
    choix_plat: '',
    choix_dessert: ''
  });
  
  // États pour les modals de détails du sondage
  const [showPresentsModal, setShowPresentsModal] = useState(false);
  const [showAbsentsModal, setShowAbsentsModal] = useState(false);
  const [showMenuDetailModal, setShowMenuDetailModal] = useState(false);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState({ type: '', item: '' });
  const [reponsesSondage, setReponsesSondage] = useState([]);
  
  // Paiements en attente de validation (pour le président)
  const [paiementsEnAttente, setPaiementsEnAttente] = useState([]);
  
  // Demandes de mot de passe oublié (pour le président)
  const [demandesMotDePasse, setDemandesMotDePasse] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    loadProchainEvenement();
    loadProchainEvenementInfo();
    loadPaiementsEnAttente();
    loadDemandesMotDePasse();
  }, []);
  
  // Charger les paiements en attente
  const loadPaiementsEnAttente = async () => {
    try {
      const response = await axios.get(`${API}/paiements-en-attente`);
      setPaiementsEnAttente(response.data || []);
    } catch (error) {
      setPaiementsEnAttente([]);
    }
  };
  
  // Charger les demandes de mot de passe
  const loadDemandesMotDePasse = async () => {
    try {
      const response = await axios.get(`${API}/admin/demandes-mot-de-passe`);
      setDemandesMotDePasse(response.data || []);
    } catch (error) {
      setDemandesMotDePasse([]);
    }
  };
  
  // Marquer une demande de mot de passe comme traitée
  const handleTraiterDemande = async (demandeId) => {
    try {
      await axios.post(`${API}/admin/demandes-mot-de-passe/${demandeId}/traiter`);
      toast.success('Demande marquée comme traitée');
      loadDemandesMotDePasse();
    } catch (error) {
      toast.error('Erreur lors du traitement');
    }
  };
  
  // Valider un paiement
  const handleValiderPaiement = async (paiementId) => {
    try {
      await axios.post(`${API}/paiements-en-attente/${paiementId}/valider?validateur_id=${currentMember?.id}`);
      toast.success('Paiement validé et enregistré dans la comptabilité !');
      loadPaiementsEnAttente();
      loadDashboardData(); // Recharger les stats
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };
  
  // Refuser un paiement
  const handleRefuserPaiement = async (paiementId) => {
    try {
      await axios.post(`${API}/paiements-en-attente/${paiementId}/refuser?validateur_id=${currentMember?.id}`);
      toast.success('Paiement refusé');
      loadPaiementsEnAttente();
    } catch (error) {
      toast.error('Erreur lors du refus');
    }
  };
  
  // Charger les réponses manuelles pour l'événement
  const loadManualResponses = async (evenementId) => {
    try {
      const response = await axios.get(`${API}/reponses-manuelles/${evenementId}`);
      setManualResponses(response.data || []);
    } catch (error) {
      // Pas de réponses manuelles
      setManualResponses([]);
    }
  };
  
  // Charger les réponses détaillées du sondage
  const loadReponsesSondage = async (evenementId) => {
    try {
      const response = await axios.get(`${API}/reponses-sondages/${evenementId}`);
      // L'API renvoie { reponses: [...] }, on extrait le tableau
      setReponsesSondage(response.data?.reponses || []);
    } catch (error) {
      setReponsesSondage([]);
    }
  };
  
  // Afficher les détails des présents
  const handleShowPresents = async () => {
    if (prochainEvenement) {
      await loadReponsesSondage(prochainEvenement.id);
      setShowPresentsModal(true);
    }
  };
  
  // Afficher les détails des absents
  const handleShowAbsents = async () => {
    if (prochainEvenement) {
      await loadReponsesSondage(prochainEvenement.id);
      setShowAbsentsModal(true);
    }
  };
  
  // Afficher les membres qui ont choisi un item de menu
  const handleShowMenuDetail = async (type, item) => {
    if (prochainEvenement) {
      await loadReponsesSondage(prochainEvenement.id);
      setSelectedMenuDetail({ type, item });
      setShowMenuDetailModal(true);
    }
  };
  
  // Ajouter une réponse manuelle
  const handleAddManualResponse = async () => {
    if (!newManualResponse.nom.trim()) {
      toast.error('Veuillez entrer un nom');
      return;
    }
    
    if (newManualResponse.type === 'membre_manuel' && !newManualResponse.membre_id) {
      toast.error('Veuillez sélectionner un membre');
      return;
    }
    
    try {
      await axios.post(`${API}/reponses-manuelles`, {
        evenement_id: prochainEvenement.id,
        nom: newManualResponse.nom.trim(),
        type: newManualResponse.type,
        membre_id: newManualResponse.membre_id || null,
        present: newManualResponse.present,
        choix_entree: newManualResponse.choix_entree || null,
        choix_plat: newManualResponse.choix_plat || null,
        choix_dessert: newManualResponse.choix_dessert || null
      });
      
      toast.success(`${newManualResponse.type === 'invite' ? 'Invité' : 'Réponse membre'} ajouté(e) !`);
      
      // Réinitialiser le formulaire
      setNewManualResponse({
        nom: '',
        type: 'invite',
        membre_id: '',
        present: true,
        choix_entree: '',
        choix_plat: '',
        choix_dessert: ''
      });
      
      // Fermer le modal
      setShowAddManualModal(false);
      
      // Recharger TOUT (événement + réponses manuelles + non-répondants)
      await loadProchainEvenement();
    } catch (error) {
      console.error('Erreur ajout réponse manuelle:', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };
  
  // Supprimer une réponse manuelle
  const handleDeleteManualResponse = async (responseId) => {
    try {
      await axios.delete(`${API}/reponses-manuelles/${responseId}`);
      toast.success('Réponse supprimée');
      // Recharger TOUT
      await loadProchainEvenement();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Charger le prochain événement et les non-répondants
  const loadProchainEvenement = async () => {
    try {
      const response = await axios.get(`${API}/evenements`);
      const evenements = response.data;
      
      // Trouver le prochain événement (à venir)
      // On compare uniquement les dates (pas les heures) pour éviter les problèmes de timezone
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const prochain = evenements
        .filter(e => {
          if (e.statut !== 'à venir') return false;
          const eventDate = new Date(e.date);
          const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          // L'événement est valide s'il est aujourd'hui ou dans le futur
          return eventDayStart >= todayStart;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      
      setProchainEvenement(prochain);
      
      if (prochain) {
        // Charger les réponses manuelles D'ABORD
        const manualRes = await axios.get(`${API}/reponses-manuelles/${prochain.id}`);
        const manualData = manualRes.data || [];
        setManualResponses(manualData);
        
        // Charger les réponses au sondage en passant les réponses manuelles
        await loadNonRepondants(prochain.id, manualData);
      }
    } catch (error) {
      console.error('Erreur chargement événement:', error);
    }
  };

  // Charger l'info du prochain événement (avant création officielle)
  const loadProchainEvenementInfo = async () => {
    try {
      const response = await axios.get(`${API}/prochain-evenement-info`);
      setProchainEvenementInfo(response.data?.info || null);
    } catch (error) {
      console.error('Erreur chargement info événement:', error);
    }
  };


  // Charger la liste des membres qui n'ont pas répondu au sondage
  const loadNonRepondants = async (evenementId, manualResponsesData = []) => {
    try {
      // Récupérer tous les membres
      const membresRes = await axios.get(`${API}/members`);
      const allMembres = membresRes.data;
      
      // Récupérer les IDs des membres qui ont répondu manuellement
      const manualMemberIds = manualResponsesData
        .filter(r => r.type === 'membre_manuel' && r.membre_id)
        .map(r => r.membre_id);
      
      // Récupérer les réponses directes à l'événement
      try {
        const reponsesRes = await axios.get(`${API}/reponses-sondages/${evenementId}`);
        const reponses = reponsesRes.data.reponses || [];
        const respondantIds = reponses.map(r => r.membre_id);
        
        // Combiner les IDs des répondants (directs + manuels)
        const allRespondantIds = [...new Set([...respondantIds, ...manualMemberIds])];
        
        // Calculer les totaux des choix de menu (seulement les présents)
        const choixEntrees = {};
        const choixPlats = {};
        const choixDesserts = {};
        
        // Compter les réponses directes
        reponses.filter(r => r.present).forEach(r => {
          if (r.choix_entree) {
            choixEntrees[r.choix_entree] = (choixEntrees[r.choix_entree] || 0) + 1;
          }
          if (r.choix_plat) {
            choixPlats[r.choix_plat] = (choixPlats[r.choix_plat] || 0) + 1;
          }
          if (r.choix_dessert) {
            choixDesserts[r.choix_dessert] = (choixDesserts[r.choix_dessert] || 0) + 1;
          }
        });
        
        // Compter les présents : réponses directes + membres ajoutés manuellement
        const presentsDirects = reponsesRes.data.presents || 0;
        const presentsManuels = manualResponsesData.filter(r => r.type === 'membre_manuel' && r.present).length;
        const totalPresents = presentsDirects + presentsManuels;
        
        const absentsDirects = reponsesRes.data.absents || 0;
        const absentsManuels = manualResponsesData.filter(r => r.type === 'membre_manuel' && !r.present).length;
        const totalAbsents = absentsDirects + absentsManuels;
        
        // Mettre à jour les stats du sondage
        setNextEvent(prev => ({
          ...prev,
          sondageResults: {
            ...prev.sondageResults,
            presents: totalPresents,
            absents: totalAbsents,
            choixEntrees,
            choixPlats,
            choixDesserts
          }
        }));
        
        // Filtrer les non-répondants (exclure aussi les membres ajoutés manuellement)
        const nonRep = allMembres.filter(m => !allRespondantIds.includes(m.id));
        setNonRepondants(nonRep);
      } catch (error) {
        // Pas encore de réponses directes
        // Mais vérifier les réponses manuelles de membres
        const nonRep = allMembres.filter(m => !manualMemberIds.includes(m.id));
        setNonRepondants(nonRep);
        
        // Compter seulement les membres manuels
        const presentsManuels = manualResponsesData.filter(r => r.type === 'membre_manuel' && r.present).length;
        const absentsManuels = manualResponsesData.filter(r => r.type === 'membre_manuel' && !r.present).length;
        
        setNextEvent(prev => ({
          ...prev,
          sondageResults: {
            ...prev.sondageResults,
            presents: presentsManuels,
            absents: absentsManuels,
            choixEntrees: {},
            choixPlats: {},
            choixDesserts: {}
          }
        }));
      }
    } catch (error) {
      console.error('Erreur chargement non-répondants:', error);
      setNonRepondants([]);
    }
  };

  // Relancer le sondage - Ouvrir le modal WhatsApp
  const handleRelanceSondage = () => {
    if (!prochainEvenement || nonRepondants.length === 0) {
      toast.info('Tous les membres ont répondu au sondage');
      return;
    }
    setShowRelanceModal(true);
  };

  // Générer le message de relance
  const getMessageRelance = () => {
    if (!prochainEvenement) return '';
    const dateEvt = new Date(prochainEvenement.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return `🔔 *Rappel - La Bague Impériale*\n\nBonjour,\n\nNous n'avons pas encore reçu votre réponse pour le ${prochainEvenement.objet} du ${dateEvt} à ${prochainEvenement.lieu}.\n\nMerci de répondre sur l'application dès que possible.\n\nCordialement,\nLe Président`;
  };

  // Copier les numéros de téléphone
  const copyTelephones = () => {
    const telephones = nonRepondants
      .filter(m => m.telephone)
      .map(m => m.telephone.replace(/\s/g, ''))
      .join('\n');
    
    if (!telephones) {
      toast.warning('Aucun numéro de téléphone enregistré');
      return;
    }
    navigator.clipboard.writeText(telephones);
    toast.success(`${nonRepondants.filter(m => m.telephone).length} numéro(s) copié(s)`);
  };

  // Copier le message
  const copyMessage = () => {
    navigator.clipboard.writeText(getMessageRelance());
    toast.success('Message copié !');
  };

  // Copier numéros ET message pour SMS (solution simple et fiable)
  const handleOpenSMSRelance = () => {
    const membresAvecTel = nonRepondants.filter(m => m.telephone);
    
    if (membresAvecTel.length === 0) {
      toast.warning('Aucun numéro de téléphone enregistré pour les non-répondants');
      return;
    }
    
    // Formater les numéros
    const telephones = membresAvecTel
      .map(m => m.telephone.replace(/\s/g, ''))
      .join(', ');
    
    // Message de relance
    const dateEvt = prochainEvenement 
      ? new Date(prochainEvenement.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
      : '';
    const message = `Rappel La Bague Imperiale: Merci de repondre au sondage pour le ${prochainEvenement?.objet || 'repas'} du ${dateEvt}. Le President`;
    
    // Copier tout : numéros + message
    const textToCopy = `DESTINATAIRES:\n${telephones}\n\nMESSAGE:\n${message}`;
    
    navigator.clipboard.writeText(textToCopy);
    toast.success(`${membresAvecTel.length} numéro(s) + message copiés !`);
  };

  const loadDashboardData = async () => {
    try {
      const membersData = await api.getMembers();
      setMembers(membersData);
      
      // Calcul des statistiques
      const totalMembers = membersData.length;
      
      // Calcul des étoiles selon les présences
      const membersByStars = { 4: 0, 3: 0, 2: 0, 1: 0 };
      membersData.forEach(m => {
        const presence = m.pourcentage_presences;
        if (presence >= 75) membersByStars[4]++;
        else if (presence >= 50) membersByStars[3]++;
        else if (presence >= 25) membersByStars[2]++;
        else membersByStars[1]++;
      });
      
      // Cotisations en attente (situation_cotisation > 0)
      const cotisationsEnAttente = membersData.filter(m => m.situation_cotisation > 0).length;
      const totalSaisonsDues = membersData.reduce((sum, m) => sum + m.situation_cotisation, 0);
      
      // Charger TOUTES les stats depuis l'API (calcul basé sur données historiques)
      let pctGlobal = 0;
      let moyPresenceGlobal = 0;
      let moyRepasGlobal = 0;
      let pctSaisonActuelle = 0;
      let moyPresenceSaison = 0;
      let moyRepasSaison = 0;
      let nbMembresActifsSaison = 0;
      try {
        const moyennesRes = await fetch(`${API}/statistiques/moyennes-dashboard`);
        const moyennesData = await moyennesRes.json();
        // Stats globales
        pctGlobal = moyennesData.pct_global || 0;
        moyPresenceGlobal = moyennesData.moy_global || 0;
        moyRepasGlobal = moyennesData.moy_repas_global || 0;
        // Stats saison actuelle
        pctSaisonActuelle = moyennesData.pct_saison_actuelle || 0;
        moyPresenceSaison = moyennesData.moy_saison_actuelle || 0;
        moyRepasSaison = moyennesData.moy_repas_saison || 0;
        nbMembresActifsSaison = moyennesData.nb_membres_actifs_saison || 0;
      } catch (e) {
        console.log('Moyennes non disponibles');
      }
      
      setStats({
        totalMembers,
        avgPresenceGlobal: pctGlobal.toFixed(1),
        avgPresenceSeason: pctSaisonActuelle.toFixed(1),
        currentSeason: 'Saison 13 - 2025',
        membersByStars,
        cotisationsEnAttente,
        totalSaisonsDues,
        moyPresenceGlobal,
        moyPresenceSaison,
        moyRepasGlobal,
        moyRepasSaison,
        nbMembresActifsSaison,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const handleExportSMS = () => {
    const { presents, choixEntrees, choixPlats, choixDesserts } = nextEvent.sondageResults || {};
    const enAttente = nonRepondants.length;
    
    // Calculer les réponses manuelles présentes
    const manuelPresents = manualResponses.filter(r => r.present);
    
    // Total présents (membres + invités + manuels)
    const totalPresents = (presents || 0) + manuelPresents.length;
    const totalMax = totalPresents + enAttente;
    
    // Fusionner les choix de menu avec les résumés intelligents
    const allChoixEntrees = {};
    const allChoixPlats = {};
    const allChoixDesserts = {};
    
    // Traiter les choix existants avec extractKeyword
    if (choixEntrees) {
      Object.entries(choixEntrees).forEach(([entree, count]) => {
        const keyword = extractKeyword(entree);
        allChoixEntrees[keyword] = (allChoixEntrees[keyword] || 0) + count;
      });
    }
    if (choixPlats) {
      Object.entries(choixPlats).forEach(([plat, count]) => {
        const keyword = extractKeyword(plat);
        allChoixPlats[keyword] = (allChoixPlats[keyword] || 0) + count;
      });
    }
    if (choixDesserts) {
      Object.entries(choixDesserts).forEach(([dessert, count]) => {
        const keyword = extractKeyword(dessert);
        allChoixDesserts[keyword] = (allChoixDesserts[keyword] || 0) + count;
      });
    }
    
    // Ajouter les choix manuels
    manuelPresents.forEach(r => {
      if (r.choix_entree) {
        const keyword = extractKeyword(r.choix_entree);
        allChoixEntrees[keyword] = (allChoixEntrees[keyword] || 0) + 1;
      }
      if (r.choix_plat) {
        const keyword = extractKeyword(r.choix_plat);
        allChoixPlats[keyword] = (allChoixPlats[keyword] || 0) + 1;
      }
      if (r.choix_dessert) {
        const keyword = extractKeyword(r.choix_dessert);
        allChoixDesserts[keyword] = (allChoixDesserts[keyword] || 0) + 1;
      }
    });
    
    // Formater la date
    const dateEvent = prochainEvenement 
      ? new Date(prochainEvenement.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : nextEvent.date;
    
    // Construire le message avec format restaurateur
    let message = `🍽️ La Bague Impériale - ${dateEvent}\n\n`;
    message += `📊 RÉCAPITULATIF\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Nbr de présences : ${totalPresents}\n`;
    message += `Nbr rép. en attente : ${enAttente}\n`;
    message += `Nbr max : ${totalMax}\n`;
    
    // Entrées
    if (Object.keys(allChoixEntrees).length > 0) {
      message += `\n🥗 ENTRÉES\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      Object.entries(allChoixEntrees).forEach(([entree, count]) => {
        message += `${entree} : ${count}\n`;
      });
    }
    
    // Plats
    if (Object.keys(allChoixPlats).length > 0) {
      message += `\n🍖 PLATS\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      Object.entries(allChoixPlats).forEach(([plat, count]) => {
        message += `${plat} : ${count}\n`;
      });
    }
    
    // Desserts
    if (Object.keys(allChoixDesserts).length > 0) {
      message += `\n🍰 DESSERTS\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      Object.entries(allChoixDesserts).forEach(([dessert, count]) => {
        message += `${dessert} : ${count}\n`;
      });
    }
    
    // Copier dans le presse-papier
    navigator.clipboard.writeText(message);
    toast.success('Résumé copié ! Prêt à envoyer au restaurateur.');
  };

  const handleShowMembersByStars = (stars) => {
    // Filtrer les membres selon le nombre d'étoiles
    const filtered = members.filter(m => {
      const presence = m.pourcentage_presences;
      if (stars === 4) return presence >= 75;
      if (stars === 3) return presence >= 50 && presence < 75;
      if (stars === 2) return presence >= 25 && presence < 50;
      if (stars === 1) return presence < 25;
      return false;
    });
    
    setSelectedStars(stars);
    setFilteredMembers(filtered);
    setShowMembersModal(true);
  };

  // Dashboard MEMBRE (avec sondage)
  if (!isAdmin) {
    return <DashboardMembre prochainEvenement={prochainEvenement} prochainEvenementInfo={prochainEvenementInfo} currentMember={currentMember} />;
  }

  // Dashboard ADMIN (Président)
  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Dashboard Président
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Vue d'ensemble et gestion du club
        </p>
      </div>

      {/* ========== SECTION 1 : PRÉSENCES ========== */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-[#D4A024]" />
          Présences
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Présence moyenne globale */}
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" data-testid="presence-globale">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-serif text-gray-400">
                Présence Moyenne Générale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-serif font-bold text-[#D4A024]">
                    {stats.avgPresenceGlobal}%
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-2xl font-bold text-white">{stats.moyPresenceGlobal}</span>
                      <span className="text-base text-gray-400 ml-1">prés./évén.</span>
                    </div>
                    <div className="border-l border-gray-600 pl-4">
                      <span className="text-2xl font-bold text-blue-400">{stats.moyRepasGlobal}</span>
                      <span className="text-base text-gray-400 ml-1">prés./repas</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-0.5">
                  {[...Array(getStarsFromPercentage(parseFloat(stats.avgPresenceGlobal)))].map((_, i) => (
                    <Star key={i} className="w-7 h-7 text-[#D4A024] fill-[#D4A024]" />
                  ))}
                </div>
              </div>
              <p className="text-base text-gray-500 mt-3">Tous les membres - Toutes saisons</p>
            </CardContent>
          </Card>

          {/* Présence saison en cours */}
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" data-testid="presence-saison">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-serif text-gray-400">
                Présence {stats.currentSeason}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-serif font-bold text-[#D4A024]">
                    {stats.avgPresenceSeason}%
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-2xl font-bold text-white">{stats.moyPresenceSaison}</span>
                      <span className="text-base text-gray-400 ml-1">prés./évén.</span>
                    </div>
                    <div className="border-l border-gray-600 pl-4">
                      <span className="text-2xl font-bold text-blue-400">{stats.moyRepasSaison}</span>
                      <span className="text-base text-gray-400 ml-1">prés./repas</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-0.5">
                  {[...Array(getStarsFromPercentage(parseFloat(stats.avgPresenceSeason)))].map((_, i) => (
                    <Star key={i} className="w-7 h-7 text-[#D4A024] fill-[#D4A024]" />
                  ))}
                </div>
              </div>
              <p className="text-base text-gray-500 mt-3">Saison en cours</p>
            </CardContent>
          </Card>
        </div>

        {/* Répartition par étoiles */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white">
              Répartition par Étoiles
            </CardTitle>
            <p className="text-base text-gray-400 mt-1">
              Calcul automatique : 4⭐ (100-75%) • 3⭐ (75-50%) • 2⭐ (50-25%) • 1⭐ (25-0%)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[4, 3, 2, 1].map((stars) => (
                <div 
                  key={stars}
                  onClick={() => handleShowMembersByStars(stars)}
                  className="bg-black/30 rounded-lg p-4 border border-[#D4A024]/20 cursor-pointer hover:bg-[#D4A024]/10 hover:border-[#D4A024]/50 transition-all"
                >
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    {[...Array(stars)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 text-[#D4A024] fill-[#D4A024]" />
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-serif font-bold text-white">
                      {stats.membersByStars[stars]}
                    </div>
                    <div className="text-base text-gray-400 mt-1">
                      {stars === 4 && '100-75%'}
                      {stars === 3 && '75-50%'}
                      {stars === 2 && '50-25%'}
                      {stars === 1 && '25-0%'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== SECTION 2 : PROCHAIN ÉVÉNEMENT ========== */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-[#D4A024]" />
          Prochain Événement
        </h2>

        {prochainEvenement ? (
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl font-serif text-white mb-2">
                    {prochainEvenement.objet} - {new Date(prochainEvenement.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-600 text-base px-3 py-1">Sondage en cours</Badge>
                    <span className="text-gray-300 text-base">📍 {prochainEvenement.lieu}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {/* Bouton Relancer les non-répondants */}
                  {nonRepondants.length > 0 && (
                    <Button
                      onClick={handleRelanceSondage}
                      disabled={loadingRelance}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white font-serif"
                      data-testid="relancer-sondage-btn"
                    >
                      {loadingRelance ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4 mr-2" />
                      )}
                      Relancer ({nonRepondants.length})
                    </Button>
                  )}
                  <Button
                    onClick={handleExportSMS}
                    className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                    data-testid="export-restaurateur-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Résumé Restaurateur
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Statut des réponses */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div 
                    onClick={handleShowPresents}
                    className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-center cursor-pointer hover:bg-green-900/40 transition-colors"
                  >
                    <div className="text-3xl font-serif font-bold text-green-400">
                      {nextEvent.sondageResults?.presents || 0}
                    </div>
                    <div className="text-base text-gray-400">Présents</div>
                    <div className="text-xs text-green-500 mt-1">Cliquez pour détails</div>
                  </div>
                  <div 
                    onClick={handleShowAbsents}
                    className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 text-center cursor-pointer hover:bg-red-900/40 transition-colors"
                  >
                    <div className="text-3xl font-serif font-bold text-red-400">
                      {nextEvent.sondageResults?.absents || 0}
                    </div>
                    <div className="text-base text-gray-400">Absents</div>
                    <div className="text-xs text-red-500 mt-1">Cliquez pour détails</div>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-serif font-bold text-yellow-400">
                      {nonRepondants.length}
                    </div>
                    <div className="text-base text-gray-400">En attente</div>
                  </div>
                  <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-serif font-bold text-purple-400">
                      {members.length - nonRepondants.length}
                    </div>
                    <div className="text-base text-gray-400">Ont répondu</div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-serif font-bold text-blue-400">
                      {members.length > 0 ? Math.round((members.length - nonRepondants.length) / members.length * 100) : 0}%
                    </div>
                    <div className="text-base text-gray-400">Taux de réponse</div>
                  </div>
                </div>

                {/* Liste des non-répondants */}
                {nonRepondants.length > 0 && (
                  <div className="bg-black/30 rounded-lg p-4 border border-yellow-600/30">
                    <h4 className="text-yellow-400 font-semibold mb-3 flex items-center text-lg">
                      <Bell className="w-5 h-5 mr-2" />
                      Membres n'ayant pas répondu ({nonRepondants.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {nonRepondants.slice(0, 10).map((m) => (
                        <Badge key={m.id} className="bg-yellow-900/50 text-yellow-300 border border-yellow-600/30 text-sm px-3 py-1">
                          {m.nom_complet}
                        </Badge>
                      ))}
                      {nonRepondants.length > 10 && (
                        <Badge className="bg-gray-800 text-gray-400 text-sm px-3 py-1">
                          +{nonRepondants.length - 10} autres
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-3">
                      💡 Cliquez sur "Relancer" pour envoyer un rappel uniquement à ces membres
                    </p>
                  </div>
                )}

                {/* Message si tout le monde a répondu */}
                {nonRepondants.length === 0 && members.length > 0 && (
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-center">
                    <div className="text-green-400 font-semibold">
                      ✅ Tous les membres ont répondu au sondage !
                    </div>
                  </div>
                )}

                {/* Résultats des choix de menu (pour les repas) */}
                {prochainEvenement.type_sondage === 'repas' && prochainEvenement.options_sondage && nextEvent.sondageResults?.presents > 0 && (
                  <div className="border-t border-[#D4A024]/20 pt-4">
                    <h3 className="text-lg font-serif text-white mb-3">
                      🍽️ Choix des Menus ({nextEvent.sondageResults.presents} présent{nextEvent.sondageResults.presents > 1 ? 's' : ''})
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">Cliquez sur un choix pour voir qui l'a sélectionné</p>
                    <div className="space-y-4">
                      {/* Entrées */}
                      {prochainEvenement.options_sondage.entrees && prochainEvenement.options_sondage.entrees.length > 0 && (
                        <div>
                          <p className="text-sm text-amber-400 mb-2 font-semibold">Entrées :</p>
                          <div className="grid grid-cols-2 gap-2">
                            {prochainEvenement.options_sondage.entrees.map((entree, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleShowMenuDetail('entree', entree)}
                                className="bg-black/30 rounded p-2 text-center border border-amber-600/30 cursor-pointer hover:bg-amber-900/30 transition-colors"
                              >
                                <div className="text-xl font-bold text-amber-400">
                                  {nextEvent.sondageResults?.choixEntrees?.[entree] || 0}
                                </div>
                                <div className="text-xs text-gray-400">{entree}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Plats */}
                      {prochainEvenement.options_sondage.plats && prochainEvenement.options_sondage.plats.length > 0 && (
                        <div>
                          <p className="text-sm text-blue-400 mb-2 font-semibold">Plats :</p>
                          <div className="grid grid-cols-2 gap-2">
                            {prochainEvenement.options_sondage.plats.map((plat, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleShowMenuDetail('plat', plat)}
                                className="bg-black/30 rounded p-2 text-center border border-blue-600/30 cursor-pointer hover:bg-blue-900/30 transition-colors"
                              >
                                <div className="text-xl font-bold text-blue-400">
                                  {nextEvent.sondageResults?.choixPlats?.[plat] || 0}
                                </div>
                                <div className="text-xs text-gray-400">{plat}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Desserts */}
                      {prochainEvenement.options_sondage.desserts && prochainEvenement.options_sondage.desserts.length > 0 && (
                        <div>
                          <p className="text-sm text-purple-400 mb-2 font-semibold">Desserts :</p>
                          <div className="grid grid-cols-2 gap-2">
                            {prochainEvenement.options_sondage.desserts.map((dessert, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleShowMenuDetail('dessert', dessert)}
                                className="bg-black/30 rounded p-2 text-center border border-purple-600/30 cursor-pointer hover:bg-purple-900/30 transition-colors"
                              >
                                <div className="text-xl font-bold text-purple-400">
                                  {nextEvent.sondageResults?.choixDesserts?.[dessert] || 0}
                                </div>
                                <div className="text-xs text-gray-400">{dessert}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ===== SECTION AJOUT MANUEL (Invités / Membres sans accès) ===== */}
                <div className="border-t border-[#D4A024]/20 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-serif text-white flex items-center">
                      <UserPlus className="w-5 h-5 mr-2 text-[#D4A024]" />
                      Ajouts Manuels (Invités / Membres sans accès)
                    </h3>
                    <Button
                      onClick={() => setShowAddManualModal(true)}
                      className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-3">
                    ⚠️ Ces ajouts sont comptés pour le restaurateur mais n'affectent PAS les statistiques de présence du club.
                  </p>
                  
                  {/* Liste des réponses manuelles */}
                  {manualResponses.length > 0 ? (
                    <div className="space-y-2">
                      {manualResponses.map((response) => (
                        <div 
                          key={response.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            response.present 
                              ? 'bg-green-900/20 border-green-600/30' 
                              : 'bg-red-900/20 border-red-600/30'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Badge className={response.type === 'invite' ? 'bg-purple-600' : 'bg-blue-600'}>
                              {response.type === 'invite' ? 'Invité' : 'Membre'}
                            </Badge>
                            <span className="text-white font-medium">{response.nom}</span>
                            <Badge className={response.present ? 'bg-green-600' : 'bg-red-600'}>
                              {response.present ? 'Présent' : 'Absent'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            {response.choix_entree && (
                              <span className="text-xs text-amber-400">E: {response.choix_entree}</span>
                            )}
                            {response.choix_plat && (
                              <span className="text-xs text-blue-400">P: {response.choix_plat}</span>
                            )}
                            {response.choix_dessert && (
                              <span className="text-xs text-purple-400">D: {response.choix_dessert}</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteManualResponse(response.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Résumé */}
                      <div className="mt-3 p-3 bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg">
                        <p className="text-[#D4A024] text-sm">
                          📊 Total ajouts manuels : <strong>{manualResponses.filter(r => r.present).length}</strong> présent(s), <strong>{manualResponses.filter(r => !r.present).length}</strong> absent(s)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Aucun ajout manuel pour cet événement
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : prochainEvenementInfo ? (
          // Afficher l'info du prochain événement (pas encore d'événement officiel)
          <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border-2 border-cyan-500/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-xl font-serif text-white mb-2 flex items-center">
                    <span className="text-cyan-400 mr-2">ℹ️</span>
                    Info - {prochainEvenementInfo.type_evenement === 'repas' ? 'Prochain Repas' : 'Prochain Apéro'}
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-gray-300">
                    <span>📅 {new Date(prochainEvenementInfo.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span>📍 {prochainEvenementInfo.lieu}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {/* Bouton Partager WhatsApp */}
                  <Button
                    onClick={() => {
                      const typeLabel = prochainEvenementInfo.type_evenement === 'repas' ? 'Prochain repas' : 'Prochain apéro';
                      const dateStr = new Date(prochainEvenementInfo.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                      const message = `🎩 *La Bague Impériale*\n\n*${typeLabel}*\n\n📅 ${dateStr}\n📍 ${prochainEvenementInfo.lieu}\n\nPlus d'informations à venir sur l'application.\n\n${window.location.origin}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-serif"
                    data-testid="share-info-whatsapp"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Partager WhatsApp
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/20">
                <p className="text-gray-400 text-sm italic">
                  Cette info est affichée sur le Dashboard de tous les membres. 
                  Créez l'événement officiel avec sondage depuis l'onglet "Événements" quand vous êtes prêt.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
            <CardContent className="py-8 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aucun événement à venir</p>
              <p className="text-gray-500 text-sm mt-1">Créez un événement depuis l'onglet Événements</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ========== SECTION 3 : COTISATIONS ========== */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-[#D4A024]" />
          Cotisations
        </h2>

        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" data-testid="cotisations">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white">
              Cotisations Annuelles en Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-5xl font-serif font-bold text-[#D4A024]">
                {stats.totalSaisonsDues}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-lg">Saisons de cotisation à recevoir</p>
                <p className="text-base text-gray-400 mt-1">
                  {stats.cotisationsEnAttente} membre(s) avec cotisation en retard • 200€/an
                </p>
              </div>
            </div>
            
            {stats.cotisationsEnAttente > 0 && (
              <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
                <Button
                  variant="outline"
                  className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10 text-base"
                  onClick={() => {
                    // Rediriger vers la page Membres
                    window.location.href = '/members';
                  }}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Voir les membres concernés
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== SECTION 3.5 : PAIEMENTS EN ATTENTE ========== */}
      {paiementsEnAttente.length > 0 && (
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
            <CreditCard className="w-6 h-6 mr-2 text-yellow-400" />
            Paiements à valider
            <Badge className="ml-3 bg-yellow-600">{paiementsEnAttente.length}</Badge>
          </h2>

          <Card className="bg-black/40 border-2 border-yellow-600/30 backdrop-blur-sm">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {paiementsEnAttente.map((paiement) => {
                  const membre = members.find(m => m.id === paiement.membre_id);
                  return (
                    <div key={paiement.id} className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-bold text-lg">
                            {membre?.nom_complet || 'Membre inconnu'}
                          </p>
                          <p className="text-yellow-400 font-semibold">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(paiement.montant)} - {paiement.objet}
                            {paiement.detail && ` (${paiement.detail})`}
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Payé le {paiement.date_paiement} • {paiement.endroit}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            Signalé le {paiement.date_signalement?.split('T')[0]}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleValiderPaiement(paiement.id)}
                            className="bg-green-700 hover:bg-green-600 text-white"
                            size="sm"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Valider
                          </Button>
                          <Button
                            onClick={() => handleRefuserPaiement(paiement.id)}
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-900/30"
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== SECTION 3.6 : DEMANDES DE MOT DE PASSE OUBLIÉ ========== */}
      {demandesMotDePasse.length > 0 && (
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
            <Key className="w-6 h-6 mr-2 text-orange-400" />
            Mots de passe oubliés
            <Badge className="ml-3 bg-orange-600">{demandesMotDePasse.length}</Badge>
          </h2>

          <Card className="bg-black/40 border-2 border-orange-600/30 backdrop-blur-sm">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {demandesMotDePasse.map((demande) => (
                  <div key={demande.id} className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-bold text-lg">
                          {demande.membre_nom}
                          {demande.membre_numero && (
                            <span className="text-orange-400 ml-2 text-sm font-normal">
                              (n°{demande.membre_numero})
                            </span>
                          )}
                        </p>
                        <p className="text-orange-400 text-sm">
                          {demande.membre_email}
                        </p>
                        {demande.membre_telephone && (
                          <p className="text-gray-400 text-sm">
                            Tél: {demande.membre_telephone}
                          </p>
                        )}
                        {/* Afficher le mot de passe réinitialisé */}
                        {demande.mot_de_passe_reinitialise && (
                          <div className="mt-2 bg-green-900/30 border border-green-600/50 rounded px-3 py-2">
                            <p className="text-xs text-gray-400">Nouveau mot de passe :</p>
                            <p className="text-green-400 font-mono text-lg flex items-center">
                              {demande.mot_de_passe_reinitialise}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-2 text-green-400 hover:bg-green-600/20"
                                onClick={() => {
                                  navigator.clipboard.writeText(demande.mot_de_passe_reinitialise);
                                  toast.success('Mot de passe copié !');
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </p>
                          </div>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          Demandé le {demande.created_at?.split('T')[0]}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {/* Bouton WhatsApp */}
                        {demande.membre_telephone && (
                          <a
                            href={`https://wa.me/${demande.membre_telephone.replace(/\s/g, '').replace(/^0/, '33')}?text=${encodeURIComponent(demande.message_whatsapp || `Bonjour,\n\nTon mot de passe La Bague Impériale a été réinitialisé.\n\nNouveau mot de passe : ${demande.mot_de_passe_reinitialise}\n\nÀ bientôt !`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp
                          </a>
                        )}
                        <Button
                          onClick={() => handleTraiterDemande(demande.id)}
                          className="bg-blue-700 hover:bg-blue-600 text-white"
                          size="sm"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Traité
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== SECTION 4 : CHARTE DU CLUB ========== */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
          <ScrollText className="w-6 h-6 mr-2 text-[#D4A024]" />
          Charte du Club
        </h2>
        <CharteClub defaultExpanded={false} />
      </div>

      {/* Modal: Liste des membres par étoiles */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[80vh] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-serif text-[#D4A024] flex items-center">
                  <div className="flex items-center space-x-1 mr-3">
                    {[...Array(selectedStars)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-[#D4A024] fill-[#D4A024]" />
                    ))}
                  </div>
                  Membres avec {selectedStars} étoile{selectedStars > 1 ? 's' : ''}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMembersModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                {selectedStars === 4 && '100-75% de présence'}
                {selectedStars === 3 && '75-50% de présence'}
                {selectedStars === 2 && '50-25% de présence'}
                {selectedStars === 1 && '25-0% de présence'}
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {filteredMembers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    Aucun membre dans cette catégorie
                  </p>
                ) : (
                  filteredMembers.map((membre) => (
                    <div
                      key={membre.id}
                      className="bg-black/40 border border-[#D4A024]/20 rounded-lg p-4 hover:border-[#D4A024]/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-serif font-semibold text-lg">
                            {membre.nom_complet}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {membre.fonction} • Entrée {membre.saison_entree} {membre.annee_entree}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1 justify-end mb-1">
                            {[...Array(membre.etoiles)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-[#D4A024] fill-[#D4A024]" />
                            ))}
                          </div>
                          <p className="text-[#D4A024] font-bold text-xl">
                            {membre.pourcentage_presences}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <div className="flex-shrink-0 p-4 border-t border-[#D4A024]/30">
              <Button
                onClick={() => setShowMembersModal(false)}
                className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
              >
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Ajout réponse manuelle */}
      {showAddManualModal && prochainEvenement && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Ajouter une réponse manuelle
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddManualModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-gray-300 text-sm mt-1">
                Pour un invité ou un membre sans accès à l'application
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Type */}
              <div>
                <Label className="text-gray-300 mb-2 block">Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewManualResponse(prev => ({ ...prev, type: 'invite' }))}
                    className={`flex-1 ${
                      newManualResponse.type === 'invite' 
                        ? 'bg-purple-600 border-purple-500 text-white' 
                        : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    Invité
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewManualResponse(prev => ({ ...prev, type: 'membre_manuel', nom: '', membre_id: '' }))}
                    className={`flex-1 ${
                      newManualResponse.type === 'membre_manuel' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    Membre (sans accès)
                  </Button>
                </div>
              </div>

              {/* Sélection du membre (si type = membre_manuel) */}
              {newManualResponse.type === 'membre_manuel' && (
                <div>
                  <Label className="text-gray-300 mb-2 block">Sélectionner le membre *</Label>
                  
                  {/* Afficher le membre sélectionné ou le placeholder */}
                  {newManualResponse.membre_id ? (
                    <div className="w-full bg-green-900/30 border-2 border-green-500 text-white rounded-lg px-4 py-3 flex items-center justify-between">
                      <span className="font-medium">{newManualResponse.nom}</span>
                      <button 
                        type="button"
                        onClick={() => setNewManualResponse(prev => ({ ...prev, membre_id: '', nom: '' }))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400 mb-2">Touchez un nom pour le sélectionner :</p>
                  )}
                  
                  {/* Liste scrollable des membres */}
                  {!newManualResponse.membre_id && (
                    <div className="max-h-48 overflow-y-auto border border-[#D4A024]/30 rounded-lg bg-black/50">
                      {members
                        .sort((a, b) => (a.nom_complet || '').localeCompare(b.nom_complet || ''))
                        .map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setNewManualResponse(prev => ({ 
                                ...prev, 
                                membre_id: m.id,
                                nom: m.nom_complet || ''
                              }));
                            }}
                            className="w-full text-left px-4 py-3 text-white hover:bg-[#D4A024]/20 border-b border-[#D4A024]/10 last:border-b-0 active:bg-[#D4A024]/30"
                          >
                            {m.nom_complet}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Nom (seulement pour invité) */}
              {newManualResponse.type === 'invite' && (
                <div>
                  <Label className="text-gray-300 mb-2 block">Nom de l'invité *</Label>
                  <Input
                    value={newManualResponse.nom}
                    onChange={(e) => setNewManualResponse(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Nom de l'invité"
                    className="bg-black/30 border-[#D4A024]/50 text-white"
                  />
                </div>
              )}

              {/* Présence */}
              <div>
                <Label className="text-gray-300 mb-2 block">Présence</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewManualResponse(prev => ({ ...prev, present: true }))}
                    className={`flex-1 ${
                      newManualResponse.present 
                        ? 'bg-green-600 border-green-500 text-white' 
                        : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Présent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewManualResponse(prev => ({ ...prev, present: false }))}
                    className={`flex-1 ${
                      !newManualResponse.present 
                        ? 'bg-red-600 border-red-500 text-white' 
                        : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Absent
                  </Button>
                </div>
              </div>

              {/* Choix de menu (si présent et si repas) */}
              {newManualResponse.present && prochainEvenement.type_sondage === 'repas' && prochainEvenement.options_sondage && (
                <div className="border-t border-[#D4A024]/30 pt-4 space-y-4">
                  <h4 className="text-[#D4A024] font-semibold">Choix du menu</h4>
                  
                  {/* Entrées */}
                  {prochainEvenement.options_sondage.entrees?.length > 0 && (
                    <div>
                      <Label className="text-amber-400 mb-2 block text-sm">Entrée</Label>
                      <div className="flex flex-wrap gap-2">
                        {prochainEvenement.options_sondage.entrees.map((entree, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewManualResponse(prev => ({ ...prev, choix_entree: entree }))}
                            className={`${
                              newManualResponse.choix_entree === entree 
                                ? 'bg-amber-600 border-amber-500 text-white' 
                                : 'border-amber-600/50 text-amber-400'
                            }`}
                          >
                            {entree}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plats */}
                  {prochainEvenement.options_sondage.plats?.length > 0 && (
                    <div>
                      <Label className="text-blue-400 mb-2 block text-sm">Plat</Label>
                      <div className="flex flex-wrap gap-2">
                        {prochainEvenement.options_sondage.plats.map((plat, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewManualResponse(prev => ({ ...prev, choix_plat: plat }))}
                            className={`${
                              newManualResponse.choix_plat === plat 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : 'border-blue-600/50 text-blue-400'
                            }`}
                          >
                            {plat}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Desserts */}
                  {prochainEvenement.options_sondage.desserts?.length > 0 && (
                    <div>
                      <Label className="text-purple-400 mb-2 block text-sm">Dessert</Label>
                      <div className="flex flex-wrap gap-2">
                        {prochainEvenement.options_sondage.desserts.map((dessert, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewManualResponse(prev => ({ ...prev, choix_dessert: dessert }))}
                            className={`${
                              newManualResponse.choix_dessert === dessert 
                                ? 'bg-purple-600 border-purple-500 text-white' 
                                : 'border-purple-600/50 text-purple-400'
                            }`}
                          >
                            {dessert}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4 border-t border-[#D4A024]/30">
                <Button
                  variant="outline"
                  onClick={() => setShowAddManualModal(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddManualResponse}
                  className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Liste des présents avec leurs choix */}
      {showPresentsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                  Membres Présents ({reponsesSondage.filter(r => r.present).length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPresentsModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {reponsesSondage
                  .filter(r => r.present)
                  .map((reponse, idx) => {
                    const membre = members.find(m => m.id === reponse.membre_id);
                    return (
                      <div key={idx} className="bg-black/30 rounded-lg p-3 border border-green-600/30">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium text-lg">{membre?.nom_complet || 'Membre inconnu'}</span>
                          <Badge className="bg-green-600">Présent</Badge>
                        </div>
                        {(reponse.choix_entree || reponse.choix_plat || reponse.choix_dessert) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {reponse.choix_entree && (
                              <Badge className="bg-amber-900/50 text-amber-300 border border-amber-600/30">
                                E: {reponse.choix_entree}
                              </Badge>
                            )}
                            {reponse.choix_plat && (
                              <Badge className="bg-blue-900/50 text-blue-300 border border-blue-600/30">
                                P: {reponse.choix_plat}
                              </Badge>
                            )}
                            {reponse.choix_dessert && (
                              <Badge className="bg-purple-900/50 text-purple-300 border border-purple-600/30">
                                D: {reponse.choix_dessert}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                
                {/* Ajouts manuels présents */}
                {manualResponses.filter(r => r.present).map((reponse, idx) => (
                  <div key={`manual-${idx}`} className="bg-black/30 rounded-lg p-3 border border-purple-600/30">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium text-lg">{reponse.nom}</span>
                      <div className="flex gap-2">
                        <Badge className={reponse.type === 'invite' ? 'bg-purple-600' : 'bg-blue-600'}>
                          {reponse.type === 'invite' ? 'Invité' : 'Ajout manuel'}
                        </Badge>
                        <Badge className="bg-green-600">Présent</Badge>
                      </div>
                    </div>
                    {(reponse.choix_entree || reponse.choix_plat || reponse.choix_dessert) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {reponse.choix_entree && (
                          <Badge className="bg-amber-900/50 text-amber-300 border border-amber-600/30">
                            E: {reponse.choix_entree}
                          </Badge>
                        )}
                        {reponse.choix_plat && (
                          <Badge className="bg-blue-900/50 text-blue-300 border border-blue-600/30">
                            P: {reponse.choix_plat}
                          </Badge>
                        )}
                        {reponse.choix_dessert && (
                          <Badge className="bg-purple-900/50 text-purple-300 border border-purple-600/30">
                            D: {reponse.choix_dessert}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Liste des absents */}
      {showAbsentsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                  <X className="w-5 h-5 mr-2 text-red-400" />
                  Membres Absents ({reponsesSondage.filter(r => !r.present).length + manualResponses.filter(r => !r.present).length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAbsentsModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {reponsesSondage
                  .filter(r => !r.present)
                  .map((reponse, idx) => {
                    const membre = members.find(m => m.id === reponse.membre_id);
                    return (
                      <div key={idx} className="bg-black/30 rounded-lg p-3 border border-red-600/30">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium text-lg">{membre?.nom_complet || 'Membre inconnu'}</span>
                          <Badge className="bg-red-600">Absent</Badge>
                        </div>
                      </div>
                    );
                  })}
                
                {/* Ajouts manuels absents */}
                {manualResponses.filter(r => !r.present).map((reponse, idx) => (
                  <div key={`manual-absent-${idx}`} className="bg-black/30 rounded-lg p-3 border border-red-600/30">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium text-lg">{reponse.nom}</span>
                      <div className="flex gap-2">
                        <Badge className={reponse.type === 'invite' ? 'bg-purple-600' : 'bg-blue-600'}>
                          {reponse.type === 'invite' ? 'Invité' : 'Ajout manuel'}
                        </Badge>
                        <Badge className="bg-red-600">Absent</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {reponsesSondage.filter(r => !r.present).length === 0 && manualResponses.filter(r => !r.present).length === 0 && (
                  <p className="text-gray-400 text-center py-4">Aucun absent pour le moment</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Détail d'un choix de menu */}
      {showMenuDetailModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-lg w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-[#D4A024]">
                  {selectedMenuDetail.type === 'entree' && '🥗 Entrée'}
                  {selectedMenuDetail.type === 'plat' && '🍽️ Plat'}
                  {selectedMenuDetail.type === 'dessert' && '🍰 Dessert'}
                  {' : '}{selectedMenuDetail.item}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMenuDetailModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {/* Membres qui ont choisi cet item */}
                {reponsesSondage
                  .filter(r => {
                    if (selectedMenuDetail.type === 'entree') return r.choix_entree === selectedMenuDetail.item;
                    if (selectedMenuDetail.type === 'plat') return r.choix_plat === selectedMenuDetail.item;
                    if (selectedMenuDetail.type === 'dessert') return r.choix_dessert === selectedMenuDetail.item;
                    return false;
                  })
                  .map((reponse, idx) => {
                    const membre = members.find(m => m.id === reponse.membre_id);
                    return (
                      <div key={idx} className="bg-black/30 rounded-lg p-3 border border-[#D4A024]/30 flex items-center justify-between">
                        <span className="text-white">{membre?.nom_complet || 'Membre inconnu'}</span>
                        <Badge className="bg-[#D4A024] text-[#7A2020]">Membre</Badge>
                      </div>
                    );
                  })}
                
                {/* Ajouts manuels qui ont choisi cet item */}
                {manualResponses
                  .filter(r => {
                    if (selectedMenuDetail.type === 'entree') return r.choix_entree === selectedMenuDetail.item;
                    if (selectedMenuDetail.type === 'plat') return r.choix_plat === selectedMenuDetail.item;
                    if (selectedMenuDetail.type === 'dessert') return r.choix_dessert === selectedMenuDetail.item;
                    return false;
                  })
                  .map((reponse, idx) => (
                    <div key={`manual-${idx}`} className="bg-black/30 rounded-lg p-3 border border-purple-600/30 flex items-center justify-between">
                      <span className="text-white">{reponse.nom}</span>
                      <Badge className={reponse.type === 'invite' ? 'bg-purple-600' : 'bg-blue-600'}>
                        {reponse.type === 'invite' ? 'Invité' : 'Ajout manuel'}
                      </Badge>
                    </div>
                  ))}
                
                {/* Message si personne */}
                {reponsesSondage.filter(r => {
                  if (selectedMenuDetail.type === 'entree') return r.choix_entree === selectedMenuDetail.item;
                  if (selectedMenuDetail.type === 'plat') return r.choix_plat === selectedMenuDetail.item;
                  if (selectedMenuDetail.type === 'dessert') return r.choix_dessert === selectedMenuDetail.item;
                  return false;
                }).length === 0 && manualResponses.filter(r => {
                  if (selectedMenuDetail.type === 'entree') return r.choix_entree === selectedMenuDetail.item;
                  if (selectedMenuDetail.type === 'plat') return r.choix_plat === selectedMenuDetail.item;
                  if (selectedMenuDetail.type === 'dessert') return r.choix_dessert === selectedMenuDetail.item;
                  return false;
                }).length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    Personne n'a choisi cette option
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== MODAL RELANCE WHATSAPP ========== */}
      {showRelanceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-serif text-[#D4A024] flex items-center">
                  <Send className="w-6 h-6 mr-2" />
                  Relance WhatsApp
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowRelanceModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                {nonRepondants.length} membre(s) n'ont pas encore répondu au sondage
              </p>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto max-h-[60vh]">
              {/* Liste des non-répondants */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-[#D4A024]" />
                  Membres à relancer
                </h3>
                <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {nonRepondants.map((m, index) => (
                    <div key={m.id} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-0">
                      <span className="text-white text-sm">{m.nom_complet}</span>
                      <span className="text-gray-400 text-xs font-mono">
                        {m.telephone || 'Pas de tel.'}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Bouton copier numéros */}
                <Button
                  onClick={copyTelephones}
                  variant="outline"
                  className="w-full mt-3 border-green-600/50 text-green-400 hover:bg-green-600/10"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Copier tous les numéros ({nonRepondants.filter(m => m.telephone).length})
                </Button>
              </div>

              {/* Message pré-formaté */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-[#D4A024]" />
                  Message à envoyer
                </h3>
                <div className="bg-black/30 rounded-lg p-4 text-gray-300 text-sm whitespace-pre-wrap">
                  {getMessageRelance()}
                </div>
                
                {/* Bouton copier message */}
                <Button
                  onClick={copyMessage}
                  variant="outline"
                  className="w-full mt-3 border-blue-600/50 text-blue-400 hover:bg-blue-600/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le message
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg p-4">
                <h4 className="text-[#D4A024] font-semibold mb-2">📱 Comment envoyer ?</h4>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li>1. Cliquez sur <strong>"Copier tous les numéros"</strong></li>
                  <li>2. Sur WhatsApp, créez une <strong>Liste de diffusion</strong> avec ces numéros</li>
                  <li>3. Cliquez sur <strong>"Copier le message"</strong></li>
                  <li>4. Collez et envoyez dans la liste de diffusion</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">
                  💡 Une liste de diffusion permet d'envoyer un message à plusieurs contacts sans créer de groupe.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
