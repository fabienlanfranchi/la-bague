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

  const getCotisationStatus = (status) => {
    const statuses = {
      0: { label: 'À jour', color: 'bg-green-500' },
      1: { label: 'Retard 1 mois', color: 'bg-yellow-500' },
      2: { label: 'Retard 2 mois', color: 'bg-orange-500' },
      3: { label: 'Retard 3+ mois', color: 'bg-red-500' },
    };
    return statuses[status] || statuses[0];
  };

  const cotisationStatus = getCotisationStatus(currentMember.situation_cotisation);

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

          {/* Cotisation */}
          <Card 
            className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" 
            data-testid="profile-cotisation"
          >
            <CardHeader>
              <CardTitle className="text-sm font-serif text-gray-400">Situation cotisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${cotisationStatus.color}`} />
                <span className="font-semibold text-white">{cotisationStatus.label}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
