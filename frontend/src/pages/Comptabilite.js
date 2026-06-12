import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [factures, setFactures] = useState([]);
  const [showCotisationsList, setShowCotisationsList] = useState(false);
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
  const [detteMode, setDetteMode] = useState('single');  // 'single' | 'multi' | 'invite'
  const [detteForm, setDetteForm] = useState({
    membre_id: '',
    montant: '',
    cause: '',
    nom_invite: '',
  });
  const [detteMultiSelectedIds, setDetteMultiSelectedIds] = useState([]);  // ids pour mode multi
  const [detteMultiSearch, setDetteMultiSearch] = useState('');  // filtre liste multi

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

  // Filtres pour l'historique des mouvements
  const [filterCaisse, setFilterCaisse] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [filterPeriode, setFilterPeriode] = useState('tous');
  const [filterMembre, setFilterMembre] = useState('tous');
  const [filterObjet, setFilterObjet] = useState('tous');

  // Transactions filtrées
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    if (filterCaisse !== 'tous') {
      filtered = filtered.filter(t => t.endroit === filterCaisse);
    }
    if (filterType !== 'tous') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterMembre !== 'tous') {
      filtered = filtered.filter(t => t.membre_id === filterMembre);
    }
    if (filterObjet !== 'tous') {
      filtered = filtered.filter(t => t.objet?.toLowerCase() === filterObjet.toLowerCase());
    }
    if (filterPeriode !== 'tous') {
      const now = new Date();
      let startDate;
      if (filterPeriode === '7j') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filterPeriode === '30j') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filterPeriode === '90j') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (filterPeriode === '1an') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }
      if (startDate) {
        filtered = filtered.filter(t => new Date(t.date) >= startDate);
      }
    }
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  const hasActiveFilters = filterCaisse !== 'tous' || filterType !== 'tous' || filterPeriode !== 'tous' || filterMembre !== 'tous' || filterObjet !== 'tous';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, comptesRes, transactionsRes, membersRes, dettesRes, facturesRes] = await Promise.all([
        axios.get(`${API}/transactions/summary`),
        axios.get(`${API}/comptes`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/members`),
        axios.get(`${API}/dettes`).catch(() => ({ data: [] })),
        axios.get(`${API}/factures-a-payer`).catch(() => ({ data: [] })),
      ]);

      setSummary(summaryRes.data);
      setComptes(comptesRes.data);
      setTransactions(transactionsRes.data);
      setMembers(membersRes.data);
      setDettes(dettesRes.data || []);
      setFactures(facturesRes.data || []);
      
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

  // Fonction pour ajouter une dette (3 modes : single / multi / invité)
  const handleAddDette = async () => {
    try {
      if (!detteForm.montant || parseFloat(detteForm.montant) <= 0) {
        toast.error('Veuillez renseigner un montant valide');
        return;
      }
      if (!detteForm.cause.trim()) {
        toast.error('Veuillez renseigner la cause de la dette');
        return;
      }

      if (detteMode === 'multi') {
        if (detteMultiSelectedIds.length === 0) {
          toast.error('Sélectionnez au moins un membre');
          return;
        }
        const res = await axios.post(`${API}/dettes/multi`, {
          membre_ids: detteMultiSelectedIds,
          montant: parseFloat(detteForm.montant),
          cause: detteForm.cause.trim(),
        });
        toast.success(res.data?.message || 'Dettes enregistrées');
      } else if (detteMode === 'invite') {
        if (!detteForm.nom_invite.trim()) {
          toast.error("Renseignez le nom de l'invité");
          return;
        }
        await axios.post(`${API}/dettes`, {
          membre_id: null,
          nom_invite: detteForm.nom_invite.trim(),
          montant: parseFloat(detteForm.montant),
          cause: detteForm.cause.trim(),
        });
        toast.success('Dette invité enregistrée');
      } else {
        // single
        if (!detteForm.membre_id) {
          toast.error('Veuillez sélectionner un membre');
          return;
        }
        await axios.post(`${API}/dettes`, {
          membre_id: detteForm.membre_id,
          montant: parseFloat(detteForm.montant),
          cause: detteForm.cause.trim(),
        });
        toast.success('Dette enregistrée avec succès');
      }

      setShowDetteModal(false);
      setDetteForm({ membre_id: '', montant: '', cause: '', nom_invite: '' });
      setDetteMultiSelectedIds([]);
      setDetteMultiSearch('');
      setDetteMode('single');
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la dette:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout de la dette');
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

  // Modal de correction de caisse (admin)
  const [editingCaisseTrans, setEditingCaisseTrans] = useState(null);  // transaction en cours d'édition
  const [newCaisse, setNewCaisse] = useState('');
  const [savingCaisse, setSavingCaisse] = useState(false);

  const openEditCaisse = (trans) => {
    setEditingCaisseTrans(trans);
    setNewCaisse('');
  };

  const submitEditCaisse = async () => {
    if (!editingCaisseTrans || !newCaisse) return;
    setSavingCaisse(true);
    try {
      const res = await axios.patch(`${API}/transactions/${editingCaisseTrans.id}/caisse`, {
        caisse: newCaisse,
      });
      toast.success(res.data?.message || 'Caisse corrigée');
      setEditingCaisseTrans(null);
      setNewCaisse('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la correction');
    } finally {
      setSavingCaisse(false);
    }
  };

  // ====== COTISATIONS - LISTE ET ACTIONS ======
  const handleAnnulerCotisation = async (membreId, nbSaisons = 1) => {
    if (!window.confirm(`Annuler ${nbSaisons} saison(s) de cotisation pour ce membre ?\n\nÀ utiliser uniquement pour corriger une erreur de saisie (ne laisse aucune trace).`)) {
      return;
    }
    try {
      await axios.post(`${API}/membres/${membreId}/annuler-cotisation`, { nb: nbSaisons });
      toast.success('Cotisation annulée');
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleOffrirCotisation = async (membreId, nbSaisons = 1) => {
    if (!window.confirm(`Offrir ${nbSaisons} saison(s) de cotisation à ce membre ?\n\nLe club exonère officiellement le membre. La trace "cotisation offerte" sera conservée.`)) {
      return;
    }
    try {
      await axios.post(`${API}/membres/${membreId}/offrir-cotisation`, { nb: nbSaisons });
      toast.success('Cotisation offerte');
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'offre");
    }
  };

  const handleDeclarerPaiementCotisation = async (membreId, nbSaisons = 1, caisse = 'Chez Fabien', mode = 'Espèces') => {
    // Crée directement une transaction recette validée et décrémente situation_cotisation
    const montant = nbSaisons * 200;
    if (!window.confirm(`Déclarer un paiement de ${montant} € (${nbSaisons} saison(s)) sur la caisse "${caisse}" en ${mode} ?`)) {
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      // 1. Créer le paiement en attente
      const presFab = members.find(m => m.role === 'admin' || m.login_key === 'labague1');
      const declarantId = presFab?.id || membreId;
      const res = await axios.post(`${API}/paiements-en-attente`, {
        membre_id: membreId,
        declarant_id: declarantId,
        date_paiement: today,
        type: 'recette',
        objet: 'cotisation',
        montant,
        endroit: caisse,
        mode_paiement: mode,
        detail: `Saisi par le trésorier - ${nbSaisons} saison(s)`,
      });
      const paiementId = res.data?.paiement?.id;
      // 2. Valider immédiatement le paiement
      if (paiementId && declarantId) {
        await axios.post(`${API}/paiements-en-attente/${paiementId}/valider`, null, {
          params: { validateur_id: declarantId },
        });
      }
      toast.success(`Paiement de ${montant} € enregistré`);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Erreur lors du paiement');
    }
  };

  // ====== FACTURES À PAYER ======
  const [showAddFactureModal, setShowAddFactureModal] = useState(false);
  const [newFacture, setNewFacture] = useState({
    libelle: '',
    fournisseur: '',
    detail: '',
    lignes: [{ libelle: '', montant: '' }],
  });
  const [editingFacture, setEditingFacture] = useState(null);  // facture en cours d'édition (avec ses lignes)
  const [payingFacture, setPayingFacture] = useState(null);
  const [paySelectedLignes, setPaySelectedLignes] = useState([]);  // ids de lignes sélectionnées
  const [payRepartition, setPayRepartition] = useState([{ caisse: '', montant: '' }]);
  const [payMode, setPayMode] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const factureMontant = (f) => {
    if (f.lignes && f.lignes.length) {
      return f.lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
    }
    return parseFloat(f.montant) || 0;
  };
  const factureRestant = (f) => {
    if (f.lignes && f.lignes.length) {
      return f.lignes
        .filter(l => l.statut !== 'payee')
        .reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
    }
    return f.statut === 'payee' ? 0 : (parseFloat(f.montant) || 0);
  };

  const newFactureTotal = newFacture.lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);

  const updateNewLigne = (idx, field, val) => {
    const next = [...newFacture.lignes];
    next[idx] = { ...next[idx], [field]: val };
    setNewFacture({ ...newFacture, lignes: next });
  };
  const addNewLigne = () => setNewFacture({ ...newFacture, lignes: [...newFacture.lignes, { libelle: '', montant: '' }] });
  const removeNewLigne = (idx) => setNewFacture({ ...newFacture, lignes: newFacture.lignes.filter((_, i) => i !== idx) });

  const handleCreateFacture = async () => {
    if (!newFacture.libelle) {
      toast.error('Libellé requis');
      return;
    }
    const lignesClean = newFacture.lignes.filter(l => l.libelle && Number(l.montant) > 0);
    if (lignesClean.length === 0) {
      toast.error('Ajoutez au moins une ligne avec un montant');
      return;
    }
    try {
      await axios.post(`${API}/factures-a-payer`, {
        libelle: newFacture.libelle,
        montant: lignesClean.reduce((s, l) => s + parseFloat(l.montant), 0),
        fournisseur: newFacture.fournisseur || null,
        detail: newFacture.detail || null,
        lignes: lignesClean.map(l => ({ libelle: l.libelle, montant: parseFloat(l.montant) })),
      });
      toast.success('Facture ajoutée');
      setShowAddFactureModal(false);
      setNewFacture({ libelle: '', fournisseur: '', detail: '', lignes: [{ libelle: '', montant: '' }] });
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la création');
    }
  };

  // Édition
  const openEditFacture = (facture) => {
    setEditingFacture({
      ...facture,
      lignes: facture.lignes && facture.lignes.length
        ? facture.lignes.map(l => ({ ...l }))
        : [{ libelle: facture.libelle, montant: facture.montant }],
    });
  };
  const updateEditLigne = (idx, field, val) => {
    const next = [...editingFacture.lignes];
    next[idx] = { ...next[idx], [field]: val };
    setEditingFacture({ ...editingFacture, lignes: next });
  };
  const addEditLigne = () => setEditingFacture({ ...editingFacture, lignes: [...editingFacture.lignes, { libelle: '', montant: '' }] });
  const removeEditLigne = (idx) => {
    const ligne = editingFacture.lignes[idx];
    if (ligne && ligne.statut === 'payee') {
      toast.error('Impossible de supprimer une ligne déjà payée');
      return;
    }
    setEditingFacture({ ...editingFacture, lignes: editingFacture.lignes.filter((_, i) => i !== idx) });
  };
  const editTotal = (editingFacture?.lignes || []).reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const saveEditFacture = async () => {
    if (!editingFacture) return;
    const lignesClean = editingFacture.lignes.filter(l => l.libelle && Number(l.montant) > 0);
    if (lignesClean.length === 0) {
      toast.error('Conservez au moins une ligne valide');
      return;
    }
    try {
      await axios.put(`${API}/factures-a-payer/${editingFacture.id}`, {
        libelle: editingFacture.libelle,
        fournisseur: editingFacture.fournisseur || null,
        detail: editingFacture.detail || null,
        lignes: lignesClean,
      });
      toast.success('Facture mise à jour');
      setEditingFacture(null);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteFacture = async (id) => {
    if (!window.confirm('Supprimer cette facture à payer ?')) return;
    try {
      await axios.delete(`${API}/factures-a-payer/${id}`);
      toast.success('Facture supprimée');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openPayFacture = (facture) => {
    setPayingFacture(facture);
    // Par défaut, toutes les lignes non payées sont sélectionnées
    const unpaidLignes = (facture.lignes || []).filter(l => l.statut !== 'payee');
    setPaySelectedLignes(unpaidLignes.map(l => l.id));
    const total = unpaidLignes.length
      ? unpaidLignes.reduce((s, l) => s + l.montant, 0)
      : facture.montant;
    setPayRepartition([{ caisse: '', montant: total.toFixed(2) }]);
    setPayMode('');
    setPayDate(new Date().toISOString().split('T')[0]);
  };

  const togglePayLigne = (id) => {
    setPaySelectedLignes(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Recalculer le total réparti automatiquement
      const lignes = payingFacture?.lignes || [];
      const selectedSum = lignes
        .filter(l => next.includes(l.id))
        .reduce((s, l) => s + l.montant, 0);
      setPayRepartition([{ caisse: payRepartition[0]?.caisse || '', montant: selectedSum.toFixed(2) }]);
      return next;
    });
  };

  const closePayModal = () => {
    setPayingFacture(null);
    setPaySelectedLignes([]);
    setPayRepartition([{ caisse: '', montant: '' }]);
    setPayMode('');
  };

  const addPayLine = () => {
    if (payRepartition.length >= 5) return;
    setPayRepartition([...payRepartition, { caisse: '', montant: '' }]);
  };

  const removePayLine = (idx) => {
    setPayRepartition(payRepartition.filter((_, i) => i !== idx));
  };

  const updatePayLine = (idx, field, val) => {
    const next = [...payRepartition];
    next[idx] = { ...next[idx], [field]: val };
    setPayRepartition(next);
  };

  const totalRepartition = payRepartition.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0);

  // Montant à payer selon sélection (toutes les lignes non payées par défaut ou cas sans lignes)
  const payExpected = (() => {
    if (!payingFacture) return 0;
    if (payingFacture.lignes && payingFacture.lignes.length) {
      return payingFacture.lignes
        .filter(l => paySelectedLignes.includes(l.id))
        .reduce((s, l) => s + l.montant, 0);
    }
    return payingFacture.montant || 0;
  })();

  const submitPayFacture = async () => {
    if (!payingFacture) return;
    for (const r of payRepartition) {
      if (!r.caisse || !Number(r.montant) || Number(r.montant) <= 0) {
        toast.error('Chaque ligne doit avoir une caisse et un montant > 0');
        return;
      }
    }
    if (Math.abs(totalRepartition - payExpected) > 0.01) {
      toast.error(`La somme (${totalRepartition.toFixed(2)} €) doit être égale au montant à payer (${payExpected.toFixed(2)} €)`);
      return;
    }
    setPayLoading(true);
    try {
      await axios.post(`${API}/factures-a-payer/${payingFacture.id}/payer`, {
        repartition: payRepartition.map(r => ({ caisse: r.caisse, montant: parseFloat(r.montant) })),
        date_paiement: payDate || null,
        mode_paiement: payMode || null,
        ligne_ids: payingFacture.lignes && payingFacture.lignes.length ? paySelectedLignes : undefined,
      });
      toast.success('Paiement enregistré');
      closePayModal();
      loadData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setPayLoading(false);
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
            <CardTitle className="text-base font-serif text-gray-400 flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Solde Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#D4A024]">
              {formatMontant(
                (summary.solde_total - (comptes.find(c => c.nom === 'Dehors')?.solde || 0)) + totalDettes
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Comptes + Dehors ({formatMontant(totalDettes)})</p>
          </CardContent>
        </Card>

        {/* Total recettes */}
        <Card className="bg-black/40 border-2 border-green-600/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif text-gray-400 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Total Recettes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-green-400">
              {formatMontant(summary.total_recettes)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Toutes périodes</p>
          </CardContent>
        </Card>

        {/* Total dépenses */}
        <Card className="bg-black/40 border-2 border-red-600/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif text-gray-400 flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
              Total Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-red-400">
              {formatMontant(summary.total_depenses)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Toutes périodes</p>
          </CardContent>
        </Card>
      </div>

      {/* À Payer (factures du club) */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-2xl font-serif font-bold text-white flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-orange-400" />
            À Payer
            {factures.filter(f => f.statut !== 'payee').length > 0 && (
              <Badge className="ml-3 bg-orange-500/20 text-orange-300 border border-orange-500/40">
                {factures.filter(f => f.statut !== 'payee').length} facture(s)
              </Badge>
            )}
          </h2>
          <Button
            onClick={() => setShowAddFactureModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-serif"
            data-testid="add-facture-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une facture
          </Button>
        </div>

        {factures.filter(f => f.statut !== 'payee').length === 0 ? (
          <Card className="bg-black/30 border border-[#D4A024]/20 backdrop-blur-sm">
            <CardContent className="py-8 text-center text-gray-400">
              Aucune facture en attente de paiement
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {factures.filter(f => f.statut !== 'payee').map((f) => {
              const total = factureMontant(f);
              const restant = factureRestant(f);
              const paye = total - restant;
              const hasLignes = f.lignes && f.lignes.length > 0;
              return (
                <Card
                  key={f.id}
                  className="bg-gradient-to-br from-orange-950/30 to-black/40 border border-orange-500/30 backdrop-blur-sm"
                  data-testid={`facture-card-${f.id}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white flex items-start justify-between gap-2">
                      <span className="flex-1">{f.libelle}</span>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-orange-300 font-bold">
                          {formatMontant(total)}
                        </span>
                        {paye > 0 && (
                          <div className="text-xs text-green-300 mt-0.5">
                            Réglé : {formatMontant(paye)}
                          </div>
                        )}
                      </div>
                    </CardTitle>
                    {f.fournisseur && (
                      <p className="text-xs text-gray-400">{f.fournisseur}</p>
                    )}
                    {f.statut === 'partielle' && (
                      <Badge className="bg-yellow-700/40 text-yellow-200 border border-yellow-500/40 w-fit">
                        Partiellement payée · Reste : {formatMontant(restant)}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {f.detail && (
                      <p className="text-xs text-gray-300 italic">{f.detail}</p>
                    )}
                    {/* Décompte des lignes */}
                    {hasLignes && (
                      <div className="bg-black/40 rounded border border-orange-500/20 divide-y divide-orange-500/10">
                        {f.lignes.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between px-2 py-1.5 text-xs"
                            data-testid={`facture-${f.id}-ligne-${l.id}`}
                          >
                            <span className={l.statut === 'payee' ? 'text-gray-500 line-through' : 'text-gray-200'}>
                              {l.statut === 'payee' && <span className="mr-1">✓</span>}
                              {l.libelle}
                            </span>
                            <span className={l.statut === 'payee' ? 'text-gray-500 line-through' : 'text-orange-300 font-semibold'}>
                              {formatMontant(l.montant)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => openPayFacture(f)}
                        className="flex-1 bg-green-700 hover:bg-green-600 text-white"
                        data-testid={`pay-facture-${f.id}`}
                      >
                        Payer {hasLignes && restant !== total ? `(reste ${formatMontant(restant)})` : ''}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditFacture(f)}
                        className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                        data-testid={`edit-facture-${f.id}`}
                        title="Éditer (libellé, lignes)"
                      >
                        ✎
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFacture(f.id)}
                        className="text-red-400 hover:bg-red-500/10"
                        data-testid={`del-facture-${f.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
          {/* Comptes normaux (exclure Dehors qui est géré par la carte Dettes) */}
          {comptes.filter(c => c.nom !== 'Dehors').map((compte) => {
            const transCount = getTransactionsForCaisse(compte.nom).length;
            return (
              <Card key={compte.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif text-white flex items-center justify-between">
                    <span>{compte.nom}</span>
                    <Badge className="bg-[#7A2020] text-[#D4A024] border border-[#D4A024] text-sm px-3 py-1">
                      {compte.type}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-serif font-bold text-[#D4A024]">
                    {formatMontant(compte.solde)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCaisseDetails(compte.nom)}
                    className="mt-3 w-full border-[#D4A024]/30 text-[#D4A024] hover:bg-[#D4A024]/10 text-base"
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
              <CardTitle className="text-lg font-serif text-white flex items-center justify-between">
                <span className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                  Dehors (Dettes)
                </span>
                <Badge className="bg-red-900 text-red-300 border border-red-600 text-sm px-3 py-1">
                  {dettes.length} dette{dettes.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-red-400">
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
          <CardContent className="space-y-3">
            <p className="text-gray-300">
              {summary.cotisations_en_attente} saison(s) de cotisation en attente de paiement (200€/an)
            </p>
            <Button
              onClick={() => setShowCotisationsList(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              data-testid="open-cotisations-list-btn"
            >
              <User className="w-4 h-4 mr-2" />
              Voir la liste des membres concernés
            </Button>
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
          <span className="text-base text-gray-400 font-normal">
            {hasActiveFilters ? `${filteredTransactions.length} / ${transactions.length}` : `${transactions.length}`} mouvement(s)
          </span>
        </h2>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={filterCaisse} onValueChange={setFilterCaisse}>
            <SelectTrigger className="w-[160px] bg-black/60 border-[#D4A024]/30 text-white h-10 text-sm" data-testid="filter-caisse">
              <SelectValue placeholder="Caisse" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
              <SelectItem value="tous" className="text-gray-400 text-sm py-2">Toutes caisses</SelectItem>
              {[...new Set(transactions.map(t => t.endroit))].filter(Boolean).map(c => (
                <SelectItem key={c} value={c} className="text-white text-sm py-2">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px] bg-black/60 border-[#D4A024]/30 text-white h-10 text-sm" data-testid="filter-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
              <SelectItem value="tous" className="text-gray-400 text-sm py-2">Tous types</SelectItem>
              <SelectItem value="recette" className="text-green-400 text-sm py-2">Recettes</SelectItem>
              <SelectItem value="dépense" className="text-red-400 text-sm py-2">Dépenses</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterMembre} onValueChange={setFilterMembre}>
            <SelectTrigger className="w-[170px] bg-black/60 border-[#D4A024]/30 text-white h-10 text-sm" data-testid="filter-membre">
              <SelectValue placeholder="Membre" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
              <SelectItem value="tous" className="text-gray-400 text-sm py-2">Tous membres</SelectItem>
              {(() => {
                // Liste unique des membre_id présents dans les transactions, triés par nom
                const ids = [...new Set(transactions.map(t => t.membre_id).filter(Boolean))];
                const entries = ids
                  .map(id => ({ id, nom: getMemberName(id) }))
                  .filter(e => e.nom && e.nom !== '-')
                  .sort((a, b) => a.nom.localeCompare(b.nom));
                return entries.map(e => (
                  <SelectItem key={e.id} value={e.id} className="text-white text-sm py-2">
                    {e.nom}
                  </SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>

          <Select value={filterObjet} onValueChange={setFilterObjet}>
            <SelectTrigger className="w-[160px] bg-black/60 border-[#D4A024]/30 text-white h-10 text-sm" data-testid="filter-objet">
              <SelectValue placeholder="Objet" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
              <SelectItem value="tous" className="text-gray-400 text-sm py-2">Tous objets</SelectItem>
              <SelectItem value="cotisation" className="text-white text-sm py-2">Cotisation</SelectItem>
              <SelectItem value="album" className="text-white text-sm py-2">Album</SelectItem>
              <SelectItem value="tombola" className="text-white text-sm py-2">Tombola</SelectItem>
              <SelectItem value="anniversaire" className="text-white text-sm py-2">Anniversaire</SelectItem>
              <SelectItem value="autres" className="text-white text-sm py-2">Autres</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPeriode} onValueChange={setFilterPeriode}>
            <SelectTrigger className="w-[150px] bg-black/60 border-[#D4A024]/30 text-white h-10 text-sm" data-testid="filter-periode">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
              <SelectItem value="tous" className="text-gray-400 text-sm py-2">Toute période</SelectItem>
              <SelectItem value="7j" className="text-white text-sm py-2">7 derniers jours</SelectItem>
              <SelectItem value="30j" className="text-white text-sm py-2">30 derniers jours</SelectItem>
              <SelectItem value="90j" className="text-white text-sm py-2">3 derniers mois</SelectItem>
              <SelectItem value="1an" className="text-white text-sm py-2">1 an</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterCaisse('tous'); setFilterType('tous'); setFilterPeriode('tous'); setFilterMembre('tous'); setFilterObjet('tous'); }}
              className="text-[#D4A024] hover:bg-[#D4A024]/10 h-10 text-sm"
              data-testid="clear-filters-btn"
            >
              <X className="w-4 h-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>

        {/* Formulaire d'ajout - Compatible iOS avec Shadcn Select */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-serif text-[#D4A024]">
              <Plus className="w-5 h-5 inline mr-2" />
              Nouveau mouvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Date */}
              <div>
                <label className="block text-base text-gray-400 mb-2">Date</label>
                <input
                  type="date"
                  value={newMouvement.date}
                  onChange={(e) => setNewMouvement({ ...newMouvement, date: e.target.value })}
                  className="w-full px-3 py-3 bg-black/60 text-white border border-[#D4A024]/30 rounded text-base"
                />
              </div>
              
              {/* Type */}
              <div>
                <label className="block text-base text-gray-400 mb-2">Type</label>
                <Select
                  value={newMouvement.type}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, type: value })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                    <SelectItem value="recette" className="text-green-400 text-base py-3">Recette</SelectItem>
                    <SelectItem value="dépense" className="text-red-400 text-base py-3">Dépense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Membre */}
              <div>
                <label className="block text-base text-gray-400 mb-2">Membre</label>
                <Select
                  value={newMouvement.membre_id || "none"}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, membre_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                    <SelectItem value="none" className="text-gray-400 text-base py-3">-- Aucun --</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-white text-base py-2">{m.nom_complet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Objet */}
              <div>
                <label className="block text-base text-gray-400 mb-2">Objet</label>
                <Select
                  value={newMouvement.objet}
                  onValueChange={(value) => setNewMouvement({ ...newMouvement, objet: value, detail: value === 'autres' ? '' : newMouvement.detail })}
                >
                  <SelectTrigger className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
                    <SelectValue placeholder="Objet" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                    {objetOptions.map(obj => (
                      <SelectItem key={obj} value={obj} className="text-white text-base py-3">
                        {obj.charAt(0).toUpperCase() + obj.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-base text-gray-400 mb-2">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMouvement.montant}
                  onChange={(e) => setNewMouvement({ ...newMouvement, montant: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-3 bg-black/60 text-white border border-[#D4A024]/30 rounded text-base text-right"
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

        {/* Liste des mouvements - Format optimisé */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-[#D4A024]/30 bg-black/30">
                  <tr className="text-left">
                    <th className="p-3 text-base font-serif text-[#D4A024]">Date</th>
                    <th className="p-3 text-base font-serif text-[#D4A024] text-right">Montant</th>
                    <th className="p-3 text-base font-serif text-[#D4A024]">Type</th>
                    <th className="p-3 text-base font-serif text-[#D4A024]">Raison / Membre</th>
                    <th className="p-3 text-base font-serif text-[#D4A024]">Détail</th>
                    <th className="p-3 text-base font-serif text-[#D4A024]">Caisse</th>
                    <th className="p-3 text-base font-serif text-[#D4A024]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 text-lg">
                        {hasActiveFilters ? 'Aucun mouvement pour ces filtres' : 'Aucun mouvement enregistré'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((trans) => {
                      const membreName = getMemberName(trans.membre_id);
                      const objetLabel = trans.objet ? (trans.objet.charAt(0).toUpperCase() + trans.objet.slice(1)) : '-';
                      const raisonMembre = membreName !== '-'
                        ? `${objetLabel} - ${membreName}`
                        : objetLabel;
                      return (
                        <tr key={trans.id} className="border-b border-[#D4A024]/10 hover:bg-[#D4A024]/5">
                          <td className="p-3 text-base text-gray-300 whitespace-nowrap">
                            {formatDate(trans.date)}
                          </td>
                          <td className={`p-3 text-lg font-semibold text-right whitespace-nowrap ${
                            trans.type === 'recette' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trans.type === 'recette' ? '+' : '-'}{formatMontant(trans.montant)}
                          </td>
                          <td className="p-3">
                            <Badge className={`text-sm px-3 py-1 ${
                              trans.type === 'recette'
                                ? 'bg-green-900/30 text-green-400 border border-green-600/30'
                                : 'bg-red-900/30 text-red-400 border border-red-600/30'
                            }`}>
                              {trans.type === 'recette' ? 'Recette' : 'Dépense'}
                            </Badge>
                          </td>
                          <td className="p-3 text-base text-white">
                            {raisonMembre}
                          </td>
                          <td className="p-3 text-base text-gray-400">
                            {trans.detail || '-'}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => openEditCaisse(trans)}
                              className="group inline-flex items-center gap-1"
                              data-testid={`edit-caisse-${trans.id}`}
                              title="Cliquer pour corriger la caisse"
                            >
                              <Badge className="bg-[#7A2020]/50 text-[#D4A024] border border-[#D4A024]/30 text-sm px-2 py-1 group-hover:bg-[#D4A024]/20 cursor-pointer transition">
                                {trans.endroit}
                              </Badge>
                              <span className="text-[10px] text-gray-500 group-hover:text-[#D4A024] transition">✎</span>
                            </button>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(trans.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              data-testid={`delete-trans-${trans.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
            <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Sélecteur de mode */}
              <div className="grid grid-cols-3 gap-1 bg-black/40 rounded p-1 border border-red-600/30">
                <button
                  type="button"
                  onClick={() => setDetteMode('single')}
                  className={`px-2 py-2 rounded text-xs font-semibold transition ${
                    detteMode === 'single' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid="dette-mode-single"
                >
                  Un membre
                </button>
                <button
                  type="button"
                  onClick={() => setDetteMode('multi')}
                  className={`px-2 py-2 rounded text-xs font-semibold transition ${
                    detteMode === 'multi' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid="dette-mode-multi"
                >
                  Plusieurs membres
                </button>
                <button
                  type="button"
                  onClick={() => setDetteMode('invite')}
                  className={`px-2 py-2 rounded text-xs font-semibold transition ${
                    detteMode === 'invite' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid="dette-mode-invite"
                >
                  Invité non-membre
                </button>
              </div>

              {/* Aperçu du format */}
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-sm">
                <p className="text-gray-300">
                  {detteMode === 'single' && (
                    <>
                      <span className="text-red-400 font-bold">MEMBRE</span>{' '}
                      <span className="text-[#D4A024]">{detteForm.membre_id ? members.find(m => m.id === detteForm.membre_id)?.nom_complet || '...' : '...'}</span>{' '}
                      <span className="text-red-400 font-bold">DOIT</span>{' '}
                      <span className="text-white">{detteForm.montant || '0'}€</span>{' '}
                      <span className="text-red-400 font-bold">CAUSE</span>{' '}
                      <span className="text-gray-300">{detteForm.cause || '...'}</span>
                    </>
                  )}
                  {detteMode === 'multi' && (
                    <>
                      <span className="text-red-400 font-bold">{detteMultiSelectedIds.length} MEMBRE(S)</span>{' '}
                      <span className="text-red-400 font-bold">DOIVENT CHACUN</span>{' '}
                      <span className="text-white">{detteForm.montant || '0'}€</span>{' '}
                      <span className="text-red-400 font-bold">CAUSE</span>{' '}
                      <span className="text-gray-300">{detteForm.cause || '...'}</span>
                    </>
                  )}
                  {detteMode === 'invite' && (
                    <>
                      <span className="text-red-400 font-bold">INVITÉ</span>{' '}
                      <span className="text-[#D4A024]">{detteForm.nom_invite || '...'}</span>{' '}
                      <span className="text-red-400 font-bold">DOIT</span>{' '}
                      <span className="text-white">{detteForm.montant || '0'}€</span>{' '}
                      <span className="text-red-400 font-bold">CAUSE</span>{' '}
                      <span className="text-gray-300">{detteForm.cause || '...'}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Mode SINGLE : Sélection du membre */}
              {detteMode === 'single' && (
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
              )}

              {/* Mode MULTI : Liste avec checkboxes */}
              {detteMode === 'multi' && (
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <label className="text-sm text-red-400 font-bold">MEMBRES À FACTURER</label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetteMultiSelectedIds(members.map(m => m.id))}
                        className="border-green-500/40 text-green-300 hover:bg-green-500/10 text-xs h-7 px-2"
                        data-testid="multi-check-all"
                      >
                        Tout cocher
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetteMultiSelectedIds([])}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs h-7 px-2"
                        data-testid="multi-uncheck-all"
                      >
                        Tout décocher
                      </Button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher un membre..."
                    value={detteMultiSearch}
                    onChange={(e) => setDetteMultiSearch(e.target.value)}
                    className="w-full mb-2 px-3 py-2 bg-black/40 border border-red-600/30 rounded text-white text-sm"
                    data-testid="multi-search"
                  />
                  <div className="bg-black/30 border border-red-600/30 rounded max-h-[260px] overflow-y-auto">
                    {members
                      .filter(m => !detteMultiSearch || m.nom_complet.toLowerCase().includes(detteMultiSearch.toLowerCase()))
                      .map((m) => {
                        const checked = detteMultiSelectedIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/5 cursor-pointer border-b border-red-500/10 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setDetteMultiSelectedIds(prev =>
                                  prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="w-4 h-4 accent-red-500"
                              data-testid={`multi-check-${m.id}`}
                            />
                            <span className={checked ? 'text-white font-semibold' : 'text-gray-300'}>
                              {m.nom_complet}
                            </span>
                            {Number(m.situation_cotisation || 0) > 0 && (
                              <span className="ml-auto text-xs text-orange-400">
                                {m.situation_cotisation} cotis.
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {detteMultiSelectedIds.length} sélectionné(s) · total à créer :{' '}
                    <span className="text-orange-300 font-bold">
                      {(detteMultiSelectedIds.length * (parseFloat(detteForm.montant) || 0)).toFixed(2)} €
                    </span>
                  </p>
                </div>
              )}

              {/* Mode INVITÉ : nom libre */}
              {detteMode === 'invite' && (
                <div>
                  <label className="block text-sm text-red-400 mb-2 font-bold">NOM DE L'INVITÉ</label>
                  <input
                    type="text"
                    value={detteForm.nom_invite}
                    onChange={(e) => setDetteForm({ ...detteForm, nom_invite: e.target.value })}
                    placeholder="Ex: Pierre Martin (ami de Fabien)"
                    className="w-full px-3 py-2 bg-black/40 border border-red-600/30 rounded text-white"
                    data-testid="dette-nom-invite"
                  />
                </div>
              )}

              {/* Montant */}
              <div>
                <label className="block text-sm text-red-400 mb-2 font-bold">
                  {detteMode === 'multi' ? 'MONTANT PAR MEMBRE' : 'DOIT'} (en €)
                </label>
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
                        const isInvite = !dette.membre_id && dette.nom_invite;
                        return (
                          <div 
                            key={dette.id} 
                            className="bg-red-900/20 border border-red-600/30 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white">
                                  <span className="text-red-400 font-bold">
                                    {isInvite ? 'INVITÉ' : 'MEMBRE'}
                                  </span>{' '}
                                  <span className="text-[#D4A024]">
                                    {isInvite ? dette.nom_invite : (membre?.nom_complet || 'Inconnu')}
                                  </span>
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
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  onClick={() => openReglementModal(dette)}
                                  variant="outline"
                                  size="sm"
                                  className="border-green-600 text-green-400 hover:bg-green-900/20"
                                  data-testid={`reglement-dette-${dette.id}`}
                                  title="Encaisser le règlement de la dette"
                                >
                                  ✓ Réglé
                                </Button>
                                <Button
                                  onClick={async () => {
                                    const nom = isInvite ? dette.nom_invite : (membre?.nom_complet || 'le membre');
                                    if (!window.confirm(`Offrir la dette de ${nom} (${dette.montant} € · ${dette.cause}) ?\n\nLa dette est annulée mais une trace "offerte par le club" sera conservée.`)) return;
                                    try {
                                      await axios.post(`${API}/dettes/${dette.id}/offrir`);
                                      toast.success('Dette offerte');
                                      loadData();
                                    } catch (e) {
                                      console.error(e);
                                      toast.error("Erreur lors de l'offre");
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                                  data-testid={`offrir-dette-${dette.id}`}
                                  title="Offert par le club (trace conservée)"
                                >
                                  🎁 Offert
                                </Button>
                                <Button
                                  onClick={async () => {
                                    if (!window.confirm(`Annuler définitivement la dette (${dette.montant} € · ${dette.cause}) ?\n\nÀ utiliser uniquement pour corriger une erreur de saisie (aucune trace).`)) return;
                                    try {
                                      await axios.delete(`${API}/dettes/${dette.id}`);
                                      toast.success('Dette supprimée');
                                      loadData();
                                    } catch (e) {
                                      console.error(e);
                                      toast.error("Erreur lors de la suppression");
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                                  data-testid={`annuler-dette-${dette.id}`}
                                  title="Annuler (erreur de saisie, aucune trace)"
                                >
                                  🗑️
                                </Button>
                              </div>
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

      {/* Modal : corriger la caisse d'une transaction */}
      {editingCaisseTrans && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingCaisseTrans(null)}
        >
          <Card
            className="bg-[#1a1a1a] border-2 border-[#D4A024] max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-[#D4A024]/30">
              <CardTitle className="text-[#D4A024] flex items-center justify-between">
                <span>Corriger la caisse</span>
                <button
                  type="button"
                  onClick={() => setEditingCaisseTrans(null)}
                  className="text-gray-400 hover:text-white"
                  data-testid="close-edit-caisse"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="bg-black/40 rounded-lg p-3 text-sm">
                <p className="text-gray-300">
                  <span className="text-gray-500">Transaction :</span>{' '}
                  <span className="text-white font-semibold">
                    {editingCaisseTrans.type === 'recette' ? '+' : '-'}
                    {formatMontant(editingCaisseTrans.montant)}
                  </span>{' '}
                  <span className="text-gray-400">
                    · {editingCaisseTrans.objet} · {getMemberName(editingCaisseTrans.membre_id)}
                  </span>
                </p>
                <p className="text-gray-300 mt-1">
                  <span className="text-gray-500">Caisse actuelle :</span>{' '}
                  <Badge className="bg-red-900/30 text-red-300 border border-red-600/40">
                    {editingCaisseTrans.endroit}
                  </Badge>
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Nouvelle caisse créditée *
                </label>
                <div className="space-y-1">
                  {['Compte Bancaire', 'Chez Fabien', 'Chez Jacques', 'PayPal', 'Asso Connect'].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCaisse(c)}
                        className={`w-full text-left px-3 py-2 rounded border transition ${
                          newCaisse === c
                            ? 'bg-[#D4A024]/30 border-[#D4A024] text-[#D4A024]'
                            : 'bg-black/40 border-[#D4A024]/30 text-white hover:bg-[#D4A024]/10'
                        }`}
                        data-testid={`select-new-caisse-${c}`}
                      >
                        {c}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded p-3 text-xs text-yellow-200">
                ⚠️ Le solde de l'ancienne caisse sera décrédité (si elle existe) et la nouvelle
                caisse sera créditée du montant correspondant.
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingCaisseTrans(null)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={savingCaisse}
                >
                  Annuler
                </Button>
                <Button
                  onClick={submitEditCaisse}
                  disabled={!newCaisse || savingCaisse}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold disabled:opacity-50"
                  data-testid="confirm-edit-caisse-btn"
                >
                  {savingCaisse ? 'Correction…' : 'Corriger'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ MODAL : Liste des cotisations en attente ============ */}
      {showCotisationsList && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCotisationsList(false)}
        >
          <Card
            className="bg-[#1a1a1a] border-2 border-orange-500/50 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-orange-500/30 flex-shrink-0">
              <CardTitle className="text-orange-300 flex items-center justify-between">
                <span>Cotisations en attente</span>
                <button
                  type="button"
                  onClick={() => setShowCotisationsList(false)}
                  className="text-gray-400 hover:text-white"
                  data-testid="close-cotisations-list"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
              <p className="text-sm text-gray-400">
                {members.filter(m => Number(m.situation_cotisation || 0) > 0).length} membre(s) ·{' '}
                {summary.cotisations_en_attente} saison(s) · {summary.cotisations_en_attente * 200} €
              </p>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto flex-1">
              {members.filter(m => Number(m.situation_cotisation || 0) > 0).length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucun membre en retard 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {members
                    .filter(m => Number(m.situation_cotisation || 0) > 0)
                    .sort((a, b) => Number(b.situation_cotisation) - Number(a.situation_cotisation))
                    .map((m) => {
                      const nb = Number(m.situation_cotisation || 0);
                      const total = nb * 200;
                      return (
                        <div
                          key={m.id}
                          className="bg-black/30 border border-orange-500/20 rounded-lg p-3"
                          data-testid={`cot-row-${m.id}`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold truncate">{m.nom_complet}</p>
                              <p className="text-xs text-gray-400">
                                {nb} saison(s) · <span className="text-orange-300 font-bold">{total} €</span>
                                {m.telephone && <span className="ml-2 text-gray-500">· {m.telephone}</span>}
                                {Number(m.cotisations_offertes || 0) > 0 && (
                                  <span className="ml-2 text-purple-300">
                                    🎁 {m.cotisations_offertes} offerte(s)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => handleDeclarerPaiementCotisation(m.id, nb, 'Chez Fabien', 'Espèces')}
                              className="bg-green-700 hover:bg-green-600 text-white text-xs"
                              data-testid={`declare-pay-${m.id}`}
                              title="Déclarer un paiement (200€/saison)"
                            >
                              💰 Déclarer payé · Fabien · Espèces
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOffrirCotisation(m.id, 1)}
                              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs"
                              data-testid={`offer-cot-${m.id}`}
                              title="Offrir cette saison (exonération officielle, trace conservée)"
                            >
                              🎁 Offert (1 saison)
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAnnulerCotisation(m.id, 1)}
                              className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                              data-testid={`cancel-cot-${m.id}`}
                              title="Annuler (erreur de saisie, aucune trace)"
                            >
                              🗑️ Annuler 1 saison
                            </Button>
                            {nb > 1 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOffrirCotisation(m.id, nb)}
                                  className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs"
                                  data-testid={`offer-all-cot-${m.id}`}
                                  title={`Offrir les ${nb} saisons`}
                                >
                                  🎁 Tout offrir ({nb})
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAnnulerCotisation(m.id, nb)}
                                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                                  data-testid={`cancel-all-cot-${m.id}`}
                                  title={`Annuler les ${nb} saisons (erreur)`}
                                >
                                  🗑️ Tout annuler ({nb})
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
            <div className="border-t border-orange-500/30 p-3 flex-shrink-0">
              <Button
                onClick={() => setShowCotisationsList(false)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white"
              >
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============ MODAL : Éditer une facture (lignes) ============ */}
      {editingFacture && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingFacture(null)}
        >
          <Card
            className="bg-[#1a1a1a] border-2 border-blue-500/50 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-blue-500/30">
              <CardTitle className="text-blue-300 flex items-center justify-between">
                Éditer la facture
                <button
                  type="button"
                  onClick={() => setEditingFacture(null)}
                  className="text-gray-400 hover:text-white"
                  data-testid="close-edit-facture"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Libellé global</label>
                <Input
                  value={editingFacture.libelle}
                  onChange={(e) => setEditingFacture({ ...editingFacture, libelle: e.target.value })}
                  className="bg-black/40 border-blue-500/30 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fournisseur</label>
                <Input
                  value={editingFacture.fournisseur || ''}
                  onChange={(e) => setEditingFacture({ ...editingFacture, fournisseur: e.target.value })}
                  className="bg-black/40 border-blue-500/30 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 font-semibold flex items-center justify-between">
                  <span>Sous-factures</span>
                  <span className="text-blue-300">Total : {formatMontant(editTotal)}</span>
                </label>
                <div className="space-y-2">
                  {editingFacture.lignes.map((l, idx) => (
                    <div key={l.id || idx} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                      <Input
                        value={l.libelle}
                        disabled={l.statut === 'payee'}
                        onChange={(e) => updateEditLigne(idx, 'libelle', e.target.value)}
                        className="bg-black/40 border-blue-500/30 text-white text-sm disabled:opacity-60"
                        data-testid={`edit-ligne-libelle-${idx}`}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.montant}
                        disabled={l.statut === 'payee'}
                        onChange={(e) => updateEditLigne(idx, 'montant', e.target.value)}
                        className="bg-black/40 border-blue-500/30 text-white text-sm disabled:opacity-60"
                        data-testid={`edit-ligne-montant-${idx}`}
                      />
                      {l.statut === 'payee' ? (
                        <Badge className="bg-green-700/30 text-green-300 border border-green-500/40 text-xs">
                          payée
                        </Badge>
                      ) : (
                        editingFacture.lignes.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeEditLigne(idx)}
                            className="text-red-400 hover:bg-red-500/10 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addEditLigne}
                  className="mt-2 border-blue-500/40 text-blue-300 hover:bg-blue-500/10 w-full"
                  data-testid="add-edit-ligne"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une sous-facture
                </Button>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Détail</label>
                <textarea
                  value={editingFacture.detail || ''}
                  onChange={(e) => setEditingFacture({ ...editingFacture, detail: e.target.value })}
                  rows={2}
                  className="w-full bg-black/40 border border-blue-500/30 text-white rounded px-3 py-2 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingFacture(null)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveEditFacture}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  data-testid="confirm-edit-facture"
                >
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ MODAL : Ajouter une facture à payer ============ */}
      {showAddFactureModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddFactureModal(false)}
        >
          <Card
            className="bg-[#1a1a1a] border-2 border-orange-500/50 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-orange-500/30">
              <CardTitle className="text-orange-300 flex items-center justify-between">
                Nouvelle facture à payer
                <button
                  type="button"
                  onClick={() => setShowAddFactureModal(false)}
                  className="text-gray-400 hover:text-white"
                  data-testid="close-add-facture"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Libellé global *</label>
                <Input
                  value={newFacture.libelle}
                  onChange={(e) => setNewFacture({ ...newFacture, libelle: e.target.value })}
                  placeholder="Ex: Repas anniversaire club"
                  className="bg-black/40 border-orange-500/30 text-white"
                  data-testid="facture-libelle"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fournisseur</label>
                <Input
                  value={newFacture.fournisseur}
                  onChange={(e) => setNewFacture({ ...newFacture, fournisseur: e.target.value })}
                  placeholder="Ex: Restaurant Le Club"
                  className="bg-black/40 border-orange-500/30 text-white"
                />
              </div>

              {/* Lignes de la facture */}
              <div>
                <label className="text-sm text-gray-300 mb-2 font-semibold flex items-center justify-between">
                  <span>Sous-factures / postes</span>
                  <span className="text-orange-300">
                    Total : {formatMontant(newFactureTotal)}
                  </span>
                </label>
                <div className="space-y-2">
                  {newFacture.lignes.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                      <Input
                        value={l.libelle}
                        onChange={(e) => updateNewLigne(idx, 'libelle', e.target.value)}
                        placeholder={idx === 0 ? "Ex: Traiteur" : "Ex: Vin / Boissons"}
                        className="bg-black/40 border-orange-500/30 text-white text-sm"
                        data-testid={`new-ligne-libelle-${idx}`}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.montant}
                        onChange={(e) => updateNewLigne(idx, 'montant', e.target.value)}
                        placeholder="Montant €"
                        className="bg-black/40 border-orange-500/30 text-white text-sm"
                        data-testid={`new-ligne-montant-${idx}`}
                      />
                      {newFacture.lignes.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeNewLigne(idx)}
                          className="text-red-400 hover:bg-red-500/10 p-2"
                          data-testid={`remove-new-ligne-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addNewLigne}
                  className="mt-2 border-orange-500/40 text-orange-300 hover:bg-orange-500/10 w-full"
                  data-testid="add-new-ligne"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une sous-facture
                </Button>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Détail</label>
                <textarea
                  value={newFacture.detail}
                  onChange={(e) => setNewFacture({ ...newFacture, detail: e.target.value })}
                  placeholder="Note interne (facultatif)"
                  rows={2}
                  className="w-full bg-black/40 border border-orange-500/30 text-white rounded px-3 py-2 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddFactureModal(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateFacture}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  data-testid="confirm-add-facture"
                >
                  Ajouter ({formatMontant(newFactureTotal)})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ MODAL : Payer une facture (avec répartition multi-caisses) ============ */}
      {payingFacture && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closePayModal}
        >
          <Card
            className="bg-[#1a1a1a] border-2 border-green-500/50 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-green-500/30">
              <CardTitle className="text-green-300 flex items-center justify-between">
                Payer : {payingFacture.libelle}
                <button
                  type="button"
                  onClick={closePayModal}
                  className="text-gray-400 hover:text-white"
                  data-testid="close-pay-facture"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
              <p className="text-sm text-gray-400">
                {payingFacture.lignes && payingFacture.lignes.length ? (
                  <>Cochez les sous-factures à régler · Sélectionné : <span className="text-green-300 font-bold">{formatMontant(payExpected)}</span></>
                ) : (
                  <>Montant total : <span className="text-green-300 font-bold">{formatMontant(payingFacture.montant)}</span></>
                )}
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Sélection des sous-factures (si lignes) */}
              {payingFacture.lignes && payingFacture.lignes.length > 0 && (
                <div>
                  <label className="text-sm text-gray-300 mb-2 block font-semibold">
                    Sous-factures à régler
                  </label>
                  <div className="bg-black/40 rounded border border-green-500/20 divide-y divide-green-500/10">
                    {payingFacture.lignes.map((l) => {
                      const isPaid = l.statut === 'payee';
                      const checked = paySelectedLignes.includes(l.id);
                      return (
                        <label
                          key={l.id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                            isPaid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500/5'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked || isPaid}
                            disabled={isPaid}
                            onChange={() => !isPaid && togglePayLigne(l.id)}
                            className="w-4 h-4 accent-green-500"
                            data-testid={`pay-toggle-${l.id}`}
                          />
                          <span className={`flex-1 ${isPaid ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {isPaid && '✓ '}
                            {l.libelle}
                          </span>
                          <span className={isPaid ? 'text-gray-500 line-through' : 'text-orange-300 font-semibold'}>
                            {formatMontant(l.montant)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date + Mode */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Date du paiement</label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="bg-black/40 border-green-500/30 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mode de paiement</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full bg-black/40 border border-green-500/30 text-white rounded px-2 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    <option value="Virement">Virement</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="CB">CB</option>
                  </select>
                </div>
              </div>

              {/* Répartition */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block font-semibold">
                  Répartition entre caisses
                </label>
                <div className="space-y-2">
                  {payRepartition.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                      <select
                        value={r.caisse}
                        onChange={(e) => updatePayLine(idx, 'caisse', e.target.value)}
                        className="bg-black/40 border border-green-500/30 text-white rounded px-2 py-2 text-sm"
                        data-testid={`pay-caisse-${idx}`}
                      >
                        <option value="">— Caisse —</option>
                        <option value="Compte Bancaire">Compte Bancaire</option>
                        <option value="Chez Fabien">Chez Fabien</option>
                        <option value="Chez Jacques">Chez Jacques</option>
                        <option value="PayPal">PayPal</option>
                        <option value="Asso Connect">Asso Connect</option>
                      </select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.montant}
                        onChange={(e) => updatePayLine(idx, 'montant', e.target.value)}
                        placeholder="Montant €"
                        className="bg-black/40 border-green-500/30 text-white text-sm"
                        data-testid={`pay-montant-${idx}`}
                      />
                      {payRepartition.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePayLine(idx)}
                          className="text-red-400 hover:bg-red-500/10 p-2"
                          data-testid={`remove-pay-line-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {payRepartition.length < 5 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addPayLine}
                    className="mt-2 border-green-500/40 text-green-300 hover:bg-green-500/10 w-full"
                    data-testid="add-pay-line"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une autre caisse
                  </Button>
                )}
              </div>

              {/* Résumé */}
              <div className="bg-black/30 border border-green-500/30 rounded p-3 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Total réparti</span>
                  <span
                    className={`font-bold ${
                      Math.abs(totalRepartition - payExpected) < 0.01
                        ? 'text-green-300'
                        : 'text-orange-300'
                    }`}
                  >
                    {formatMontant(totalRepartition)} / {formatMontant(payExpected)}
                  </span>
                </div>
                {Math.abs(totalRepartition - payExpected) >= 0.01 && (
                  <p className="text-orange-400 text-xs mt-1">
                    ⚠️ La somme doit égaler le montant sélectionné
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closePayModal}
                  disabled={payLoading}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Annuler
                </Button>
                <Button
                  onClick={submitPayFacture}
                  disabled={payLoading || Math.abs(totalRepartition - payExpected) >= 0.01 || payExpected <= 0}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold disabled:opacity-50"
                  data-testid="confirm-pay-facture"
                >
                  {payLoading ? 'Paiement…' : 'Confirmer le paiement'}
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
