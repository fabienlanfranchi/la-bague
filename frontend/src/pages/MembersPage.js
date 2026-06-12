import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Plus, Pencil, Trash2, Search, User, TrendingUp, Calendar, X, ChevronRight, Key, Copy, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Saison en cours
const SAISON_EN_COURS = 13;

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  // Tri des colonnes
  const [sortColumn, setSortColumn] = useState('numero_membre'); // Par défaut: numéro de membre
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' ou 'desc'
  
  // Pour la vue profil détaillé
  const [selectedMember, setSelectedMember] = useState(null);
  // Dettes du membre sélectionné (facture identique à celle du profil membre)
  const [selectedMemberDettes, setSelectedMemberDettes] = useState([]);
  const [memberStats, setMemberStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPresenceDetail, setShowPresenceDetail] = useState(false);
  
  // Modal mots de passe
  const [showMotsDePasseModal, setShowMotsDePasseModal] = useState(false);
  const [membresMotsDePasse, setMembresMotsDePasse] = useState([]);
  
  const [formData, setFormData] = useState({
    numero_membre: 0,
    nom_complet: '',
    fonction: '',
    annee_entree: new Date().getFullYear(),
    saison_entree: 'Saison 13',  // Saison actuelle par défaut
    pourcentage_presences: 0,
    etoiles: 1,
    situation_cotisation: 0,
    autres_infos: '',
    email: '',
    telephone: '',  // Numéro pour WhatsApp
    is_president: false,
    saisons_exclues: [],  // Saisons où le membre était en sommeil
  });

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    // Filtrer les membres en fonction de la recherche
    let filtered = members.filter((member) =>
      member.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.fonction.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Trier les membres
    filtered = [...filtered].sort((a, b) => {
      let valueA, valueB;
      
      switch (sortColumn) {
        case 'numero_membre':
          // Forcer la conversion en nombre pour un tri numérique correct
          valueA = parseInt(a.numero_membre, 10) || 0;
          valueB = parseInt(b.numero_membre, 10) || 0;
          break;
        case 'nom_complet':
          valueA = (a.nom_complet || '').toLowerCase();
          valueB = (b.nom_complet || '').toLowerCase();
          break;
        case 'fonction':
          valueA = (a.fonction || '').toLowerCase();
          valueB = (b.fonction || '').toLowerCase();
          break;
        case 'annee_entree':
          valueA = parseInt(a.annee_entree, 10) || 0;
          valueB = parseInt(b.annee_entree, 10) || 0;
          break;
        case 'etoiles':
          valueA = parseInt(a.etoiles, 10) || 0;
          valueB = parseInt(b.etoiles, 10) || 0;
          break;
        case 'pourcentage_presences':
          valueA = parseFloat(a.pourcentage_presences) || 0;
          valueB = parseFloat(b.pourcentage_presences) || 0;
          break;
        case 'situation_cotisation':
          valueA = parseFloat(a.situation_cotisation) || 0;
          valueB = parseFloat(b.situation_cotisation) || 0;
          break;
        default:
          valueA = a.numero_membre || 0;
          valueB = b.numero_membre || 0;
      }
      
      // Comparer les valeurs
      if (typeof valueA === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else {
        return sortDirection === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
    });
    
    setFilteredMembers(filtered);
  }, [searchTerm, members, sortColumn, sortDirection]);

  // Fonction pour gérer le clic sur une colonne de tri
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Si on clique sur la même colonne, inverser la direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, tri ascendant par défaut
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Composant pour l'icône de tri
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-[#D4A024]" />
      : <ArrowDown className="w-4 h-4 ml-1 text-[#D4A024]" />;
  };

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
      setFilteredMembers(data);
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  // Charger les mots de passe des membres (admin)
  const loadMembresMotsDePasse = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/membres-mots-de-passe`);
      const data = await response.json();
      setMembresMotsDePasse(data || []);
      setShowMotsDePasseModal(true);
    } catch (error) {
      toast.error('Erreur lors du chargement des mots de passe');
    }
  };

  // Charger les stats d'un membre
  const loadMemberStats = async (memberId) => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API_URL}/api/presences/membre/${memberId}`);
      const data = await response.json();
      setMemberStats(data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setMemberStats(null);
    }
    setLoadingStats(false);
  };

  // Ouvrir le profil détaillé d'un membre
  const handleViewMember = async (member) => {
    setSelectedMember(member);
    setShowPresenceDetail(false);  // Réinitialiser
    setSelectedMemberDettes([]);
    await loadMemberStats(member.id);
    // Charger les dettes du membre pour afficher la facture détaillée
    try {
      const res = await fetch(`${API_URL}/api/dettes/membre/${member.id}`);
      setSelectedMemberDettes(await res.json() || []);
    } catch (_) {
      setSelectedMemberDettes([]);
    }
  };

  // Fermer le profil détaillé
  const handleCloseMemberView = () => {
    setSelectedMember(null);
    setMemberStats(null);
    setSelectedMemberDettes([]);
  };

  // Calculer les étoiles selon le %
  const getStarsFromPercentage = (pct) => {
    if (pct >= 75) return 4;
    if (pct >= 50) return 3;
    if (pct >= 25) return 2;
    return 1;
  };

  // Obtenir les stats de la saison en cours
  const getCurrentSeasonStats = () => {
    if (!memberStats?.par_saison) return null;
    return memberStats.par_saison.find(s => s.saison === SAISON_EN_COURS);
  };

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        numero_membre: member.numero_membre || 0,
        nom_complet: member.nom_complet,
        fonction: member.fonction,
        annee_entree: member.annee_entree,
        saison_entree: member.saison_entree,
        pourcentage_presences: member.pourcentage_presences,
        etoiles: member.etoiles,
        situation_cotisation: member.situation_cotisation,
        autres_infos: member.autres_infos || '',
        email: member.email || '',
        telephone: member.telephone || '',
        is_president: member.is_president || false,
        saisons_exclues: member.saisons_exclues || [],
      });
    } else {
      setEditingMember(null);
      // Calculer le prochain numéro de membre
      const maxNumero = members.reduce((max, m) => Math.max(max, m.numero_membre || 0), 0);
      setFormData({
        numero_membre: maxNumero + 1,
        nom_complet: '',
        fonction: '',
        annee_entree: new Date().getFullYear(),
        saison_entree: 'Saison 13',  // Saison actuelle par défaut
        pourcentage_presences: 0,
        etoiles: 1,
        situation_cotisation: 0,
        autres_infos: '',
        email: '',
        telephone: '',
        is_president: false,
        saisons_exclues: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        // Utiliser la route admin pour une mise à jour complète
        const response = await fetch(`${API_URL}/api/admin/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Erreur mise à jour');
        toast.success('Membre mis à jour avec succès');
      } else {
        await api.createMember(formData);
        toast.success('Membre créé avec succès');
      }
      setDialogOpen(false);
      loadMembers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde du membre');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      return;
    }
    try {
      await api.deleteMember(id);
      toast.success('Membre supprimé avec succès');
      loadMembers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du membre');
    }
  };

  const getCotisationBadge = (status) => {
    const badges = {
      0: { label: '✓', color: 'bg-green-100 text-green-800' },
      1: { label: '1 an', color: 'bg-yellow-100 text-yellow-800' },
      2: { label: '2 ans', color: 'bg-orange-100 text-orange-800' },
      3: { label: '3+ ans', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || badges[0];
    return (
      <span className={`px-2 py-1 rounded text-sm font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Gestion des Membres
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">Tableau complet des membres du club</p>
      </div>

      {/* Barre d'actions */}
      <Card className="mb-6 bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            {/* Recherche */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Rechercher un membre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Bouton ajouter */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
                  data-testid="add-member-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un membre
                </Button>
              </DialogTrigger>
              
              {/* Bouton Espace Mots de Passe */}
              <Button
                onClick={loadMembresMotsDePasse}
                variant="outline"
                size="icon"
                className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/10 ml-2 w-10 h-10"
                data-testid="btn-cles-membres"
                title="Clés d'activation des membres"
              >
                <Key className="w-5 h-5" />
              </Button>
              
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-2rem)]">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                      {editingMember ? 'Modifier le membre' : 'Nouveau membre'}
                    </DialogTitle>
                    <DialogDescription>
                      Remplissez les informations du membre
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4 overflow-y-auto flex-1 px-1">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="numero_membre">N° Membre *</Label>
                        <Input
                          id="numero_membre"
                          type="number"
                          value={formData.numero_membre}
                          onChange={(e) =>
                            setFormData({ ...formData, numero_membre: parseInt(e.target.value) })
                          }
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="nom_complet">Nom complet *</Label>
                        <Input
                          id="nom_complet"
                          value={formData.nom_complet}
                          onChange={(e) =>
                            setFormData({ ...formData, nom_complet: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fonction">Fonction *</Label>
                        <Input
                          id="fonction"
                          value={formData.fonction}
                          onChange={(e) =>
                            setFormData({ ...formData, fonction: e.target.value })
                          }
                          placeholder="Ex: Président, Trésorier..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="email@exemple.com"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="telephone">Téléphone (WhatsApp)</Label>
                      <Input
                        id="telephone"
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) =>
                          setFormData({ ...formData, telephone: e.target.value })
                        }
                        placeholder="06 12 34 56 78"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="annee_entree">Année d'entrée</Label>
                        <Input
                          id="annee_entree"
                          type="number"
                          value={formData.annee_entree}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              annee_entree: parseInt(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="saison_entree">Saison d'entrée</Label>
                        <Select
                          value={formData.saison_entree}
                          onValueChange={(value) =>
                            setFormData({ ...formData, saison_entree: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(15)].map((_, i) => (
                              <SelectItem key={i + 1} value={`Saison ${i + 1}`}>
                                Saison {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="pourcentage_presences" className="flex items-center gap-1">
                          % Présences
                          <span className="text-base text-gray-400">(ancien)</span>
                        </Label>
                        <Input
                          id="pourcentage_presences"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.pourcentage_presences}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pourcentage_presences: parseFloat(e.target.value),
                            })
                          }
                          className="bg-gray-100"
                          title="Ce champ est obsolète. Utilisez l'onglet Statistiques pour les vraies présences."
                        />
                      </div>
                      <div>
                        <Label htmlFor="etoiles">Étoiles (1-4)</Label>
                        <Select
                          value={formData.etoiles.toString()}
                          onValueChange={(value) =>
                            setFormData({ ...formData, etoiles: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 ⭐</SelectItem>
                            <SelectItem value="2">2 ⭐⭐</SelectItem>
                            <SelectItem value="3">3 ⭐⭐⭐</SelectItem>
                            <SelectItem value="4">4 ⭐⭐⭐⭐</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="situation_cotisation">Cotisation</Label>
                        <Select
                          value={formData.situation_cotisation.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              situation_cotisation: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">À jour (0)</SelectItem>
                            <SelectItem value="1">1 année due</SelectItem>
                            <SelectItem value="2">2 années dues</SelectItem>
                            <SelectItem value="3">3+ années dues</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="autres_infos">Autres informations</Label>
                      <Input
                        id="autres_infos"
                        value={formData.autres_infos}
                        onChange={(e) =>
                          setFormData({ ...formData, autres_infos: e.target.value })
                        }
                        placeholder="Informations supplémentaires..."
                      />
                    </div>

                    {/* Option Président */}
                    <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <input
                        type="checkbox"
                        id="is_president"
                        checked={formData.is_president}
                        onChange={(e) =>
                          setFormData({ ...formData, is_president: e.target.checked })
                        }
                        className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                      />
                      <Label htmlFor="is_president" className="text-amber-800 font-medium cursor-pointer">
                        Ce membre est le Président du club
                      </Label>
                    </div>

                    {/* Saisons exclues (en sommeil) */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Label className="text-gray-700 font-medium mb-2 block">
                        Saisons exclues (membre en sommeil)
                      </Label>
                      <p className="text-base text-gray-500 mb-2">
                        Cochez les saisons où ce membre était en pause/sommeil (ne seront pas comptées dans ses stats)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13].map((saison) => (
                          <label 
                            key={saison} 
                            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm ${
                              formData.saisons_exclues?.includes(saison) 
                                ? 'bg-red-100 border border-red-300 text-red-700' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.saisons_exclues?.includes(saison)}
                              onChange={(e) => {
                                const currentExclues = formData.saisons_exclues || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, saisons_exclues: [...currentExclues, saison].sort((a,b) => a-b) });
                                } else {
                                  setFormData({ ...formData, saisons_exclues: currentExclues.filter(s => s !== saison) });
                                }
                              }}
                              className="w-3 h-3"
                            />
                            S{saison}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold">
                      {editingMember ? 'Mettre à jour' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des membres */}
      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-serif text-white">
            Liste des membres ({filteredMembers.length})
          </CardTitle>
          <CardDescription className="text-gray-400">
            Cliquez sur un membre pour le modifier ou le supprimer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#D4A024]/20 hover:bg-[#D4A024]/5">
                  <TableHead 
                    className="text-[#D4A024] font-serif w-12 cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('numero_membre')}
                  >
                    <div className="flex items-center">
                      #
                      <SortIcon column="numero_membre" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[#D4A024] font-serif cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('nom_complet')}
                  >
                    <div className="flex items-center">
                      Nom
                      <SortIcon column="nom_complet" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[#D4A024] font-serif cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('fonction')}
                  >
                    <div className="flex items-center">
                      Fonction
                      <SortIcon column="fonction" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[#D4A024] font-serif cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('annee_entree')}
                  >
                    <div className="flex items-center">
                      Entrée
                      <SortIcon column="annee_entree" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-[#D4A024] font-serif cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('etoiles')}
                  >
                    <div className="flex items-center justify-center">
                      Étoiles
                      <SortIcon column="etoiles" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-[#D4A024] font-serif cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('pourcentage_presences')}
                  >
                    <div className="flex items-center justify-center">
                      Présences
                      <SortIcon column="pourcentage_presences" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-[#D4A024] font-serif cursor-pointer hover:bg-[#D4A024]/10 select-none"
                    onClick={() => handleSort('situation_cotisation')}
                  >
                    <div className="flex items-center justify-center">
                      Cotisation
                      <SortIcon column="situation_cotisation" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-[#D4A024] font-serif">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      Aucun membre trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow 
                      key={member.id} 
                      data-testid={`member-row-${member.id}`} 
                      className="border-[#D4A024]/20 hover:bg-[#D4A024]/5 cursor-pointer"
                      onClick={() => handleViewMember(member)}
                    >
                      <TableCell className="text-gray-500 font-mono text-sm">
                        {member.numero_membre}
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {member.nom_complet}
                        {member.is_president && (
                          <span className="ml-2 text-sm bg-amber-600 text-white px-1.5 py-0.5 rounded">PRÉS.</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-base text-gray-400">
                          {member.fonction}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-white">
                          <div>{member.saison_entree} {member.annee_entree}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {[...Array(member.etoiles)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 text-yellow-400 fill-yellow-400"
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-[#D4A024]">
                          {member.pourcentage_presences}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getCotisationBadge(member.situation_cotisation)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(member)}
                            data-testid={`edit-member-${member.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-member-${member.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Profil Détaillé du Membre */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleCloseMemberView}>
          <Card 
            className="bg-[#1a1a1a] border-2 border-[#D4A024] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-serif text-[#D4A024] flex items-center gap-3">
                    <User className="w-6 h-6" />
                    {selectedMember.nom_complet}
                    {selectedMember.is_president && (
                      <span className="text-sm bg-amber-600 text-white px-2 py-1 rounded">PRÉSIDENT</span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    {selectedMember.fonction} • Membre #{selectedMember.numero_membre} • Depuis {selectedMember.annee_entree}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseMemberView}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {loadingStats ? (
                <div className="text-center py-8 text-gray-400">Chargement des statistiques...</div>
              ) : (
                <>
                  {/* ========== PRÉSENCE TOTAL (cliquable) ========== */}
                  <div 
                    className="bg-gradient-to-r from-[#D4A024]/20 to-transparent rounded-lg p-5 border border-[#D4A024]/30 cursor-pointer hover:border-[#D4A024]/60 transition-colors"
                    onClick={() => setShowPresenceDetail(!showPresenceDetail)}
                  >
                    <h3 className="text-lg font-serif text-[#D4A024] mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Présence Total
                      </span>
                      <ChevronRight className={`w-5 h-5 text-[#D4A024] transition-transform ${showPresenceDetail ? 'rotate-90' : ''}`} />
                    </h3>
                    
                    {/* % Global et Étoiles + Total */}
                    <div className="flex items-center justify-between p-3 bg-[#D4A024]/10 rounded-lg border border-[#D4A024]/30">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-bold text-white">
                          {memberStats?.totaux?.pct_global || selectedMember.pourcentage_presences || 0}%
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(getStarsFromPercentage(memberStats?.totaux?.pct_global || selectedMember.pourcentage_presences || 0))].map((_, i) => (
                            <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#D4A024] font-bold text-2xl">
                          {memberStats?.totaux?.presences_total || 0}/{memberStats?.totaux?.events_total || 0}
                        </div>
                        <div className="text-base text-gray-400">Présences / Événements</div>
                      </div>
                    </div>
                    
                    {/* Tableau simplifié par saison (visible au clic) */}
                    {showPresenceDetail && memberStats?.par_saison && memberStats.par_saison.length > 0 && (
                      <div className="overflow-x-auto mt-4" onClick={(e) => e.stopPropagation()}>
                        <table className="w-full text-sm">
                          <thead className="bg-black/40">
                            <tr>
                              <th className="px-4 py-2 text-left text-[#D4A024] font-semibold">Saison</th>
                              <th className="px-4 py-2 text-center text-gray-300 font-semibold">Présences / Événements</th>
                              <th className="px-4 py-2 text-center text-[#D4A024] font-semibold">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberStats.par_saison.map((s, idx) => {
                              const totalPres = (s.presences_aperos || 0) + (s.presences_repas || 0) + (s.presences_anniversaires || 0);
                              const totalEvents = (s.nb_aperos || 0) + (s.nb_repas || 0) + (s.nb_anniversaires || 0);
                              return (
                                <tr key={s.saison} className={idx % 2 === 0 ? 'bg-black/20' : 'bg-black/10'}>
                                  <td className="px-4 py-2 text-white font-medium">Saison {s.saison}</td>
                                  <td className="px-4 py-2 text-center text-gray-300">{totalPres}/{totalEvents}</td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={`font-bold ${
                                      s.pct_global_saison >= 75 ? 'text-green-400' :
                                      s.pct_global_saison >= 50 ? 'text-[#D4A024]' :
                                      s.pct_global_saison >= 25 ? 'text-orange-400' :
                                      'text-red-400'
                                    }`}>{s.pct_global_saison}%</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ========== SAISON EN COURS ========== */}
                  <div className="bg-gradient-to-r from-green-900/20 to-transparent rounded-lg p-5 border border-green-600/30">
                    <h3 className="text-lg font-serif text-green-400 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Saison en cours ({SAISON_EN_COURS})
                    </h3>
                    
                    {(() => {
                      const saisonStats = getCurrentSeasonStats();
                      if (!saisonStats) {
                        return (
                          <div className="text-center py-4 text-gray-500">
                            Pas de données pour la saison {SAISON_EN_COURS}
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {/* % Saison */}
                          <div className="flex items-center gap-4 mb-4">
                            <span className="text-3xl font-bold text-white">
                              {saisonStats.pct_global_saison || 0}%
                            </span>
                            <div className="flex items-center gap-1">
                              {[...Array(getStarsFromPercentage(saisonStats.pct_global_saison || 0))].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                          </div>
                          
                          {/* Détail saison */}
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-amber-400 font-bold">
                                {saisonStats.presences_aperos || 0}/{saisonStats.nb_aperos || 0}
                              </div>
                              <div className="text-base text-gray-400">Apéros</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-blue-400 font-bold">
                                {saisonStats.presences_repas || 0}/{saisonStats.nb_repas || 0}
                              </div>
                              <div className="text-base text-gray-400">Repas</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-purple-400 font-bold">
                                {saisonStats.presences_anniversaires || 0}/{saisonStats.nb_anniversaires || 0}
                              </div>
                              <div className="text-base text-gray-400">Anniversaires</div>
                            </div>
                            <div className="bg-green-900/30 rounded-lg p-3 border border-green-600/50">
                              <div className="text-green-400 font-bold">
                                {(saisonStats.presences_aperos || 0) + (saisonStats.presences_repas || 0) + (saisonStats.presences_anniversaires || 0)}/
                                {(saisonStats.nb_aperos || 0) + (saisonStats.nb_repas || 0) + (saisonStats.nb_anniversaires || 0)}
                              </div>
                              <div className="text-base text-gray-400">Saison</div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* ========== COTISATIONS — Facture (identique au profil membre) ========== */}
                  {(() => {
                    const currentSeason = 13;
                    const lignes = [];
                    const nbCot = Number(selectedMember.situation_cotisation || 0);
                    for (let i = 0; i < nbCot; i++) {
                      const saison = currentSeason - i;
                      lignes.push({
                        key: `cot-${saison}`,
                        description: `Cotisation saison ${saison}`,
                        montant: 200,
                      });
                    }
                    selectedMemberDettes.forEach((d) => {
                      lignes.push({
                        key: `dette-${d.id}`,
                        description: d.libelle || d.cause || 'Dette',
                        montant: Number(d.montant || 0),
                      });
                    });
                    const totalDu = lignes.reduce((s, l) => s + l.montant, 0);

                    return (
                      <div
                        className={`rounded-lg p-5 border ${
                          lignes.length > 0
                            ? 'bg-gradient-to-r from-red-900/30 to-transparent border-red-600/40'
                            : 'bg-gradient-to-r from-green-900/20 to-transparent border-green-600/30'
                        }`}
                        data-testid="cotisations-facture-president"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-serif text-gray-200">Cotisations & Dettes</h3>
                          {lignes.length === 0 && (
                            <span className="text-green-400 font-semibold text-base">✓ À jour</span>
                          )}
                        </div>

                        {lignes.length > 0 && (
                          <>
                            {/* En-tête */}
                            <div className="grid grid-cols-[1fr_auto] items-center gap-3 pb-2 mb-2 border-b border-red-600/30 text-xs uppercase tracking-wider text-gray-400">
                              <span>Désignation</span>
                              <span className="text-right">Montant</span>
                            </div>
                            <div className="space-y-1">
                              {lignes.map((l) => (
                                <div key={l.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 px-2 rounded bg-black/20">
                                  <span className="text-gray-200 text-base">{l.description}</span>
                                  <span className="text-red-300 text-base font-bold">
                                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(l.montant)}
                                  </span>
                                  {l.key.startsWith('dette-') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        if (!window.confirm(`Effacer la dette « ${l.description} » (${l.montant} €) ?\n\nÀ utiliser uniquement si le paiement a déjà été reçu hors de l'app.`)) return;
                                        try {
                                          const detteId = l.key.replace('dette-', '');
                                          const res = await fetch(`${API_URL}/api/dettes/${detteId}`, { method: 'DELETE' });
                                          if (!res.ok) throw new Error('http');
                                          toast.success('Dette effacée');
                                          const r = await fetch(`${API_URL}/api/dettes/membre/${selectedMember.id}`);
                                          setSelectedMemberDettes((await r.json()) || []);
                                        } catch (_) {
                                          toast.error('Erreur lors de la suppression');
                                        }
                                      }}
                                      className="text-red-400 hover:text-red-200 hover:bg-red-500/10 px-2"
                                      data-testid={`del-dette-${l.key.replace('dette-', '')}`}
                                      title="Effacer cette dette (paiement reçu hors app)"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {l.key.startsWith('cot-') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        if (!window.confirm(`Annuler « ${l.description} » (${l.montant} €) ?\n\nÀ utiliser uniquement si la cotisation a déjà été réglée hors de l'app ou pour exonérer le membre.`)) return;
                                        try {
                                          const res = await fetch(`${API_URL}/api/membres/${selectedMember.id}/annuler-cotisation`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ nb: 1 }),
                                          });
                                          if (!res.ok) throw new Error('http');
                                          const data = await res.json();
                                          toast.success('Cotisation annulée');
                                          // Mettre à jour le membre sélectionné localement
                                          setSelectedMember({ ...selectedMember, situation_cotisation: data.situation_cotisation });
                                          // Refresh des membres
                                          if (typeof loadMembers === 'function') {
                                            loadMembers();
                                          }
                                        } catch (_) {
                                          toast.error("Erreur lors de l'annulation");
                                        }
                                      }}
                                      className="text-red-400 hover:text-red-200 hover:bg-red-500/10 px-2"
                                      data-testid={`del-cot-${l.key.replace('cot-', '')}`}
                                      title="Annuler cette cotisation (réglée hors app / exonération)"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-red-600/30 flex items-center justify-between">
                              <span className="text-gray-300 font-semibold">Total dû</span>
                              <span className="text-2xl font-bold text-red-300" data-testid="facture-total-president">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalDu)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 italic mt-2">
                              Cette facture est partagée avec {selectedMember.nom_complet} sur son profil.
                              Toute évolution (paiement, ajout de dette) y est répercutée automatiquement.
                            </p>
                          </>
                        )}
                        {selectedMember.autres_infos && (
                          <p className="text-gray-500 text-sm mt-3 italic">
                            {selectedMember.autres_infos}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
              
              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4 border-t border-[#D4A024]/20">
                <Button
                  variant="outline"
                  className="flex-1 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                  onClick={() => {
                    handleCloseMemberView();
                    handleOpenDialog(selectedMember);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]"
                  onClick={handleCloseMemberView}
                >
                  Fermer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Clés d'activation des Membres */}
      {showMotsDePasseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <CardHeader className="border-b border-[#D4A024]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-serif text-[#D4A024] flex items-center">
                  <Key className="w-6 h-6 mr-2" />
                  Clés d'activation des Membres
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMotsDePasseModal(false)}
                  className="text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <CardDescription className="text-gray-300 mt-2">
                Utilisez ces clés pour aider les membres qui ont oublié leur accès.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto max-h-[65vh]">
              <div className="space-y-2">
                {membresMotsDePasse.map((membre) => (
                  <div key={membre.id} className="bg-black/30 rounded-lg p-4 border border-[#D4A024]/30">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-white font-bold text-lg">
                          {membre.numero_membre}. {membre.nom_complet}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-black/40 rounded-lg px-4 py-2">
                        <div>
                          <p className="text-xs text-gray-500">Clé d'activation</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[#D4A024] font-mono text-lg font-bold">
                              labague{membre.numero_membre}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-[#D4A024] hover:bg-[#D4A024]/10"
                              onClick={() => {
                                navigator.clipboard.writeText(`labague${membre.numero_membre}`);
                                toast.success('Clé copiée !');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {membresMotsDePasse.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    Aucun membre trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MembersPage;
