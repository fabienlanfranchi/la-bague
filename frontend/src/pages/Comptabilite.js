import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Calendar,
  Filter,
  Download,
  Trash2
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
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showPayCotisation, setShowPayCotisation] = useState(false);

  // Form states
  const [newTransaction, setNewTransaction] = useState({
    type: 'recette',
    montant: '',
    categorie: '',
    description: '',
    compte_id: ''
  });

  const [cotisationPayment, setCotisationPayment] = useState({
    membre_id: '',
    montant: '',
    compte_id: '',
    nombre_saisons: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, comptesRes, transactionsRes, categoriesRes, membersRes] = await Promise.all([
        axios.get(`${API}/transactions/summary`),
        axios.get(`${API}/comptes`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/members`)
      ]);

      setSummary(summaryRes.data);
      setComptes(comptesRes.data);
      setTransactions(transactionsRes.data);
      setCategories(categoriesRes.data);
      setMembers(membersRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    try {
      if (!newTransaction.montant || !newTransaction.categorie || !newTransaction.compte_id) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      await axios.post(`${API}/transactions`, {
        ...newTransaction,
        montant: parseFloat(newTransaction.montant)
      });

      toast.success('Transaction ajoutée avec succès');
      setShowAddTransaction(false);
      setNewTransaction({
        type: 'recette',
        montant: '',
        categorie: '',
        description: '',
        compte_id: ''
      });
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la transaction:', error);
      toast.error('Erreur lors de l\'ajout de la transaction');
    }
  };

  const handlePayCotisation = async () => {
    try {
      if (!cotisationPayment.membre_id || !cotisationPayment.montant || !cotisationPayment.compte_id) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const response = await axios.post(`${API}/transactions/cotisation`, {
        ...cotisationPayment,
        montant: parseFloat(cotisationPayment.montant),
        nombre_saisons: parseInt(cotisationPayment.nombre_saisons)
      });

      toast.success(response.data.message);
      setShowPayCotisation(false);
      setCotisationPayment({
        membre_id: '',
        montant: '',
        compte_id: '',
        nombre_saisons: 1
      });
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la cotisation:', error);
      toast.error('Erreur lors de l\'enregistrement de la cotisation');
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return;
    }

    try {
      await axios.delete(`${API}/transactions/${transactionId}`);
      toast.success('Transaction supprimée');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Solde total */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-serif text-gray-400 flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Solde Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#D4A024]">
              {formatMontant(summary.solde_total)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tous les comptes</p>
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
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center">
          <Wallet className="w-6 h-6 mr-2 text-[#D4A024]" />
          Comptes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comptes.map((compte) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={() => setShowAddTransaction(true)}
          className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une transaction
        </Button>
        <Button
          onClick={() => setShowPayCotisation(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-serif"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Enregistrer paiement cotisation
        </Button>
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
              {summary.cotisations_en_attente} saison(s) de cotisation en attente de paiement
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tableau des transactions */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-[#D4A024]" />
            Transactions récentes
          </span>
          <span className="text-sm text-gray-400 font-normal">
            {transactions.length} transaction(s)
          </span>
        </h2>

        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#D4A024]/20">
                  <tr className="text-left">
                    <th className="p-4 text-sm font-serif text-gray-400">Date</th>
                    <th className="p-4 text-sm font-serif text-gray-400">Type</th>
                    <th className="p-4 text-sm font-serif text-gray-400">Catégorie</th>
                    <th className="p-4 text-sm font-serif text-gray-400">Description</th>
                    <th className="p-4 text-sm font-serif text-gray-400 text-right">Montant</th>
                    <th className="p-4 text-sm font-serif text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-400">
                        Aucune transaction enregistrée
                      </td>
                    </tr>
                  ) : (
                    transactions.map((trans) => (
                      <tr key={trans.id} className="border-b border-[#D4A024]/10 hover:bg-[#D4A024]/5">
                        <td className="p-4 text-sm text-gray-300">
                          {formatDate(trans.date)}
                        </td>
                        <td className="p-4">
                          <Badge className={
                            trans.type === 'recette'
                              ? 'bg-green-900/30 text-green-400 border border-green-600/30'
                              : 'bg-red-900/30 text-red-400 border border-red-600/30'
                          }>
                            {trans.type === 'recette' ? 'Recette' : 'Dépense'}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-white">
                          {trans.categorie}
                        </td>
                        <td className="p-4 text-sm text-gray-300">
                          {trans.description || '-'}
                        </td>
                        <td className={`p-4 text-sm font-semibold text-right ${
                          trans.type === 'recette' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trans.type === 'recette' ? '+' : '-'}{formatMontant(trans.montant)}
                        </td>
                        <td className="p-4">
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

      {/* Modal: Ajouter transaction */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-[#D4A024]">
                Ajouter une transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  <option value="recette">Recette</option>
                  <option value="dépense">Dépense</option>
                </select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.montant}
                  onChange={(e) => setNewTransaction({ ...newTransaction, montant: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  placeholder="100.00"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
                <select
                  value={newTransaction.categorie}
                  onChange={(e) => setNewTransaction({ ...newTransaction, categorie: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories
                    .filter(cat => cat.type === newTransaction.type)
                    .map(cat => (
                      <option key={cat.id} value={cat.nom}>{cat.nom}</option>
                    ))
                  }
                </select>
              </div>

              {/* Compte */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Compte</label>
                <select
                  value={newTransaction.compte_id}
                  onChange={(e) => setNewTransaction({ ...newTransaction, compte_id: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  <option value="">Sélectionner un compte</option>
                  {comptes.map(compte => (
                    <option key={compte.id} value={compte.id}>{compte.nom}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (optionnel)</label>
                <textarea
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  rows="3"
                  placeholder="Détails de la transaction..."
                />
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleAddTransaction}
                  className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                >
                  Ajouter
                </Button>
                <Button
                  onClick={() => setShowAddTransaction(false)}
                  variant="outline"
                  className="flex-1 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Payer cotisation */}
      {showPayCotisation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#7A2020] border-2 border-[#D4A024] max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-[#D4A024]">
                Enregistrer paiement cotisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Membre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Membre</label>
                <select
                  value={cotisationPayment.membre_id}
                  onChange={(e) => setCotisationPayment({ ...cotisationPayment, membre_id: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  <option value="">Sélectionner un membre</option>
                  {members
                    .filter(m => m.situation_cotisation > 0)
                    .map(membre => (
                      <option key={membre.id} value={membre.id}>
                        {membre.nom_complet} ({membre.situation_cotisation} saison(s) due(s))
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Nombre de saisons */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de saisons payées</label>
                <input
                  type="number"
                  min="1"
                  value={cotisationPayment.nombre_saisons}
                  onChange={(e) => setCotisationPayment({ ...cotisationPayment, nombre_saisons: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                />
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cotisationPayment.montant}
                  onChange={(e) => setCotisationPayment({ ...cotisationPayment, montant: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                  placeholder="100.00"
                />
              </div>

              {/* Compte */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Compte</label>
                <select
                  value={cotisationPayment.compte_id}
                  onChange={(e) => setCotisationPayment({ ...cotisationPayment, compte_id: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-[#D4A024]/30 rounded text-white"
                >
                  <option value="">Sélectionner un compte</option>
                  {comptes.map(compte => (
                    <option key={compte.id} value={compte.id}>{compte.nom}</option>
                  ))}
                </select>
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handlePayCotisation}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-serif"
                >
                  Enregistrer
                </Button>
                <Button
                  onClick={() => setShowPayCotisation(false)}
                  variant="outline"
                  className="flex-1 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10"
                >
                  Annuler
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
