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
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire de nouveau mouvement
  const [newMouvement, setNewMouvement] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'recette',
    membre_id: '',
    objet: 'cotisation',
    montant: '',
    endroit: 'Compte',
    detail: ''
  });

  const objetOptions = ['cotisation', 'dette', 'album', 'tickets', 'habits', 'autres'];
  const caisseOptions = ['Compte', 'chèque', 'Fabien', 'Jacques', 'Enveloppe bar', 'PayPal'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, comptesRes, transactionsRes, membersRes] = await Promise.all([
        axios.get(`${API}/transactions/summary`),
        axios.get(`${API}/comptes`),
        axios.get(`${API}/transactions`),
        axios.get(`${API}/members`)
      ]);

      setSummary(summaryRes.data);
      setComptes(comptesRes.data);
      setTransactions(transactionsRes.data);
      setMembers(membersRes.data);
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

      // Si c'est une dette et pas de détail, demander le format
      if (newMouvement.objet === 'dette' && !newMouvement.detail) {
        toast.error('Pour une dette, veuillez renseigner le détail (format: mente/montant/raison)');
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
        endroit: 'Compte',
        detail: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du mouvement:', error);
      toast.error('Erreur lors de l\'ajout du mouvement');
    }
  };

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
                  {/* Ligne de formulaire pour ajouter un mouvement */}
                  <tr className="border-b border-[#D4A024]/20 bg-[#D4A024]/5">
                    <td className="p-2">
                      <input
                        type="date"
                        value={newMouvement.date}
                        onChange={(e) => setNewMouvement({ ...newMouvement, date: e.target.value })}
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={newMouvement.type}
                        onChange={(e) => setNewMouvement({ ...newMouvement, type: e.target.value })}
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      >
                        <option value="recette">Recette</option>
                        <option value="dépense">Dépense</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={newMouvement.membre_id}
                        onChange={(e) => setNewMouvement({ ...newMouvement, membre_id: e.target.value })}
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      >
                        <option value="">-</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.nom_complet}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={newMouvement.objet}
                        onChange={(e) => setNewMouvement({ ...newMouvement, objet: e.target.value })}
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      >
                        {objetOptions.map(obj => (
                          <option key={obj} value={obj}>{obj}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newMouvement.montant}
                        onChange={(e) => setNewMouvement({ ...newMouvement, montant: e.target.value })}
                        placeholder="€"
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm text-right"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={newMouvement.endroit}
                        onChange={(e) => setNewMouvement({ ...newMouvement, endroit: e.target.value })}
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      >
                        {endroitOptions.map(end => (
                          <option key={end} value={end}>{end}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={newMouvement.detail}
                        onChange={(e) => setNewMouvement({ ...newMouvement, detail: e.target.value })}
                        placeholder={newMouvement.objet === 'dette' ? 'mente/montant/raison' : 'Détail...'}
                        className="w-full px-2 py-1 bg-black/40 border border-[#D4A024]/30 rounded text-white text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        onClick={handleAddMouvement}
                        size="sm"
                        className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>

                  {/* Transactions existantes */}
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
    </div>
  );
};

export default Comptabilite;
