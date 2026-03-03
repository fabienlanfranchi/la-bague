import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Download, Upload, Shield, AlertTriangle, Check, RefreshCw, Database, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Sauvegarde() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  // Exporter toutes les données
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/export/all`);
      const data = await response.json();
      
      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `la-bague-imperiale-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setLastExport(data);
      toast.success('Export réussi ! Fichier téléchargé.');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    }
    setExporting(false);
  };

  // Gérer la sélection du fichier d'import
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setImportFile(data);
        setImportPreview(data.counts);
        setShowImportConfirm(true);
      } catch (error) {
        toast.error('Fichier invalide. Veuillez sélectionner un fichier d\'export valide.');
      }
    };
    reader.readAsText(file);
  };

  // Confirmer et importer les données
  const handleImportConfirm = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      const response = await fetch(`${API_URL}/api/import/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importFile)
      });
      
      if (!response.ok) throw new Error('Erreur import');
      
      const result = await response.json();
      toast.success('Import réussi ! Les données ont été restaurées.');
      setShowImportConfirm(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (error) {
      console.error('Erreur import:', error);
      toast.error('Erreur lors de l\'import');
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Sauvegarde des Données</h1>
        <p className="text-stone-500">Exportez et importez les données de votre club</p>
      </div>

      {/* Info importante */}
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Comment ça marche ?</h3>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                <li>• <strong>Exporter</strong> : Télécharge un fichier JSON avec toutes vos données</li>
                <li>• <strong>Importer</strong> : Restaure les données depuis un fichier de sauvegarde</li>
                <li>• Conservez vos fichiers d'export dans un endroit sûr (Google Drive, Dropbox, etc.)</li>
                <li>• Faites un export régulier, surtout après avoir saisi beaucoup de données</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Exporter les données
            </CardTitle>
            <CardDescription>
              Téléchargez une copie de sauvegarde de toutes vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                L'export inclut : membres, présences, événements, comptabilité, messages, et toutes les configurations.
              </p>
            </div>
            
            <Button 
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              data-testid="export-btn"
            >
              {exporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter maintenant
                </>
              )}
            </Button>

            {lastExport && (
              <div className="bg-stone-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-stone-700 mb-2">Dernier export :</p>
                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <span>Membres : {lastExport.counts?.members || 0}</span>
                  <span>Présences : {lastExport.counts?.presences_membres || 0}</span>
                  <span>Événements : {lastExport.counts?.events || 0}</span>
                  <span>Saisons : {lastExport.counts?.saisons_config || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Importer les données
            </CardTitle>
            <CardDescription>
              Restaurez vos données depuis un fichier de sauvegarde
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  <strong>Attention :</strong> L'import remplace TOUTES les données existantes. 
                  Faites un export avant d'importer.
                </p>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
                data-testid="import-file-input"
              />
              <label 
                htmlFor="import-file"
                className="cursor-pointer"
              >
                <HardDrive className="h-10 w-10 text-stone-400 mx-auto mb-2" />
                <p className="text-stone-600 font-medium">Cliquez pour sélectionner un fichier</p>
                <p className="text-sm text-stone-400 mt-1">Format : .json (fichier d'export)</p>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmation d'import */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Confirmer l'import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-stone-600">
                Vous êtes sur le point de restaurer les données suivantes :
              </p>
              
              {importPreview && (
                <div className="bg-stone-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-stone-600">Membres :</span>
                    <span className="font-medium">{importPreview.members || 0}</span>
                    <span className="text-stone-600">Présences :</span>
                    <span className="font-medium">{importPreview.presences_membres || 0}</span>
                    <span className="text-stone-600">Événements :</span>
                    <span className="font-medium">{importPreview.events || 0}</span>
                    <span className="text-stone-600">Transactions :</span>
                    <span className="font-medium">{importPreview.transactions || 0}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-3">
                    Date de l'export : {importFile?.export_date ? new Date(importFile.export_date).toLocaleString('fr-FR') : 'Inconnue'}
                  </p>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  ⚠️ Cette action va <strong>remplacer</strong> toutes les données actuelles !
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportConfirm(false);
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleImportConfirm}
                  disabled={importing}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="confirm-import-btn"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Import...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmer l'import
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
