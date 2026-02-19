import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Star, TrendingUp, Award } from 'lucide-react';

const Dashboard = () => {
  const { isAdmin, currentMember } = useUser();
  const [stats, setStats] = useState({
    totalMembers: 0,
    avgPresence: 0,
    topMembers: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const members = await api.getMembers();
        const totalMembers = members.length;
        const avgPresence = members.reduce((sum, m) => sum + m.pourcentage_presences, 0) / totalMembers || 0;
        const topMembers = members.filter(m => m.etoiles >= 3).length;

        setStats({
          totalMembers,
          avgPresence: avgPresence.toFixed(1),
          topMembers,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des stats:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Bienvenue à La Bague Impériale
        </h1>
        <p className="text-gray-600">
          {isAdmin ? 'Panneau d\'administration' : 'Votre espace membre'}
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stat-members">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Membres Total
            </CardTitle>
            <Users className="w-5 h-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-presence">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Présence Moyenne
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{stats.avgPresence}%</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-top-members">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Membres d'Excellence
            </CardTitle>
            <Award className="w-5 h-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">{stats.topMembers}</div>
            <p className="text-xs text-gray-500 mt-1">3-4 étoiles</p>
          </CardContent>
        </Card>
      </div>

      {/* Message de bienvenue */}
      <Card>
        <CardHeader>
          <CardTitle>🎩 À propos du Club</CardTitle>
          <CardDescription>
            La Bague Impériale est un club d'amateurs de cigares de prestige
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-gray-700">
            <p>
              Fondé dans la tradition de l'excellence, notre club réunit des passionnés
              autour de moments privilégiés de dégustation et de partage.
            </p>
            <p>
              {isAdmin ? (
                <span className="font-semibold text-amber-700">
                  En tant que Président, vous avez accès à la gestion complète des membres.
                </span>
              ) : (
                <span>
                  Consultez votre profil pour voir vos statistiques et votre progression.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
