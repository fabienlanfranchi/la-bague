import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
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
import { ClipboardCheck, Plus, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const objetOptions = ['cotisation', 'album', 'tombola', 'anniversaire', 'autres'];
const caisseOptions = ['Compte', 'Chez Fabien', 'Chez Jacques', 'PayPal', 'Asso Connect', 'Chèque'];

const TresorierPage = () => {
  const { currentMember } = useUser();
  const [members, setMembers] = useState([]);
  const [mesPaiements, setMesPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date_paiement: new Date().toISOString().split('T')[0],
    type: 'recette',
    membre_id: '',
    objet: '',
    montant: '',
    endroit: '',
    detail: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersRes, paiementsRes] = await Promise.all([
        fetch(`${API_URL}/api/members`),
        currentMember?.id 
          ? fetch(`${API_URL}/api/paiements-en-attente/membre/${currentMember.id}`)
          : Promise.resolve({ json: () => [] })
      ]);
      const membersData = await membersRes.json();
      setMembers(membersData || []);
      
      if (currentMember?.id) {
        const paiementsData = await paiementsRes.json();
        setMesPaiements(paiementsData || []);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.membre_id) {
      toast.error('Veuillez sélectionner un membre');
      return;
    }
    if (!form.objet) {
      toast.error('Veuillez sélectionner un objet');
      return;
    }
    if (!form.montant || parseFloat(form.montant) <= 0) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }
    if (!form.endroit) {
      toast.error('Veuillez sélectionner une caisse');
      return;
    }
    if (form.objet === 'autres' && !form.detail) {
      toast.error('Veuillez préciser le détail pour "Autres"');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/paiements-en-attente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membre_id: form.membre_id,
          date_paiement: form.date_paiement,
          type: form.type,
          objet: form.objet,
          montant: parseFloat(form.montant),
          endroit: form.endroit,
          detail: form.detail || null,
          declarant_id: currentMember?.id || null,
        })
      });

      if (response.ok) {
        const membreNom = members.find(m => m.id === form.membre_id)?.nom_complet || 'Membre';
        toast.success(`Signalement envoyé pour ${membreNom}. En attente de validation par le Président.`);
        setForm({
          date_paiement: new Date().toISOString().split('T')[0],
          type: 'recette',
          membre_id: '',
          objet: '',
          montant: '',
          endroit: '',
          detail: ''
        });
        // Recharger les signalements
        const paiementsRes = await fetch(`${API_URL}/api/paiements-en-attente/membre/${currentMember.id}`);
        const paiementsData = await paiementsRes.json();
        setMesPaiements(paiementsData || []);
      } else {
        toast.error('Erreur lors du signalement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du signalement');
    }
    setSubmitting(false);
  };

  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'en_attente':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'validé':
        return <Badge className="bg-green-600/20 text-green-400 border border-green-600/30"><CheckCircle className="w-3 h-3 mr-1" />Validé</Badge>;
      case 'refusé':
        return <Badge className="bg-red-600/20 text-red-400 border border-red-600/30"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      default:
        return <Badge className="bg-gray-600/20 text-gray-400">{statut}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#D4A024] font-serif text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#D4A024] flex items-center justify-center gap-3">
          <ClipboardCheck className="w-8 h-8" />
          Espace Trésorier
        </h1>
        <p className="text-gray-400 mt-2 text-base">
          Signaler un paiement pour validation par le Président
        </p>
      </div>

      {/* Formulaire de signalement */}
      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" data-testid="tresorier-form-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-serif text-[#D4A024]">
            <Plus className="w-5 h-5 inline mr-2" />
            Nouveau signalement de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Date */}
            <div>
              <label className="block text-base text-gray-400 mb-2">Date</label>
              <input
                type="date"
                data-testid="tresorier-date"
                value={form.date_paiement}
                onChange={(e) => setForm({ ...form, date_paiement: e.target.value })}
                className="w-full px-3 py-3 bg-black/60 text-white border border-[#D4A024]/30 rounded text-base"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-base text-gray-400 mb-2">Type</label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
              >
                <SelectTrigger data-testid="tresorier-type" className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
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
                value={form.membre_id || "none"}
                onValueChange={(value) => setForm({ ...form, membre_id: value === "none" ? "" : value })}
              >
                <SelectTrigger data-testid="tresorier-membre" className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30 max-h-[300px]">
                  <SelectItem value="none" className="text-gray-400 text-base py-3">-- Sélectionner --</SelectItem>
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
                value={form.objet || "none"}
                onValueChange={(value) => setForm({ ...form, objet: value === "none" ? "" : value, detail: value === 'autres' ? '' : form.detail })}
              >
                <SelectTrigger data-testid="tresorier-objet" className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
                  <SelectValue placeholder="Objet" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                  <SelectItem value="none" className="text-gray-400 text-base py-3">-- Sélectionner --</SelectItem>
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
                data-testid="tresorier-montant"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-3 bg-black/60 text-white border border-[#D4A024]/30 rounded text-base text-right"
              />
            </div>

            {/* Caisse */}
            <div>
              <label className="block text-base text-gray-400 mb-2">Caisse</label>
              <Select
                value={form.endroit || "none"}
                onValueChange={(value) => setForm({ ...form, endroit: value === "none" ? "" : value })}
              >
                <SelectTrigger data-testid="tresorier-caisse" className="w-full bg-black/60 border-[#D4A024]/30 text-white h-12 text-base">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                  <SelectItem value="none" className="text-gray-400 text-base py-3">-- Sélectionner --</SelectItem>
                  {caisseOptions.map(caisse => (
                    <SelectItem key={caisse} value={caisse} className="text-white text-base py-3">{caisse}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Détail */}
            <div className="col-span-2">
              <label className="block text-base text-gray-400 mb-2">
                Détail {form.objet === 'autres' && <span className="text-orange-400">(obligatoire)</span>}
              </label>
              <input
                type="text"
                data-testid="tresorier-detail"
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                placeholder={form.objet === 'autres' ? 'Précisez...' : 'Optionnel'}
                className={`w-full px-3 py-3 bg-black/60 text-white border rounded text-base ${
                  form.objet === 'autres' ? 'border-orange-500' : 'border-[#D4A024]/30'
                }`}
              />
            </div>
          </div>

          {/* Info signalement */}
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Ce signalement sera envoyé au Président pour validation. Une fois validé, il sera automatiquement enregistré dans la comptabilité.
            </p>
          </div>

          {/* Bouton Signaler */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="tresorier-submit-btn"
            className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold py-3 text-base"
          >
            <ClipboardCheck className="w-5 h-5 mr-2" />
            {submitting ? 'Envoi en cours...' : 'Signaler le paiement'}
          </Button>
        </CardContent>
      </Card>

      {/* Historique des signalements */}
      {mesPaiements.length > 0 && (
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm" data-testid="tresorier-history">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-serif text-[#D4A024]">
              <Clock className="w-5 h-5 inline mr-2" />
              Mes signalements ({mesPaiements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mesPaiements.map((paiement) => {
                const membre = members.find(m => m.id === paiement.membre_id);
                return (
                  <div key={paiement.id} className="bg-black/30 border border-[#D4A024]/20 rounded-lg p-4" data-testid={`signalement-${paiement.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          {membre?.nom_complet || 'Membre inconnu'}
                        </p>
                        <p className="text-[#D4A024]">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(paiement.montant)} - {paiement.objet}
                          {paiement.detail && ` (${paiement.detail})`}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Payé le {paiement.date_paiement} - {paiement.endroit}
                        </p>
                      </div>
                      {getStatutBadge(paiement.statut)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TresorierPage;
