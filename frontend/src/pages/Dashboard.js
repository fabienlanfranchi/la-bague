import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Award, Crown } from 'lucide-react';

const Dashboard = () => {
  const { isAdmin } = useUser();
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
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Bienvenue
        </h1>
        <p className="text-[#D4A024] text-lg md:text-xl font-serif">
          {isAdmin ? 'Tableau de bord Président' : 'Votre espace membre'}
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm hover:border-[#D4A024] transition-all"
          data-testid="stat-members"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-serif text-gray-400">
              Membres Total
            </CardTitle>
            <Users className="w-6 h-6 text-[#D4A024]" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#D4A024]">
              {stats.totalMembers}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm hover:border-[#D4A024] transition-all"
          data-testid="stat-presence"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-serif text-gray-400">
              Présence Moyenne
            </CardTitle>
            <TrendingUp className="w-6 h-6 text-[#D4A024]" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#D4A024]">
              {stats.avgPresence}%
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm hover:border-[#D4A024] transition-all"
          data-testid="stat-top-members"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-serif text-gray-400">
              Membres d'Excellence
            </CardTitle>
            <Award className="w-6 h-6 text-[#D4A024]" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#D4A024]">
              {stats.topMembers}
            </div>
            <p className="text-xs text-gray-500 mt-1">3-4 étoiles</p>
          </CardContent>
        </Card>
      </div>

      {/* Carte de bienvenue */}
      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Crown className="w-8 h-8 text-[#D4A024]" />
            <CardTitle className="text-2xl font-serif text-white">
              La Bague Impériale
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Bienvenue dans l'espace de gestion de <span className="text-[#D4A024] font-semibold">La Bague Impériale</span>, 
            club d'amateurs de cigares de prestige. Fondé dans la tradition de l'excellence, 
            notre club réunit des passionnés autour de moments privilégiés de dégustation et de partage.
          </p>
          
          {isAdmin ? (
            <div className="bg-[#D4A024]/10 border-l-4 border-[#D4A024] p-4 rounded">
              <p className="text-[#D4A024] font-semibold">
                👑 En tant que Président, vous avez accès à la gestion complète des membres et de leurs statistiques.
              </p>
            </div>
          ) : (
            <div className="bg-[#D4A024]/10 border-l-4 border-[#D4A024] p-4 rounded">
              <p className="text-gray-300">
                Consultez votre profil pour voir votre carte de membre et vos statistiques.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
