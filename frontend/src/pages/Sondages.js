import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BarChart3, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Sondages = () => {
  const { isAdmin } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Exemple de sondages (à remplacer par de vraies données API)
  const [sondages, setSondages] = useState([
    {
      id: 1,
      question: 'Quel est votre cigare préféré ?',
      options: ['Cohiba', 'Montecristo', 'Romeo y Julieta', 'Partagás'],
      votes: [12, 8, 15, 5],
      status: 'active',
      hasVoted: false
    },
    {
      id: 2,
      question: 'Quelle fréquence de réunions préférez-vous ?',
      options: ['Hebdomadaire', 'Bi-mensuelle', 'Mensuelle'],
      votes: [3, 18, 9],
      status: 'active',
      hasVoted: true,
      userVote: 1
    }
  ]);

  const [newSondage, setNewSondage] = useState({
    question: '',
    options: ['', '']
  });

  const handleAddOption = () => {
    setNewSondage({
      ...newSondage,
      options: [...newSondage.options, '']
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...newSondage.options];
    newOptions[index] = value;
    setNewSondage({
      ...newSondage,
      options: newOptions
    });
  };

  const handleCreateSondage = () => {
    // Logique pour créer un sondage (à connecter à l'API)
    console.log('Créer sondage:', newSondage);
    setDialogOpen(false);
    setNewSondage({ question: '', options: ['', ''] });
  };

  const handleVote = (sondageId, optionIndex) => {
    // Logique pour voter (à connecter à l'API)
    setSondages(sondages.map(s => {
      if (s.id === sondageId) {
        const newVotes = [...s.votes];
        newVotes[optionIndex]++;
        return { ...s, votes: newVotes, hasVoted: true, userVote: optionIndex };
      }
      return s;
    }));
  };

  const getTotalVotes = (votes) => votes.reduce((sum, v) => sum + v, 0);
  
  const getPercentage = (votes, index) => {
    const total = getTotalVotes(votes);
    return total > 0 ? ((votes[index] / total) * 100).toFixed(1) : 0;
  };

  const handleDeleteSondage = (sondageId) => {
    // Supprimer le sondage de la liste
    setSondages(sondages.filter(s => s.id !== sondageId));
  };

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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Nouveau Sondage</DialogTitle>
                <DialogDescription>
                  Créez un nouveau sondage pour les membres
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="question">Question *</Label>
                  <Input
                    id="question"
                    value={newSondage.question}
                    onChange={(e) => setNewSondage({ ...newSondage, question: e.target.value })}
                    placeholder="Ex: Quel est votre cigare préféré ?"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Options de réponse *</Label>
                  <div className="space-y-2 mt-2">
                    {newSondage.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une option
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
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
          {sondages.map((sondage) => (
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
                          {sondage.votes[index]} votes ({getPercentage(sondage.votes, index)}%)
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
          ))}
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
        {sondages.map((sondage) => (
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
                {sondage.hasVoted ? ' Vous avez voté' : ' En attente de votre réponse'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sondage.hasVoted ? (
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
                          {sondage.userVote === index && (
                            <CheckCircle2 className="w-4 h-4 text-[#D4A024]" />
                          )}
                        </div>
                        <span className="text-[#D4A024] font-semibold">
                          {sondage.votes[index]} votes ({getPercentage(sondage.votes, index)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            sondage.userVote === index ? 'bg-[#D4A024]' : 'bg-gray-500'
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
        ))}

        {sondages.length === 0 && (
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucun sondage actif pour le moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Sondages;
