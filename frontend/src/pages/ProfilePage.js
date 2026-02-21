import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import MemberCard from '../components/MemberCard';

const ProfilePage = () => {
  const { currentMember, setCurrentMember } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const members = await api.getMembers();
        if (members.length > 0) {
          setCurrentMember(members[0]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [setCurrentMember]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#D4A024] text-xl font-serif">Chargement...</div>
      </div>
    );
  }

  if (!currentMember) {
    return (
      <Card className="bg-black/40 border-2 border-[#D4A024]/30">
        <CardContent className="py-8">
          <p className="text-center text-gray-400">
            Aucun profil disponible. Veuillez créer un membre d'abord.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Générer toutes les saisons du membre
  const generateSeasons = () => {
    const currentYear = 2025; // Année actuelle de la saison 13
    const currentSeason = 13;
    const startYear = currentMember.annee_entree;
    
    // Calculer la saison d'entrée (Saison 1 = 2013)
    const startSeason = startYear - 2012; // 2013 - 2012 = 1, 2014 - 2012 = 2, etc.
    
    const seasons = [];
    for (let season = startSeason; season <= currentSeason; season++) {
      const yearStart = 2012 + season; // Saison 1 = 2013, Saison 2 = 2014, etc.
      const yearEnd = yearStart + 1;
      
      // Déterminer si la cotisation est payée
      // Les X dernières saisons sont non payées (X = situation_cotisation)
      const unpaidSeasons = currentMember.situation_cotisation || 0;
      const isPaid = season <= (currentSeason - unpaidSeasons);
      
      seasons.push({
        number: season,
        label: `Saison ${season} (${yearStart}-${yearEnd})`,
        isPaid: isPaid
      });
    }
    
    return seasons;
  };

  const memberSeasons = generateSeasons();

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Mon Profil
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Vos informations et statistiques
        </p>
      </div>

      {/* Carte de membre virtuelle */}
      <div data-testid="member-card-section">
        <MemberCard member={currentMember} />
      </div>

      {/* Informations détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations générales */}
        <Card 
          className="lg:col-span-2 bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" 
          data-testid="profile-info"
        >
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-white flex items-center justify-between">
              <span>{currentMember.nom_complet}</span>
              <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024]">
                {currentMember.fonction}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-[#D4A024] mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Année d'entrée</p>
                  <p className="font-semibold text-lg text-white">{currentMember.annee_entree}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-[#D4A024] mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Saison d'entrée</p>
                  <p className="font-semibold text-lg text-white">{currentMember.saison_entree}</p>
                </div>
              </div>
            </div>

            {currentMember.autres_infos && (
              <div className="flex items-start space-x-3 p-4 bg-[#D4A024]/10 rounded-lg border-l-4 border-[#D4A024]">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Autres informations</p>
                  <p className="text-gray-200">{currentMember.autres_infos}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <div className="space-y-4">
          {/* Étoiles */}
          <Card 
            className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" 
            data-testid="profile-stars"
          >
            <CardHeader>
              <CardTitle className="text-sm font-serif text-gray-400">Évaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-1 mb-2">
                {[1, 2, 3, 4].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 ${
                      star <= currentMember.etoiles
                        ? 'text-[#D4A024] fill-[#D4A024]'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-400">
                {currentMember.etoiles} étoile{currentMember.etoiles > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Présences */}
          <Card 
            className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" 
            data-testid="profile-presence"
          >
            <CardHeader>
              <CardTitle className="text-sm font-serif text-gray-400">Taux de présence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-6 h-6 text-[#D4A024]" />
                <span className="text-3xl font-serif font-bold text-[#D4A024]">
                  {currentMember.pourcentage_presences}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cotisation - Historique des saisons */}
          <Card 
            className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" 
            data-testid="profile-cotisation"
          >
            <CardHeader>
              <CardTitle className="text-sm font-serif text-gray-400">
                Historique des cotisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {memberSeasons.map((season) => (
                  <div
                    key={season.number}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      season.isPaid
                        ? 'bg-green-900/20 border-green-600/30'
                        : 'bg-red-900/20 border-red-600/30'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      season.isPaid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      Saison {season.number}
                    </span>
                    <div className={`w-3 h-3 rounded-full ${
                      season.isPaid ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                ))}
                
                {/* Résumé */}
                <div className="pt-3 mt-3 border-t border-[#D4A024]/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total saisons :</span>
                    <span className="text-white font-semibold">{memberSeasons.length}</span>
                  </div>
                  {currentMember.situation_cotisation > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-400">En attente :</span>
                      <span className="text-red-400 font-semibold">
                        {currentMember.situation_cotisation} saison{currentMember.situation_cotisation > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
