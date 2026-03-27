import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Tags, Edit2, Trash2, Check, X, AlertTriangle, 
  Search, ArrowRight, Globe, Box, RefreshCw, Layers, Ban, RotateCcw, GitMerge, FileText, Cigarette, Eye, Star
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminCigarotheque = () => {
  const [activeTab, setActiveTab] = useState('marques');
  const [marques, setMarques] = useState([]);
  const [modules, setModules] = useState([]);
  const [terroirs, setTerroirs] = useState([]);
  const [gammes, setGammes] = useState([]);
  const [doublons, setDoublons] = useState([]);
  const [doublonsIgnores, setDoublonsIgnores] = useState([]);
  const [doublonsCigares, setDoublonsCigares] = useState([]);
  const [doublonsCigaresIgnores, setDoublonsCigaresIgnores] = useState([]);
  const [searchCigares, setSearchCigares] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [showIgnoredCigares, setShowIgnoredCigares] = useState(false);
  const [compareModal, setCompareModal] = useState(null); // {cigare1: {...}, cigare2: {...}}
  const [compareLoading, setCompareLoading] = useState(false);
  const [editedCigares, setEditedCigares] = useState({ cigare1: null, cigare2: null }); // Pour les modifications en cours
  
  // État pour l'édition
  const [editingItem, setEditingItem] = useState(null);
  const [newName, setNewName] = useState('');

  // Charger les données
  const loadMarques = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/admin/marques`);
      setMarques(res.data.marques);
    } catch (error) {
      toast.error('Erreur lors du chargement des marques');
    }
  };

  const loadModules = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/admin/modules`);
      setModules(res.data.modules);
    } catch (error) {
      toast.error('Erreur lors du chargement des modules');
    }
  };

  const loadTerroirs = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/admin/terroirs`);
      setTerroirs(res.data.terroirs);
    } catch (error) {
      toast.error('Erreur lors du chargement des terroirs');
    }
  };

  const loadGammes = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/admin/gammes`);
      setGammes(res.data.gammes);
    } catch (error) {
      toast.error('Erreur lors du chargement des gammes');
    }
  };

  const loadDoublons = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/admin/doublons`);
      setDoublons(res.data.doublons);
    } catch (error) {
      toast.error('Erreur lors de la détection des doublons');
    }
  };

  const loadDoublonsIgnores = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/admin/doublons-ignores`);
      setDoublonsIgnores(res.data.doublons_ignores);
    } catch (error) {
      console.error('Erreur chargement doublons ignorés:', error);
    }
  };

  // Charger les doublons de cigares
  const loadDoublonsCigares = async (search = '') => {
    try {
      let url = `${API}/api/cigares/doublons-potentiels`;
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      const res = await axios.get(url);
      setDoublonsCigares(res.data.doublons);
    } catch (error) {
      console.error('Erreur chargement doublons cigares:', error);
    }
  };

  // Charger les doublons de cigares ignorés
  const loadDoublonsCigaresIgnores = async () => {
    try {
      const res = await axios.get(`${API}/api/cigares/doublons/ignores`);
      setDoublonsCigaresIgnores(res.data.doublons_ignores);
    } catch (error) {
      console.error('Erreur chargement doublons cigares ignorés:', error);
    }
  };

  useEffect(() => {
    loadMarques();
    loadModules();
    loadTerroirs();
    loadGammes();
    loadDoublons();
    loadDoublonsIgnores();
  }, []);

  // Fusionner deux cigares
  const handleFusionnerCigares = async (cigareCompletId, cigareNotesId) => {
    if (!window.confirm(`Fusionner les cigares ?\n\nLe cigare ${cigareCompletId} gardera sa fiche et récupérera les notes du cigare ${cigareNotesId}.\nLe cigare ${cigareNotesId} sera supprimé.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/cigares/fusionner?cigare_complet_id=${cigareCompletId}&cigare_notes_id=${cigareNotesId}`);
      toast.success(res.data.message);
      loadDoublonsCigares(searchCigares);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fusion');
    } finally {
      setLoading(false);
    }
  };

  // Fusion intelligente : prend le meilleur des deux cigares
  const handleFusionIntelligente = async (cigare1Id, cigare2Id) => {
    if (!window.confirm(`Fusion intelligente ?\n\nLes meilleurs champs de chaque cigare seront combinés.\nLe cigare avec l'ID le plus petit sera conservé, l'autre supprimé.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/cigares/fusionner-intelligent?cigare1_id=${cigare1Id}&cigare2_id=${cigare2Id}`);
      toast.success(`${res.data.message} (${res.data.nb_champs_fusionnes} champs fusionnés)`);
      loadDoublonsCigares(searchCigares);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fusion');
    } finally {
      setLoading(false);
    }
  };

  // Ignorer un doublon de cigares
  const handleIgnorerDoublonCigare = async (cigare1Id, cigare2Id) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/cigares/doublons/ignorer?cigare1_id=${cigare1Id}&cigare2_id=${cigare2Id}`);
      toast.success(res.data.message);
      loadDoublonsCigares(searchCigares);
      loadDoublonsCigaresIgnores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Restaurer un doublon de cigares ignoré
  const handleRestaurerDoublonCigare = async (cigare1Id, cigare2Id) => {
    setLoading(true);
    try {
      const res = await axios.delete(`${API}/api/cigares/doublons/restaurer?cigare1_id=${cigare1Id}&cigare2_id=${cigare2Id}`);
      toast.success(res.data.message);
      loadDoublonsCigares(searchCigares);
      loadDoublonsCigaresIgnores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Comparer deux cigares en détail
  const handleComparer = async (id1, id2) => {
    setCompareLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        axios.get(`${API}/api/cigares/${id1}`),
        axios.get(`${API}/api/cigares/${id2}`)
      ]);
      setCompareModal({ cigare1: res1.data, cigare2: res2.data });
      setEditedCigares({ cigare1: { ...res1.data }, cigare2: { ...res2.data } });
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setCompareLoading(false);
    }
  };

  // Transférer un champ d'un cigare vers l'autre
  const handleTransferField = (field, fromCigare, toCigare) => {
    const value = editedCigares[fromCigare][field];
    setEditedCigares(prev => ({
      ...prev,
      [toCigare]: { ...prev[toCigare], [field]: value }
    }));
    toast.success(`${field} transféré`);
  };

  // Valider : sauvegarder le cigare le plus complet et supprimer l'autre
  const handleValiderComparaison = async () => {
    setLoading(true);
    try {
      const score1 = getCompletionScore(editedCigares.cigare1);
      const score2 = getCompletionScore(editedCigares.cigare2);
      
      // Déterminer quel cigare garder (le plus complet)
      const cigareGarde = score1.filled >= score2.filled ? editedCigares.cigare1 : editedCigares.cigare2;
      const cigareSupprime = score1.filled >= score2.filled ? editedCigares.cigare2 : editedCigares.cigare1;
      
      // Sauvegarder le cigare le plus complet
      await axios.put(`${API}/api/cigares/${cigareGarde.id}`, cigareGarde);
      
      // Supprimer l'autre
      await axios.delete(`${API}/api/cigares/${cigareSupprime.id}`);
      
      toast.success(`Cigare ID ${cigareGarde.id} conservé (${score1.filled >= score2.filled ? score1.percent : score2.percent}% complet). ID ${cigareSupprime.id} supprimé.`);
      setCompareModal(null);
      setEditedCigares({ cigare1: null, cigare2: null });
      loadDoublonsCigares(searchCigares);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la validation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer le score de complétude d'un cigare
  const getCompletionScore = (cigare) => {
    const fields = ['nom_cigare', 'marque', 'gamme', 'module', 'terroir', 'dimensions', 'puissance', 'prix', 'note_bagues', 'premier_tiers', 'deuxieme_tiers', 'troisieme_tiers', 'conclusion', 'photo_url'];
    let filled = 0;
    fields.forEach(f => {
      if (cigare[f] && cigare[f] !== '' && cigare[f] !== null) filled++;
    });
    return { filled, total: fields.length, percent: Math.round((filled / fields.length) * 100) };
  };

  // Ignorer un doublon (pas un vrai doublon)
  const handleIgnorerDoublon = async (marque1, marque2) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/cigares/admin/ignorer-doublon?marque1=${encodeURIComponent(marque1)}&marque2=${encodeURIComponent(marque2)}`);
      toast.success(res.data.message);
      loadDoublons();
      loadDoublonsIgnores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Restaurer un doublon ignoré
  const handleRestaurerDoublon = async (marque1, marque2) => {
    setLoading(true);
    try {
      const res = await axios.delete(`${API}/api/cigares/admin/restaurer-doublon?marque1=${encodeURIComponent(marque1)}&marque2=${encodeURIComponent(marque2)}`);
      toast.success(res.data.message);
      loadDoublons();
      loadDoublonsIgnores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Renommer une marque
  const handleRenameMarque = async (oldName) => {
    if (!newName.trim()) {
      toast.error('Le nouveau nom ne peut pas être vide');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(`${API}/api/cigares/admin/rename-marque?old_name=${encodeURIComponent(oldName)}&new_name=${encodeURIComponent(newName.trim())}`);
      toast.success(res.data.message);
      setEditingItem(null);
      setNewName('');
      loadMarques();
      loadDoublons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du renommage');
    } finally {
      setLoading(false);
    }
  };

  // Renommer un module
  const handleRenameModule = async (oldName) => {
    if (!newName.trim()) {
      toast.error('Le nouveau nom ne peut pas être vide');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(`${API}/api/cigares/admin/rename-module?old_name=${encodeURIComponent(oldName)}&new_name=${encodeURIComponent(newName.trim())}`);
      toast.success(res.data.message);
      setEditingItem(null);
      setNewName('');
      loadModules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du renommage');
    } finally {
      setLoading(false);
    }
  };

  // Renommer un terroir
  const handleRenameTerroir = async (oldName) => {
    if (!newName.trim()) {
      toast.error('Le nouveau nom ne peut pas être vide');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(`${API}/api/cigares/admin/rename-terroir?old_name=${encodeURIComponent(oldName)}&new_name=${encodeURIComponent(newName.trim())}`);
      toast.success(res.data.message);
      setEditingItem(null);
      setNewName('');
      loadTerroirs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du renommage');
    } finally {
      setLoading(false);
    }
  };

  // Renommer une gamme
  const handleRenameGamme = async (oldName, marque) => {
    if (!newName.trim()) {
      toast.error('Le nouveau nom ne peut pas être vide');
      return;
    }
    setLoading(true);
    try {
      let url = `${API}/api/cigares/admin/rename-gamme?old_name=${encodeURIComponent(oldName)}&new_name=${encodeURIComponent(newName.trim())}`;
      if (marque) {
        url += `&marque=${encodeURIComponent(marque)}`;
      }
      const res = await axios.put(url);
      toast.success(res.data.message);
      setEditingItem(null);
      setNewName('');
      loadGammes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du renommage');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une gamme (vider le champ)
  const handleDeleteGamme = async (gamme, marque) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la gamme "${gamme}" ${marque ? `pour ${marque}` : ''} ? (Le champ sera vidé, les cigares ne seront pas supprimés)`)) {
      return;
    }
    setLoading(true);
    try {
      let url = `${API}/api/cigares/admin/delete-gamme?gamme=${encodeURIComponent(gamme)}`;
      if (marque) {
        url += `&marque=${encodeURIComponent(marque)}`;
      }
      const res = await axios.delete(url);
      toast.success(res.data.message);
      loadGammes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une marque
  const handleDeleteMarque = async (marque) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la marque "${marque}" et TOUS ses cigares ?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await axios.delete(`${API}/api/cigares/admin/delete-marque?marque=${encodeURIComponent(marque)}`);
      toast.success(res.data.message);
      loadMarques();
      loadDoublons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // Fusionner deux marques (renommer l'une vers l'autre)
  const handleMergeDoublon = async (marqueToRename, marqueTarget) => {
    if (!window.confirm(`Fusionner "${marqueToRename}" vers "${marqueTarget}" ?\n\nTous les cigares "${marqueToRename}" deviendront "${marqueTarget}".`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(`${API}/api/cigares/admin/rename-marque?old_name=${encodeURIComponent(marqueToRename)}&new_name=${encodeURIComponent(marqueTarget)}`);
      toast.success(res.data.message);
      loadMarques();
      loadGammes();
      loadDoublons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fusion');
    } finally {
      setLoading(false);
    }
  };

  // Fusionner avec extraction de gamme (ex: "Bentley White" → "Bentley" + gamme "White")
  const handleMergeWithGamme = async (marqueSource, marqueCible) => {
    // Déduire la gamme
    let gammeExtraite = '';
    if (marqueSource.toLowerCase().startsWith(marqueCible.toLowerCase())) {
      gammeExtraite = marqueSource.substring(marqueCible.length).trim();
    } else if (marqueSource.toLowerCase().endsWith(marqueCible.toLowerCase())) {
      gammeExtraite = marqueSource.substring(0, marqueSource.length - marqueCible.length).trim();
    }
    
    const message = gammeExtraite 
      ? `Fusionner "${marqueSource}" vers "${marqueCible}" ET extraire "${gammeExtraite}" comme gamme ?\n\nLes cigares garderont la trace de leur gamme d'origine.`
      : `Fusionner "${marqueSource}" vers "${marqueCible}" avec extraction de gamme ?`;
    
    if (!window.confirm(message)) {
      return;
    }
    setLoading(true);
    try {
      let url = `${API}/api/cigares/admin/fusionner-avec-gamme?marque_source=${encodeURIComponent(marqueSource)}&marque_cible=${encodeURIComponent(marqueCible)}`;
      if (gammeExtraite) {
        url += `&gamme_extraite=${encodeURIComponent(gammeExtraite)}`;
      }
      const res = await axios.put(url);
      toast.success(res.data.message);
      loadMarques();
      loadGammes();
      loadDoublons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fusion');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les éléments
  const filterItems = (items, key) => {
    if (!searchTerm) return items;
    return items.filter(item => {
      const name = item[key] || '';
      const marque = item.marque || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             marque.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  // Composant pour afficher une liste d'items simple (marques, modules, terroirs)
  const ItemList = ({ items, type, itemKey, onRename, onDelete, showDelete = true }) => {
    const filteredItems = filterItems(items, itemKey);

    return (
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {filteredItems.map((item, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between bg-black/30 border border-gray-700 rounded-lg p-3 hover:border-[#D4A024]/50 transition-colors"
          >
            {editingItem === `${type}-${item[itemKey]}` ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nouveau nom..."
                  className="bg-black/50 border-[#D4A024]/30 text-white flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="bg-green-600 hover:bg-green-500 h-8 w-8"
                  onClick={() => onRename(item[itemKey])}
                  disabled={loading}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-gray-600 h-8 w-8"
                  onClick={() => { setEditingItem(null); setNewName(''); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{item[itemKey]}</span>
                  <Badge variant="secondary" className="bg-[#D4A024]/20 text-[#D4A024]">
                    {item.count} cigares
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                    onClick={() => { setEditingItem(`${type}-${item[itemKey]}`); setNewName(item[itemKey]); }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {showDelete && onDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      onClick={() => onDelete(item[itemKey])}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="text-gray-500 text-center py-4">Aucun élément trouvé</p>
        )}
      </div>
    );
  };

  // Composant pour afficher les gammes (avec marque associée)
  const GammesList = () => {
    const filteredGammes = filterItems(gammes, 'gamme');

    return (
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {filteredGammes.map((item, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between bg-black/30 border border-gray-700 rounded-lg p-3 hover:border-[#D4A024]/50 transition-colors"
          >
            {editingItem === `gamme-${item.gamme}-${item.marque}` ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nouveau nom..."
                  className="bg-black/50 border-[#D4A024]/30 text-white flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="bg-green-600 hover:bg-green-500 h-8 w-8"
                  onClick={() => handleRenameGamme(item.gamme, item.marque)}
                  disabled={loading}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-gray-600 h-8 w-8"
                  onClick={() => { setEditingItem(null); setNewName(''); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-white font-medium">{item.gamme}</span>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                    {item.marque}
                  </Badge>
                  <Badge variant="secondary" className="bg-[#D4A024]/20 text-[#D4A024]">
                    {item.count} cigares
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                    onClick={() => { 
                      setEditingItem(`gamme-${item.gamme}-${item.marque}`); 
                      setNewName(item.gamme); 
                    }}
                    title="Renommer cette gamme"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    onClick={() => handleDeleteGamme(item.gamme, item.marque)}
                    title="Supprimer cette gamme (vide le champ)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        {filteredGammes.length === 0 && (
          <p className="text-gray-500 text-center py-4">Aucune gamme trouvée</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2d1f1f] to-[#1a1a1a] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#D4A024]">
              Administration Cigarothèque
            </h1>
            <p className="text-gray-400 mt-1">
              Gérer les marques, gammes, modules et terroirs
            </p>
          </div>
          <Button
            variant="outline"
            className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/10"
            onClick={() => { loadMarques(); loadModules(); loadTerroirs(); loadGammes(); loadDoublons(); }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Barre de recherche globale */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une marque, une gamme, un module, un terroir..."
              className="pl-10 bg-black/50 border-[#D4A024]/30 text-white h-12"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-black/50 border border-gray-700 mb-6 flex-wrap h-auto p-1">
            <TabsTrigger value="marques" className="data-[state=active]:bg-[#D4A024]/20 data-[state=active]:text-[#D4A024]">
              <Tags className="w-4 h-4 mr-2" />
              Marques ({marques.length})
            </TabsTrigger>
            <TabsTrigger value="gammes" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
              <Layers className="w-4 h-4 mr-2" />
              Gammes ({gammes.length})
            </TabsTrigger>
            <TabsTrigger value="modules" className="data-[state=active]:bg-[#D4A024]/20 data-[state=active]:text-[#D4A024]">
              <Box className="w-4 h-4 mr-2" />
              Modules ({modules.length})
            </TabsTrigger>
            <TabsTrigger value="terroirs" className="data-[state=active]:bg-[#D4A024]/20 data-[state=active]:text-[#D4A024]">
              <Globe className="w-4 h-4 mr-2" />
              Terroirs ({terroirs.length})
            </TabsTrigger>
            <TabsTrigger value="doublons" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-400">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Doublons Marques ({doublons.length})
            </TabsTrigger>
            <TabsTrigger 
              value="doublons-cigares" 
              className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400"
              onClick={() => { if (doublonsCigares.length === 0) loadDoublonsCigares(); }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Doublons Cigares
            </TabsTrigger>
          </TabsList>

          {/* Onglet Marques */}
          <TabsContent value="marques">
            <Card className="bg-black/40 border-2 border-[#D4A024]/30">
              <CardHeader>
                <CardTitle className="text-[#D4A024] flex items-center">
                  <Tags className="w-5 h-5 mr-2" />
                  Toutes les marques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemList 
                  items={marques} 
                  type="marques"
                  itemKey="marque"
                  onRename={handleRenameMarque}
                  onDelete={handleDeleteMarque}
                  showDelete={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Gammes */}
          <TabsContent value="gammes">
            <Card className="bg-black/40 border-2 border-purple-600/30">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center">
                  <Layers className="w-5 h-5 mr-2" />
                  Toutes les gammes/lignes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-4">
                  Chaque gamme est associée à une marque. Renommer ou supprimer affecte uniquement cette combinaison.
                </p>
                <GammesList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Modules */}
          <TabsContent value="modules">
            <Card className="bg-black/40 border-2 border-[#D4A024]/30">
              <CardHeader>
                <CardTitle className="text-[#D4A024] flex items-center">
                  <Box className="w-5 h-5 mr-2" />
                  Tous les modules (formats)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemList 
                  items={modules} 
                  type="modules"
                  itemKey="module"
                  onRename={handleRenameModule}
                  onDelete={null}
                  showDelete={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Terroirs */}
          <TabsContent value="terroirs">
            <Card className="bg-black/40 border-2 border-[#D4A024]/30">
              <CardHeader>
                <CardTitle className="text-[#D4A024] flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Tous les terroirs (pays)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemList 
                  items={terroirs} 
                  type="terroirs"
                  itemKey="terroir"
                  onRename={handleRenameTerroir}
                  onDelete={null}
                  showDelete={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Doublons */}
          <TabsContent value="doublons">
            <Card className="bg-black/40 border-2 border-orange-600/30">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Doublons potentiels de marques
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${showIgnored ? 'bg-gray-600 text-white' : 'border-gray-600 text-gray-400'}`}
                    onClick={() => setShowIgnored(!showIgnored)}
                  >
                    {showIgnored ? 'Masquer ignorés' : `Voir ignorés (${doublonsIgnores.length})`}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showIgnored ? (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Ces marques semblent être des doublons. Fusionnez-les ou marquez comme "Pas un doublon".
                    </p>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                      {doublons.map((doublon, idx) => (
                        <div 
                          key={idx}
                          className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-orange-600/30 text-orange-300">
                              {doublon.similarite}% similaire
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                              onClick={() => handleIgnorerDoublon(doublon.marque1, doublon.marque2)}
                              disabled={loading}
                              title="Pas un doublon - ignorer cette suggestion"
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Pas un doublon
                            </Button>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Marque 1 */}
                            <div className="flex-1 bg-black/30 rounded-lg p-3 text-center">
                              <p className="text-white font-medium">{doublon.marque1}</p>
                              <p className="text-gray-400 text-sm">{doublon.count1} cigares</p>
                            </div>

                            {/* Boutons de fusion */}
                            <div className="flex flex-col gap-1">
                              {/* Fusion simple */}
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-400 hover:bg-green-900/30 px-2"
                                  onClick={() => handleMergeDoublon(doublon.marque1, doublon.marque2)}
                                  disabled={loading}
                                  title={`Fusionner "${doublon.marque1}" vers "${doublon.marque2}"`}
                                >
                                  <ArrowRight className="w-5 h-5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-400 hover:bg-green-900/30 rotate-180 px-2"
                                  onClick={() => handleMergeDoublon(doublon.marque2, doublon.marque1)}
                                  disabled={loading}
                                  title={`Fusionner "${doublon.marque2}" vers "${doublon.marque1}"`}
                                >
                                  <ArrowRight className="w-5 h-5" />
                                </Button>
                              </div>
                              
                              {/* Fusion + Gamme */}
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-purple-400 hover:bg-purple-900/30 px-2 text-xs"
                                  onClick={() => handleMergeWithGamme(doublon.marque1, doublon.marque2)}
                                  disabled={loading}
                                  title={`Fusionner "${doublon.marque1}" vers "${doublon.marque2}" et extraire la gamme`}
                                >
                                  <GitMerge className="w-4 h-4" />
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-purple-400 hover:bg-purple-900/30 px-2 text-xs"
                                  onClick={() => handleMergeWithGamme(doublon.marque2, doublon.marque1)}
                                  disabled={loading}
                                  title={`Fusionner "${doublon.marque2}" vers "${doublon.marque1}" et extraire la gamme`}
                                >
                                  <ArrowRight className="w-3 h-3 rotate-180" />
                                  <GitMerge className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Marque 2 */}
                            <div className="flex-1 bg-black/30 rounded-lg p-3 text-center">
                              <p className="text-white font-medium">{doublon.marque2}</p>
                              <p className="text-gray-400 text-sm">{doublon.count2} cigares</p>
                            </div>
                          </div>
                          
                          {/* Légende */}
                          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
                            <span><ArrowRight className="w-3 h-3 inline text-green-400" /> Fusion simple</span>
                            <span><GitMerge className="w-3 h-3 inline text-purple-400" /> Fusion + Gamme</span>
                          </div>
                        </div>
                      ))}
                      {doublons.length === 0 && (
                        <p className="text-gray-500 text-center py-4">Aucun doublon détecté</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Ces paires ont été marquées comme "Pas un doublon" et ne s'afficheront plus.
                    </p>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                      {doublonsIgnores.map((doublon, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-white">{doublon.marque1}</span>
                              <span className="text-gray-500">/</span>
                              <span className="text-white">{doublon.marque2}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                              onClick={() => handleRestaurerDoublon(doublon.marque1, doublon.marque2)}
                              disabled={loading}
                              title="Restaurer dans la liste des doublons"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restaurer
                            </Button>
                          </div>
                        </div>
                      ))}
                      {doublonsIgnores.length === 0 && (
                        <p className="text-gray-500 text-center py-4">Aucun doublon ignoré</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Doublons Cigares */}
          <TabsContent value="doublons-cigares">
            <Card className="bg-black/40 border-2 border-red-600/30">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Doublons de cigares
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${showIgnoredCigares ? 'bg-gray-600 text-white' : 'border-gray-600 text-gray-400'}`}
                    onClick={() => { setShowIgnoredCigares(!showIgnoredCigares); if (!showIgnoredCigares) loadDoublonsCigaresIgnores(); }}
                  >
                    {showIgnoredCigares ? 'Voir doublons' : `Ignorés (${doublonsCigaresIgnores.length})`}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showIgnoredCigares ? (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Recherchez des cigares similaires pour les fusionner ou marquez comme "Pas un doublon".
                    </p>
                    
                    {/* Recherche */}
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={searchCigares}
                        onChange={(e) => setSearchCigares(e.target.value)}
                        placeholder="Rechercher un cigare (ex: Red Caiman, Horacio...)"
                        className="bg-black/50 border-red-600/30 text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            loadDoublonsCigares(searchCigares);
                          }
                        }}
                      />
                      <Button
                        onClick={() => loadDoublonsCigares(searchCigares)}
                        className="bg-red-600 hover:bg-red-500"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Chercher
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {doublonsCigares.map((doublon, idx) => (
                        <div 
                          key={idx}
                          className="bg-red-900/20 border border-red-600/30 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-red-600/30 text-red-300">
                              {doublon.similarite}% similaire
                            </Badge>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                onClick={() => handleComparer(doublon.cigare1.id, doublon.cigare2.id)}
                                disabled={compareLoading}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Comparer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                                onClick={() => handleIgnorerDoublonCigare(doublon.cigare1.id, doublon.cigare2.id)}
                                disabled={loading}
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Pas un doublon
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Cigare 1 */}
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-white font-medium">{doublon.cigare1.nom || '(Sans nom)'}</p>
                              <p className="text-gray-400 text-sm">{doublon.cigare1.marque}</p>
                          {doublon.cigare1.gamme && (
                            <p className="text-purple-400 text-xs">Gamme: {doublon.cigare1.gamme}</p>
                          )}
                          {doublon.cigare1.module && (
                            <p className="text-gray-500 text-xs">Module: {doublon.cigare1.module}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            {doublon.cigare1.has_nom && (
                              <Badge className="bg-green-600/30 text-green-300 text-xs">Fiche OK</Badge>
                            )}
                            {doublon.cigare1.has_notes && (
                              <Badge className="bg-blue-600/30 text-blue-300 text-xs">Notes OK</Badge>
                            )}
                            {!doublon.cigare1.has_nom && (
                              <Badge className="bg-orange-600/30 text-orange-300 text-xs">Fiche incomplète</Badge>
                            )}
                            {!doublon.cigare1.has_notes && (
                              <Badge className="bg-gray-600/30 text-gray-300 text-xs">Sans notes</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs mt-1">ID: {doublon.cigare1.id}</p>
                        </div>

                        {/* Cigare 2 */}
                        <div className="bg-black/30 rounded-lg p-3">
                          <p className="text-white font-medium">{doublon.cigare2.nom || '(Sans nom)'}</p>
                          <p className="text-gray-400 text-sm">{doublon.cigare2.marque}</p>
                          {doublon.cigare2.gamme && (
                            <p className="text-purple-400 text-xs">Gamme: {doublon.cigare2.gamme}</p>
                          )}
                          {doublon.cigare2.module && (
                            <p className="text-gray-500 text-xs">Module: {doublon.cigare2.module}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            {doublon.cigare2.has_nom && (
                              <Badge className="bg-green-600/30 text-green-300 text-xs">Fiche OK</Badge>
                            )}
                            {doublon.cigare2.has_notes && (
                              <Badge className="bg-blue-600/30 text-blue-300 text-xs">Notes OK</Badge>
                            )}
                            {!doublon.cigare2.has_nom && (
                              <Badge className="bg-orange-600/30 text-orange-300 text-xs">Fiche incomplète</Badge>
                            )}
                            {!doublon.cigare2.has_notes && (
                              <Badge className="bg-gray-600/30 text-gray-300 text-xs">Sans notes</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs mt-1">ID: {doublon.cigare2.id}</p>
                        </div>
                      </div>

                      {/* Boutons de fusion */}
                      <div className="flex justify-center gap-4 mt-3">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white"
                          onClick={() => handleFusionnerCigares(doublon.cigare1.id, doublon.cigare2.id)}
                          disabled={loading}
                          title="Garder le cigare 1 et récupérer les infos du cigare 2"
                        >
                          <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                          Garder gauche
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white"
                          onClick={() => handleFusionnerCigares(doublon.cigare2.id, doublon.cigare1.id)}
                          disabled={loading}
                          title="Garder le cigare 2 et récupérer les infos du cigare 1"
                        >
                          Garder droite
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {doublonsCigares.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      Recherchez un cigare pour trouver des doublons potentiels
                    </p>
                  )}
                </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Ces paires de cigares ont été marquées comme "Pas un doublon" et ne s'afficheront plus dans la recherche.
                    </p>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                      {doublonsCigaresIgnores.map((item, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <span className="text-white">{item.cigare1_nom || `ID ${item.cigare1_id}`}</span>
                            <span className="text-gray-500 mx-2">↔</span>
                            <span className="text-white">{item.cigare2_nom || `ID ${item.cigare2_id}`}</span>
                            <span className="text-gray-500 text-xs ml-2">
                              ({item.cigare1_marque} / {item.cigare2_marque})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                            onClick={() => handleRestaurerDoublonCigare(item.cigare1_id, item.cigare2_id)}
                            disabled={loading}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restaurer
                          </Button>
                        </div>
                      ))}
                      {doublonsCigaresIgnores.length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          Aucun doublon de cigares ignoré
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modale de comparaison détaillée avec champs transférables */}
      {compareModal && editedCigares.cigare1 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] border border-red-600/30 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-red-600/30 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-red-400">Comparaison détaillée</h2>
                <p className="text-gray-500 text-xs mt-1">Cliquez sur une valeur pour la transférer vers l'autre cigare</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCompareModal(null); setEditedCigares({ cigare1: null, cigare2: null }); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4">
              {/* En-têtes des deux cigares */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {['cigare1', 'cigare2'].map((cigareKey, idx) => {
                  const cigare = editedCigares[cigareKey];
                  const score = getCompletionScore(cigare);
                  return (
                    <div key={idx} className={`bg-black/30 rounded-lg p-3 border ${score.percent > 50 ? 'border-green-600/50' : 'border-orange-600/50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">{cigare.nom_cigare || '(Sans nom)'}</h3>
                          <p className="text-gray-400 text-sm">{cigare.marque} • ID {cigare.id}</p>
                        </div>
                        <div className={`text-2xl font-bold ${score.percent > 70 ? 'text-green-400' : score.percent > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {score.percent}%
                        </div>
                      </div>
                      {cigare.photo_url && (
                        <img src={cigare.photo_url} alt={cigare.nom_cigare} className="w-full h-24 object-contain rounded mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tableau comparatif avec champs cliquables */}
              <div className="bg-black/20 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-400 w-1/3">Cigare 1 (ID {editedCigares.cigare1.id})</th>
                      <th className="text-center p-3 text-gray-500 w-1/6">Champ</th>
                      <th className="text-right p-3 text-gray-400 w-1/3">Cigare 2 (ID {editedCigares.cigare2.id})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'nom_cigare', label: 'Nom' },
                      { key: 'marque', label: 'Marque' },
                      { key: 'gamme', label: 'Gamme' },
                      { key: 'module', label: 'Module' },
                      { key: 'terroir', label: 'Terroir' },
                      { key: 'dimensions', label: 'Dimensions' },
                      { key: 'puissance', label: 'Puissance' },
                      { key: 'prix', label: 'Prix' },
                      { key: 'note_bagues', label: 'Note' },
                      { key: 'premier_tiers', label: '1er tiers' },
                      { key: 'deuxieme_tiers', label: '2ème tiers' },
                      { key: 'troisieme_tiers', label: '3ème tiers' },
                      { key: 'conclusion', label: 'Conclusion' },
                    ].map(({ key, label }) => {
                      const val1 = editedCigares.cigare1[key];
                      const val2 = editedCigares.cigare2[key];
                      const hasVal1 = val1 !== null && val1 !== '' && val1 !== undefined;
                      const hasVal2 = val2 !== null && val2 !== '' && val2 !== undefined;
                      const isLongText = ['premier_tiers', 'deuxieme_tiers', 'troisieme_tiers', 'conclusion'].includes(key);
                      
                      const displayVal = (val) => {
                        if (!val) return '-';
                        if (key === 'prix') return `${val}€`;
                        if (key === 'note_bagues') return `${val}⭐`;
                        if (isLongText) return val.length > 80 ? val.substring(0, 80) + '...' : val;
                        return val;
                      };

                      return (
                        <tr key={key} className="border-b border-gray-800 hover:bg-gray-800/30">
                          {/* Valeur cigare 1 - cliquable pour transférer vers cigare 2 */}
                          <td className="p-2">
                            <button
                              onClick={() => hasVal1 && handleTransferField(key, 'cigare1', 'cigare2')}
                              disabled={!hasVal1}
                              className={`w-full text-left p-2 rounded transition-all ${
                                hasVal1 
                                  ? 'hover:bg-blue-600/30 hover:border-blue-500 cursor-pointer border border-transparent' 
                                  : 'cursor-not-allowed opacity-50'
                              } ${hasVal1 ? 'text-white' : 'text-gray-600 italic'}`}
                              title={hasVal1 ? `Cliquer pour copier vers Cigare 2` : ''}
                            >
                              <span className={isLongText ? 'text-xs' : ''}>{displayVal(val1)}</span>
                              {hasVal1 && <ArrowRight className="w-3 h-3 inline ml-2 text-blue-400 opacity-50" />}
                            </button>
                          </td>
                          
                          {/* Label du champ */}
                          <td className="p-2 text-center">
                            <span className="text-gray-500 text-xs font-medium">{label}</span>
                          </td>
                          
                          {/* Valeur cigare 2 - cliquable pour transférer vers cigare 1 */}
                          <td className="p-2">
                            <button
                              onClick={() => hasVal2 && handleTransferField(key, 'cigare2', 'cigare1')}
                              disabled={!hasVal2}
                              className={`w-full text-right p-2 rounded transition-all ${
                                hasVal2 
                                  ? 'hover:bg-green-600/30 hover:border-green-500 cursor-pointer border border-transparent' 
                                  : 'cursor-not-allowed opacity-50'
                              } ${hasVal2 ? 'text-white' : 'text-gray-600 italic'}`}
                              title={hasVal2 ? `Cliquer pour copier vers Cigare 1` : ''}
                            >
                              {hasVal2 && <ArrowRight className="w-3 h-3 inline mr-2 text-green-400 opacity-50 rotate-180" />}
                              <span className={isLongText ? 'text-xs' : ''}>{displayVal(val2)}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Boutons d'action simplifiés */}
              <div className="mt-6 flex justify-center gap-4">
                <Button
                  className="bg-green-600 hover:bg-green-500 text-white px-8"
                  onClick={handleValiderComparaison}
                  disabled={loading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Valider (garde le plus complet)
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:bg-gray-800"
                  onClick={() => {
                    handleIgnorerDoublonCigare(editedCigares.cigare1.id, editedCigares.cigare2.id);
                    setCompareModal(null);
                    setEditedCigares({ cigare1: null, cigare2: null });
                  }}
                  disabled={loading}
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Pas un doublon
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCigarotheque;
