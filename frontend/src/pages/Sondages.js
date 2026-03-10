import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BarChart3, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sondages = () => {
  const { isAdmin, currentUser } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sondages, setSondages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({});

  const [newSondage, setNewSondage] = useState({
    question: '',
    options: ['', '']
  });

  // Charger les sondages
  useEffect(() => {
    loadSondages();
  }, []);

  const loadSondages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/sondages-generiques`);
      setSondages(response.data);
      
      // Charger les votes de l'utilisateur connecté
      if (currentUser?.id) {
        const votesMap = {};
        for (const sondage of response.data) {
          try {
            const voteRes = await axios.get(`${API}/sondages-generiques/${sondage.id}/mon-vote/${currentUser.id}`);
            if (voteRes.data.hasVoted) {
              votesMap[sondage.id] = voteRes.data.option_index;
            }
          } catch (e) {
            // Pas de vote
          }
        }
        setUserVotes(votesMap);
      }
    } catch (error) {
      console.error('Erreur chargement sondages:', error);
      toast.error('Erreur lors du chargement des sondages');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    setNewSondage({
      ...newSondage,
      options: [...newSondage.options, '']
    });
  };

  const handleRemoveOption = (index) => {
    if (newSondage.options.length > 2) {
      const newOptions = newSondage.options.filter((_, i) => i !== index);
      setNewSondage({ ...newSondage, options: newOptions });
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...newSondage.options];
    newOptions[index] = value;
    setNewSondage({
      ...newSondage,
      options: newOptions
    });
  };

  const handleCreateSondage = async () => {
    try {
      const validOptions = newSondage.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast.error('Au moins 2 options sont requises');
        return;
      }

      await axios.post(`${API}/sondages-generiques`, {
        question: newSondage.question,
        options: validOptions
      });

      toast.success('Sondage créé avec succès');
      setDialogOpen(false);
      setNewSondage({ question: '', options: ['', ''] });
      loadSondages();
    } catch (error) {
      console.error('Erreur création sondage:', error);
      toast.error('Erreur lors de la création du sondage');
    }
  };

  const handleVote = async (sondageId, optionIndex) => {
    if (!currentUser?.id) {
      toast.error('Vous devez être connecté pour voter');
      return;
    }

    try {
      await axios.post(`${API}/sondages-generiques/${sondageId}/vote?membre_id=${currentUser.id}&option_index=${optionIndex}`);
      
      toast.success('Vote enregistré !');
      setUserVotes({ ...userVotes, [sondageId]: optionIndex });
      loadSondages();
    } catch (error) {
      console.error('Erreur vote:', error);
      toast.error('Erreur lors du vote');
    }
  };

  const handleDeleteSondage = async (sondageId) => {
    if (!window.confirm('Supprimer ce sondage et tous ses votes ?')) return;

    try {
      await axios.delete(`${API}/sondages-generiques/${sondageId}`);
      toast.success('Sondage supprimé');
      loadSondages();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTotalVotes = (votes) => votes ? votes.reduce((sum, v) => sum + v, 0) : 0;
  
  const getPercentage = (votes, index) => {
    const total = getTotalVotes(votes);
    return total > 0 ? ((votes[index] / total) * 100).toFixed(1) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#D4A024] animate-spin" />
      </div>
    );
  }

  // Interface ADMIN : Créer et gérer les sondages
  if (isAdmin) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
              Sondages
            </h1>
            <p className="text-[#D4A024] text-lg font-serif">
              Créer et gérer les sondages
            </p>
          </div>

          {/* Bouton Créer un sondage */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold"
                data-testid="create-poll-button"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer un sondage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#D4A024]/30">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-white">Nouveau Sondage</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Créez un nouveau sondage pour les membres
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="question" className="text-white">Question *</Label>
                  <Input
                    id="question"
                    value={newSondage.question}
                    onChange={(e) => setNewSondage({ ...newSondage, question: e.target.value })}
                    placeholder="Ex: Quel est votre cigare préféré ?"
                    className="mt-1 bg-black/40 border-[#D4A024]/30 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Options de réponse *</Label>
                  <div className="space-y-2 mt-2">
                    {newSondage.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="bg-black/40 border-[#D4A024]/30 text-white"
                        />
                        {newSondage.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="mt-2 border-[#D4A024]/30 text-[#D4A024]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une option
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-600 text-gray-300">
                  Annuler
                </Button>
                <Button 
                  onClick={handleCreateSondage}
                  className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]"
                  disabled={!newSondage.question || newSondage.options.filter(o => o.trim()).length < 2}
                >
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Liste des sondages (Vue Admin) */}
        <div className="space-y-4">
          {sondages.length === 0 ? (
            <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun sondage créé</p>
                <p className="text-gray-500 text-sm mt-2">Cliquez sur "Créer un sondage" pour commencer</p>
              </CardContent>
            </Card>
          ) : (
            sondages.map((sondage) => (
              <Card 
                key={sondage.id}
                className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-serif text-white mb-2">
                        {sondage.question}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-600">
                          {sondage.status === 'active' ? 'Actif' : 'Terminé'}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {getTotalVotes(sondage.votes)} vote(s)
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-500 hover:bg-red-900/20"
                      onClick={() => handleDeleteSondage(sondage.id)}
                      data-testid={`delete-poll-${sondage.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sondage.options.map((option, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">{option}</span>
                          <span className="text-[#D4A024] font-semibold">
                            {sondage.votes?.[index] || 0} votes ({getPercentage(sondage.votes, index)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-[#D4A024] h-2 rounded-full transition-all"
                            style={{ width: `${getPercentage(sondage.votes, index)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Interface MEMBRE : Répondre aux sondages
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Sondages
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Participez aux sondages du club
        </p>
      </div>

      {/* Liste des sondages (Vue Membre) */}
      <div className="space-y-6">
        {sondages.length === 0 ? (
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucun sondage actif pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          sondages.map((sondage) => {
            const hasVoted = userVotes[sondage.id] !== undefined;
            const userVoteIndex = userVotes[sondage.id];

            return (
              <Card 
                key={sondage.id}
                className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm"
              >
                <CardHeader>
                  <CardTitle className="text-2xl font-serif text-white mb-2">
                    {sondage.question}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {getTotalVotes(sondage.votes)} vote(s) • 
                    {hasVoted ? ' Vous avez voté' : ' En attente de votre réponse'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasVoted ? (
                    // Formulaire de vote
                    <RadioGroup className="space-y-3">
                      {sondage.options.map((option, index) => (
                        <div 
                          key={index}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-[#D4A024]/30 hover:bg-[#D4A024]/10 cursor-pointer transition"
                          onClick={() => handleVote(sondage.id, index)}
                        >
                          <RadioGroupItem value={index.toString()} id={`${sondage.id}-${index}`} />
                          <Label 
                            htmlFor={`${sondage.id}-${index}`}
                            className="flex-1 text-white cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    // Résultats après vote
                    <div className="space-y-3">
                      {sondage.options.map((option, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-white">{option}</span>
                              {userVoteIndex === index && (
                                <CheckCircle2 className="w-4 h-4 text-[#D4A024]" />
                              )}
                            </div>
                            <span className="text-[#D4A024] font-semibold">
                              {sondage.votes?.[index] || 0} votes ({getPercentage(sondage.votes, index)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                userVoteIndex === index ? 'bg-[#D4A024]' : 'bg-gray-500'
                              }`}
                              style={{ width: `${getPercentage(sondage.votes, index)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sondages;
