import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ChevronLeft, ChevronRight, Save, BarChart3, Users, Calendar, RefreshCw, Check, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Edit, Lock, Table, LineChart } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Statistiques() {
  const [membres, setMembres] = useState([]);
  const [saisonsConfig, setSaisonsConfig] = useState({});
  const [presences, setPresences] = useState({});
  const [selectedSaison, setSelectedSaison] = useState(1);  // Commencer par la saison 1
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('saison'); // 'saison', 'global', 'stats_saison'
  const [globalStats, setGlobalStats] = useState([]);
  
  // Pour le tri des colonnes
  const [sortColumn, setSortColumn] = useState('pct_global');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' ou 'desc'
  
  // Stats résumées par saison (depuis l'API)
  const [saisonsResume, setSaisonsResume] = useState([]);
  
  // État pour les modifications manuelles des saisons historiques
  const [saisonsManuelEdits, setSaisonsManuelEdits] = useState({});
  const [savingSaisons, setSavingSaisons] = useState(false);
  
  // Mode d'affichage Stats Saisons : 'tableau' ou 'graphique'
  const [statsSaisonDisplayMode, setStatsSaisonDisplayMode] = useState('tableau');

  // Charger les données
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les membres
      const membresRes = await fetch(`${API_URL}/api/members`);
      const membresData = await membresRes.json();
      setMembres(membresData.sort((a, b) => a.numero_membre - b.numero_membre));

      // Charger les stats globales
      const globalRes = await fetch(`${API_URL}/api/statistiques/global`);
      const globalData = await globalRes.json();
      setGlobalStats(globalData.membres || []);
      
      // Construire le dict des configs de saisons
      const configsDict = {};
      for (const config of (globalData.saisons_config || [])) {
        configsDict[config.saison] = config;
      }
      setSaisonsConfig(configsDict);

      // Charger les stats résumées par saison
      const saisonsResumeRes = await fetch(`${API_URL}/api/statistiques/saisons-resume`);
      const saisonsResumeData = await saisonsResumeRes.json();
      setSaisonsResume(saisonsResumeData || []);

      // Charger les présences de la saison sélectionnée
      await loadSaisonPresences(selectedSaison);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
    }
    setLoading(false);
  }, [selectedSaison]);

  const loadSaisonPresences = async (saison) => {
    try {
      const res = await fetch(`${API_URL}/api/statistiques/saison/${saison}`);
      const data = await res.json();
      
      // Mettre à jour la config de la saison
      if (data.config) {
        setSaisonsConfig(prev => ({
          ...prev,
          [saison]: data.config
        }));
      }
      
      // Construire le dict des présences
      const presDict = {};
      for (const m of (data.membres || [])) {
        presDict[m.membre_id] = {
          presences_aperos: m.presences_aperos || 0,
          presences_repas: m.presences_repas || 0,
          presences_anniversaires: m.presences_anniversaires || 0
        };
      }
      setPresences(presDict);
      setHasChanges(false);
    } catch (error) {
      console.error('Erreur chargement présences:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      loadSaisonPresences(selectedSaison);
    }
  }, [selectedSaison]);

  // Obtenir la config de la saison actuelle
  const getCurrentConfig = () => {
    return saisonsConfig[selectedSaison] || {
      nb_aperos: 0,
      nb_repas: 0,
      nb_anniversaires: 0
    };
  };

  // Mettre à jour la config de la saison
  const handleConfigChange = (field, value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setSaisonsConfig(prev => ({
      ...prev,
      [selectedSaison]: {
        ...prev[selectedSaison],
        saison: selectedSaison,
        [field]: numValue
      }
    }));
    setHasChanges(true);
  };

  // Mettre à jour les présences d'un membre
  const handlePresenceChange = (membreId, field, value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    const config = getCurrentConfig();
    
    // Validation: ne pas dépasser le nombre d'événements
    let maxValue = 999;
    if (field === 'presences_aperos') maxValue = config.nb_aperos || 999;
    if (field === 'presences_repas') maxValue = config.nb_repas || 999;
    if (field === 'presences_anniversaires') maxValue = config.nb_anniversaires || 999;
    
    const validValue = Math.min(Math.max(0, numValue), maxValue);
    
    setPresences(prev => ({
      ...prev,
      [membreId]: {
        ...prev[membreId],
        [field]: validValue
      }
    }));
    setHasChanges(true);
  };

  // Afficher la valeur pour les inputs (vide si 0)
  const displayValue = (val) => val === 0 ? '' : val;

  // Fonction de tri des colonnes
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Stats membres triées
  const sortedGlobalStats = useMemo(() => {
    return [...globalStats].sort((a, b) => {
      let aVal = a[sortColumn] || 0;
      let bVal = b[sortColumn] || 0;
      if (sortDirection === 'asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });
  }, [globalStats, sortColumn, sortDirection]);

  // Stats saisons triées (depuis l'API)
  const sortedSaisonsStats = useMemo(() => {
    return [...saisonsResume].sort((a, b) => {
      let aVal = a[sortColumn] || 0;
      let bVal = b[sortColumn] || 0;
      if (sortDirection === 'asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });
  }, [saisonsResume, sortColumn, sortDirection]);

  // Données préparées pour le graphique (triées par saison)
  const chartData = useMemo(() => {
    return [...saisonsResume]
      .sort((a, b) => a.saison - b.saison)
      .map(stat => ({
        name: `S${stat.saison}`,
        saison: stat.saison,
        fullName: `Saison ${stat.saison} (${stat.annee_debut}-${stat.annee_fin})`,
        'Moy. Apéros': stat.moy_aperos || 0,
        'Moy. Repas': stat.moy_repas || 0,
        'Moy. Anniv.': stat.moy_anniversaires || 0,
        'Moy. Globale': stat.moy_global || 0,
        membres: stat.membres_actifs || 0
      }));
  }, [saisonsResume]);

  // Icône de tri pour les en-têtes
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-amber-600" />
      : <ArrowDown className="h-3 w-3 ml-1 text-amber-600" />;
  };

  // Gérer les modifications manuelles des saisons historiques
  const handleSaisonManuelChange = (saison, field, value) => {
    const numValue = value === '' ? null : parseInt(value) || 0;
    setSaisonsManuelEdits(prev => ({
      ...prev,
      [saison]: {
        ...prev[saison],
        [field]: numValue
      }
    }));
  };

  // Obtenir la valeur à afficher pour une saison (éditée ou originale)
  const getSaisonValue = (stat, field) => {
    const edited = saisonsManuelEdits[stat.saison]?.[field];
    if (edited !== undefined) return edited;
    return stat[field] || 0;
  };

  // Calculer la moyenne pour une saison avec les valeurs éditées
  const calculateMoyenne = (stat, type) => {
    const presField = `presences_membres_${type}`;
    const nbField = `nb_${type}`;
    
    const presences = getSaisonValue(stat, presField);
    const nbEvents = stat[nbField] || 0;
    
    if (nbEvents === 0 || presences === null) return '-';
    return (presences / nbEvents).toFixed(1);
  };

  // Sauvegarder les données manuelles d'une saison
  const handleSaveSaisonManuel = async (saison) => {
    const edits = saisonsManuelEdits[saison];
    if (!edits) return;

    setSavingSaisons(true);
    try {
      const stat = saisonsResume.find(s => s.saison === saison);
      
      await fetch(`${API_URL}/api/saisons-config/${saison}/manual-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presences_membres_aperos: edits.presences_membres_aperos ?? stat?.presences_membres_aperos,
          presences_membres_repas: edits.presences_membres_repas ?? stat?.presences_membres_repas,
          presences_membres_anniversaires: edits.presences_membres_anniversaires ?? stat?.presences_membres_anniversaires,
          nb_membres_manuel: edits.membres_actifs ?? stat?.membres_actifs
        })
      });

      toast.success(`Saison ${saison} sauvegardée !`);
      
      // Recharger les données
      const saisonsResumeRes = await fetch(`${API_URL}/api/statistiques/saisons-resume`);
      const saisonsResumeData = await saisonsResumeRes.json();
      setSaisonsResume(saisonsResumeData || []);
      
      // Nettoyer les éditions de cette saison
      setSaisonsManuelEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[saison];
        return newEdits;
      });
      
    } catch (error) {
      console.error('Erreur sauvegarde saison:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
    setSavingSaisons(false);
  };

  // Vérifier si une saison a des modifications non sauvegardées
  const hasSaisonChanges = (saison) => {
    return saisonsManuelEdits[saison] && Object.keys(saisonsManuelEdits[saison]).length > 0;
  };

  // Sauvegarder toutes les modifications
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Sauvegarder la config de la saison
      const config = getCurrentConfig();
      await fetch(`${API_URL}/api/saisons-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saison: selectedSaison,
          nb_aperos: config.nb_aperos || 0,
          nb_repas: config.nb_repas || 0,
          nb_anniversaires: config.nb_anniversaires || 0
        })
      });

      // 2. Sauvegarder les présences en masse
      const presencesList = Object.entries(presences).map(([membreId, data]) => ({
        membre_id: membreId,
        presences_aperos: data.presences_aperos || 0,
        presences_repas: data.presences_repas || 0,
        presences_anniversaires: data.presences_anniversaires || 0
      }));

      await fetch(`${API_URL}/api/presences/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saison: selectedSaison,
          presences: presencesList
        })
      });

      toast.success('Données sauvegardées avec succès !');
      setHasChanges(false);
      
      // Recharger les stats globales
      const globalRes = await fetch(`${API_URL}/api/statistiques/global`);
      const globalData = await globalRes.json();
      setGlobalStats(globalData.membres || []);
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  // Calculer le % pour un membre
  const calculatePercentage = (membreId) => {
    const config = getCurrentConfig();
    const pres = presences[membreId] || {};
    
    const totalPres = (pres.presences_aperos || 0) + (pres.presences_repas || 0) + (pres.presences_anniversaires || 0);
    const totalEvents = (config.nb_aperos || 0) + (config.nb_repas || 0) + (config.nb_anniversaires || 0);
    
    if (totalEvents === 0) return 0;
    return Math.round(totalPres / totalEvents * 100);
  };

  // Navigation saisons
  const goToPrevSaison = () => {
    if (selectedSaison > 1) setSelectedSaison(s => s - 1);
  };

  const goToNextSaison = () => {
    if (selectedSaison < 20) setSelectedSaison(s => s + 1);
  };

  const config = getCurrentConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Statistiques de Présences</h1>
          <p className="text-stone-500">Gérez les présences des membres par saison</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={viewMode === 'saison' ? 'default' : 'outline'}
            onClick={() => setViewMode('saison')}
            className={viewMode === 'saison' 
              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
              : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200 hover:text-stone-800'}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Saisie
          </Button>
          <Button
            variant={viewMode === 'global' ? 'default' : 'outline'}
            onClick={() => setViewMode('global')}
            className={viewMode === 'global' 
              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
              : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200 hover:text-stone-800'}
          >
            <Users className="h-4 w-4 mr-2" />
            Stats Membres
          </Button>
          <Button
            variant={viewMode === 'stats_saison' ? 'default' : 'outline'}
            onClick={() => setViewMode('stats_saison')}
            className={viewMode === 'stats_saison' 
              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
              : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200 hover:text-stone-800'}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Stats Saisons
          </Button>
        </div>
      </div>

      {viewMode === 'saison' ? (
        <>
          {/* Sélecteur de saison */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={goToPrevSaison} disabled={selectedSaison <= 1}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-amber-700">Saison {selectedSaison}</span>
                  <div className="flex gap-1">
                    {[...Array(Math.min(14, 14))].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setSelectedSaison(i + 1)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          selectedSaison === i + 1
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="outline" onClick={goToNextSaison} disabled={selectedSaison >= 20}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Config de la saison (nombre d'événements) */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                Configuration de la Saison {selectedSaison}
                <span className="text-sm font-normal text-stone-500 ml-2">
                  (Nombre d'événements organisés)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nombre d'Apéros
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={displayValue(config.nb_aperos || 0)}
                    onChange={(e) => handleConfigChange('nb_aperos', e.target.value)}
                    className="text-center text-lg font-semibold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nombre de Repas
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={displayValue(config.nb_repas || 0)}
                    onChange={(e) => handleConfigChange('nb_repas', e.target.value)}
                    className="text-center text-lg font-semibold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nombre d'Anniversaires
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={displayValue(config.nb_anniversaires || 0)}
                    onChange={(e) => handleConfigChange('nb_anniversaires', e.target.value)}
                    className="text-center text-lg font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-4 text-center text-stone-600">
                Total : <span className="font-bold text-amber-700">
                  {(config.nb_aperos || 0) + (config.nb_repas || 0) + (config.nb_anniversaires || 0)} événements
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des présences */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  Présences des Membres
                </CardTitle>
                {hasChanges && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Modifications non sauvegardées</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="presences-table">
                  <thead className="bg-stone-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700 w-8">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700 min-w-[200px]">Membre</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-stone-700" style={{ minWidth: '120px' }}>
                        Apéros
                        <div className="text-sm font-normal text-stone-500">/ {config.nb_aperos || 0}</div>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-stone-700" style={{ minWidth: '120px' }}>
                        Repas
                        <div className="text-sm font-normal text-stone-500">/ {config.nb_repas || 0}</div>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-stone-700" style={{ minWidth: '120px' }}>
                        Anniversaires
                        <div className="text-sm font-normal text-stone-500">/ {config.nb_anniversaires || 0}</div>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-amber-700 bg-amber-50" style={{ minWidth: '100px' }}>
                        % Saison
                        <div className="text-sm font-normal text-amber-600">(calculé)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {membres.map((membre, index) => {
                      const pres = presences[membre.id] || {};
                      const pct = calculatePercentage(membre.id);
                      
                      return (
                        <tr 
                          key={membre.id} 
                          className={`border-b border-stone-100 hover:bg-stone-50 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}
                          data-testid={`presence-row-${membre.numero_membre}`}
                        >
                          <td className="px-4 py-2 text-sm text-stone-500">{membre.numero_membre}</td>
                          <td className="px-4 py-2">
                            <span className="font-medium text-stone-800">{membre.nom_complet}</span>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              max={config.nb_aperos || 999}
                              value={displayValue(pres.presences_aperos || 0)}
                              onChange={(e) => handlePresenceChange(membre.id, 'presences_aperos', e.target.value)}
                              className="w-20 mx-auto text-center"
                              placeholder="0"
                              data-testid={`input-aperos-${membre.numero_membre}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              max={config.nb_repas || 999}
                              value={displayValue(pres.presences_repas || 0)}
                              onChange={(e) => handlePresenceChange(membre.id, 'presences_repas', e.target.value)}
                              className="w-20 mx-auto text-center"
                              placeholder="0"
                              data-testid={`input-repas-${membre.numero_membre}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              max={config.nb_anniversaires || 999}
                              value={displayValue(pres.presences_anniversaires || 0)}
                              onChange={(e) => handlePresenceChange(membre.id, 'presences_anniversaires', e.target.value)}
                              className="w-20 mx-auto text-center"
                              placeholder="0"
                              data-testid={`input-anniversaires-${membre.numero_membre}`}
                            />
                          </td>
                          <td className="px-4 py-2 text-center bg-amber-50">
                            <span className={`font-bold text-lg ${
                              pct >= 75 ? 'text-green-600' :
                              pct >= 50 ? 'text-amber-600' :
                              pct >= 25 ? 'text-orange-500' :
                              'text-red-500'
                            }`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Bouton Sauvegarder */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8"
              data-testid="save-presences-btn"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : hasChanges ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les modifications
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Tout est sauvegardé
                </>
              )}
            </Button>
          </div>
        </>
      ) : viewMode === 'global' ? (
        /* Vue Globale - Stats Membres */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Stats Membres - Toutes Saisons Confondues
              <span className="text-sm font-normal text-stone-500 ml-2">(Cliquez sur un en-tête pour trier)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="global-stats-table">
                <thead className="bg-stone-100">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-sm font-semibold text-stone-700 w-8 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('numero_membre')}
                    >
                      <span className="flex items-center"># <SortIcon column="numero_membre" /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700">Membre</th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('presences_aperos')}
                    >
                      <span className="flex items-center justify-center">Apéros <SortIcon column="presences_aperos" /></span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('pct_aperos')}
                    >
                      <span className="flex items-center justify-center">% Apéros <SortIcon column="pct_aperos" /></span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('presences_repas')}
                    >
                      <span className="flex items-center justify-center">Repas <SortIcon column="presences_repas" /></span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('pct_repas')}
                    >
                      <span className="flex items-center justify-center">% Repas <SortIcon column="pct_repas" /></span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('presences_anniversaires')}
                    >
                      <span className="flex items-center justify-center">Anniv. <SortIcon column="presences_anniversaires" /></span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('pct_anniversaires')}
                    >
                      <span className="flex items-center justify-center">% Anniv. <SortIcon column="pct_anniversaires" /></span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-semibold text-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-100"
                      onClick={() => handleSort('pct_global')}
                    >
                      <span className="flex items-center justify-center">% Global <SortIcon column="pct_global" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGlobalStats.map((stat, index) => (
                    <tr 
                      key={stat.membre_id} 
                      className={`border-b border-stone-100 hover:bg-stone-50 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}
                    >
                      <td className="px-4 py-2 text-sm text-stone-500">{stat.numero_membre}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-stone-800">{stat.nom_complet}</span>
                        {stat.saisons_exclues?.length > 0 && (
                          <span className="ml-2 text-base text-gray-400" title={`En sommeil: S${stat.saisons_exclues.join(', S')}`}>💤</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-sm">
                        {stat.presences_aperos}/{stat.total_aperos}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-medium ${
                          stat.pct_aperos >= 75 ? 'text-green-600' :
                          stat.pct_aperos >= 50 ? 'text-amber-600' :
                          'text-red-500'
                        }`}>
                          {stat.pct_aperos}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-sm">
                        {stat.presences_repas}/{stat.total_repas}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-medium ${
                          stat.pct_repas >= 75 ? 'text-green-600' :
                          stat.pct_repas >= 50 ? 'text-amber-600' :
                          'text-red-500'
                        }`}>
                          {stat.pct_repas}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-sm">
                        {stat.presences_anniversaires}/{stat.total_anniversaires}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-medium ${
                          stat.pct_anniversaires >= 75 ? 'text-green-600' :
                          stat.pct_anniversaires >= 50 ? 'text-amber-600' :
                          'text-red-500'
                        }`}>
                          {stat.pct_anniversaires}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center bg-amber-50">
                        <span className={`font-bold text-lg ${
                          stat.pct_global >= 75 ? 'text-green-600' :
                          stat.pct_global >= 50 ? 'text-amber-600' :
                          stat.pct_global >= 25 ? 'text-orange-500' :
                          'text-red-500'
                        }`}>
                          {stat.pct_global}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Vue Stats Saisons - MOYENNES par événement */
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  Stats par Saison - Moyenne de Présences
                </CardTitle>
                {statsSaisonDisplayMode === 'tableau' && (
                  <p className="text-sm text-stone-500 mt-2">
                    <Edit className="h-4 w-4 inline mr-1" />
                    Saisons 1-12 : Saisie manuelle
                    <Lock className="h-4 w-4 inline mx-2" />
                    Saison 13+ : Calcul automatique
                  </p>
                )}
              </div>
              {/* Toggle Tableau / Graphique */}
              <div className="flex gap-2">
                <Button
                  variant={statsSaisonDisplayMode === 'tableau' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatsSaisonDisplayMode('tableau')}
                  className={statsSaisonDisplayMode === 'tableau' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'}
                >
                  <Table className="h-4 w-4 mr-1" />
                  Tableau
                </Button>
                <Button
                  variant={statsSaisonDisplayMode === 'graphique' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatsSaisonDisplayMode('graphique')}
                  className={statsSaisonDisplayMode === 'graphique' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'}
                >
                  <LineChart className="h-4 w-4 mr-1" />
                  Graphique
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {statsSaisonDisplayMode === 'graphique' ? (
              /* Mode Graphique */
              <div className="p-6 space-y-8">
                {/* Graphique Lignes - Évolution des moyennes */}
                <div>
                  <h3 className="text-lg font-semibold text-stone-700 mb-4">Évolution des Moyennes de Présences</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #d4a024', borderRadius: '8px' }}
                          labelStyle={{ color: '#d4a024', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value, name) => [`${value} présents/évén.`, name]}
                          labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Moy. Globale" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', r: 5 }} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Moy. Apéros" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                        <Line type="monotone" dataKey="Moy. Repas" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                        <Line type="monotone" dataKey="Moy. Anniv." stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique Barres - Comparaison par saison */}
                <div>
                  <h3 className="text-lg font-semibold text-stone-700 mb-4">Comparaison par Saison</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #d4a024', borderRadius: '8px' }}
                          labelStyle={{ color: '#d4a024', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value, name) => [`${value} présents/évén.`, name]}
                          labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                        />
                        <Legend />
                        <Bar dataKey="Moy. Apéros" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Moy. Repas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Moy. Anniv." fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique Membres */}
                <div>
                  <h3 className="text-lg font-semibold text-stone-700 mb-4">Évolution du Nombre de Membres</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #d4a024', borderRadius: '8px' }}
                          labelStyle={{ color: '#d4a024', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value) => [`${value} membres`, 'Nb Membres']}
                          labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                        />
                        <Bar dataKey="membres" fill="#78716c" radius={[4, 4, 0, 0]} name="Nb Membres" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode Tableau */
              <div className="overflow-x-auto">
              <table className="w-full" data-testid="saison-stats-table">
                <thead className="bg-stone-100">
                  <tr>
                    <th 
                      className="px-3 py-3 text-left text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-200"
                      onClick={() => handleSort('saison')}
                    >
                      <span className="flex items-center">Saison <SortIcon column="saison" /></span>
                    </th>
                    <th className="px-2 py-3 text-center text-sm font-semibold text-stone-500">
                      Nb Membres
                    </th>
                    <th className="px-2 py-3 text-center text-sm font-semibold text-amber-600" colSpan="2">
                      Apéros
                      <div className="text-sm font-normal">(Prés. / Moy.)</div>
                    </th>
                    <th className="px-2 py-3 text-center text-sm font-semibold text-blue-600" colSpan="2">
                      Repas
                      <div className="text-sm font-normal">(Prés. / Moy.)</div>
                    </th>
                    <th className="px-2 py-3 text-center text-sm font-semibold text-purple-600" colSpan="2">
                      Anniversaires
                      <div className="text-sm font-normal">(Prés. / Moy.)</div>
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-sm font-semibold text-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-100"
                      onClick={() => handleSort('moy_global')}
                    >
                      <span className="flex items-center justify-center">Moy. Globale <SortIcon column="moy_global" /></span>
                    </th>
                    <th className="px-2 py-3 text-center text-sm font-semibold text-stone-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSaisonsStats.map((stat, index) => {
                    const isEditable = stat.saison <= 12;
                    const hasChanges = hasSaisonChanges(stat.saison);
                    
                    return (
                      <tr 
                        key={stat.saison} 
                        className={`border-b border-stone-100 hover:bg-stone-50 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'} ${hasChanges ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {isEditable ? (
                              <Edit className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Lock className="h-3 w-3 text-stone-400" />
                            )}
                            <span className="font-medium text-stone-800">S{stat.saison}</span>
                          </div>
                          <span className="text-sm text-stone-400">{stat.annee_debut}-{stat.annee_fin}</span>
                        </td>
                        
                        {/* Nombre de membres */}
                        <td className="px-2 py-2 text-center">
                          {isEditable ? (
                            <Input
                              type="number"
                              min="0"
                              value={getSaisonValue(stat, 'membres_actifs') || ''}
                              onChange={(e) => handleSaisonManuelChange(stat.saison, 'membres_actifs', e.target.value)}
                              className="w-14 mx-auto text-center text-sm h-8"
                              placeholder="0"
                            />
                          ) : (
                            <span className="text-stone-600">{stat.membres_actifs}</span>
                          )}
                        </td>
                        
                        {/* Apéros - Présences */}
                        <td className="px-1 py-2 text-center">
                          {isEditable ? (
                            <Input
                              type="number"
                              min="0"
                              value={getSaisonValue(stat, 'presences_membres_aperos') || ''}
                              onChange={(e) => handleSaisonManuelChange(stat.saison, 'presences_membres_aperos', e.target.value)}
                              className="w-14 mx-auto text-center text-sm h-8"
                              placeholder="0"
                              disabled={stat.nb_aperos === 0}
                            />
                          ) : (
                            <span className="text-sm text-stone-500">{stat.presences_membres_aperos || 0}</span>
                          )}
                          <div className="text-sm text-stone-400">/ {stat.nb_aperos} év.</div>
                        </td>
                        {/* Apéros - Moyenne */}
                        <td className="px-1 py-2 text-center bg-amber-50/30">
                          <span className="font-semibold text-amber-600">
                            {isEditable ? calculateMoyenne(stat, 'aperos') : (stat.moy_aperos || '-')}
                          </span>
                        </td>
                        
                        {/* Repas - Présences */}
                        <td className="px-1 py-2 text-center">
                          {isEditable ? (
                            <Input
                              type="number"
                              min="0"
                              value={getSaisonValue(stat, 'presences_membres_repas') || ''}
                              onChange={(e) => handleSaisonManuelChange(stat.saison, 'presences_membres_repas', e.target.value)}
                              className="w-14 mx-auto text-center text-sm h-8"
                              placeholder="0"
                              disabled={stat.nb_repas === 0}
                            />
                          ) : (
                            <span className="text-sm text-stone-500">{stat.presences_membres_repas || 0}</span>
                          )}
                          <div className="text-sm text-stone-400">/ {stat.nb_repas} év.</div>
                        </td>
                        {/* Repas - Moyenne */}
                        <td className="px-1 py-2 text-center bg-blue-50/30">
                          <span className="font-semibold text-blue-600">
                            {isEditable ? calculateMoyenne(stat, 'repas') : (stat.moy_repas || '-')}
                          </span>
                        </td>
                        
                        {/* Anniversaires - Présences */}
                        <td className="px-1 py-2 text-center">
                          {isEditable ? (
                            <Input
                              type="number"
                              min="0"
                              value={getSaisonValue(stat, 'presences_membres_anniversaires') || ''}
                              onChange={(e) => handleSaisonManuelChange(stat.saison, 'presences_membres_anniversaires', e.target.value)}
                              className="w-14 mx-auto text-center text-sm h-8"
                              placeholder="0"
                              disabled={stat.nb_anniversaires === 0}
                            />
                          ) : (
                            <span className="text-sm text-stone-500">{stat.presences_membres_anniversaires || 0}</span>
                          )}
                          <div className="text-sm text-stone-400">/ {stat.nb_anniversaires} év.</div>
                        </td>
                        {/* Anniversaires - Moyenne */}
                        <td className="px-1 py-2 text-center bg-purple-50/30">
                          <span className="font-semibold text-purple-600">
                            {isEditable ? calculateMoyenne(stat, 'anniversaires') : (stat.moy_anniversaires || '-')}
                          </span>
                        </td>
                        
                        {/* Moyenne Globale */}
                        <td className="px-3 py-2 text-center bg-amber-50">
                          <span className="font-bold text-lg text-amber-700">
                            {isEditable ? (
                              (() => {
                                const totalPres = (getSaisonValue(stat, 'presences_membres_aperos') || 0) +
                                                  (getSaisonValue(stat, 'presences_membres_repas') || 0) +
                                                  (getSaisonValue(stat, 'presences_membres_anniversaires') || 0);
                                const totalEvts = stat.total_events || 0;
                                return totalEvts > 0 ? (totalPres / totalEvts).toFixed(1) : '-';
                              })()
                            ) : (stat.moy_global || '-')}
                          </span>
                        </td>
                        
                        {/* Action */}
                        <td className="px-2 py-2 text-center">
                          {isEditable && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveSaisonManuel(stat.saison)}
                              disabled={!hasChanges || savingSaisons}
                              className={`h-7 px-2 text-sm ${hasChanges ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-stone-200 text-stone-400'}`}
                            >
                              {savingSaisons ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
