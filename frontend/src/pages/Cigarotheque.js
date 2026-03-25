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
  SortAsc,
  Check,
  CircleOff,
  Scale
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
  const [isCubainFilter, setIsCubainFilter] = useState(''); // '', 'true', 'false'
  const [terroirFilter, setTerroirFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [puissanceFilter, setPuissanceFilter] = useState('');
  const [prixMin, setPrixMin] = useState('');
  const [prixMax, setPrixMax] = useState('');
  const [collectionFilter, setCollectionFilter] = useState(''); // '', 'dans', 'pas_dans'
  
  // Filtres Ma Cigarthèque
  const [maCollectionSearch, setMaCollectionSearch] = useState('');
  const [maCollectionPays, setMaCollectionPays] = useState('');
  const [maCollectionMarque, setMaCollectionMarque] = useState('');
  const [maCollectionModule, setMaCollectionModule] = useState('');
  const [maCollectionTri, setMaCollectionTri] = useState('pays'); // pays, marque, module
  
  // Handlers pour les filtres en cascade
  const handleMaCollectionPaysChange = (value) => {
    setMaCollectionPays(value);
    // Réinitialiser marque et module quand on change le pays
    setMaCollectionMarque('');
    setMaCollectionModule('');
  };
  
  const handleMaCollectionMarqueChange = (value) => {
    setMaCollectionMarque(value);
    // Réinitialiser le module quand on change la marque
    setMaCollectionModule('');
  };
  
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
  const [noteType, setNoteType] = useState('basique'); // 'basique' ou 'poussee'
  const [noteData, setNoteData] = useState({
    // Fiche Basique
    note_globale: '',
    note_puissance: '',
    evolution: 'lineaire',
    note_libre: '',
    // Fiche Poussée - Avant allumage
    cape: '',
    construction: '',
    odeur_cru: '',
    tirage_froid: '',
    // Premier tiers
    tirage_premier: '',
    combustion_premier: '',
    notes_premier: '',
    corps_premier: '',
    // Deuxième tiers
    evolution_deuxieme: '',
    fumee_deuxieme: '',
    notes_deuxieme: '',
    retrohale: '',
    // Dernier tiers
    montee_puissance: '',
    equilibre: '',
    finale: '',
    // Bilan
    points_forts: '',
    defauts: ''
  });
  const [noteCigare, setNoteCigare] = useState(null);

  // Comparateur de cigares
  const [showComparator, setShowComparator] = useState(false);
  const [comparatorCigars, setComparatorCigars] = useState([]); // Max 2 cigares
  const [comparatorMode, setComparatorMode] = useState(false); // Mode sélection pour comparateur

  const LIMIT = 20;

  // Set des IDs de cigares dans Ma Cigarthèque (pour le badge et le filtre)
  const maCollectionCigareIds = useMemo(() => {
    return new Set(maCigarotheque.map(c => c.cigare_id).filter(Boolean));
  }, [maCigarotheque]);

  // Fonction pour vérifier si un cigare est dans Ma Cigarthèque
  const isInMaCollection = (cigareId) => {
    return maCollectionCigareIds.has(cigareId);
  };

  // Set des IDs de cigares dans l'Apéro du Club (pour le badge verre de rouge)
  const aperoClubCigareIds = useMemo(() => {
    return new Set(aperoClub.map(c => c.cigare_id).filter(Boolean));
  }, [aperoClub]);

  // Fonction pour vérifier si un cigare est dans l'Apéro du Club
  const isInAperoClub = (cigareId) => {
    return aperoClubCigareIds.has(cigareId);
  };

  // Charger les filtres au démarrage
  useEffect(() => {
    loadFiltres();
    loadAperoClub();
    // Charger Ma Cigarthèque uniquement pour les membres (pas l'admin)
    if (!isAdmin && currentMember?.id) {
      loadMaCigarotheque();
    }
  }, [isAdmin, currentMember?.id]);

  const loadFiltres = async (isCubain = null, terroir = null) => {
    try {
      const params = new URLSearchParams();
      if (isCubain !== null && isCubain !== '') {
        params.append('is_cubain', isCubain);
      }
      if (terroir && terroir !== 'all') {
        params.append('terroir', terroir);
      }
      const response = await axios.get(`${API}/cigares-filtres?${params}`);
      setFiltres(response.data);
    } catch (error) {
      console.error('Erreur chargement filtres:', error);
    }
  };

  // Handler pour le changement de filtre cubain/non-cubain
  const handleCubainFilterChange = (value) => {
    setIsCubainFilter(value);
    setTerroirFilter(''); // Réinitialiser le terroir
    setMarqueFilter(''); // Réinitialiser la marque
    if (value === 'true') {
      loadFiltres(true, null);
    } else if (value === 'false') {
      loadFiltres(false, null);
    } else {
      loadFiltres(null, null);
    }
    setPage(0);
  };

  // Handler pour le changement de terroir
  const handleTerroirFilterChange = (value) => {
    setTerroirFilter(value);
    setMarqueFilter(''); // Réinitialiser la marque
    loadFiltres(isCubainFilter === 'true' ? true : isCubainFilter === 'false' ? false : null, value);
    setPage(0);
  };

  const loadCigares = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', LIMIT);
      params.append('offset', page * LIMIT);
      if (search) params.append('search', search);
      if (marqueFilter && marqueFilter !== 'all') params.append('marque', marqueFilter);
      if (isCubainFilter === 'true') params.append('is_cubain', 'true');
      if (isCubainFilter === 'false') params.append('is_cubain', 'false');
      if (terroirFilter && terroirFilter !== 'all') params.append('terroir', terroirFilter);
      if (moduleFilter && moduleFilter !== 'all') params.append('module', moduleFilter);
      if (puissanceFilter && puissanceFilter !== 'all') params.append('puissance', puissanceFilter);
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

  // Charger les détails des cigares de Ma Collection depuis le catalogue
  const loadCigaresDeMaCollection = async () => {
    if (maCigarotheque.length === 0) {
      setCigares([]);
      setTotal(0);
      return;
    }
    
    setLoading(true);
    try {
      // Récupérer les IDs des cigares de la collection
      const cigareIds = maCigarotheque.map(c => c.cigare_id).filter(Boolean);
      
      // Charger les détails de chaque cigare depuis le catalogue
      const detailsPromises = cigareIds.map(id => 
        axios.get(`${API}/cigares/${id}`).catch(() => null)
      );
      const results = await Promise.all(detailsPromises);
      
      // Filtrer les résultats valides
      let cigareDetails = results
        .filter(r => r && r.data)
        .map(r => r.data);
      
      // Appliquer les filtres supplémentaires si présents
      if (isCubainFilter === 'true') {
        cigareDetails = cigareDetails.filter(c => c.is_cubain === true || c.terroir === 'Cuba');
      } else if (isCubainFilter === 'false') {
        cigareDetails = cigareDetails.filter(c => c.is_cubain === false || (c.terroir && c.terroir !== 'Cuba'));
      }
      
      if (terroirFilter && terroirFilter !== 'all') {
        cigareDetails = cigareDetails.filter(c => c.terroir === terroirFilter);
      }
      
      if (marqueFilter && marqueFilter !== 'all') {
        cigareDetails = cigareDetails.filter(c => c.marque === marqueFilter);
      }
      
      if (puissanceFilter && puissanceFilter !== 'all') {
        cigareDetails = cigareDetails.filter(c => c.puissance === puissanceFilter);
      }
      
      setCigares(cigareDetails);
      setTotal(cigareDetails.length);
    } catch (error) {
      console.error('Erreur chargement détails cigares:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les cigares selon le mode (normal ou "Dans Ma Collection")
  useEffect(() => {
    if (collectionFilter === 'dans') {
      loadCigaresDeMaCollection();
    } else {
      loadCigares();
    }
  }, [page, search, marqueFilter, isCubainFilter, terroirFilter, moduleFilter, puissanceFilter, prixMin, prixMax, collectionFilter, maCigarotheque]);

  // Filtrer les cigares selon le filtre "pas dans ma collection" uniquement
  const filteredCigares = useMemo(() => {
    // Si filtre "dans", on a déjà chargé directement les cigares de la collection
    if (collectionFilter === 'dans') {
      return cigares;
    }
    
    // Filtre "pas_dans" - filtrer côté client
    if (collectionFilter === 'pas_dans') {
      return cigares.filter(c => !isInMaCollection(c.id));
    }
    
    return cigares;
  }, [cigares, collectionFilter, maCollectionCigareIds]);

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
    setIsCubainFilter('');
    setTerroirFilter('');
    setModuleFilter('');
    setPuissanceFilter('');
    setPrixMin('');
    setPrixMax('');
    setCollectionFilter('');
    setPage(0);
    loadFiltres(null, null); // Recharger tous les filtres sans restriction
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

  // Extraire les options de filtres de Ma Cigarthèque (en cascade)
  const maCollectionFilterOptions = useMemo(() => {
    // Tous les pays disponibles
    const pays = [...new Set(maCigarotheque.map(c => c.pays).filter(Boolean))].sort();
    
    // Marques filtrées par le pays sélectionné
    let cigaresPourMarques = maCigarotheque;
    if (maCollectionPays && maCollectionPays !== 'all') {
      cigaresPourMarques = maCigarotheque.filter(c => c.pays === maCollectionPays);
    }
    const marques = [...new Set(cigaresPourMarques.map(c => c.marque).filter(Boolean))].sort();
    
    // Modules filtrés par pays ET marque sélectionnés
    let cigaresPourModules = maCigarotheque;
    if (maCollectionPays && maCollectionPays !== 'all') {
      cigaresPourModules = cigaresPourModules.filter(c => c.pays === maCollectionPays);
    }
    if (maCollectionMarque && maCollectionMarque !== 'all') {
      cigaresPourModules = cigaresPourModules.filter(c => c.marque === maCollectionMarque);
    }
    const modules = [...new Set(cigaresPourModules.map(c => c.vitole).filter(Boolean))].sort();
    
    return { pays, marques, modules };
  }, [maCigarotheque, maCollectionPays, maCollectionMarque]);

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
        marque: cigare.marque_display || cigare.marque || 'Inconnu',
        gamme: cigare.gamme_display || cigare.gamme || '',
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

  const removeFromAperoClubByCigareId = async (cigareId) => {
    try {
      // Trouver l'entrée dans aperoClub qui correspond à ce cigare_id
      const aperoEntry = aperoClub.find(a => a.cigare_id === cigareId);
      if (aperoEntry) {
        await axios.delete(`${API}/apero-club/${aperoEntry.id}`);
        toast.success('Cigare retiré de l\'Apéro du Club');
        loadAperoClub();
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Toggle Apéro du Club avec confirmation
  const toggleAperoClub = async (cigare) => {
    const isInApero = isInAperoClub(cigare.id);
    
    if (isInApero) {
      // Retirer de l'Apéro
      if (window.confirm(`Retirer "${cigare.marque_display || cigare.marque || 'ce cigare'}" de l'Apéro du Club ?`)) {
        await removeFromAperoClubByCigareId(cigare.id);
      }
    } else {
      // Ajouter à l'Apéro
      if (window.confirm(`Ajouter "${cigare.marque_display || cigare.marque || 'ce cigare'}" à l'Apéro du Club ?`)) {
        await addToAperoClub(cigare);
      }
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

  // ===== COMPARATEUR DE CIGARES =====
  
  const addToComparator = (cigare) => {
    if (comparatorCigars.length >= 2) {
      toast.error('Maximum 2 cigares dans le comparateur');
      return;
    }
    if (comparatorCigars.find(c => c.id === cigare.id)) {
      toast.error('Ce cigare est déjà dans le comparateur');
      return;
    }
    setComparatorCigars([...comparatorCigars, cigare]);
    toast.success(`${cigare.marque_display || cigare.marque} ajouté au comparateur`);
    
    // Si on a 2 cigares, afficher le comparateur automatiquement
    if (comparatorCigars.length === 1) {
      setShowComparator(true);
      setComparatorMode(false);
    }
  };

  const removeFromComparator = (cigareId) => {
    setComparatorCigars(comparatorCigars.filter(c => c.id !== cigareId));
  };

  const clearComparator = () => {
    setComparatorCigars([]);
    setShowComparator(false);
    setComparatorMode(false);
  };

  const isInComparator = (cigareId) => {
    return comparatorCigars.some(c => c.id === cigareId);
  };

  const openComparatorMode = () => {
    setComparatorMode(true);
    setActiveTab('catalogue');
    toast.info('Sélectionnez 2 cigares à comparer');
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
      note_libre: noteLibre.replace(/Puissance:.*?(\d+(?:\.\d+)?\/5)?/g, '').replace(/Évolution|Linéaire/g, '').trim(),
      // Réinitialiser les champs de la fiche poussée
      cape: '',
      construction: '',
      odeur_cru: '',
      tirage_froid: '',
      tirage_premier: '',
      combustion_premier: '',
      notes_premier: '',
      corps_premier: '',
      evolution_deuxieme: '',
      fumee_deuxieme: '',
      notes_deuxieme: '',
      retrohale: '',
      montee_puissance: '',
      equilibre: '',
      finale: '',
      points_forts: '',
      defauts: ''
    });
    setNoteType('basique');
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    try {
      // Construire le commentaire structuré selon le type de fiche
      let commentaire = '';
      
      if (noteType === 'basique') {
        const commentParts = [];
        if (noteData.note_puissance) {
          commentParts.push(`Puissance: ${noteData.note_puissance}/5`);
        }
        commentParts.push(noteData.evolution === 'evolution' ? 'Évolution' : 'Linéaire');
        if (noteData.note_libre) {
          commentParts.push(`Notes: ${noteData.note_libre}`);
        }
        commentaire = commentParts.join(' | ');
      } else {
        // Fiche Poussée - Format structuré
        const sections = [];
        
        // Avant allumage
        const avantAllumage = [];
        if (noteData.cape) avantAllumage.push(`Cape: ${noteData.cape}`);
        if (noteData.construction) avantAllumage.push(`Construction: ${noteData.construction}`);
        if (noteData.odeur_cru) avantAllumage.push(`Odeur à cru: ${noteData.odeur_cru}`);
        if (noteData.tirage_froid) avantAllumage.push(`Tirage à froid: ${noteData.tirage_froid}`);
        if (avantAllumage.length) sections.push(`[Avant allumage] ${avantAllumage.join(', ')}`);
        
        // Premier tiers
        const premierTiers = [];
        if (noteData.tirage_premier) premierTiers.push(`Tirage: ${noteData.tirage_premier}`);
        if (noteData.combustion_premier) premierTiers.push(`Combustion: ${noteData.combustion_premier}`);
        if (noteData.notes_premier) premierTiers.push(`Notes: ${noteData.notes_premier}`);
        if (noteData.corps_premier) premierTiers.push(`Corps: ${noteData.corps_premier}`);
        if (premierTiers.length) sections.push(`[1er tiers] ${premierTiers.join(', ')}`);
        
        // Deuxième tiers
        const deuxiemeTiers = [];
        if (noteData.evolution_deuxieme) deuxiemeTiers.push(`Évolution: ${noteData.evolution_deuxieme}`);
        if (noteData.fumee_deuxieme) deuxiemeTiers.push(`Fumée: ${noteData.fumee_deuxieme}`);
        if (noteData.notes_deuxieme) deuxiemeTiers.push(`Notes: ${noteData.notes_deuxieme}`);
        if (noteData.retrohale) deuxiemeTiers.push(`Rétro: ${noteData.retrohale}`);
        if (deuxiemeTiers.length) sections.push(`[2e tiers] ${deuxiemeTiers.join(', ')}`);
        
        // Dernier tiers
        const dernierTiers = [];
        if (noteData.montee_puissance) dernierTiers.push(`Montée: ${noteData.montee_puissance}`);
        if (noteData.equilibre) dernierTiers.push(`Équilibre: ${noteData.equilibre}`);
        if (noteData.finale) dernierTiers.push(`Finale: ${noteData.finale}`);
        if (dernierTiers.length) sections.push(`[3e tiers] ${dernierTiers.join(', ')}`);
        
        // Bilan
        const bilan = [];
        if (noteData.points_forts) bilan.push(`Points forts: ${noteData.points_forts}`);
        if (noteData.defauts) bilan.push(`Défauts: ${noteData.defauts}`);
        if (bilan.length) sections.push(`[Bilan] ${bilan.join(' | ')}`);
        
        commentaire = sections.join(' || ');
      }
      
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

      {/* Barre du Comparateur */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={comparatorMode ? () => setComparatorMode(false) : openComparatorMode}
          variant={comparatorMode ? "default" : "outline"}
          className={comparatorMode 
            ? "bg-purple-600 hover:bg-purple-700 text-white" 
            : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          }
          data-testid="comparator-btn"
        >
          <Scale className="w-4 h-4 mr-2" />
          {comparatorMode ? "Mode Comparateur actif" : "Comparateur de cigares"}
        </Button>

        {/* Afficher les cigares sélectionnés pour comparaison */}
        {comparatorCigars.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {comparatorCigars.map((cigare, idx) => (
              <Badge 
                key={cigare.id} 
                className="bg-purple-600/80 text-white px-3 py-1 flex items-center gap-2"
              >
                <span className="font-semibold">{idx + 1}.</span>
                {cigare.marque_display || cigare.marque}
                <button 
                  onClick={() => removeFromComparator(cigare.id)}
                  className="ml-1 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {comparatorCigars.length === 2 && (
              <Button
                size="sm"
                onClick={() => setShowComparator(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Voir comparaison
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={clearComparator}
              className="text-gray-400 hover:text-red-400"
            >
              Effacer
            </Button>
          </div>
        )}

        {comparatorMode && comparatorCigars.length < 2 && (
          <span className="text-purple-300 text-sm">
            Cliquez sur un cigare pour l'ajouter ({comparatorCigars.length}/2)
          </span>
        )}
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
                {/* Ligne 1: Catégorie (Cubain/Non-Cubain) + Terroir + Marque */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  {/* Filtre Cubain / Non-Cubain */}
                  <Select value={isCubainFilter} onValueChange={handleCubainFilterChange}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-cubain">
                      <MapPin className="w-4 h-4 mr-2 text-[#D4A024]" />
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                      <SelectItem value="all" className="text-gray-400">
                        Tous ({filtres?.stats?.total || 0})
                      </SelectItem>
                      <SelectItem value="true" className="text-amber-400">
                        🇨🇺 Cubain ({filtres?.stats?.cubains || 0})
                      </SelectItem>
                      <SelectItem value="false" className="text-blue-400">
                        🌎 Non-Cubain ({filtres?.stats?.non_cubains || 0})
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Filtre Terroir (visible uniquement si Non-Cubain sélectionné) */}
                  {isCubainFilter === 'false' && (
                    <Select value={terroirFilter} onValueChange={handleTerroirFilterChange}>
                      <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-terroir">
                        <MapPin className="w-4 h-4 mr-2 text-blue-400" />
                        <SelectValue placeholder="Terroir" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                        <SelectItem value="all" className="text-gray-400">Tous les terroirs</SelectItem>
                        {filtres?.terroirs?.map(t => (
                          <SelectItem key={t.nom} value={t.nom} className="text-white">
                            {t.nom} ({t.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Filtre Marque */}
                  <Select value={marqueFilter} onValueChange={setMarqueFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-marque">
                      <SelectValue placeholder="Marque" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                      <SelectItem value="all" className="text-gray-400">Toutes marques</SelectItem>
                      <SelectItem value="__NULL__" className="text-gray-400">Sans marque</SelectItem>
                      {filtres?.marques?.map(m => (
                        <SelectItem key={m.nom} value={m.nom} className="text-white">
                          {m.nom} ({m.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ligne 2: Module + Puissance */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-module">
                      <Box className="w-4 h-4 mr-2 text-[#D4A024]" />
                      <SelectValue placeholder="Module" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                      <SelectItem value="all" className="text-gray-400">Tous modules</SelectItem>
                      {filtres?.modules?.map(m => (
                        <SelectItem key={m.nom} value={m.nom} className="text-white">
                          {m.nom} ({m.count})
                        </SelectItem>
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

                  {/* Filtre Ma Collection (membres seulement, pas l'admin) */}
                  {!isAdmin && maCigarotheque.length > 0 && (
                    <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                      <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12" data-testid="filter-collection">
                        <User className="w-4 h-4 mr-2 text-[#D4A024]" />
                        <SelectValue placeholder="Ma Collection" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                        <SelectItem value="all" className="text-gray-400">Tous les cigares</SelectItem>
                        <SelectItem value="dans" className="text-green-400">
                          <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" /> Dans Ma Cigarthèque ({maCigarotheque.length})
                          </span>
                        </SelectItem>
                        <SelectItem value="pas_dans" className="text-orange-400">
                          <span className="flex items-center gap-2">
                            <CircleOff className="w-4 h-4" /> Pas encore noté
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Ligne 3: Prix + Réinitialiser */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                  <Button type="button" variant="outline" onClick={resetFiltres} className="text-gray-400 hover:text-white border-gray-600 h-12 col-span-2 md:col-span-1" data-testid="reset-filters-btn">
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
              {/* Compteur de résultats filtrés */}
              {!isAdmin && collectionFilter && collectionFilter !== 'all' && (
                <p className="text-gray-400 text-sm">
                  {filteredCigares.length} cigare(s) {collectionFilter === 'dans' ? 'dans votre collection' : 'pas encore noté(s)'}
                </p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCigares.map((cigare) => (
                  <Card 
                    key={cigare.id} 
                    className={`bg-black/40 border-2 transition-all cursor-pointer overflow-hidden relative ${
                      isInComparator(cigare.id)
                        ? 'border-purple-500 hover:border-purple-400 ring-2 ring-purple-500/50'
                        : !isAdmin && isInMaCollection(cigare.id) 
                          ? 'border-green-500/50 hover:border-green-400' 
                          : 'border-[#D4A024]/30 hover:border-[#D4A024]'
                    }`}
                    onClick={() => { 
                      if (comparatorMode) {
                        addToComparator(cigare);
                      } else {
                        setSelectedCigare(cigare); 
                        setShowDetail(true); 
                      }
                    }}
                    data-testid={`cigare-card-${cigare.id}`}
                  >
                    <CardContent className="p-4">
                      {/* Badge Comparateur */}
                      {isInComparator(cigare.id) && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className="bg-purple-600 text-white text-xs">
                            <Scale className="w-3 h-3 mr-1" />
                            Comparateur
                          </Badge>
                        </div>
                      )}
                      
                      {/* Badge "Dans Ma Cigarthèque" (membres seulement) */}
                      {!isAdmin && isInMaCollection(cigare.id) && (
                        <div className="mb-2">
                          <Badge className="bg-green-600/80 text-white text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Dans Ma Cigarthèque
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-serif font-bold text-white truncate uppercase">
                            {cigare.nom_cigare || cigare.vitole_nom || 'Sans nom'}
                          </h3>
                          <p className="text-[#D4A024] truncate">{cigare.marque_display || cigare.marque || ''}</p>
                          <p className="text-gray-400 text-sm truncate">{cigare.gamme_display || cigare.gamme || ''}</p>
                          {cigare.module && (
                            <p className="text-gray-500 text-xs truncate">{cigare.module}{cigare.vitole ? ` (${cigare.vitole})` : ''}</p>
                          )}
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
                              {/* Bouton toggle Apéro du Club - Grisé si pas dedans, Rouge avec glow si dedans */}
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => toggleAperoClub(cigare)}
                                className={`transition-all duration-300 ${isInAperoClub(cigare.id) 
                                  ? "bg-[#7A2020] border-[#7A2020] text-white hover:bg-[#8A3030] apero-active" 
                                  : "border-gray-500 text-gray-400 hover:border-[#7A2020] hover:text-[#7A2020]"
                                }`}
                                title={isInAperoClub(cigare.id) ? "Retirer de l'Apéro du Club" : "Ajouter à l'Apéro du Club"}
                                data-testid={`toggle-apero-btn-${cigare.id}`}
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
                    <Select value={maCollectionPays} onValueChange={handleMaCollectionPaysChange}>
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
                    <Select value={maCollectionMarque} onValueChange={handleMaCollectionMarqueChange}>
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
                <div>
                  <DialogTitle className="text-2xl font-serif text-white uppercase">
                    {selectedCigare.nom_cigare || selectedCigare.vitole_nom || 'Sans nom'}
                  </DialogTitle>
                  <p className="text-[#D4A024] text-lg">{selectedCigare.marque_display || selectedCigare.marque || ''}</p>
                  <p className="text-gray-400">{selectedCigare.gamme_display || selectedCigare.gamme || ''}</p>
                  {selectedCigare.module && (
                    <p className="text-gray-500 text-sm">{selectedCigare.module}{selectedCigare.vitole ? ` (${selectedCigare.vitole})` : ''}</p>
                  )}
                </div>
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
                      {/* Bouton toggle Apéro du Club */}
                      <Button 
                        onClick={() => toggleAperoClub(selectedCigare)} 
                        variant="outline" 
                        className={isInAperoClub(selectedCigare.id)
                          ? "bg-[#7A2020] border-[#7A2020] text-white hover:bg-[#8A3030]"
                          : "border-gray-500 text-gray-400 hover:border-[#7A2020] hover:text-[#7A2020]"
                        }
                      >
                        <Wine className="w-4 h-4 mr-2" />
                        {isInAperoClub(selectedCigare.id) ? "Dans l'Apéro" : "Apéro du Club"}
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
                <Label className="text-gray-300">Nom du cigare</Label>
                <Input
                  value={editData.nom_cigare || ''}
                  onChange={(e) => setEditData({...editData, nom_cigare: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-nom-cigare"
                />
              </div>
              <div>
                <Label className="text-gray-300">Terroir / Pays</Label>
                <Input
                  value={editData.terroir || editData.pays_fabrication || ''}
                  onChange={(e) => setEditData({...editData, terroir: e.target.value, pays_fabrication: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-terroir"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Module</Label>
                <Input
                  value={editData.module || ''}
                  onChange={(e) => setEditData({...editData, module: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-module"
                />
              </div>
              <div>
                <Label className="text-gray-300">Vitole (précision)</Label>
                <Input
                  value={editData.vitole || ''}
                  onChange={(e) => setEditData({...editData, vitole: e.target.value})}
                  className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                  data-testid="edit-vitole"
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
        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#D4A024]/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-white flex items-center">
              <Star className="w-5 h-5 mr-2 text-[#D4A024]" />
              Noter ce cigare
            </DialogTitle>
            {noteCigare && (
              <p className="text-[#D4A024]">{noteCigare.marque} {noteCigare.gamme || ''}</p>
            )}
          </DialogHeader>

          {/* Onglets Fiche Basique / Fiche Poussée */}
          <Tabs value={noteType} onValueChange={setNoteType} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/60">
              <TabsTrigger value="basique" className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]">
                Fiche Basique
              </TabsTrigger>
              <TabsTrigger value="poussee" className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]">
                Fiche Poussée
              </TabsTrigger>
            </TabsList>

            {/* ===== FICHE BASIQUE ===== */}
            <TabsContent value="basique" className="space-y-5 py-4">
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
            </TabsContent>

            {/* ===== FICHE POUSSÉE ===== */}
            <TabsContent value="poussee" className="space-y-6 py-4">
              {/* Avant allumage */}
              <div className="space-y-3">
                <h4 className="text-[#D4A024] font-semibold border-b border-[#D4A024]/30 pb-1">Avant allumage</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Cape</Label>
                    <Input
                      value={noteData.cape || ''}
                      onChange={(e) => setNoteData({...noteData, cape: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Aspect, couleur, texture..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Construction</Label>
                    <Input
                      value={noteData.construction || ''}
                      onChange={(e) => setNoteData({...noteData, construction: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Ferme, souple..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Odeur à cru</Label>
                    <Input
                      value={noteData.odeur_cru || ''}
                      onChange={(e) => setNoteData({...noteData, odeur_cru: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Notes perçues..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Tirage à froid</Label>
                    <Input
                      value={noteData.tirage_froid || ''}
                      onChange={(e) => setNoteData({...noteData, tirage_froid: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Ouvert, serré..."
                    />
                  </div>
                </div>
              </div>

              {/* Premier tiers */}
              <div className="space-y-3">
                <h4 className="text-[#D4A024] font-semibold border-b border-[#D4A024]/30 pb-1">Premier tiers</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Tirage</Label>
                    <Input
                      value={noteData.tirage_premier || ''}
                      onChange={(e) => setNoteData({...noteData, tirage_premier: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Facile, résistant..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Combustion</Label>
                    <Input
                      value={noteData.combustion_premier || ''}
                      onChange={(e) => setNoteData({...noteData, combustion_premier: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Régulière, irrégulière..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Notes dominantes</Label>
                    <Input
                      value={noteData.notes_premier || ''}
                      onChange={(e) => setNoteData({...noteData, notes_premier: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Boisé, épicé..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Corps</Label>
                    <Input
                      value={noteData.corps_premier || ''}
                      onChange={(e) => setNoteData({...noteData, corps_premier: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Léger, moyen, plein..."
                    />
                  </div>
                </div>
              </div>

              {/* Deuxième tiers */}
              <div className="space-y-3">
                <h4 className="text-[#D4A024] font-semibold border-b border-[#D4A024]/30 pb-1">Deuxième tiers</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Évolution</Label>
                    <Input
                      value={noteData.evolution_deuxieme || ''}
                      onChange={(e) => setNoteData({...noteData, evolution_deuxieme: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Stable, montée..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Fumée</Label>
                    <Input
                      value={noteData.fumee_deuxieme || ''}
                      onChange={(e) => setNoteData({...noteData, fumee_deuxieme: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Dense, légère..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Notes</Label>
                    <Input
                      value={noteData.notes_deuxieme || ''}
                      onChange={(e) => setNoteData({...noteData, notes_deuxieme: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Nouvelles notes..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Rétro-olfaction</Label>
                    <Input
                      value={noteData.retrohale || ''}
                      onChange={(e) => setNoteData({...noteData, retrohale: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Par le nez..."
                    />
                  </div>
                </div>
              </div>

              {/* Dernier tiers */}
              <div className="space-y-3">
                <h4 className="text-[#D4A024] font-semibold border-b border-[#D4A024]/30 pb-1">Dernier tiers</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Montée en puissance</Label>
                    <Input
                      value={noteData.montee_puissance || ''}
                      onChange={(e) => setNoteData({...noteData, montee_puissance: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Forte, douce..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Équilibre</Label>
                    <Input
                      value={noteData.equilibre || ''}
                      onChange={(e) => setNoteData({...noteData, equilibre: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Maintenu, perdu..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Finale</Label>
                    <Input
                      value={noteData.finale || ''}
                      onChange={(e) => setNoteData({...noteData, finale: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1"
                      placeholder="Longue, courte..."
                    />
                  </div>
                </div>
              </div>

              {/* Bilan */}
              <div className="space-y-3">
                <h4 className="text-[#D4A024] font-semibold border-b border-[#D4A024]/30 pb-1">Bilan</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Points forts</Label>
                    <Textarea
                      value={noteData.points_forts || ''}
                      onChange={(e) => setNoteData({...noteData, points_forts: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1 min-h-[80px]"
                      placeholder="Ce qui vous a plu..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Défauts</Label>
                    <Textarea
                      value={noteData.defauts || ''}
                      onChange={(e) => setNoteData({...noteData, defauts: e.target.value})}
                      className="bg-black/60 border-[#D4A024]/30 text-white mt-1 min-h-[80px]"
                      placeholder="Ce qui pourrait être amélioré..."
                    />
                  </div>
                </div>
              </div>

              {/* Note globale aussi dans fiche poussée */}
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
                />
              </div>
            </TabsContent>
          </Tabs>

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

      {/* ==================== MODAL COMPARATEUR ==================== */}
      <Dialog open={showComparator} onOpenChange={setShowComparator}>
        <DialogContent className="max-w-5xl bg-[#1a1a1a] border-[#D4A024]/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-purple-400" />
              Comparateur de Cigares
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {comparatorCigars.length < 2 ? (
              <div className="text-center py-12">
                <Scale className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-4">
                  Sélectionnez {2 - comparatorCigars.length} cigare(s) pour comparer
                </p>
                <Button
                  onClick={() => { setShowComparator(false); openComparatorMode(); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Choisir dans le catalogue
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {comparatorCigars.map((cigare, idx) => (
                  <Card key={cigare.id} className={`bg-black/60 border-2 ${idx === 0 ? 'border-blue-500/50' : 'border-orange-500/50'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge className={idx === 0 ? 'bg-blue-600' : 'bg-orange-600'}>
                            Cigare {idx + 1}
                          </Badge>
                          <CardTitle className="text-xl font-serif text-white mt-2 uppercase">
                            {cigare.nom_cigare || cigare.vitole_nom || 'Sans nom'}
                          </CardTitle>
                          <p className="text-[#D4A024]">{cigare.marque_display || cigare.marque || ''}</p>
                          <p className="text-gray-400 text-sm">{cigare.gamme_display || cigare.gamme || ''}</p>
                          {cigare.module && (
                            <p className="text-gray-500 text-xs">{cigare.module}{cigare.vitole ? ` (${cigare.vitole})` : ''}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromComparator(cigare.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Photo */}
                      {cigare.photo && (
                        <div className="relative rounded-lg overflow-hidden bg-black/40 h-48">
                          <img 
                            src={getPhotoUrl(cigare.photo)} 
                            alt={`${cigare.marque || ''}`}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Infos principales */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/40 rounded-lg p-3 text-center">
                          <Star className="w-5 h-5 text-[#D4A024] mx-auto mb-1" />
                          <p className="text-2xl font-bold text-[#D4A024]">{cigare.note_bagues || '-'}</p>
                          <p className="text-gray-400 text-xs">Note</p>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 text-center">
                          <Euro className="w-5 h-5 text-green-400 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-green-400">{cigare.prix || '-'}€</p>
                          <p className="text-gray-400 text-xs">Prix</p>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 text-center">
                          <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-white">{getPuissanceLabel(cigare.puissance)}</p>
                          <p className="text-gray-400 text-xs">Puissance</p>
                        </div>
                        <div className="bg-black/40 rounded-lg p-3 text-center">
                          <MapPin className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-white">{cigare.pays_fabrication || '-'}</p>
                          <p className="text-gray-400 text-xs">Origine</p>
                        </div>
                      </div>

                      {/* Dimensions */}
                      <div className="bg-black/40 rounded-lg p-3">
                        <p className="text-[#D4A024] text-sm font-semibold mb-2">Dimensions</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold text-white">{cigare.longueur_mm || '-'}</p>
                            <p className="text-gray-400 text-xs">mm</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{cigare.cepo || '-'}</p>
                            <p className="text-gray-400 text-xs">cepo</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{cigare.diametre_mm || '-'}</p>
                            <p className="text-gray-400 text-xs">Ø mm</p>
                          </div>
                        </div>
                      </div>

                      {/* Composition */}
                      <div className="bg-black/40 rounded-lg p-3">
                        <p className="text-[#D4A024] text-sm font-semibold mb-2">Composition</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-300"><span className="text-gray-500">Cape:</span> {cigare.cape || '-'}</p>
                          <p className="text-gray-300"><span className="text-gray-500">Sous-cape:</span> {cigare.sous_cape || '-'}</p>
                          <p className="text-gray-300"><span className="text-gray-500">Tripe:</span> {cigare.tripe || '-'}</p>
                        </div>
                      </div>

                      {/* Conclusion */}
                      {cigare.conclusion && (
                        <div className="bg-black/40 rounded-lg p-3">
                          <p className="text-[#D4A024] text-sm font-semibold mb-1">Conclusion</p>
                          <p className="text-gray-300 text-sm">{cigare.conclusion}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowComparator(false); openComparatorMode(); }}
              className="border-purple-500/50 text-purple-400"
            >
              Changer les cigares
            </Button>
            <Button
              variant="outline"
              onClick={clearComparator}
              className="border-gray-600 text-gray-400"
            >
              Effacer et fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cigarotheque;
