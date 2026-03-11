import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Search, 
  Star, 
  MapPin, 
  Flame, 
  Euro,
  BookOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Wine,
  User,
  Trash2,
  Edit3,
  Box,
  Download,
  Save,
  X,
  Filter,
  SortAsc
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Fonction pour obtenir l'URL de la photo via le proxy backend
const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  const photoName = photoPath.replace('./photos_cigares/', '').replace('photos_cigares/', '');
  return `${API}/cigare-photo/${encodeURIComponent(photoName)}`;
};

const Cigarotheque = () => {
  const { isAdmin, currentMember } = useUser();
  const [activeTab, setActiveTab] = useState('catalogue');
  const [loading, setLoading] = useState(false);
  
  // Catalogue
  const [cigares, setCigares] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filtres, setFiltres] = useState(null);
  
  // Filtres actifs - Catalogue
  const [search, setSearch] = useState('');
  const [marqueFilter, setMarqueFilter] = useState('');
  const [paysFilter, setPaysFilter] = useState('');
  const [puissanceFilter, setPuissanceFilter] = useState('');
  const [vitoleFilter, setVitoleFilter] = useState('');
  const [prixMin, setPrixMin] = useState('');
  const [prixMax, setPrixMax] = useState('');
  
  // Filtres Ma Cigarthèque
  const [maCollectionSearch, setMaCollectionSearch] = useState('');
  const [maCollectionPays, setMaCollectionPays] = useState('');
  const [maCollectionMarque, setMaCollectionMarque] = useState('');
  const [maCollectionModule, setMaCollectionModule] = useState('');
  const [maCollectionTri, setMaCollectionTri] = useState('pays'); // pays, marque, module
  
  // Modal détail
  const [selectedCigare, setSelectedCigare] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Modal édition (admin)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  
  // Modal recherche cigare (pour ajouter à Ma Cigarthèque)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchModalQuery, setSearchModalQuery] = useState('');
  const [searchModalResults, setSearchModalResults] = useState([]);
  const [searchModalLoading, setSearchModalLoading] = useState(false);
  
  // Ma Cigarthèque
  const [maCigarotheque, setMaCigarotheque] = useState([]);
  
  // Apéro du Club
  const [aperoClub, setAperoClub] = useState([]);
  
  // Modal notation guidée (Ma Cigarthèque)
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteData, setNoteData] = useState({
    note_globale: '',
    note_puissance: '',
    evolution: 'lineaire', // 'evolution' ou 'lineaire'
    note_libre: ''
  });
  const [noteCigare, setNoteCigare] = useState(null);

  const LIMIT = 20;

  // Charger les filtres au démarrage
  useEffect(() => {
    loadFiltres();
    loadAperoClub();
    if (!isAdmin && currentMember?.id) {
      loadMaCigarotheque();
    }
  }, [isAdmin, currentMember?.id]);

  // Charger les cigares quand les filtres changent
  useEffect(() => {
    loadCigares();
  }, [page, search, marqueFilter, paysFilter, puissanceFilter, vitoleFilter, prixMin, prixMax]);

  const loadFiltres = async () => {
    try {
      const response = await axios.get(`${API}/cigares-filtres`);
      setFiltres(response.data);
    } catch (error) {
      console.error('Erreur chargement filtres:', error);
    }
  };

  const loadCigares = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', LIMIT);
      params.append('offset', page * LIMIT);
      if (search) params.append('search', search);
      if (marqueFilter && marqueFilter !== 'all') params.append('marque', marqueFilter);
      if (paysFilter && paysFilter !== 'all') params.append('pays', paysFilter);
      if (puissanceFilter && puissanceFilter !== 'all') params.append('puissance', puissanceFilter);
      if (vitoleFilter && vitoleFilter !== 'all') params.append('vitole', vitoleFilter);
      if (prixMin) params.append('prix_min', prixMin);
      if (prixMax) params.append('prix_max', prixMax);

      const response = await axios.get(`${API}/cigares?${params}`);
      setCigares(response.data.cigares);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Erreur chargement cigares:', error);
      toast.error('Erreur lors du chargement des cigares');
    } finally {
      setLoading(false);
    }
  };

  const loadMaCigarotheque = useCallback(async () => {
    if (!currentMember?.id) return;
    try {
      const response = await axios.get(`${API}/ma-cigarotheque/${currentMember.id}`);
      setMaCigarotheque(response.data);
    } catch (error) {
      console.error('Erreur chargement ma cigarthèque:', error);
    }
  }, [currentMember?.id]);

  const loadAperoClub = async () => {
    try {
      const response = await axios.get(`${API}/apero-club`);
      setAperoClub(response.data);
    } catch (error) {
      console.error('Erreur chargement apéro club:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadCigares();
  };

  const resetFiltres = () => {
    setSearch('');
    setMarqueFilter('');
    setPaysFilter('');
    setPuissanceFilter('');
    setVitoleFilter('');
    setPrixMin('');
    setPrixMax('');
    setPage(0);
  };

  const getPuissanceLabel = (p) => {
    switch(p) {
      case 'A': return 'Forte';
      case 'B': return 'Moyenne';
      case 'C': return 'Légère';
      default: return p || '-';
    }
  };

  const getPuissanceColor = (p) => {
    switch(p) {
      case 'A': return 'bg-red-900 text-red-300 border-red-600';
      case 'B': return 'bg-orange-900 text-orange-300 border-orange-600';
      case 'C': return 'bg-green-900 text-green-300 border-green-600';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  // ===== FILTRAGE ET TRI MA CIGARTHÈQUE =====
  
  const filteredMaCigarotheque = useMemo(() => {
    let filtered = [...maCigarotheque];
    
    // Filtrer par recherche
    if (maCollectionSearch) {
      const searchLower = maCollectionSearch.toLowerCase();
      filtered = filtered.filter(c => 
        (c.marque || '').toLowerCase().includes(searchLower) ||
        (c.gamme || '').toLowerCase().includes(searchLower) ||
        (c.vitole || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrer par pays
    if (maCollectionPays && maCollectionPays !== 'all') {
      filtered = filtered.filter(c => c.pays === maCollectionPays);
    }
    
    // Filtrer par marque
    if (maCollectionMarque && maCollectionMarque !== 'all') {
      filtered = filtered.filter(c => c.marque === maCollectionMarque);
    }
    
    // Filtrer par module
    if (maCollectionModule && maCollectionModule !== 'all') {
      filtered = filtered.filter(c => c.vitole === maCollectionModule);
    }
    
    // Trier
    filtered.sort((a, b) => {
      switch(maCollectionTri) {
        case 'pays':
          return (a.pays || '').localeCompare(b.pays || '');
        case 'marque':
          return (a.marque || '').localeCompare(b.marque || '');
        case 'module':
          return (a.vitole || '').localeCompare(b.vitole || '');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [maCigarotheque, maCollectionSearch, maCollectionPays, maCollectionMarque, maCollectionModule, maCollectionTri]);

  // Extraire les options de filtres de Ma Cigarthèque
  const maCollectionFilterOptions = useMemo(() => {
    const pays = [...new Set(maCigarotheque.map(c => c.pays).filter(Boolean))].sort();
    const marques = [...new Set(maCigarotheque.map(c => c.marque).filter(Boolean))].sort();
    const modules = [...new Set(maCigarotheque.map(c => c.vitole).filter(Boolean))].sort();
    return { pays, marques, modules };
  }, [maCigarotheque]);

  // ===== RECHERCHE DANS LE CATALOGUE (Modal) =====
  
  const searchInCatalogue = async () => {
    if (!searchModalQuery.trim()) return;
    setSearchModalLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', 20);
      params.append('search', searchModalQuery);
      const response = await axios.get(`${API}/cigares?${params}`);
      setSearchModalResults(response.data.cigares);
    } catch (error) {
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearchModalLoading(false);
    }
  };

  const addToMaCigarothequeFromSearch = async (cigare) => {
    if (!currentMember?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      await axios.post(`${API}/ma-cigarotheque`, {
        membre_id: currentMember.id,
        cigare_id: cigare.id,
        marque: cigare.marque || 'Inconnu',
        gamme: cigare.gamme || '',
        vitole: cigare.vitole_nom || cigare.vitole_type || '',
        pays: cigare.pays_fabrication || '',
        puissance: cigare.puissance || '',
        prix: cigare.prix || null
      });
      toast.success('Cigare ajouté à votre Cigarthèque !');
      loadMaCigarotheque();
      setShowSearchModal(false);
      setSearchModalQuery('');
      setSearchModalResults([]);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  // ===== FONCTIONS POUR MA CIGARTHÈQUE =====
  
  const addToMaCigarotheque = async (cigare, fromApero = false) => {
    if (!currentMember?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      await axios.post(`${API}/ma-cigarotheque`, {
        membre_id: currentMember.id,
        cigare_id: fromApero ? cigare.cigare_id : cigare.id,
        marque: cigare.marque || 'Inconnu',
        gamme: cigare.gamme || '',
        vitole: cigare.vitole_nom || cigare.vitole || '',
        pays: cigare.pays_fabrication || cigare.pays || '',
        puissance: cigare.puissance || '',
        prix: cigare.prix || null
      });
      toast.success('Cigare ajouté à votre Cigarthèque !');
      loadMaCigarotheque();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const deleteFromMaCigarotheque = async (cigareId) => {
    if (!window.confirm('Supprimer ce cigare de votre collection ?')) return;
    try {
      await axios.delete(`${API}/ma-cigarotheque/${cigareId}`);
      toast.success('Cigare supprimé de votre collection');
      loadMaCigarotheque();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ===== FONCTIONS POUR APÉRO DU CLUB (ADMIN) =====
  
  const addToAperoClub = async (cigare) => {
    try {
      await axios.post(`${API}/apero-club`, {
        cigare_id: cigare.id,
        marque: cigare.marque || 'Inconnu',
        gamme: cigare.gamme || '',
        vitole: cigare.vitole_nom || '',
        pays: cigare.pays_fabrication || '',
        puissance: cigare.puissance || '',
        prix: cigare.prix || null,
        date_apero: new Date().toISOString().split('T')[0]
      });
      toast.success('Cigare ajouté à l\'Apéro du Club !');
      loadAperoClub();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const deleteFromAperoClub = async (cigareId) => {
    if (!window.confirm('Supprimer ce cigare de l\'Apéro du Club ?')) return;
    try {
      await axios.delete(`${API}/apero-club/${cigareId}`);
      toast.success('Cigare supprimé');
      loadAperoClub();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ===== FONCTION COPIER FICHE (Format pour événement Apéro) =====
  
  const copyFicheCigare = (cigare) => {
    const fiche = `🚬 ${cigare.marque || 'Cigare'} ${cigare.gamme || ''} ${cigare.vitole_nom || cigare.vitole || ''}

📍 Origine: ${cigare.pays_fabrication || cigare.pays || '-'}
💪 Puissance: ${getPuissanceLabel(cigare.puissance)}
⭐ Note: ${cigare.note_bagues || cigare.note_globale || '-'}/5
💰 Prix: ${cigare.prix || '-'}€

📏 Format: ${cigare.longueur_mm || '-'}mm x ${cigare.cepo || '-'}

🍂 Cape: ${cigare.cape || '-'}
🍂 Sous-cape: ${cigare.sous_cape || '-'}
🍂 Tripe: ${cigare.tripe || '-'}

${cigare.conclusion ? `📝 ${cigare.conclusion}` : ''}`.trim();

    navigator.clipboard.writeText(fiche);
    toast.success('Fiche copiée ! Prête à coller dans un événement Apéro');
  };

  // ===== MODAL ÉDITION ADMIN =====
  
  const openEditModal = (cigare) => {
    setEditData({
      id: cigare.id,
      marque: cigare.marque || '',
      gamme: cigare.gamme || '',
      vitole_nom: cigare.vitole_nom || '',
      pays_fabrication: cigare.pays_fabrication || '',
      puissance: cigare.puissance || '',
      prix: cigare.prix || '',
      note_bagues: cigare.note_bagues || '',
      conclusion: cigare.conclusion || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      await axios.put(`${API}/cigares/${editData.id}`, {
        marque: editData.marque || null,
        gamme: editData.gamme || null,
        vitole_nom: editData.vitole_nom || null,
        pays_fabrication: editData.pays_fabrication || null,
        puissance: editData.puissance || null,
        prix: editData.prix ? parseFloat(editData.prix) : null,
        note_bagues: editData.note_bagues ? parseFloat(editData.note_bagues) : null,
        conclusion: editData.conclusion || null
      });
      toast.success('Cigare modifié avec succès !');
      setShowEditModal(false);
      loadCigares();
    } catch (error) {
      toast.error('Erreur lors de la modification');
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteCigare = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir SUPPRIMER définitivement ce cigare du catalogue ?\n\nCette action est irréversible.')) {
      return;
    }
    
    setEditLoading(true);
    try {
      await axios.delete(`${API}/cigares/${editData.id}`);
      toast.success('Cigare supprimé du catalogue');
      setShowEditModal(false);
      loadCigares();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  // ===== MODAL NOTATION GUIDÉE (MA CIGARTHÈQUE) =====
  
  const openNoteModal = (cigare) => {
    setNoteCigare(cigare);
    // Parser les notes existantes si elles existent
    const existingNote = cigare.note_personnelle || '';
    const existingComment = cigare.commentaire || '';
    
    // Essayer de parser le commentaire structuré
    let notePuissance = '';
    let evolution = 'lineaire';
    let noteLibre = existingComment;
    
    if (existingComment.includes('Puissance:')) {
      const match = existingComment.match(/Puissance:\s*(\d+(?:\.\d+)?)/);
      if (match) notePuissance = match[1];
    }
    if (existingComment.includes('Évolution')) {
      evolution = 'evolution';
    }
    if (existingComment.includes('Linéaire')) {
      evolution = 'lineaire';
    }
    // Extraire la note libre
    const noteLibreMatch = existingComment.match(/Notes?:\s*(.+)/i);
    if (noteLibreMatch) noteLibre = noteLibreMatch[1];
    
    setNoteData({
      note_globale: existingNote ? String(existingNote) : '',
      note_puissance: notePuissance,
      evolution: evolution,
      note_libre: noteLibre.replace(/Puissance:.*?(\d+(?:\.\d+)?\/5)?/g, '').replace(/Évolution|Linéaire/g, '').trim()
    });
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    try {
      // Construire le commentaire structuré
      const commentParts = [];
      if (noteData.note_puissance) {
        commentParts.push(`Puissance: ${noteData.note_puissance}/5`);
      }
      commentParts.push(noteData.evolution === 'evolution' ? 'Évolution' : 'Linéaire');
      if (noteData.note_libre) {
        commentParts.push(`Notes: ${noteData.note_libre}`);
      }
      
      const commentaire = commentParts.join(' | ');
      
      await axios.put(`${API}/ma-cigarotheque/${noteCigare.id}`, null, {
        params: {
          note: noteData.note_globale ? parseFloat(noteData.note_globale) : null,
          commentaire: commentaire || null
        }
      });
      toast.success('Notes enregistrées !');
      setShowNoteModal(false);
      loadMaCigarotheque();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Définir les onglets selon le rôle
  const getTabs = () => {
    if (isAdmin) {
      return [
        { value: 'catalogue', label: 'Catalogue', icon: BookOpen },
        { value: 'apero-club', label: 'Apéro du Club', icon: Wine }
      ];
    } else {
      return [
        { value: 'catalogue', label: 'Catalogue', icon: BookOpen },
        { value: 'apero-club', label: 'Apéro du Club', icon: Wine },
        { value: 'ma-collection', label: 'Ma Cigarthèque', icon: User }
      ];
    }
  };

  // Grouper les cigares de Ma Cigarthèque par la clé de tri
  const groupedMaCigarotheque = useMemo(() => {
    const groups = {};
    filteredMaCigarotheque.forEach(cigare => {
      let key;
      switch(maCollectionTri) {
        case 'pays':
          key = cigare.pays || 'Non défini';
          break;
        case 'marque':
          key = cigare.marque || 'Sans marque';
          break;
        case 'module':
          key = cigare.vitole || 'Non défini';
          break;
        default:
          key = 'Tous';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(cigare);
    });
    return groups;
  }, [filteredMaCigarotheque, maCollectionTri]);

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Cigarthèque
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          {total} cigares dans le catalogue
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-3'} bg-black/40`}>
          {getTabs().map(tab => (
            <TabsTrigger 
              key={tab.value}
              value={tab.value} 
              className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ==================== ONGLET CATALOGUE ==================== */}
        <TabsContent value="catalogue" className="space-y-4">
          {/* Barre de recherche et filtres */}
          <Card className="bg-black/40 border-2 border-[#D4A024]/30">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Recherche */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher par marque, gamme..."
                      className="pl-10 bg-black/60 border-[#D4A024]/30 text-white text-lg h-12"
                      data-testid="search-input"
                    />
                  </div>
                  <Button type="submit" className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] h-12 px-6" data-testid="search-btn">
                    <Search className="w-5 h-5" />
                  </Button>
                </div>

                {/* Filtres */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <Select value={marqueFilter} onValueChange={setMarqueFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-marque">
                      <SelectValue placeholder="Marque" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                      <SelectItem value="all" className="text-gray-400">Toutes marques</SelectItem>
                      <SelectItem value="__NULL__" className="text-gray-400">Sans marque</SelectItem>
                      {filtres?.marques?.map(m => (
                        <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={paysFilter} onValueChange={setPaysFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-pays">
                      <MapPin className="w-4 h-4 mr-2 text-[#D4A024]" />
                      <SelectValue placeholder="Pays" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                      <SelectItem value="all" className="text-gray-400">Tous les pays</SelectItem>
                      {filtres?.pays?.map(p => (
                        <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={puissanceFilter} onValueChange={setPuissanceFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-puissance">
                      <Flame className="w-4 h-4 mr-2 text-[#D4A024]" />
                      <SelectValue placeholder="Puissance" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                      <SelectItem value="all" className="text-gray-400">Toutes</SelectItem>
                      <SelectItem value="A" className="text-red-400">Forte (A)</SelectItem>
                      <SelectItem value="B" className="text-orange-400">Moyenne (B)</SelectItem>
                      <SelectItem value="C" className="text-green-400">Légère (C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Select value={vitoleFilter} onValueChange={setVitoleFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-module">
                      <Box className="w-4 h-4 mr-2 text-[#D4A024]" />
                      <SelectValue placeholder="Module" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                      <SelectItem value="all" className="text-gray-400">Tous modules</SelectItem>
                      {filtres?.vitoles?.map(v => (
                        <SelectItem key={v} value={v} className="text-white">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    value={prixMin}
                    onChange={(e) => setPrixMin(e.target.value)}
                    placeholder="Prix min €"
                    className="bg-black/60 border-[#D4A024]/30 text-white h-12"
                    data-testid="filter-prix-min"
                  />

                  <Input
                    type="number"
                    value={prixMax}
                    onChange={(e) => setPrixMax(e.target.value)}
                    placeholder="Prix max €"
                    className="bg-black/60 border-[#D4A024]/30 text-white h-12"
                    data-testid="filter-prix-max"
                  />

                  <Button type="button" variant="outline" onClick={resetFiltres} className="text-gray-400 hover:text-white border-gray-600 h-12" data-testid="reset-filters-btn">
                    Réinitialiser
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Liste des cigares */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-[#D4A024] border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-400 mt-4">Chargement...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cigares.map((cigare) => (
                  <Card 
                    key={cigare.id} 
                    className="bg-black/40 border-2 border-[#D4A024]/30 hover:border-[#D4A024] transition-all cursor-pointer overflow-hidden"
                    onClick={() => { setSelectedCigare(cigare); setShowDetail(true); }}
                    data-testid={`cigare-card-${cigare.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-serif font-bold text-white truncate">
                            {cigare.marque || 'Sans marque'}
                          </h3>
                          <p className="text-[#D4A024] truncate">{cigare.gamme || ''}</p>
                          <p className="text-gray-400 text-sm truncate">{cigare.vitole_nom || cigare.vitole_type || ''}</p>
                        </div>
                        {cigare.note_bagues && (
                          <Badge className="bg-[#D4A024] text-[#7A2020] text-lg px-3 py-1 ml-2 shrink-0">
                            <Star className="w-4 h-4 mr-1 inline" />
                            {cigare.note_bagues}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {cigare.pays_fabrication && (
                          <Badge variant="outline" className="border-[#D4A024]/50 text-gray-300">
                            <MapPin className="w-3 h-3 mr-1" />
                            {cigare.pays_fabrication}
                          </Badge>
                        )}
                        {cigare.puissance && (
                          <Badge className={`${getPuissanceColor(cigare.puissance)} border`}>
                            <Flame className="w-3 h-3 mr-1" />
                            {getPuissanceLabel(cigare.puissance)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-[#D4A024]">
                          {cigare.prix ? `${cigare.prix}€` : '-'}
                        </span>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyFicheCigare(cigare)}
                            className="border-[#D4A024]/50 text-[#D4A024]"
                            data-testid={`copy-btn-${cigare.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {isAdmin ? (
                            <>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(cigare)}
                                className="border-blue-500/50 text-blue-400"
                                data-testid={`edit-btn-${cigare.id}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => addToAperoClub(cigare)}
                                className="bg-[#7A2020] hover:bg-[#8A3030] text-white"
                                data-testid={`add-apero-btn-${cigare.id}`}
                              >
                                <Wine className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => addToMaCigarotheque(cigare)}
                              className="bg-[#7A2020] hover:bg-[#8A3030] text-white"
                              data-testid={`add-collection-btn-${cigare.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="border-[#D4A024]/50 text-[#D4A024]"
                    data-testid="prev-page-btn"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-white text-lg">
                    Page {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="border-[#D4A024]/50 text-[#D4A024]"
                    data-testid="next-page-btn"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ==================== ONGLET APÉRO DU CLUB ==================== */}
        <TabsContent value="apero-club" className="space-y-4">
          <Card className="bg-black/40 border-2 border-[#D4A024]/30">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-white flex items-center">
                <Wine className="w-6 h-6 mr-2 text-[#D4A024]" />
                Apéro du Club
              </CardTitle>
              <p className="text-gray-400">
                {isAdmin ? 'Gérez les cigares fumés lors des apéros' : 'Cigares fumés lors des apéros du club'}
              </p>
            </CardHeader>
            <CardContent>
              {aperoClub.length === 0 ? (
                <div className="text-center py-8">
                  <Wine className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Aucun cigare enregistré</p>
                  {isAdmin && (
                    <p className="text-gray-500 text-sm mt-2">Ajoutez des cigares depuis le catalogue</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {aperoClub.map((cigare) => (
                    <div key={cigare.id} className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-[#D4A024]/20" data-testid={`apero-item-${cigare.id}`}>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-lg">{cigare.marque} {cigare.gamme || ''}</h4>
                        <p className="text-gray-400">{cigare.vitole || ''}</p>
                        <p className="text-[#D4A024] text-sm mt-1">{cigare.date_apero}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyFicheCigare(cigare)}
                          className="text-[#D4A024]"
                          title="Copier la fiche (pour événement Apéro)"
                          data-testid={`copy-apero-btn-${cigare.id}`}
                        >
                          <Copy className="w-5 h-5" />
                        </Button>
                        {!isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addToMaCigarotheque(cigare, true)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                            title="Copier vers Ma Cigarthèque"
                            data-testid={`import-apero-btn-${cigare.id}`}
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFromAperoClub(cigare.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            data-testid={`delete-apero-btn-${cigare.id}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ONGLET MA CIGARTHÈQUE (Membres seulement) ==================== */}
        {!isAdmin && (
          <TabsContent value="ma-collection" className="space-y-4">
            <Card className="bg-black/40 border-2 border-[#D4A024]/30">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle className="text-2xl font-serif text-white flex items-center">
                      <User className="w-6 h-6 mr-2 text-[#D4A024]" />
                      Ma Cigarthèque
                    </CardTitle>
                    <p className="text-gray-400">{maCigarotheque.length} cigare(s) dans votre collection</p>
                  </div>
                  <Button
                    onClick={() => setShowSearchModal(true)}
                    className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]"
                    data-testid="add-cigare-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un cigare
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtres et Tri pour Ma Cigarthèque */}
                <div className="bg-black/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 text-[#D4A024] mb-2">
                    <Filter className="w-5 h-5" />
                    <span className="font-semibold">Filtres et Tri</span>
                  </div>
                  
                  {/* Recherche */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      value={maCollectionSearch}
                      onChange={(e) => setMaCollectionSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-10 bg-black/60 border-[#D4A024]/30 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Tri par */}
                    <Select value={maCollectionTri} onValueChange={setMaCollectionTri}>
                      <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white">
                        <SortAsc className="w-4 h-4 mr-2 text-[#D4A024]" />
                        <SelectValue placeholder="Trier par" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                        <SelectItem value="pays" className="text-white">Par Terroir</SelectItem>
                        <SelectItem value="marque" className="text-white">Par Marque</SelectItem>
                        <SelectItem value="module" className="text-white">Par Module</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Filtre Pays */}
                    <Select value={maCollectionPays} onValueChange={setMaCollectionPays}>
                      <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white">
                        <MapPin className="w-4 h-4 mr-2 text-[#D4A024]" />
                        <SelectValue placeholder="Terroir" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                        <SelectItem value="all" className="text-gray-400">Tous</SelectItem>
                        {maCollectionFilterOptions.pays.map(p => (
                          <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Filtre Marque */}
                    <Select value={maCollectionMarque} onValueChange={setMaCollectionMarque}>
                      <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white">
                        <SelectValue placeholder="Marque" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[200px]">
                        <SelectItem value="all" className="text-gray-400">Toutes</SelectItem>
                        {maCollectionFilterOptions.marques.map(m => (
                          <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Filtre Module */}
                    <Select value={maCollectionModule} onValueChange={setMaCollectionModule}>
                      <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white">
                        <Box className="w-4 h-4 mr-2 text-[#D4A024]" />
                        <SelectValue placeholder="Module" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[200px]">
                        <SelectItem value="all" className="text-gray-400">Tous</SelectItem>
                        {maCollectionFilterOptions.modules.map(m => (
                          <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Liste groupée */}
                {filteredMaCigarotheque.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {maCigarotheque.length === 0 
                        ? 'Votre collection est vide' 
                        : 'Aucun cigare ne correspond aux filtres'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Cliquez sur "Ajouter un cigare" pour rechercher dans le catalogue
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedMaCigarotheque).map(([groupName, groupCigares]) => (
                      <div key={groupName}>
                        <h3 className="text-[#D4A024] font-serif font-bold text-xl mb-3 border-b border-[#D4A024]/30 pb-2">
                          {groupName} ({groupCigares.length})
                        </h3>
                        <div className="space-y-3">
                          {groupCigares.map((cigare) => (
                            <div key={cigare.id} className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-[#D4A024]/20" data-testid={`collection-item-${cigare.id}`}>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-semibold text-lg">{cigare.marque} {cigare.gamme || ''}</h4>
                                <p className="text-gray-400">{cigare.vitole || ''}</p>
                                {cigare.note_personnelle && (
                                  <div className="flex items-center mt-2 flex-wrap gap-2">
                                    <Badge className="bg-[#D4A024] text-[#7A2020]">
                                      <Star className="w-3 h-3 mr-1" />
                                      {cigare.note_personnelle}/5
                                    </Badge>
                                    {cigare.commentaire && cigare.commentaire.includes('Puissance:') && (
                                      <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                                        <Flame className="w-3 h-3 mr-1" />
                                        {cigare.commentaire.match(/Puissance:\s*(\d+(?:\.\d+)?)/)?.[1]}/5
                                      </Badge>
                                    )}
                                    {cigare.commentaire && cigare.commentaire.includes('Évolution') && (
                                      <Badge variant="outline" className="border-blue-500/50 text-blue-400">Évolution</Badge>
                                    )}
                                    {cigare.commentaire && cigare.commentaire.includes('Linéaire') && (
                                      <Badge variant="outline" className="border-green-500/50 text-green-400">Linéaire</Badge>
                                    )}
                                  </div>
                                )}
                                {cigare.commentaire && cigare.commentaire.includes('Notes:') && (
                                  <p className="text-gray-400 text-sm mt-1 italic">
                                    "{cigare.commentaire.match(/Notes:\s*(.+)/)?.[1] || ''}"
                                  </p>
                                )}
                                {!cigare.note_personnelle && (
                                  <Badge variant="outline" className="mt-2 border-gray-600 text-gray-500">
                                    Non noté
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openNoteModal(cigare)}
                                  className="text-[#D4A024]"
                                  title="Noter ce cigare"
                                  data-testid={`note-btn-${cigare.id}`}
                                >
                                  <Edit3 className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyFicheCigare(cigare)}
                                  className="text-[#D4A024]"
                                  title="Copier la fiche"
                                  data-testid={`copy-collection-btn-${cigare.id}`}
                                >
                                  <Copy className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteFromMaCigarotheque(cigare.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  data-testid={`delete-collection-btn-${cigare.id}`}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ==================== MODAL DÉTAIL CIGARE ==================== */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#D4A024]/50 max-h-[90vh] overflow-y-auto">
          {selectedCigare && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-white">
                  {selectedCigare.marque || 'Sans marque'} {selectedCigare.gamme || ''}
                </DialogTitle>
                <p className="text-[#D4A024] text-lg">{selectedCigare.vitole_nom || selectedCigare.vitole_type || ''}</p>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Photo du cigare */}
                {selectedCigare.photo && (
                  <div className="relative rounded-lg overflow-hidden bg-black/60">
                    <img 
                      src={getPhotoUrl(selectedCigare.photo)} 
                      alt={`${selectedCigare.marque || ''} ${selectedCigare.gamme || ''}`}
                      className="w-full max-h-[300px] object-contain mx-auto"
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </div>
                )}

                {/* Infos principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/40 rounded-lg p-4 text-center">
                    <Star className="w-6 h-6 text-[#D4A024] mx-auto mb-2" />
                    <p className="text-3xl font-bold text-[#D4A024]">{selectedCigare.note_bagues || '-'}</p>
                    <p className="text-gray-400 text-sm">Note</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 text-center">
                    <Euro className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-400">{selectedCigare.prix || '-'}€</p>
                    <p className="text-gray-400 text-sm">Prix</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 text-center">
                    <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-white">{getPuissanceLabel(selectedCigare.puissance)}</p>
                    <p className="text-gray-400 text-sm">Puissance</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 text-center">
                    <MapPin className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">{selectedCigare.pays_fabrication || '-'}</p>
                    <p className="text-gray-400 text-sm">Origine</p>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="bg-black/40 rounded-lg p-4">
                  <h4 className="text-[#D4A024] font-semibold mb-3">Dimensions</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">{selectedCigare.longueur_mm || '-'}</p>
                      <p className="text-gray-400 text-sm">mm (longueur)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{selectedCigare.cepo || '-'}</p>
                      <p className="text-gray-400 text-sm">cepo</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{selectedCigare.diametre_mm || '-'}</p>
                      <p className="text-gray-400 text-sm">mm (diamètre)</p>
                    </div>
                  </div>
                </div>

                {/* Composition */}
                <div className="bg-black/40 rounded-lg p-4">
                  <h4 className="text-[#D4A024] font-semibold mb-3">Composition</h4>
                  <div className="space-y-2">
                    <p className="text-white"><span className="text-gray-400">Cape:</span> {selectedCigare.cape || '-'}</p>
                    <p className="text-white"><span className="text-gray-400">Sous-cape:</span> {selectedCigare.sous_cape || '-'}</p>
                    <p className="text-white"><span className="text-gray-400">Tripe:</span> {selectedCigare.tripe || '-'}</p>
                  </div>
                </div>

                {/* Dégustation */}
                {(selectedCigare.premier_tiers || selectedCigare.deuxieme_tiers || selectedCigare.troisieme_tiers) && (
                  <div className="bg-black/40 rounded-lg p-4">
                    <h4 className="text-[#D4A024] font-semibold mb-3">Dégustation</h4>
                    <div className="space-y-3">
                      {selectedCigare.degustation_cru && (
                        <div>
                          <p className="text-gray-400 text-sm">À froid</p>
                          <p className="text-white">{selectedCigare.degustation_cru}</p>
                        </div>
                      )}
                      {selectedCigare.premier_tiers && (
                        <div>
                          <p className="text-gray-400 text-sm">1er tiers</p>
                          <p className="text-white">{selectedCigare.premier_tiers}</p>
                        </div>
                      )}
                      {selectedCigare.deuxieme_tiers && (
                        <div>
                          <p className="text-gray-400 text-sm">2ème tiers</p>
                          <p className="text-white">{selectedCigare.deuxieme_tiers}</p>
                        </div>
                      )}
                      {selectedCigare.troisieme_tiers && (
                        <div>
                          <p className="text-gray-400 text-sm">3ème tiers</p>
                          <p className="text-white">{selectedCigare.troisieme_tiers}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conclusion */}
                {selectedCigare.conclusion && (
                  <div className="bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg p-4">
                    <h4 className="text-[#D4A024] font-semibold mb-2">Conclusion</h4>
                    <p className="text-white italic">{selectedCigare.conclusion}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button onClick={() => copyFicheCigare(selectedCigare)} className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]">
                    <Copy className="w-4 h-4 mr-2" />
                    Copier la fiche
                  </Button>
                  {isAdmin ? (
                    <>
                      <Button onClick={() => { openEditModal(selectedCigare); setShowDetail(false); }} variant="outline" className="border-blue-500 text-blue-400">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                      <Button onClick={() => { addToAperoClub(selectedCigare); setShowDetail(false); }} variant="outline" className="border-[#7A2020] text-[#7A2020]">
                        <Wine className="w-4 h-4 mr-2" />
                        Apéro du Club
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => { addToMaCigarotheque(selectedCigare); setShowDetail(false); }} variant="outline" className="border-[#D4A024] text-[#D4A024]">
                      <Plus className="w-4 h-4 mr-2" />
                      Ma Cigarthèque
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL ÉDITION ADMIN ==================== */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg bg-[#1a1a1a] border-[#D4A024]/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-white flex items-center">
              <Edit3 className="w-5 h-5 mr-2 text-[#D4A024]" />
              Modifier le cigare
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Marque</Label>
                <Input
                  value={editData.marque || ''}
                  onChange={(e) => setEditData({...editData, marque: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-marque"
                />
              </div>
              <div>
                <Label className="text-gray-300">Gamme</Label>
                <Input
                  value={editData.gamme || ''}
                  onChange={(e) => setEditData({...editData, gamme: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-gamme"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Vitole</Label>
                <Input
                  value={editData.vitole_nom || ''}
                  onChange={(e) => setEditData({...editData, vitole_nom: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-vitole"
                />
              </div>
              <div>
                <Label className="text-gray-300">Pays</Label>
                <Input
                  value={editData.pays_fabrication || ''}
                  onChange={(e) => setEditData({...editData, pays_fabrication: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-pays"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Puissance</Label>
                <Select 
                  value={editData.puissance || ''} 
                  onValueChange={(v) => setEditData({...editData, puissance: v})}
                >
                  <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white mt-1" data-testid="edit-puissance">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                    <SelectItem value="A" className="text-red-400">Forte (A)</SelectItem>
                    <SelectItem value="B" className="text-orange-400">Moyenne (B)</SelectItem>
                    <SelectItem value="C" className="text-green-400">Légère (C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Prix (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.prix || ''}
                  onChange={(e) => setEditData({...editData, prix: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-prix"
                />
              </div>
              <div>
                <Label className="text-gray-300">Note (/5)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="5"
                  value={editData.note_bagues || ''}
                  onChange={(e) => setEditData({...editData, note_bagues: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-note"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Conclusion</Label>
              <Textarea
                value={editData.conclusion || ''}
                onChange={(e) => setEditData({...editData, conclusion: e.target.value})}
                className="bg-black/60 border-[#D4A024]/30 text-white mt-1 min-h-[80px]"
                data-testid="edit-conclusion"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={handleDeleteCigare} 
              disabled={editLoading}
              className="border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300"
              data-testid="delete-cigare-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-gray-600 text-gray-400">
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} disabled={editLoading} className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]" data-testid="save-edit-btn">
                <Save className="w-4 h-4 mr-2" />
                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL NOTATION GUIDÉE (MA CIGARTHÈQUE) ==================== */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-[#D4A024]/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-white flex items-center">
              <Star className="w-5 h-5 mr-2 text-[#D4A024]" />
              Noter ce cigare
            </DialogTitle>
            {noteCigare && (
              <p className="text-[#D4A024]">{noteCigare.marque} {noteCigare.gamme || ''}</p>
            )}
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Note globale */}
            <div>
              <Label className="text-gray-300 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#D4A024]" />
                Note globale (sur 5)
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="5"
                value={noteData.note_globale || ''}
                onChange={(e) => setNoteData({...noteData, note_globale: e.target.value})}
                className="bg-black/60 border-[#D4A024]/30 text-white mt-1 text-lg h-12"
                placeholder="Ex: 4.5"
                data-testid="note-globale-input"
              />
            </div>

            {/* Puissance ressentie */}
            <div>
              <Label className="text-gray-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Puissance ressentie (sur 5)
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="5"
                value={noteData.note_puissance || ''}
                onChange={(e) => setNoteData({...noteData, note_puissance: e.target.value})}
                className="bg-black/60 border-[#D4A024]/30 text-white mt-1 text-lg h-12"
                placeholder="Ex: 3"
                data-testid="note-puissance-input"
              />
            </div>

            {/* Évolution ou Linéaire */}
            <div>
              <Label className="text-gray-300 mb-2 block">Caractère du cigare</Label>
              <RadioGroup 
                value={noteData.evolution} 
                onValueChange={(v) => setNoteData({...noteData, evolution: v})}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="evolution" id="evolution" className="border-[#D4A024] text-[#D4A024]" />
                  <Label htmlFor="evolution" className="text-white cursor-pointer">Évolutif</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lineaire" id="lineaire" className="border-[#D4A024] text-[#D4A024]" />
                  <Label htmlFor="lineaire" className="text-white cursor-pointer">Linéaire</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Note libre */}
            <div>
              <Label className="text-gray-300">Notes libres</Label>
              <Textarea
                value={noteData.note_libre || ''}
                onChange={(e) => setNoteData({...noteData, note_libre: e.target.value})}
                className="bg-black/60 border-[#D4A024]/30 text-white mt-1 min-h-[100px]"
                placeholder="Arômes perçus, accords, impressions générales..."
                data-testid="note-libre-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-gray-600 text-gray-400">
              Annuler
            </Button>
            <Button onClick={handleSaveNote} className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]" data-testid="save-note-btn">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL RECHERCHE CIGARE (Ajouter à Ma Cigarthèque) ==================== */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#D4A024]/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-white flex items-center">
              <Search className="w-5 h-5 mr-2 text-[#D4A024]" />
              Rechercher un cigare
            </DialogTitle>
            <p className="text-gray-400">Trouvez un cigare dans le catalogue pour l'ajouter à votre collection</p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Recherche */}
            <div className="flex gap-2">
              <Input
                value={searchModalQuery}
                onChange={(e) => setSearchModalQuery(e.target.value)}
                placeholder="Tapez un nom de marque ou de cigare..."
                className="bg-black/60 border-[#D4A024]/30 text-white"
                onKeyDown={(e) => e.key === 'Enter' && searchInCatalogue()}
                data-testid="search-modal-input"
                autoFocus
              />
              <Button onClick={searchInCatalogue} disabled={searchModalLoading} className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Résultats */}
            {searchModalLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-[#D4A024] border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : searchModalResults.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {searchModalResults.map((cigare) => (
                  <div 
                    key={cigare.id}
                    className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-[#D4A024]/20 hover:border-[#D4A024] cursor-pointer transition-all"
                    onClick={() => addToMaCigarothequeFromSearch(cigare)}
                    data-testid={`search-result-${cigare.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{cigare.marque || 'Sans marque'} {cigare.gamme || ''}</p>
                      <p className="text-gray-400 text-sm">{cigare.vitole_nom || ''}</p>
                      <div className="flex gap-2 mt-1">
                        {cigare.pays_fabrication && (
                          <Badge variant="outline" className="border-[#D4A024]/30 text-gray-400 text-xs">
                            {cigare.pays_fabrication}
                          </Badge>
                        )}
                        {cigare.prix && (
                          <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                            {cigare.prix}€
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Plus className="w-6 h-6 text-[#D4A024] shrink-0 ml-4" />
                  </div>
                ))}
              </div>
            ) : searchModalQuery && (
              <p className="text-gray-400 text-center py-4">Aucun résultat. Essayez un autre terme.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSearchModal(false); setSearchModalQuery(''); setSearchModalResults([]); }} className="border-gray-600 text-gray-400">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cigarotheque;
