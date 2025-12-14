import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminDashboardOverviewProps {
  totalDocuments: number;
  totalEmployees: number;
  totalServices: number;
  totalStorage: number;
  weeklyActivity: number[];
  enterpriseName?: string | null;
  enterpriseId?: number | null;
}

export const AdminDashboardOverview = ({
  totalDocuments,
  totalEmployees,
  totalServices,
  totalStorage,
  weeklyActivity,
  enterpriseName,
  enterpriseId,
}: AdminDashboardOverviewProps) => {
  const maxActivity = Math.max(...weeklyActivity, 1);
  const [extraStorage, setExtraStorage] = useState(0);
  const [storageInput, setStorageInput] = useState("");

  const enterpriseLabel = enterpriseName
    ? enterpriseName
    : (typeof enterpriseId === "number" ? `Entreprise #${enterpriseId}` : "votre entreprise");

  const handleAddStorage = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(storageInput.replace(",", "."));
    if (isNaN(value) || value <= 0) {
      toast.error("Veuillez saisir un nombre de Go valide.");
      return;
    }

    setExtraStorage((prev) => prev + value);
    toast.success("Stockage ajouté (simulation)", {
      description: `Vous avez ajouté ${value} Go de stockage à la capacité de l'entreprise.`,
    });
    setStorageInput("");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Documents: bleu → blanc */}
        <Card className="bg-gradient-to-r from-blue-700 via-sky-400 to-white text-slate-900 border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalDocuments}</p>
            <p className="text-xs mt-1 opacity-90">Documents dans {enterpriseLabel}</p>
          </CardContent>
        </Card>

        {/* Employés: bleu doux → blanc → orange clair */}
        <Card className="bg-gradient-to-r from-sky-500 via-white to-orange-300 text-slate-900 border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Employés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalEmployees}</p>
            <p className="text-xs mt-1 opacity-90">Utilisateurs actifs dans {enterpriseLabel}</p>
          </CardContent>
        </Card>

        {/* Services: bleu nuit → bleu → orange */}
        <Card className="bg-gradient-to-r from-blue-900 via-blue-600 to-orange-500 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalServices}</p>
            <p className="text-xs mt-1 opacity-90">Unités organisationnelles dans {enterpriseLabel}</p>
          </CardContent>
        </Card>

        {/* Stockage: blanc → orange soutenu */}
        <Card className="bg-gradient-to-r from-white via-orange-300 to-orange-500 text-slate-900 border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stockage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{(totalStorage + extraStorage).toFixed(1)} Go</p>
            <p className="text-xs mt-1 opacity-90 mb-3">Capacité allouée à {enterpriseLabel}</p>
          </CardContent>
        </Card>
      </div>

     
    </div>
  );
};
