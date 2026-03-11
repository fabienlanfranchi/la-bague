import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Flame, 
  Euro,
  BookOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Wine,
  User,
  Trash2,
  Edit3,
  Box
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const Cigarotheque = () => {
  const { isAdmin, currentMember } = useUser();
  const [activeTab, setActiveTab] = useState('catalogue');
  const [loading, setLoading] = useState(false);
  
  // Catalogue
  const [cigares, setCigares] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filtres, setFiltres] = useState(null);
  
  // Filtres actifs
  const [search, setSearch] = useState('');
  const [marqueFilter, setMarqueFilter] = useState('');
  const [paysFilter, setPaysFilter] = useState('');
  const [puissanceFilter, setPuissanceFilter] = useState('');
  const [vitoleFilter, setVitoleFilter] = useState('');
  const [prixMin, setPrixMin] = useState('');
  const [prixMax, setPrixMax] = useState('');
  
  // Modal détail
  const [selectedCigare, setSelectedCigare] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Ma Cigarthèque
  const [maCigarotheque, setMaCigarotheque] = useState([]);
  
  // Apéro du Club
  const [aperoClub, setAperoClub] = useState([]);

  const LIMIT = 20;

  // Charger les filtres au démarrage
  useEffect(() => {
    loadFiltres();
    loadMaCigarotheque();
    loadAperoClub();
  }, []);

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

  const loadMaCigarotheque = async () => {
    if (!currentMember?.id) return;
    try {
      const response = await axios.get(`${API}/ma-cigarotheque/${currentMember.id}`);
      setMaCigarotheque(response.data);
    } catch (error) {
      console.error('Erreur chargement ma cigarthèque:', error);
    }
  };

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

  const addToMaCigarotheque = async (cigare) => {
    if (!currentMember?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      await axios.post(`${API}/ma-cigarotheque`, {
        membre_id: currentMember.id,
        cigare_id: cigare.id,
        marque: cigare.marque || 'Inconnu',
        gamme: cigare.gamme,
        vitole: cigare.vitole_nom
      });
      toast.success('Cigare ajouté à votre collection !');
      loadMaCigarotheque();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const addToAperoClub = async (cigare) => {
    try {
      await axios.post(`${API}/apero-club`, {
        cigare_id: cigare.id,
        marque: cigare.marque || 'Inconnu',
        gamme: cigare.gamme,
        vitole: cigare.vitole_nom,
        date_apero: new Date().toISOString().split('T')[0]
      });
      toast.success('Cigare ajouté à l\'Apéro du Club !');
      loadAperoClub();
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

  const copyFicheCigare = (cigare) => {
    const fiche = `🚬 ${cigare.marque || ''} ${cigare.gamme || ''} ${cigare.vitole_nom || ''}

📍 Origine: ${cigare.pays_fabrication || '-'}
🔥 Puissance: ${getPuissanceLabel(cigare.puissance)}
⭐ Note: ${cigare.note_bagues || '-'}/5
💰 Prix: ${cigare.prix || '-'}€

📏 Format: ${cigare.longueur_mm || '-'}mm x ${cigare.cepo || '-'}

🍃 Cape: ${cigare.cape || '-'}
🍃 Sous-cape: ${cigare.sous_cape || '-'}
🍃 Tripe: ${cigare.tripe || '-'}

${cigare.conclusion ? `\n💬 ${cigare.conclusion}` : ''}`;

    navigator.clipboard.writeText(fiche);
    toast.success('Fiche copiée !');
  };

  const totalPages = Math.ceil(total / LIMIT);

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
        <TabsList className="grid w-full grid-cols-3 bg-black/40">
          <TabsTrigger value="catalogue" className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]">
            <BookOpen className="w-4 h-4 mr-2" />
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="ma-collection" className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]">
            <User className="w-4 h-4 mr-2" />
            Ma Collection
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="apero-club" className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]">
              <Wine className="w-4 h-4 mr-2" />
              Apéro du Club
            </TabsTrigger>
          )}
        </TabsList>

        {/* ONGLET CATALOGUE */}
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
                    />
                  </div>
                  <Button type="submit" className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] h-12 px-6">
                    <Search className="w-5 h-5" />
                  </Button>
                </div>

                {/* Filtres */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <Select value={marqueFilter} onValueChange={setMarqueFilter}>
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12">
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
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12">
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
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12">
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
                    <SelectTrigger className="bg-black/60 border-[#D4A024]/30 text-white h-12">
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
                  />

                  <Input
                    type="number"
                    value={prixMax}
                    onChange={(e) => setPrixMax(e.target.value)}
                    placeholder="Prix max €"
                    className="bg-black/60 border-[#D4A024]/30 text-white h-12"
                  />

                  <Button type="button" variant="outline" onClick={resetFiltres} className="text-gray-400 hover:text-white border-gray-600 h-12">
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
                    className="bg-black/40 border-2 border-[#D4A024]/30 hover:border-[#D4A024] transition-all cursor-pointer"
                    onClick={() => { setSelectedCigare(cigare); setShowDetail(true); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-serif font-bold text-white">
                            {cigare.marque || 'Sans marque'}
                          </h3>
                          <p className="text-[#D4A024]">{cigare.gamme || ''}</p>
                          <p className="text-gray-400 text-sm">{cigare.vitole_nom || cigare.vitole_type || ''}</p>
                        </div>
                        {cigare.note_bagues && (
                          <Badge className="bg-[#D4A024] text-[#7A2020] text-lg px-3 py-1">
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
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => addToMaCigarotheque(cigare)}
                            className="bg-[#7A2020] hover:bg-[#8A3030] text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
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
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ONGLET MA COLLECTION */}
        <TabsContent value="ma-collection" className="space-y-4">
          <Card className="bg-black/40 border-2 border-[#D4A024]/30">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-white">
                Ma Cigarthèque
              </CardTitle>
              <p className="text-gray-400">{maCigarotheque.length} cigare(s) dans votre collection</p>
            </CardHeader>
            <CardContent>
              {maCigarotheque.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Votre collection est vide</p>
                  <p className="text-gray-500 text-sm mt-2">Ajoutez des cigares depuis le catalogue</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {maCigarotheque.map((cigare) => (
                    <div key={cigare.id} className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-[#D4A024]/20">
                      <div>
                        <h4 className="text-white font-semibold text-lg">{cigare.marque} {cigare.gamme || ''}</h4>
                        <p className="text-gray-400">{cigare.vitole || ''}</p>
                        {cigare.note_personnelle && (
                          <div className="flex items-center mt-1">
                            <Star className="w-4 h-4 text-[#D4A024] mr-1" />
                            <span className="text-[#D4A024]">{cigare.note_personnelle}/5</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyFicheCigare(cigare)}
                          className="text-[#D4A024]"
                        >
                          <Copy className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFromMaCigarotheque(cigare.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET APÉRO DU CLUB (Admin) */}
        {isAdmin && (
          <TabsContent value="apero-club" className="space-y-4">
            <Card className="bg-black/40 border-2 border-[#D4A024]/30">
              <CardHeader>
                <CardTitle className="text-2xl font-serif text-white flex items-center">
                  <Wine className="w-6 h-6 mr-2 text-[#D4A024]" />
                  Apéro du Club
                </CardTitle>
                <p className="text-gray-400">Cigares fumés lors des apéros</p>
              </CardHeader>
              <CardContent>
                {aperoClub.length === 0 ? (
                  <div className="text-center py-8">
                    <Wine className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Aucun cigare enregistré</p>
                    <p className="text-gray-500 text-sm mt-2">Ajoutez des cigares depuis le catalogue</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aperoClub.map((cigare) => (
                      <div key={cigare.id} className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-[#D4A024]/20">
                        <div>
                          <h4 className="text-white font-semibold text-lg">{cigare.marque} {cigare.gamme || ''}</h4>
                          <p className="text-gray-400">{cigare.vitole || ''}</p>
                          <p className="text-[#D4A024] text-sm mt-1">{cigare.date_apero}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyFicheCigare(cigare)}
                            className="text-[#D4A024]"
                          >
                            <Copy className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFromAperoClub(cigare.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
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

      {/* Modal Détail Cigare */}
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
                  <Button onClick={() => { addToMaCigarotheque(selectedCigare); setShowDetail(false); }} variant="outline" className="border-[#D4A024] text-[#D4A024]">
                    <Plus className="w-4 h-4 mr-2" />
                    Ma Cigarthèque
                  </Button>
                  {isAdmin && (
                    <Button onClick={() => { addToAperoClub(selectedCigare); setShowDetail(false); }} variant="outline" className="border-[#7A2020] text-[#7A2020]">
                      <Wine className="w-4 h-4 mr-2" />
                      Apéro du Club
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cigarotheque;
