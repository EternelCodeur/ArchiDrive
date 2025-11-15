/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AdminEmployee } from "@/types/admin";

export type Permission = {
  viewAllFolders: boolean;
  deleteDocuments: boolean;
};

interface AdminSettingsPermissionsProps {
  employees: AdminEmployee[];
  permissions: Record<number, Permission>;
  togglePermission: (userId: number, key: keyof Permission, value: boolean) => void;
}

export const AdminSettingsPermissions = ({
  employees,
  permissions,
  togglePermission,
}: AdminSettingsPermissionsProps) => {
  // Paramètres globaux simulés (thème, langue, fuseau horaire)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [accentColor, setAccentColor] = useState<"blue" | "green" | "purple">("blue");
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [timezone, setTimezone] = useState("Europe/Paris");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Permissions par agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-3 bg-muted text-xs font-medium px-3 py-2">
                <span>Agent</span>
                <span>Voir tous les dossiers</span>
                <span>Supprimer les documents</span>
              </div>
              {employees.map((u) => {
                const p =
                  permissions[u.id] ||
                  ({
                    viewAllFolders: false,
                    deleteDocuments: false,
                  } as Permission);
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-3 items-center text-xs px-3 py-2 border-t"
                  >
                    <div>
                      <p className="font-medium text-foreground text-xs">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={p.viewAllFolders}
                        onCheckedChange={(val: any) =>
                          togglePermission(u.id, "viewAllFolders", Boolean(val))
                        }
                      />
                      <span>Autoriser</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={p.deleteDocuments}
                        onCheckedChange={(val: any) =>
                          togglePermission(u.id, "deleteDocuments", Boolean(val))
                        }
                      />
                      <span>Autoriser</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Paramètres de thème / couleurs */}
        <Card>
          <CardHeader>
            <CardTitle>Apparence et couleurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium">Thème</p>
                <select
                  title="Choisir le thème"
                  className="border rounded-md px-3 py-2 text-xs"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="system">Système</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Couleur principale</p>
                <select
                  title="Choisir la couleur principale"
                  className="border rounded-md px-3 py-2 text-xs"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value as any)}
                >
                  <option value="blue">Bleu</option>
                  <option value="green">Vert</option>
                  <option value="purple">Violet</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ces paramètres sont simulés côté interface pour personnaliser l'apparence de votre
              application.
            </p>
          </CardContent>
        </Card>

        {/* Paramètres de langue */}
        <Card>
          <CardHeader>
            <CardTitle>Langue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <select
              title="Choisir la langue de l'application"
              className="border rounded-md px-3 py-2 text-xs"
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Sélectionnez la langue par défaut de l'application.
            </p>
          </CardContent>
        </Card>

        {/* Paramètres de fuseau horaire */}
        <Card>
          <CardHeader>
            <CardTitle>Fuseau horaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <select
              title="Choisir le fuseau horaire"
              className="border rounded-md px-3 py-2 text-xs"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Europe/Paris">Europe / Paris (CET)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Amérique / New York</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Ce fuseau horaire sera utilisé pour l'affichage des dates et heures.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button type="button">Enregistrer les paramètres</Button>
      </div>
    </div>
  );
};
