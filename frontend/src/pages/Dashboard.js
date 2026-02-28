import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Star, Calendar, DollarSign, MessageSquare, Download, X, Bell, RefreshCw, Check, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============ COMPOSANT DASHBOARD MEMBRE ============
const DashboardMembre = ({ prochainEvenement, currentMember }) => {
  const [reponse, setReponse] = useState(null); // null, 'oui', 'non'
  const [reponseEnvoyee, setReponseEnvoyee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingReponse, setExistingReponse] = useState(null);

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
        }
      } catch (error) {
        // Pas de réponse existante, c'est normal
        console.log('Pas de réponse existante');
      }
    };
    
    loadExistingReponse();
  }, [prochainEvenement, currentMember]);

  // Calculer la date limite du sondage selon le type d'événement
  const getDateLimiteSondage = (evenement) => {
    if (!evenement) return null;
    const dateEvt = new Date(evenement.date);
    
    if (evenement.type_sondage === 'repas' || evenement.objet?.toLowerCase().includes('repas')) {
      dateEvt.setHours(21, 30, 0, 0);
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

    setLoading(true);
    try {
      await axios.post(`${API}/reponses-sondages`, {
        evenement_id: prochainEvenement.id,
        membre_id: currentMember.id,
        present: reponse === 'oui'
      });
      
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
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => { setReponse('oui'); setReponseEnvoyee(false); }}
                      className={`flex-1 transition-all duration-200 ${
                        reponse === 'oui'
                          ? 'bg-green-600 border-green-500 text-white font-bold shadow-lg shadow-green-500/30'
                          : 'border-green-600/50 text-green-400 hover:bg-green-900/30'
                      }`}
                    >
                      <Check className={`w-5 h-5 mr-2 ${reponse === 'oui' ? 'animate-bounce' : ''}`} />
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
                      <X className={`w-5 h-5 mr-2 ${reponse === 'non' ? 'animate-bounce' : ''}`} />
                      NON, absent
                    </Button>
                  </div>
                </div>

                {/* Confirmation visuelle */}
                {reponseEnvoyee && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 mb-4">
                    <p className="text-green-400 text-center font-semibold flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Votre réponse "{reponse === 'oui' ? 'PRÉSENT' : 'ABSENT'}" a été enregistrée !
                    </p>
                    <p className="text-green-400/70 text-center text-sm mt-1">
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
      {!prochainEvenement && (
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardContent className="py-8 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun événement à venir</p>
            <p className="text-gray-500 text-sm mt-1">Vous serez notifié dès qu'un événement sera programmé</p>
          </CardContent>
        </Card>
      )}

      {/* À propos du club */}
      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white">
            🎩 À propos du Club
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 leading-relaxed">
            Bienvenue dans votre espace membre de La Bague Impériale, club d'amateurs de cigares de prestige.
            Consultez votre profil, participez aux sondages, et restez informé des prochains événements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};


const Dashboard = () => {
  const { isAdmin, currentMember } = useUser();
  const [members, setMembers] = useState([]);
  const [prochainEvenement, setProchainEvenement] = useState(null);
  const [nonRepondants, setNonRepondants] = useState([]);
  const [loadingRelance, setLoadingRelance] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    avgPresenceGlobal: 0,
    avgPresenceSeason: 0,
    currentSeason: 'Saison 13 - 2025',
    membersByStars: { 4: 0, 3: 0, 2: 0, 1: 0 },
    cotisationsEnAttente: 0,
    totalSaisonsDues: 0, // Nombre total de saisons dues
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

  useEffect(() => {
    loadDashboardData();
    loadProchainEvenement();
  }, []);

  // Charger le prochain événement et les non-répondants
  const loadProchainEvenement = async () => {
    try {
      const response = await axios.get(`${API}/evenements`);
      const evenements = response.data;
      
      // Trouver le prochain événement (à venir)
      const now = new Date();
      const prochain = evenements
        .filter(e => e.statut === 'à venir' && new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      
      setProchainEvenement(prochain);
      
      if (prochain) {
        // Charger les réponses au sondage pour cet événement
        await loadNonRepondants(prochain.id);
      }
    } catch (error) {
      console.error('Erreur chargement événement:', error);
    }
  };

  // Charger la liste des membres qui n'ont pas répondu au sondage
  const loadNonRepondants = async (evenementId) => {
    try {
      // Récupérer tous les membres
      const membresRes = await axios.get(`${API}/members`);
      const allMembres = membresRes.data;
      
      // Récupérer les réponses existantes pour cet événement (via messages liés)
      const messagesRes = await axios.get(`${API}/messages`);
      const sondageMessage = messagesRes.data.find(m => m.evenement_id === evenementId && m.type === 'sondage');
      
      if (sondageMessage) {
        const reponsesRes = await axios.get(`${API}/sondage-reponses/${sondageMessage.id}`);
        const respondantIds = reponsesRes.data.map(r => r.membre_id);
        
        // Filtrer les non-répondants
        const nonRep = allMembres.filter(m => !respondantIds.includes(m.id));
        setNonRepondants(nonRep);
      } else {
        // Pas de sondage envoyé = tous sont non-répondants
        setNonRepondants(allMembres);
      }
    } catch (error) {
      console.error('Erreur chargement non-répondants:', error);
      setNonRepondants([]);
    }
  };

  // Relancer le sondage uniquement aux non-répondants
  const handleRelanceSondage = async () => {
    if (!prochainEvenement || nonRepondants.length === 0) {
      toast.info('Tous les membres ont répondu au sondage');
      return;
    }

    setLoadingRelance(true);
    try {
      const dateEvt = new Date(prochainEvenement.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      await axios.post(`${API}/messages`, {
        type: 'rappel_sondage',
        titre: `⚠️ Rappel : Sondage ${prochainEvenement.objet}`,
        contenu: `Bonjour,\n\nNous n'avons pas encore reçu votre réponse au sondage pour le ${prochainEvenement.objet} du ${dateEvt} à ${prochainEvenement.lieu}.\n\nMerci de répondre rapidement.\n\nCordialement,\nLe Président`,
        destinataires: nonRepondants.map(m => m.id),
        evenement_id: prochainEvenement.id
      });

      toast.success(`Rappel envoyé à ${nonRepondants.length} membre(s) non-répondant(s)`);
      loadProchainEvenement(); // Recharger les données
    } catch (error) {
      console.error('Erreur relance:', error);
      toast.error('Erreur lors de l\'envoi du rappel');
    } finally {
      setLoadingRelance(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const membersData = await api.getMembers();
      setMembers(membersData);
      
      // Calcul des statistiques
      const totalMembers = membersData.length;
      
      // Présence moyenne globale
      const avgPresenceGlobal = membersData.reduce((sum, m) => sum + m.pourcentage_presences, 0) / totalMembers || 0;
      
      // Présence moyenne saison en cours (Saison 13 - 2025)
      const currentSeasonMembers = membersData.filter(m => m.saison_entree === 'Saison 13');
      const avgPresenceSeason = currentSeasonMembers.length > 0
        ? currentSeasonMembers.reduce((sum, m) => sum + m.pourcentage_presences, 0) / currentSeasonMembers.length
        : 0;
      
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
      
      setStats({
        totalMembers,
        avgPresenceGlobal: avgPresenceGlobal.toFixed(1),
        avgPresenceSeason: avgPresenceSeason.toFixed(1),
        currentSeason: 'Saison 13 - 2025',
        membersByStars,
        cotisationsEnAttente,
        totalSaisonsDues,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const handleExportSMS = () => {
    const { presents, entreeA, entreeB, platA, platB, platC } = nextEvent.sondageResults;
    const message = `📊 Résultats Sondage - ${nextEvent.type} du ${nextEvent.date}\n\n` +
      `✅ Présents: ${presents}\n` +
      `❌ Absents: ${nextEvent.sondageResults.absents}\n\n` +
      `🍽️ ENTRÉES:\n` +
      `  • Entrée A: ${entreeA}\n` +
      `  • Entrée B: ${entreeB}\n\n` +
      `🍖 PLATS:\n` +
      `  • Plat A: ${platA}\n` +
      `  • Plat B: ${platB}\n` +
      `  • Plat C: ${platC}`;
    
    // Copier dans le presse-papier
    navigator.clipboard.writeText(message);
    toast.success('Résultats copiés ! Vous pouvez les coller dans votre SMS.');
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
    return <DashboardMembre prochainEvenement={prochainEvenement} currentMember={currentMember} />;
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
              <CardTitle className="text-sm font-serif text-gray-400">
                Présence Moyenne Générale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-serif font-bold text-[#D4A024]">
                  {stats.avgPresenceGlobal}%
                </div>
                <div className="flex items-center space-x-0.5">
                  {[...Array(getStarsFromPercentage(parseFloat(stats.avgPresenceGlobal)))].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-[#D4A024] fill-[#D4A024]" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Tous les membres</p>
            </CardContent>
          </Card>

          {/* Présence saison en cours */}
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" data-testid="presence-saison">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-serif text-gray-400">
                Présence {stats.currentSeason}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-serif font-bold text-[#D4A024]">
                  {stats.avgPresenceSeason}%
                </div>
                <div className="flex items-center space-x-0.5">
                  {[...Array(getStarsFromPercentage(parseFloat(stats.avgPresenceSeason)))].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-[#D4A024] fill-[#D4A024]" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Saison en cours</p>
            </CardContent>
          </Card>
        </div>

        {/* Répartition par étoiles */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white">
              Répartition par Étoiles
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
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
                      <Star key={i} className="w-5 h-5 text-[#D4A024] fill-[#D4A024]" />
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-serif font-bold text-white">
                      {stats.membersByStars[stars]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
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
                    <Badge className="bg-green-600">Sondage en cours</Badge>
                    <span className="text-gray-400 text-sm">📍 {prochainEvenement.lieu}</span>
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
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export SMS
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Statut des réponses */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-serif font-bold text-green-400">
                      {members.length - nonRepondants.length}
                    </div>
                    <div className="text-sm text-gray-400">Ont répondu</div>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-serif font-bold text-yellow-400">
                      {nonRepondants.length}
                    </div>
                    <div className="text-sm text-gray-400">Non-répondants</div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-serif font-bold text-blue-400">
                      {members.length > 0 ? Math.round((members.length - nonRepondants.length) / members.length * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-400">Taux de réponse</div>
                  </div>
                </div>

                {/* Liste des non-répondants */}
                {nonRepondants.length > 0 && (
                  <div className="bg-black/30 rounded-lg p-4 border border-yellow-600/30">
                    <h4 className="text-yellow-400 font-semibold mb-3 flex items-center">
                      <Bell className="w-4 h-4 mr-2" />
                      Membres n'ayant pas répondu ({nonRepondants.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {nonRepondants.slice(0, 10).map((m) => (
                        <Badge key={m.id} className="bg-yellow-900/50 text-yellow-300 border border-yellow-600/30">
                          {m.nom_complet}
                        </Badge>
                      ))}
                      {nonRepondants.length > 10 && (
                        <Badge className="bg-gray-800 text-gray-400">
                          +{nonRepondants.length - 10} autres
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
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

                {/* Données mockées pour les choix (à connecter plus tard) */}
                <div className="border-t border-[#D4A024]/20 pt-4">
                  <h3 className="text-lg font-serif text-white mb-3">
                    🍽️ Choix des Plats (exemple)
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/30 rounded p-2 text-center border border-[#D4A024]/20">
                        <div className="text-xl font-bold text-[#D4A024]">{nextEvent.sondageResults.entreeA}</div>
                        <div className="text-xs text-gray-500">Entrée A</div>
                      </div>
                      <div className="bg-black/30 rounded p-2 text-center border border-[#D4A024]/20">
                        <div className="text-xl font-bold text-[#D4A024]">{nextEvent.sondageResults.entreeB}</div>
                        <div className="text-xs text-gray-500">Entrée B</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black/30 rounded p-2 text-center border border-[#D4A024]/20">
                        <div className="text-xl font-bold text-[#D4A024]">{nextEvent.sondageResults.platA}</div>
                        <div className="text-xs text-gray-500">Plat A</div>
                      </div>
                      <div className="bg-black/30 rounded p-2 text-center border border-[#D4A024]/20">
                        <div className="text-xl font-bold text-[#D4A024]">{nextEvent.sondageResults.platB}</div>
                        <div className="text-xs text-gray-500">Plat B</div>
                      </div>
                      <div className="bg-black/30 rounded p-2 text-center border border-[#D4A024]/20">
                        <div className="text-xl font-bold text-[#D4A024]">{nextEvent.sondageResults.platC}</div>
                        <div className="text-xs text-gray-500">Plat C</div>
                      </div>
                    </div>
                  </div>
                </div>
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
                <p className="text-white font-medium">Saisons de cotisation à recevoir</p>
                <p className="text-sm text-gray-400 mt-1">
                  {stats.cotisationsEnAttente} membre(s) avec cotisation en retard • 200€/an
                </p>
              </div>
            </div>
            
            {stats.cotisationsEnAttente > 0 && (
              <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
                <Button
                  variant="outline"
                  className="border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                  onClick={() => {
                    // Rediriger vers la page Membres
                    window.location.href = '/members';
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Voir les membres concernés
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
};

export default Dashboard;
