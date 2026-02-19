import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, TrendingUp, DollarSign, Info } from 'lucide-react';

const ProfilePage = () => {
  const { currentMember, setCurrentMember } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Pour la démo, on prend le premier membre
        // Dans une vraie app, on aurait un ID de session
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (!currentMember) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-600">
              Aucun profil disponible. Veuillez créer un membre d'abord.
            </p>
          </CardContent>
        </Card>
      </div>
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
    <div className="container mx-auto px-4 py-8">
      {/* En-tête du profil */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Mon Profil
        </h1>
        <p className="text-gray-600">Vos informations et statistiques</p>
      </div>

      {/* Carte principale du profil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Informations générales */}
        <Card className="lg:col-span-2" data-testid="profile-info">
          <CardHeader>
            <CardTitle className="text-2xl">{currentMember.nom_complet}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className="bg-amber-600">{currentMember.fonction}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-amber-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Année d'entrée</p>
                  <p className="font-semibold text-lg">{currentMember.annee_entree}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-amber-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Saison d'entrée</p>
                  <p className="font-semibold text-lg">{currentMember.saison_entree}</p>
                </div>
              </div>
            </div>

            {currentMember.autres_infos && (
              <div className="flex items-start space-x-3 mt-4 p-3 bg-gray-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Autres informations</p>
                  <p className="text-gray-800 mt-1">{currentMember.autres_infos}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <div className="space-y-4">
          {/* Étoiles */}
          <Card data-testid="profile-stars">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Évaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 ${
                      star <= currentMember.etoiles
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {currentMember.etoiles} étoile{currentMember.etoiles > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Présences */}
          <Card data-testid="profile-presence">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Taux de présence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span className="text-3xl font-bold text-green-700">
                  {currentMember.pourcentage_presences}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cotisation */}
          <Card data-testid="profile-cotisation">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Situation cotisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${cotisationStatus.color}`} />
                <span className="font-semibold">{cotisationStatus.label}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
