import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Star, Calendar, DollarSign, MessageSquare, Download, X } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { isAdmin } = useUser();
  const [members, setMembers] = useState([]);
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
  }, []);

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

  // Dashboard MEMBRE (simplifié)
  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Bienvenue à La Bague Impériale
          </h1>
          <p className="text-[#D4A024] text-lg font-serif">
            Votre espace membre
          </p>
        </div>

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
                    <Award key={i} className="w-6 h-6 text-[#D4A024] fill-[#D4A024]" />
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
                    <Award key={i} className="w-6 h-6 text-[#D4A024] fill-[#D4A024]" />
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
                  className="bg-black/30 rounded-lg p-4 border border-[#D4A024]/20"
                >
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    {[...Array(stars)].map((_, i) => (
                      <Award key={i} className="w-5 h-5 text-[#D4A024] fill-[#D4A024]" />
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

        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-serif text-white mb-2">
                  {nextEvent.type} du {nextEvent.date}
                </CardTitle>
                <Badge className="bg-green-600">Sondage en cours</Badge>
              </div>
              <Button
                onClick={handleExportSMS}
                className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
              >
                <Download className="w-4 h-4 mr-2" />
                Export SMS
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Présences */}
              <div>
                <h3 className="text-lg font-serif text-white mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-[#D4A024]" />
                  Présences
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                    <div className="text-3xl font-serif font-bold text-green-400">
                      {nextEvent.sondageResults.presents}
                    </div>
                    <div className="text-sm text-gray-400">Présents</div>
                  </div>
                  <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
                    <div className="text-3xl font-serif font-bold text-red-400">
                      {nextEvent.sondageResults.absents}
                    </div>
                    <div className="text-sm text-gray-400">Absents</div>
                  </div>
                </div>
              </div>

              {/* Choix des plats */}
              <div>
                <h3 className="text-lg font-serif text-white mb-3">
                  🍽️ Choix des Plats
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white">Entrées</span>
                    </div>
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
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white">Plats Principaux</span>
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
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
};

export default Dashboard;
