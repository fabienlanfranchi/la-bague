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
import { Star, Plus, Pencil, Trash2, Search, User, TrendingUp, Calendar, X, ChevronRight } from 'lucide-react';
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
  
  // Pour la vue profil détaillé
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  const [formData, setFormData] = useState({
    numero_membre: 0,
    nom_complet: '',
    fonction: '',
    annee_entree: new Date().getFullYear(),
    saison_entree: 'Printemps',
    pourcentage_presences: 0,
    etoiles: 1,
    situation_cotisation: 0,
    autres_infos: '',
    email: '',
    is_president: false,
  });

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    // Filtrer les membres en fonction de la recherche
    const filtered = members.filter((member) =>
      member.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.fonction.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [searchTerm, members]);

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
    await loadMemberStats(member.id);
  };

  // Fermer le profil détaillé
  const handleCloseMemberView = () => {
    setSelectedMember(null);
    setMemberStats(null);
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
        is_president: member.is_president || false,
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
        saison_entree: 'Printemps',
        pourcentage_presences: 0,
        etoiles: 1,
        situation_cotisation: 0,
        autres_infos: '',
        email: '',
        is_president: false,
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
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
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
                            <SelectItem value="Printemps">Printemps</SelectItem>
                            <SelectItem value="Été">Été</SelectItem>
                            <SelectItem value="Automne">Automne</SelectItem>
                            <SelectItem value="Hiver">Hiver</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="pourcentage_presences" className="flex items-center gap-1">
                          % Présences
                          <span className="text-xs text-gray-400">(ancien)</span>
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
                  <TableHead className="text-[#D4A024] font-serif w-12">#</TableHead>
                  <TableHead className="text-[#D4A024] font-serif">Nom</TableHead>
                  <TableHead className="text-[#D4A024] font-serif">Fonction</TableHead>
                  <TableHead className="text-[#D4A024] font-serif">Entrée</TableHead>
                  <TableHead className="text-center text-[#D4A024] font-serif">Étoiles</TableHead>
                  <TableHead className="text-center text-[#D4A024] font-serif">Présences</TableHead>
                  <TableHead className="text-center text-[#D4A024] font-serif">Cotisation</TableHead>
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
                          <span className="ml-2 text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded">PRÉS.</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-400">
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
                  {/* ========== PRÉSENCE TOTAL ========== */}
                  <div className="bg-gradient-to-r from-[#D4A024]/20 to-transparent rounded-lg p-5 border border-[#D4A024]/30">
                    <h3 className="text-lg font-serif text-[#D4A024] mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Présence Total
                    </h3>
                    
                    {/* % Global et Étoiles */}
                    <div className="flex items-center justify-between mb-4">
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
                    </div>
                    
                    {/* Détail par type */}
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-amber-400 font-bold text-lg">
                          {memberStats?.totaux?.presences_aperos || 0}/{memberStats?.totaux?.total_aperos || 0}
                        </div>
                        <div className="text-xs text-gray-400">Apéros</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-blue-400 font-bold text-lg">
                          {memberStats?.totaux?.presences_repas || 0}/{memberStats?.totaux?.total_repas || 0}
                        </div>
                        <div className="text-xs text-gray-400">Repas</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-purple-400 font-bold text-lg">
                          {memberStats?.totaux?.presences_anniversaires || 0}/{memberStats?.totaux?.total_anniversaires || 0}
                        </div>
                        <div className="text-xs text-gray-400">Anniversaires</div>
                      </div>
                      <div className="bg-[#D4A024]/20 rounded-lg p-3 border border-[#D4A024]/50">
                        <div className="text-[#D4A024] font-bold text-lg">
                          {memberStats?.totaux?.presences_total || 0}/{memberStats?.totaux?.events_total || 0}
                        </div>
                        <div className="text-xs text-gray-400">Total</div>
                      </div>
                    </div>
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
                              <div className="text-xs text-gray-400">Apéros</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-blue-400 font-bold">
                                {saisonStats.presences_repas || 0}/{saisonStats.nb_repas || 0}
                              </div>
                              <div className="text-xs text-gray-400">Repas</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-purple-400 font-bold">
                                {saisonStats.presences_anniversaires || 0}/{saisonStats.nb_anniversaires || 0}
                              </div>
                              <div className="text-xs text-gray-400">Anniversaires</div>
                            </div>
                            <div className="bg-green-900/30 rounded-lg p-3 border border-green-600/50">
                              <div className="text-green-400 font-bold">
                                {(saisonStats.presences_aperos || 0) + (saisonStats.presences_repas || 0) + (saisonStats.presences_anniversaires || 0)}/
                                {(saisonStats.nb_aperos || 0) + (saisonStats.nb_repas || 0) + (saisonStats.nb_anniversaires || 0)}
                              </div>
                              <div className="text-xs text-gray-400">Saison</div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* ========== COTISATIONS ========== */}
                  <div className="bg-gradient-to-r from-gray-800/50 to-transparent rounded-lg p-5 border border-gray-600/30">
                    <h3 className="text-lg font-serif text-gray-300 mb-3">Cotisations</h3>
                    <div className="flex items-center gap-4">
                      {selectedMember.situation_cotisation === 0 ? (
                        <span className="text-green-400 font-semibold">✓ À jour</span>
                      ) : (
                        <span className="text-red-400 font-semibold">
                          {selectedMember.situation_cotisation} saison(s) en attente
                        </span>
                      )}
                    </div>
                    {selectedMember.autres_infos && (
                      <p className="text-gray-500 text-sm mt-3 italic">
                        {selectedMember.autres_infos}
                      </p>
                    )}
                  </div>
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
    </div>
  );
};

export default MembersPage;
