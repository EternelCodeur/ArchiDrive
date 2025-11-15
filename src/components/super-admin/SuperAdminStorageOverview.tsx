import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SuperAdminStorageOverviewProps {
  totalCapacity: number;
  usedStorage: number;
}

export const SuperAdminStorageOverview = ({
  totalCapacity,
  usedStorage,
}: SuperAdminStorageOverviewProps) => {
  const [extraCapacity, setExtraCapacity] = useState(0);
  const [capacityInput, setCapacityInput] = useState("");

  const effectiveCapacity = totalCapacity + extraCapacity;
  const usedPercent = Math.min(100, Math.max(0, (usedStorage / effectiveCapacity) * 100));

  const handleAddCapacity = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(capacityInput.replace(",", "."));
    if (isNaN(value) || value <= 0) {
      toast.error("Veuillez saisir un nombre de Go valide.");
      return;
    }

    setExtraCapacity((prev) => prev + value);
    toast.success("Capacité ajoutée (simulation)", {
      description: `Vous avez ajouté ${value} Go à la capacité globale de stockage.`,
    });
    setCapacityInput("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestion du stockage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisez la consommation globale du stockage alloué aux entreprises.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-center">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du stockage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Capacité totale : </span>
              {effectiveCapacity.toFixed(1)} Go
            </p>
            <p>
              <span className="font-medium">Utilisé : </span>
              {usedStorage} Go ({usedPercent.toFixed(0)} %)
            </p>
            <p>
              <span className="font-medium">Restant : </span>
              {Math.max(0, effectiveCapacity - usedStorage).toFixed(1)} Go
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Données simulées pour visualiser la répartition du stockage sur l'ensemble des
              entreprises.
            </p>
            <form onSubmit={handleAddCapacity} className="mt-3 flex items-center gap-2 text-xs">
              <Input
                type="number"
                step="0.1"
                min="0"
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                placeholder="Ajouter des Go"
                className="h-8 w-28 text-xs"
              />
              <Button type="submit" variant="outline" size="sm" className="h-8 px-3 text-xs">
                Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-40 h-40">
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `conic-gradient(#3b82f6 0 ${usedPercent}%, #e5e7eb ${usedPercent}% 100%)`,
              }}
            />
            <div className="absolute inset-4 rounded-full bg-background flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Utilisé</span>
              <span className="text-lg font-semibold">{usedPercent.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span>Stockage utilisé ({usedStorage} Go)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-slate-200" />
              <span>Disponible ({totalCapacity - usedStorage} Go)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
