import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Calendar, TrendingUp, User, BarChart3, RefreshCw, AlertTriangle, CreditCard, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import MemberCard from '../components/MemberCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProfilePage = () => {
  const { currentMember, setCurrentMember } = useUser();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos'); // 'infos' ou 'presences'
  const [presencesStats, setPresencesStats] = useState(null);
  const [loadingPresences, setLoadingPresences] = useState(false);
  const [dettes, setDettes] = useState([]);
  
  // Modal signalement de paiement
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [paiementForm, setPaiementForm] = useState({
    date_paiement: new Date().toISOString().split('T')[0],
    type: 'recette',
    objet: '',
    montant: '',
    endroit: '',
    detail: ''
  });
  const [mesPaiements, setMesPaiements] = useState([]);
  const [submittingPaiement, setSubmittingPaiement] = useState(false);

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

  // Charger les dettes du membre
  useEffect(() => {
    const loadDettes = async () => {
      if (currentMember?.id) {
        try {
          const response = await fetch(`${API_URL}/api/dettes/membre/${currentMember.id}`);
          const data = await response.json();
          setDettes(data || []);
        } catch (error) {
          console.error('Erreur chargement dettes:', error);
          setDettes([]);
        }
      }
    };
    loadDettes();
  }, [currentMember]);

  // Charger les paiements signalés par le membre
  useEffect(() => {
    const loadMesPaiements = async () => {
      if (currentMember?.id) {
        try {
          const response = await fetch(`${API_URL}/api/paiements-en-attente/membre/${currentMember.id}`);
          const data = await response.json();
          setMesPaiements(data || []);
        } catch (error) {
          console.error('Erreur chargement paiements:', error);
          setMesPaiements([]);
        }
      }
    };
    loadMesPaiements();
  }, [currentMember]);

  // Soumettre un signalement de paiement
  const handleSubmitPaiement = async () => {
    if (!paiementForm.objet || !paiementForm.montant || !paiementForm.endroit) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setSubmittingPaiement(true);
    try {
      const response = await fetch(`${API_URL}/api/paiements-en-attente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membre_id: currentMember.id,
          date_paiement: paiementForm.date_paiement,
          type: paiementForm.type,
          objet: paiementForm.objet,
          montant: parseFloat(paiementForm.montant),
          endroit: paiementForm.endroit,
          detail: paiementForm.detail || null
        })
      });
      
      if (response.ok) {
        toast.success('Paiement signalé ! En attente de validation par le président.');
        setShowPaiementModal(false);
        setPaiementForm({
          date_paiement: new Date().toISOString().split('T')[0],
          type: 'recette',
          objet: '',
          montant: '',
          endroit: '',
          detail: ''
        });
        // Recharger les paiements
        const paiementsRes = await fetch(`${API_URL}/api/paiements-en-attente/membre/${currentMember.id}`);
        const paiementsData = await paiementsRes.json();
        setMesPaiements(paiementsData || []);
      } else {
        toast.error('Erreur lors du signalement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du signalement');
    }
    setSubmittingPaiement(false);
  };

  // Charger les stats de présences quand on va sur l'onglet
  useEffect(() => {
    const loadPresences = async () => {
      if (activeTab === 'presences' && currentMember?.id && !presencesStats) {
        setLoadingPresences(true);
        try {
          const response = await fetch(`${API_URL}/api/presences/membre/${currentMember.id}`);
          const data = await response.json();
          setPresencesStats(data);
        } catch (error) {
          console.error('Erreur chargement présences:', error);
        }
        setLoadingPresences(false);
      }
    };
    loadPresences();
  }, [activeTab, currentMember, presencesStats]);

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
    const currentYear = 2025;
    const currentSeason = 13;
    const startYear = currentMember.annee_entree;
    const startSeason = startYear - 2012;
    
    const seasons = [];
    for (let season = startSeason; season <= currentSeason; season++) {
      const yearStart = 2012 + season;
      const yearEnd = yearStart + 1;
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
  
  // Obtenir le % global calculé
  const getGlobalPercentage = () => {
    if (presencesStats?.totaux?.pct_global !== undefined) {
      return presencesStats.totaux.pct_global;
    }
    return currentMember.pourcentage_presences || 0;
  };

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

      {/* Onglets */}
      <div className="flex gap-2 border-b border-[#D4A024]/30 pb-2">
        <Button
          variant={activeTab === 'infos' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('infos')}
          className={activeTab === 'infos' ? 'bg-[#D4A024] text-[#7A2020]' : 'text-gray-400 hover:text-[#D4A024]'}
          data-testid="tab-infos"
        >
          <User className="w-4 h-4 mr-2" />
          Informations
        </Button>
        <Button
          variant={activeTab === 'presences' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('presences')}
          className={activeTab === 'presences' ? 'bg-[#D4A024] text-[#7A2020]' : 'text-gray-400 hover:text-[#D4A024]'}
          data-testid="tab-presences"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Présences
        </Button>
      </div>

      {activeTab === 'infos' ? (
        /* Onglet Informations */
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
                    <p className="text-base text-gray-400">Année d'entrée</p>
                    <p className="font-semibold text-lg text-white">{currentMember.annee_entree}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-[#D4A024] mt-1" />
                  <div>
                    <p className="text-base text-gray-400">Saison d'entrée</p>
                    <p className="font-semibold text-lg text-white">{currentMember.saison_entree}</p>
                  </div>
                </div>
              </div>

              {currentMember.autres_infos && (
                <div className="flex items-start space-x-3 p-4 bg-[#D4A024]/10 rounded-lg border-l-4 border-[#D4A024]">
                  <div>
                    <p className="text-base text-gray-400 mb-1">Autres informations</p>
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
                <p className="text-base text-gray-400">
                  {currentMember.etoiles} étoile{currentMember.etoiles > 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            {/* Présences (aperçu) */}
            <Card 
              className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm cursor-pointer hover:border-[#D4A024]/50 transition-colors" 
              data-testid="profile-presence"
              onClick={() => setActiveTab('presences')}
            >
              <CardHeader>
                <CardTitle className="text-sm font-serif text-gray-400">Taux de présence global</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6 text-[#D4A024]" />
                  <span className="text-3xl font-serif font-bold text-[#D4A024]">
                    {getGlobalPercentage()}%
                  </span>
                </div>
                <p className="text-base text-gray-500 mt-2">Cliquez pour voir le détail</p>
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
                <div className="space-y-2 max-h-64 overflow-y-auto">
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

            {/* Situation Financière - Dettes */}
            {(currentMember.situation_cotisation > 0 || dettes.length > 0) && (
              <Card className="bg-black/40 border-2 border-red-600/30 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-serif text-white flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                    Situation Financière
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Cotisations dues */}
                    {currentMember.situation_cotisation > 0 && (
                      <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-3">
                        <p className="text-white">
                          <span className="text-orange-400 font-bold">DOIT :</span>{' '}
                          <span className="text-white">{currentMember.situation_cotisation} cotisation{currentMember.situation_cotisation > 1 ? 's' : ''}</span>{' '}
                          <span className="text-gray-400">({currentMember.situation_cotisation * 200}€)</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Autres dettes */}
                    {dettes.map((dette) => (
                      <div key={dette.id} className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                        <p className="text-white">
                          <span className="text-red-400 font-bold">DOIT :</span>{' '}
                          <span className="text-white">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dette.montant)}</span>{' '}
                          <span className="text-red-400 font-bold">POUR</span>{' '}
                          <span className="text-gray-300">{dette.cause}</span>
                        </p>
                      </div>
                    ))}
                    
                    {/* Total */}
                    <div className="pt-2 border-t border-red-600/30">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total dû :</span>
                        <span className="text-xl font-bold text-red-400">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                            (currentMember.situation_cotisation * 200) + dettes.reduce((sum, d) => sum + d.montant, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bouton Signaler un paiement */}
            <Card className="bg-black/40 border-2 border-green-600/30 backdrop-blur-sm">
              <CardContent className="py-4">
                <Button
                  onClick={() => setShowPaiementModal(true)}
                  className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3"
                  data-testid="btn-signaler-paiement"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Signaler un paiement
                </Button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Signalez un paiement effectué pour qu'il soit validé par le président
                </p>
              </CardContent>
            </Card>

            {/* Paiements en attente de validation */}
            {mesPaiements.length > 0 && (
              <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-serif text-white">
                    Mes paiements signalés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mesPaiements.map((paiement) => (
                      <div 
                        key={paiement.id} 
                        className={`p-3 rounded-lg border ${
                          paiement.statut === 'en_attente' 
                            ? 'bg-yellow-900/20 border-yellow-600/30' 
                            : paiement.statut === 'validé'
                            ? 'bg-green-900/20 border-green-600/30'
                            : 'bg-red-900/20 border-red-600/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              {paiement.objet} - {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(paiement.montant)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {paiement.date_paiement} • {paiement.endroit}
                            </p>
                          </div>
                          <Badge className={
                            paiement.statut === 'en_attente' 
                              ? 'bg-yellow-600' 
                              : paiement.statut === 'validé'
                              ? 'bg-green-600'
                              : 'bg-red-600'
                          }>
                            {paiement.statut === 'en_attente' ? 'En attente' : paiement.statut === 'validé' ? 'Validé' : 'Refusé'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Onglet Présences */
        <div className="space-y-6">
          {loadingPresences ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-[#D4A024]" />
            </div>
          ) : presencesStats ? (
            <>
              {/* Résumé global */}
              <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif text-white">
                    Statistiques Globales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-[#D4A024]/10 rounded-lg">
                      <div className="text-3xl font-bold text-[#D4A024]">
                        {presencesStats.totaux?.pct_global || 0}%
                      </div>
                      <div className="text-base text-gray-400 mt-1">Total</div>
                      <div className="text-base text-gray-500">
                        {presencesStats.totaux?.presences_total || 0}/{presencesStats.totaux?.events_total || 0}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-amber-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">
                        {presencesStats.totaux?.pct_aperos || 0}%
                      </div>
                      <div className="text-base text-gray-400 mt-1">Apéros</div>
                      <div className="text-base text-gray-500">
                        {presencesStats.totaux?.presences_aperos || 0}/{presencesStats.totaux?.total_aperos || 0}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">
                        {presencesStats.totaux?.pct_repas || 0}%
                      </div>
                      <div className="text-base text-gray-400 mt-1">Repas</div>
                      <div className="text-base text-gray-500">
                        {presencesStats.totaux?.presences_repas || 0}/{presencesStats.totaux?.total_repas || 0}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">
                        {presencesStats.totaux?.pct_anniversaires || 0}%
                      </div>
                      <div className="text-base text-gray-400 mt-1">Anniversaires</div>
                      <div className="text-base text-gray-500">
                        {presencesStats.totaux?.presences_anniversaires || 0}/{presencesStats.totaux?.total_anniversaires || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Détail par saison */}
              <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif text-white">
                    Détail par Saison
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {presencesStats.par_saison && presencesStats.par_saison.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full" data-testid="presences-detail-table">
                        <thead className="bg-[#D4A024]/10">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[#D4A024]">Saison</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-amber-400">Apéros</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-blue-400">Repas</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-purple-400">Anniv.</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-[#D4A024]">% Saison</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presencesStats.par_saison.map((saison, index) => (
                            <tr 
                              key={saison.saison} 
                              className={`border-b border-[#D4A024]/10 ${index % 2 === 0 ? 'bg-black/20' : ''}`}
                            >
                              <td className="px-4 py-3 text-white font-medium">Saison {saison.saison}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-amber-400">{saison.presences_aperos}/{saison.nb_aperos}</span>
                                <span className="text-gray-500 text-sm ml-1">({saison.pct_aperos}%)</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-blue-400">{saison.presences_repas}/{saison.nb_repas}</span>
                                <span className="text-gray-500 text-sm ml-1">({saison.pct_repas}%)</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-purple-400">{saison.presences_anniversaires}/{saison.nb_anniversaires}</span>
                                <span className="text-gray-500 text-sm ml-1">({saison.pct_anniversaires}%)</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-bold text-lg ${
                                  saison.pct_global_saison >= 75 ? 'text-green-400' :
                                  saison.pct_global_saison >= 50 ? 'text-[#D4A024]' :
                                  saison.pct_global_saison >= 25 ? 'text-orange-400' :
                                  'text-red-400'
                                }`}>
                                  {saison.pct_global_saison}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      Aucune donnée de présence enregistrée.
                      <br />
                      <span className="text-sm">Les statistiques apparaîtront une fois les données saisies par l'administrateur.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-8 text-center text-gray-400">
              Impossible de charger les statistiques de présence.
            </div>
          )}
        </div>
      )}

      {/* Modal Signaler un paiement */}
      {showPaiementModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Signaler un paiement
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPaiementModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-gray-300 text-sm mt-1">
                Le président sera notifié et devra valider ce paiement
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Date */}
              <div>
                <Label className="text-gray-300 mb-2 block">Date du paiement *</Label>
                <Input
                  type="date"
                  value={paiementForm.date_paiement}
                  onChange={(e) => setPaiementForm(prev => ({ ...prev, date_paiement: e.target.value }))}
                  className="bg-black/30 border-[#D4A024]/50 text-white"
                />
              </div>

              {/* Objet */}
              <div>
                <Label className="text-gray-300 mb-2 block">Objet du paiement *</Label>
                <div className="max-h-40 overflow-y-auto border border-[#D4A024]/30 rounded-lg bg-black/50">
                  {['cotisation', 'album', 'tombola', 'anniversaire', 'autres'].map((obj) => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setPaiementForm(prev => ({ ...prev, objet: obj }))}
                      className={`w-full text-left px-4 py-3 border-b border-[#D4A024]/10 last:border-b-0 ${
                        paiementForm.objet === obj 
                          ? 'bg-[#D4A024]/30 text-[#D4A024]' 
                          : 'text-white hover:bg-[#D4A024]/10'
                      }`}
                    >
                      {obj.charAt(0).toUpperCase() + obj.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Détail si "autres" */}
              {paiementForm.objet === 'autres' && (
                <div>
                  <Label className="text-gray-300 mb-2 block">Précisez</Label>
                  <Input
                    value={paiementForm.detail}
                    onChange={(e) => setPaiementForm(prev => ({ ...prev, detail: e.target.value }))}
                    placeholder="Détail du paiement..."
                    className="bg-black/30 border-[#D4A024]/50 text-white"
                  />
                </div>
              )}

              {/* Montant */}
              <div>
                <Label className="text-gray-300 mb-2 block">Montant (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paiementForm.montant}
                  onChange={(e) => setPaiementForm(prev => ({ ...prev, montant: e.target.value }))}
                  placeholder="0.00"
                  className="bg-black/30 border-[#D4A024]/50 text-white text-lg"
                />
              </div>

              {/* Où / À qui */}
              <div>
                <Label className="text-gray-300 mb-2 block">Remis à / Où *</Label>
                <div className="max-h-40 overflow-y-auto border border-[#D4A024]/30 rounded-lg bg-black/50">
                  {['Compte', 'Chez Fabien', 'Chez Jacques', 'PayPal', 'Asso Connect', 'Chèque', 'Espèces'].map((lieu) => (
                    <button
                      key={lieu}
                      type="button"
                      onClick={() => setPaiementForm(prev => ({ ...prev, endroit: lieu }))}
                      className={`w-full text-left px-4 py-3 border-b border-[#D4A024]/10 last:border-b-0 ${
                        paiementForm.endroit === lieu 
                          ? 'bg-[#D4A024]/30 text-[#D4A024]' 
                          : 'text-white hover:bg-[#D4A024]/10'
                      }`}
                    >
                      {lieu}
                    </button>
                  ))}
                </div>
              </div>

              {/* Résumé */}
              {paiementForm.objet && paiementForm.montant && paiementForm.endroit && (
                <div className="bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg p-4">
                  <p className="text-[#D4A024] font-semibold mb-2">Résumé :</p>
                  <p className="text-white">
                    Paiement de <span className="text-[#D4A024] font-bold">{paiementForm.montant}€</span> pour{' '}
                    <span className="text-[#D4A024] font-bold">{paiementForm.objet}</span>
                    {paiementForm.objet === 'autres' && paiementForm.detail && ` (${paiementForm.detail})`}
                    , remis à <span className="text-[#D4A024] font-bold">{paiementForm.endroit}</span> le{' '}
                    <span className="text-[#D4A024] font-bold">{paiementForm.date_paiement}</span>
                  </p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-4 border-t border-[#D4A024]/30">
                <Button
                  variant="outline"
                  onClick={() => setShowPaiementModal(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={submittingPaiement}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmitPaiement}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold"
                  disabled={submittingPaiement || !paiementForm.objet || !paiementForm.montant || !paiementForm.endroit}
                >
                  {submittingPaiement ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Signaler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
