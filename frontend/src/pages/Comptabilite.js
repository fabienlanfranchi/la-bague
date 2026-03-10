import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Calendar,
  Trash2,
  ArrowRightLeft,
  X,
  AlertTriangle,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Comptabilite = () => {
  const [summary, setSummary] = useState({
    solde_total: 0,
    total_recettes: 0,
    total_depenses: 0,
    cotisations_en_attente: 0
  });
  const [comptes, setComptes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [dettes, setDettes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de virement
  const [showVirementModal, setShowVirementModal] = useState(false);
  const [virementForm, setVirementForm] = useState({
    compte_source: '',
    compte_destination: '',
    montant: '',
    description: ''
  });

  // Modal de dette "Dehors"
  const [showDetteModal, setShowDetteModal] = useState(false);
  const [detteForm, setDetteForm] = useState({
    membre_id: '',
    montant: '',
    cause: ''
  });

  // Modal de détails d'une caisse
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCaisse, setSelectedCaisse] = useState(null);

  // Modal de règlement de dette
  const [showReglementModal, setShowReglementModal] = useState(false);
  const [detteARegler, setDetteARegler] = useState(null);
  const [compteDestinationReglement, setCompteDestinationReglement] = useState('');

  // Formulaire de nouveau mouvement
  const [newMouvement, setNewMouvement] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'recette',
    membre_id: '',
    objet: 'cotisation',
    montant: '',
    endroit: '',
    detail: ''
  });

  // Options pour les objets
  const objetOptions = ['cotisation', 'album', 'tombola', 'anniversaire', 'autres'];
  
  // Options fixes pour les caisses
  const caisseOptions = ['Compte', 'Chez Fabien', 'Chez Jacques', 'PayPal', 'Asso Connect', 'Chèque'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, comptesRes, transactionsRes, membersRes, dettesRes] = await Promise.all([
        axios.get(`${API}/transactions/summary`),
        axios.get(`${API}/comptes`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/members`),
        axios.get(`${API}/dettes`).catch(() => ({ data: [] }))
      ]);

      setSummary(summaryRes.data);
      setComptes(comptesRes.data);
      setTransactions(transactionsRes.data);
      setMembers(membersRes.data);
      setDettes(dettesRes.data || []);
      
      // Initialiser la caisse par défaut avec le premier compte
      if (comptesRes.data.length > 0 && !newMouvement.endroit) {
        setNewMouvement(prev => ({ ...prev, endroit: comptesRes.data[0].nom }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMouvement = async () => {
    try {
      if (!newMouvement.montant) {
        toast.error('Veuillez renseigner un montant');
        return;
      }

      if (!newMouvement.endroit) {
        toast.error('Veuillez sélectionner une caisse');
        return;
      }

      // Si "autres" est sélectionné et pas de détail, demander
      if (newMouvement.objet === 'autres' && !newMouvement.detail) {
        toast.error('Pour "autres", veuillez renseigner le détail');
        return;
      }

      // Pour une cotisation, le membre est obligatoire
      if (newMouvement.objet === 'cotisation' && !newMouvement.membre_id) {
        toast.error('Pour une cotisation, veuillez sélectionner un membre');
        return;
      }

      await axios.post(`${API}/transactions`, {
        ...newMouvement,
        montant: parseFloat(newMouvement.montant)
      });

      toast.success('Mouvement enregistré avec succès');
      
      // Reset du formulaire
      setNewMouvement({
        date: new Date().toISOString().split('T')[0],
        type: 'recette',
        membre_id: '',
        objet: 'cotisation',
        montant: '',
        endroit: comptes.length > 0 ? comptes[0].nom : '',
        detail: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du mouvement:', error);
      toast.error('Erreur lors de l\'ajout du mouvement');
    }
  };

  // Fonction de virement entre comptes
  const handleVirement = async () => {
    try {
      if (!virementForm.compte_source || !virementForm.compte_destination) {
        toast.error('Veuillez sélectionner les comptes source et destination');
        return;
      }
      if (virementForm.compte_source === virementForm.compte_destination) {
        toast.error('Les comptes source et destination doivent être différents');
        return;
      }
      if (!virementForm.montant || parseFloat(virementForm.montant) <= 0) {
        toast.error('Veuillez renseigner un montant valide');
        return;
      }

      await axios.post(`${API}/virements`, {
        compte_source: virementForm.compte_source,
        compte_destination: virementForm.compte_destination,
        montant: parseFloat(virementForm.montant),
        description: virementForm.description || 'Virement interne'
      });

      toast.success('Virement effectué avec succès');
      setShowVirementModal(false);
      setVirementForm({
        compte_source: '',
        compte_destination: '',
        montant: '',
        description: ''
      });
      loadData();
    } catch (error) {
      console.error('Erreur lors du virement:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du virement');
    }
  };

  // Fonction pour ajouter une dette "Dehors"
  const handleAddDette = async () => {
    try {
      if (!detteForm.membre_id) {
        toast.error('Veuillez sélectionner un membre');
        return;
      }
      if (!detteForm.montant || parseFloat(detteForm.montant) <= 0) {
        toast.error('Veuillez renseigner un montant valide');
        return;
      }
      if (!detteForm.cause.trim()) {
        toast.error('Veuillez renseigner la cause de la dette');
        return;
      }

      await axios.post(`${API}/dettes`, {
        membre_id: detteForm.membre_id,
        montant: parseFloat(detteForm.montant),
        cause: detteForm.cause.trim()
      });

      toast.success('Dette enregistrée avec succès');
      setShowDetteModal(false);
      setDetteForm({ membre_id: '', montant: '', cause: '' });
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la dette:', error);
      toast.error('Erreur lors de l\'ajout de la dette');
    }
  };

  // Fonction pour ouvrir la modal de règlement de dette
  const openReglementModal = (dette) => {
    setDetteARegler(dette);
    setCompteDestinationReglement('');
    setShowReglementModal(true);
  };

  // Fonction pour régler une dette via la modal
  const handleReglerDette = async () => {
    if (!detteARegler || !compteDestinationReglement) {
      toast.error('Veuillez sélectionner un compte de destination');
      return;
    }

    try {
      // 1. Créer le virement Dehors → Compte destination
      await axios.post(`${API}/virements`, {
        compte_source: 'Dehors',
        compte_destination: compteDestinationReglement,
        montant: detteARegler.montant,
        description: `Paiement dette: ${detteARegler.cause} (${members.find(m => m.id === detteARegler.membre_id)?.nom_complet || 'Membre'})`
      });

      // 2. Supprimer la dette
      await axios.delete(`${API}/dettes/${detteARegler.id}`);
      
      toast.success(`Dette réglée ! Virement de ${formatMontant(detteARegler.montant)} vers ${compteDestinationReglement}`);
      setShowReglementModal(false);
      setDetteARegler(null);
      setCompteDestinationReglement('');
      loadData();
    } catch (error) {
      console.error('Erreur lors du règlement de la dette:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du règlement');
    }
  };

  // Fonction pour ouvrir les détails d'une caisse
  const openCaisseDetails = (caisseName) => {
    setSelectedCaisse(caisseName);
    setShowDetailsModal(true);
  };

  // Obtenir les transactions d'une caisse spécifique
  const getTransactionsForCaisse = (caisseName) => {
    return transactions.filter(t => t.endroit === caisseName);
  };

  // Calculer le total des dettes (pour "Dehors")
  const totalDettes = dettes.reduce((sum, d) => sum + d.montant, 0);

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
      return;
    }

    try {
      await axios.delete(`${API}/transactions/${transactionId}`);
      toast.success('Mouvement supprimé');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant);
  };

  const getMemberName = (membreId) => {
    const membre = members.find(m => m.id === membreId);
    return membre ? membre.nom_complet : '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#D4A024] text-xl font-serif">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Comptabilité
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Gestion financière du club
        </p>
      </div>

      {/* Vue d'ensemble financière */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Solde total (comptes + dettes) */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-serif text-gray-400 flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Solde Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#D4A024]">
              {formatMontant(summary.solde_total + totalDettes)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Comptes + Dehors ({formatMontant(totalDettes)})</p>
          </CardContent>
        </Card>

        {/* Total recettes */}
        <Card className="bg-black/40 border-2 border-green-600/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-serif text-gray-400 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
              Total Recettes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-green-400">
              {formatMontant(summary.total_recettes)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Toutes périodes</p>
          </CardContent>
        </Card>

        {/* Total dépenses */}
        <Card className="bg-black/40 border-2 border-red-600/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-serif text-gray-400 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-red-400" />
              Total Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-red-400">
              {formatMontant(summary.total_depenses)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Toutes périodes</p>
          </CardContent>
        </Card>
      </div>

      {/* Comptes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif font-bold text-white flex items-center">
            <Wallet className="w-6 h-6 mr-2 text-[#D4A024]" />
            Comptes & Caisses
          </h2>
          <Button
            onClick={() => setShowVirementModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-serif"
            data-testid="virement-btn"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Faire un virement
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Comptes normaux */}
          {comptes.map((compte) => {
            const transCount = getTransactionsForCaisse(compte.nom).length;
            return (
              <Card key={compte.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-serif text-white flex items-center justify-between">
                    <span>{compte.nom}</span>
                    <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024]">
                      {compte.type}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-serif font-bold text-[#D4A024]">
                    {formatMontant(compte.solde)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCaisseDetails(compte.nom)}
                    className="mt-3 w-full border-[#D4A024]/30 text-[#D4A024] hover:bg-[#D4A024]/10"
                  >
                    Détails ({transCount} mouvement{transCount > 1 ? 's' : ''})
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Carte spéciale "Dehors" avec les dettes */}
          <Card className="bg-black/40 border-2 border-red-600/30 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif text-white flex items-center justify-between">
                <span className="flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-red-400" />
                  Dehors (Dettes)
                </span>
                <Badge className="bg-red-900 text-red-300 border border-red-600">
                  {dettes.length} dette{dettes.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-bold text-red-400">
                {formatMontant(totalDettes)}
              </div>
              <div className="flex space-x-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCaisseDetails('Dehors')}
                  className="flex-1 border-red-600/30 text-red-400 hover:bg-red-900/20"
                >
                  Détails
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowDetteModal(true)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  data-testid="add-dette-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cotisations en attente */}
      {summary.cotisations_en_attente > 0 && (
        <Card className="bg-black/40 border-2 border-orange-600/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white flex items-center justify-between">
              <span>Cotisations à recevoir</span>
              <Badge className="bg-orange-600 text-white text-lg px-3 py-1">
                {summary.cotisations_en_attente} saisons
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              {summary.cotisations_en_attente} saison(s) de cotisation en attente de paiement (200€/an)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tableau des mouvements */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-[#D4A024]" />
            Mouvements
          </span>
          <span className="text-sm text-gray-400 font-normal">
            {transactions.length} mouvement(s)
          </span>
        </h2>

        {/* Formulaire d'ajout - Compatible iOS avec Shadcn Select */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-serif text-[#D4A024]">
              <Plus className="w-5 h-5 inline mr-2" />
              Nouveau mouvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Date */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={newMouvement.date}
                  onChange={(e) => setNewMouvement({ ...newMouvement, date: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 text-white border border-[#D4A024]/30 rounded text-sm"
                />
              </div>
              
              {/* Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <Select
                  value={newMouvement.type}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, type: value })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                    <SelectItem value="recette" className="text-green-400">Recette</SelectItem>
                    <SelectItem value="dépense" className="text-red-400">Dépense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Membre */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Membre</label>
                <Select
                  value={newMouvement.membre_id || "none"}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, membre_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                    <SelectItem value="none" className="text-gray-400">-- Aucun --</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-white">{m.nom_complet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Objet */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Objet</label>
                <Select
                  value={newMouvement.objet}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, objet: value, detail: value === 'autres' ? '' : newMouvement.detail })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white">
                    <SelectValue placeholder="Objet" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                    {objetOptions.map(obj => (
                      <SelectItem key={obj} value={obj} className="text-white">
                        {obj.charAt(0).toUpperCase() + obj.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMouvement.montant}
                  onChange={(e) => setNewMouvement({ ...newMouvement, montant: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-black/60 text-white border border-[#D4A024]/30 rounded text-sm text-right"
                />
              </div>

              {/* Caisse */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Caisse</label>
                <Select
                  value={newMouvement.endroit || "none"}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, endroit: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                    <SelectItem value="none" className="text-gray-400">-- Sélectionner --</SelectItem>
                    {caisseOptions.map(caisse => (
                      <SelectItem key={caisse} value={caisse} className="text-white">{caisse}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Détail */}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">
                  Détail {newMouvement.objet === 'autres' && <span className="text-orange-400">(obligatoire)</span>}
                </label>
                <input
                  type="text"
                  value={newMouvement.detail}
                  onChange={(e) => setNewMouvement({ ...newMouvement, detail: e.target.value })}
                  placeholder={newMouvement.objet === 'autres' ? 'Précisez...' : 'Optionnel'}
                  className={`w-full px-3 py-2 bg-black/60 text-white border rounded text-sm ${
                    newMouvement.objet === 'autres' ? 'border-orange-500' : 'border-[#D4A024]/30'
                  }`}
                />
              </div>
            </div>

            {/* Bouton Ajouter */}
            <Button
              onClick={handleAddMouvement}
              className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter le mouvement
            </Button>
          </CardContent>
        </Card>

        {/* Liste des mouvements */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-[#D4A024]/30 bg-black/30">
                  <tr className="text-left">
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Date</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Type</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Membre</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Objet</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024] text-right">Montant</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Caisse</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Détail</th>
                    <th className="p-3 text-sm font-serif text-[#D4A024]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-gray-400">
                        Aucun mouvement enregistré
                      </td>
                    </tr>
                  ) : (
                    transactions.map((trans) => (
                      <tr key={trans.id} className="border-b border-[#D4A024]/10 hover:bg-[#D4A024]/5">
                        <td className="p-3 text-sm text-gray-300">
                          {formatDate(trans.date)}
                        </td>
                        <td className="p-3">
                          <Badge className={
                            trans.type === 'recette'
                              ? 'bg-green-900/30 text-green-400 border border-green-600/30'
                              : 'bg-red-900/30 text-red-400 border border-red-600/30'
                          }>
                            {trans.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-white">
                          {getMemberName(trans.membre_id)}
                        </td>
                        <td className="p-3 text-sm text-white">
                          {trans.objet}
                        </td>
                        <td className={`p-3 text-sm font-semibold text-right ${
                          trans.type === 'recette' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trans.type === 'recette' ? '+' : '-'}{formatMontant(trans.montant)}
                        </td>
                        <td className="p-3 text-sm text-gray-300">
                          {trans.endroit}
                        </td>
                        <td className="p-3 text-sm text-gray-300">
                          {trans.detail || '-'}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(trans.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de virement */}
      {showVirementModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="bg-[#1a1a1a] border-2 border-blue-600/50 w-full max-w-md mx-4">
            <CardHeader className="border-b border-blue-600/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white flex items-center">
                  <ArrowRightLeft className="w-5 h-5 mr-2 text-blue-400" />
                  Virement entre comptes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVirementModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Compte source */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">De (compte source)</label>
                <select
                  value={virementForm.compte_source}
                  onChange={(e) => setVirementForm({ ...virementForm, compte_source: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-blue-600/30 rounded text-white"
                >
                  <option value="">Sélectionner un compte...</option>
                  {comptes.map(c => (
                    <option key={c.id} value={c.nom}>{c.nom} ({formatMontant(c.solde)})</option>
                  ))}
                </select>
              </div>

              {/* Flèche */}
              <div className="flex justify-center">
                <ArrowRightLeft className="w-6 h-6 text-blue-400 rotate-90" />
              </div>

              {/* Compte destination */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Vers (compte destination)</label>
                <select
                  value={virementForm.compte_destination}
                  onChange={(e) => setVirementForm({ ...virementForm, compte_destination: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-blue-600/30 rounded text-white"
                >
                  <option value="">Sélectionner un compte...</option>
                  {comptes.filter(c => c.nom !== virementForm.compte_source).map(c => (
                    <option key={c.id} value={c.nom}>{c.nom} ({formatMontant(c.solde)})</option>
                  ))}
                </select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Montant</label>
                <input
                  type="number"
                  step="0.01"
                  value={virementForm.montant}
                  onChange={(e) => setVirementForm({ ...virementForm, montant: e.target.value })}
                  placeholder="0.00 €"
                  className="w-full px-3 py-2 bg-black/40 border border-blue-600/30 rounded text-white text-right text-lg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description (optionnel)</label>
                <input
                  type="text"
                  value={virementForm.description}
                  onChange={(e) => setVirementForm({ ...virementForm, description: e.target.value })}
                  placeholder="Motif du virement..."
                  className="w-full px-3 py-2 bg-black/40 border border-blue-600/30 rounded text-white"
                />
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setShowVirementModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleVirement}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-serif"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Effectuer le virement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal d'ajout de dette */}
      {showDetteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="bg-[#1a1a1a] border-2 border-red-600/50 w-full max-w-md mx-4">
            <CardHeader className="border-b border-red-600/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                  Ajouter une dette
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Aperçu du format */}
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-sm">
                <p className="text-gray-300">
                  <span className="text-red-400 font-bold">MEMBRE</span>{' '}
                  <span className="text-[#D4A024]">{detteForm.membre_id ? members.find(m => m.id === detteForm.membre_id)?.nom_complet || '...' : '...'}</span>{' '}
                  <span className="text-red-400 font-bold">DOIT</span>{' '}
                  <span className="text-white">{detteForm.montant || '0'}€</span>{' '}
                  <span className="text-red-400 font-bold">CAUSE</span>{' '}
                  <span className="text-gray-300">{detteForm.cause || '...'}</span>
                </p>
              </div>

              {/* Sélection du membre avec Shadcn Select */}
              <div>
                <label className="block text-sm text-red-400 mb-2 font-bold">MEMBRE</label>
                <Select
                  value={detteForm.membre_id || "none"}
                  onValueChange={(value) => setDetteForm({ ...detteForm, membre_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-red-600/30 text-white">
                    <SelectValue placeholder="Sélectionner un membre..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-red-600/30 max-h-[300px]">
                    <SelectItem value="none" className="text-gray-400">-- Sélectionner --</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-white">{m.nom_complet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm text-red-400 mb-2 font-bold">DOIT (montant en €)</label>
                <input
                  type="number"
                  step="0.01"
                  value={detteForm.montant}
                  onChange={(e) => setDetteForm({ ...detteForm, montant: e.target.value })}
                  placeholder="50"
                  className="w-full px-3 py-2 bg-black/40 border border-red-600/30 rounded text-white text-right text-lg"
                />
              </div>

              {/* Cause */}
              <div>
                <label className="block text-sm text-red-400 mb-2 font-bold">CAUSE</label>
                <input
                  type="text"
                  value={detteForm.cause}
                  onChange={(e) => setDetteForm({ ...detteForm, cause: e.target.value })}
                  placeholder="tombola, repas, etc..."
                  className="w-full px-3 py-2 bg-black/40 border border-red-600/30 rounded text-white"
                />
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setShowDetteModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddDette}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-serif"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Enregistrer la dette
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de détails d'une caisse */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className={`bg-[#1a1a1a] w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col ${
            selectedCaisse === 'Dehors' ? 'border-2 border-red-600/50' : 'border-2 border-[#D4A024]/50'
          }`}>
            <CardHeader className={`border-b ${selectedCaisse === 'Dehors' ? 'border-red-600/30' : 'border-[#D4A024]/30'}`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white flex items-center">
                  {selectedCaisse === 'Dehors' ? (
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                  ) : (
                    <Wallet className="w-5 h-5 mr-2 text-[#D4A024]" />
                  )}
                  Détails : {selectedCaisse}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1">
              {selectedCaisse === 'Dehors' ? (
                /* Afficher les dettes */
                <div className="space-y-3">
                  {dettes.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Aucune dette enregistrée</p>
                  ) : (
                    <>
                      {dettes.map((dette) => {
                        const membre = members.find(m => m.id === dette.membre_id);
                        return (
                          <div 
                            key={dette.id} 
                            className="bg-red-900/20 border border-red-600/30 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white">
                                  <span className="text-red-400 font-bold">MEMBRE</span>{' '}
                                  <span className="text-[#D4A024]">{membre?.nom_complet || 'Inconnu'}</span>
                                </p>
                                <p className="text-white">
                                  <span className="text-red-400 font-bold">DOIT</span>{' '}
                                  <span className="text-lg font-bold">{formatMontant(dette.montant)}</span>
                                </p>
                                <p className="text-gray-400 text-sm">
                                  <span className="text-red-400 font-bold">CAUSE</span>{' '}
                                  {dette.cause}
                                </p>
                              </div>
                              <Button
                                onClick={() => openReglementModal(dette)}
                                variant="outline"
                                size="sm"
                                className="border-green-600 text-green-400 hover:bg-green-900/20"
                                data-testid={`reglement-dette-${dette.id}`}
                              >
                                ✓ Réglé
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="border-t border-red-600/30 pt-3 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-semibold">Total Dehors :</span>
                          <span className="text-2xl font-bold text-red-400">
                            {formatMontant(totalDettes)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Afficher les transactions de la caisse */
                <div className="space-y-2">
                  {getTransactionsForCaisse(selectedCaisse).length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Aucun mouvement pour cette caisse</p>
                  ) : (
                    <>
                      {getTransactionsForCaisse(selectedCaisse).map((trans) => {
                        const membre = members.find(m => m.id === trans.membre_id);
                        return (
                          <div 
                            key={trans.id} 
                            className={`border rounded-lg p-3 ${
                              trans.type === 'recette' 
                                ? 'bg-green-900/20 border-green-600/30' 
                                : 'bg-red-900/20 border-red-600/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-400 text-sm">{formatDate(trans.date)}</span>
                                  <Badge className={trans.type === 'recette' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}>
                                    {trans.type}
                                  </Badge>
                                </div>
                                <p className="text-white mt-1">
                                  {membre?.nom_complet && <span className="text-[#D4A024]">{membre.nom_complet} - </span>}
                                  <span className="capitalize">{trans.objet}</span>
                                  {trans.detail && <span className="text-gray-400"> ({trans.detail})</span>}
                                </p>
                              </div>
                              <div className={`text-xl font-bold ${trans.type === 'recette' ? 'text-green-400' : 'text-red-400'}`}>
                                {trans.type === 'recette' ? '+' : '-'}{formatMontant(trans.montant)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de règlement de dette */}
      {showReglementModal && detteARegler && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <Card className="bg-[#1a1a1a] border-2 border-green-600/50 w-full max-w-md mx-4">
            <CardHeader className="border-b border-green-600/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif text-white flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                  Régler une dette
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReglementModal(false);
                    setDetteARegler(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Récapitulatif de la dette */}
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Dette à régler :</p>
                <p className="text-white">
                  <span className="text-[#D4A024] font-semibold">
                    {members.find(m => m.id === detteARegler.membre_id)?.nom_complet || 'Inconnu'}
                  </span>
                </p>
                <p className="text-2xl font-bold text-red-400 mt-2">
                  {formatMontant(detteARegler.montant)}
                </p>
                <p className="text-gray-400 text-sm mt-1">Cause : {detteARegler.cause}</p>
              </div>

              {/* Sélection du compte destination */}
              <div>
                <label className="block text-sm text-green-400 mb-2 font-bold">
                  Vers quel compte ?
                </label>
                <Select
                  value={compteDestinationReglement || "none"}
                  onValueChange={(value) => setCompteDestinationReglement(value === "none" ? "" : value)}
                >
                  <SelectTrigger className="w-full bg-black/60 border-green-600/30 text-white">
                    <SelectValue placeholder="Sélectionner un compte..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-green-600/30">
                    <SelectItem value="none" className="text-gray-400">-- Sélectionner --</SelectItem>
                    {comptes.filter(c => c.nom !== 'Dehors').map(c => (
                      <SelectItem key={c.id} value={c.nom} className="text-white">
                        {c.nom} ({formatMontant(c.solde)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Explication */}
              <div className="bg-green-900/10 border border-green-600/20 rounded-lg p-3 text-sm text-gray-300">
                <p className="flex items-center">
                  <ArrowRightLeft className="w-4 h-4 mr-2 text-green-400" />
                  Un virement de <span className="text-green-400 font-bold mx-1">{formatMontant(detteARegler.montant)}</span> 
                  sera effectué depuis "Dehors" vers le compte sélectionné.
                </p>
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => {
                    setShowReglementModal(false);
                    setDetteARegler(null);
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleReglerDette}
                  disabled={!compteDestinationReglement}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-serif disabled:opacity-50"
                  data-testid="confirm-reglement-btn"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Confirmer le règlement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Comptabilite;
