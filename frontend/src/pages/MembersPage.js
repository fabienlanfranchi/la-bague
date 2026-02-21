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
import { Star, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    nom_complet: '',
    fonction: '',
    annee_entree: new Date().getFullYear(),
    saison_entree: 'Printemps',
    pourcentage_presences: 0,
    etoiles: 1,
    situation_cotisation: 0,
    autres_infos: '',
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

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        nom_complet: member.nom_complet,
        fonction: member.fonction,
        annee_entree: member.annee_entree,
        saison_entree: member.saison_entree,
        pourcentage_presences: member.pourcentage_presences,
        etoiles: member.etoiles,
        situation_cotisation: member.situation_cotisation,
        autres_infos: member.autres_infos || '',
      });
    } else {
      setEditingMember(null);
      setFormData({
        nom_complet: '',
        fonction: '',
        annee_entree: new Date().getFullYear(),
        saison_entree: 'Printemps',
        pourcentage_presences: 0,
        etoiles: 1,
        situation_cotisation: 0,
        autres_infos: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await api.updateMember(editingMember.id, formData);
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
      1: { label: '1', color: 'bg-yellow-100 text-yellow-800' },
      2: { label: '2', color: 'bg-orange-100 text-orange-800' },
      3: { label: '3+', color: 'bg-red-100 text-red-800' },
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
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMember ? 'Modifier le membre' : 'Nouveau membre'}
                    </DialogTitle>
                    <DialogDescription>
                      Remplissez les informations du membre
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
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
                        <Label htmlFor="pourcentage_presences">% Présences</Label>
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
                            <SelectItem value="1">Retard 1 mois</SelectItem>
                            <SelectItem value="2">Retard 2 mois</SelectItem>
                            <SelectItem value="3">Retard 3+ mois</SelectItem>
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
                  </div>

                  <DialogFooter>
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
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Aucun membre trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id} data-testid={`member-row-${member.id}`} className="border-[#D4A024]/20 hover:bg-[#D4A024]/5">
                      <TableCell className="font-medium text-white">
                        {member.nom_complet}
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
                        <div className="flex items-center justify-end space-x-2">
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
    </div>
  );
};

export default MembersPage;
