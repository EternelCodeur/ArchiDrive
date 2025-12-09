/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
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

  // Load enterprise UI preferences
  const { data: uiPrefs } = useQuery<{ ui_theme: "light" | "dark" | "system"; ui_accent_color: "blue" | "green" | "purple" } | null>({
    queryKey: ["ui-preferences"],
    queryFn: async () => {
      const res = await apiFetch(`/api/ui-preferences`, { toast: { error: { enabled: false } } });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!uiPrefs) return;
    // Apply enterprise preferences when loaded
    if (uiPrefs.ui_theme) setTheme(uiPrefs.ui_theme);
    if (uiPrefs.ui_accent_color) setAccentColor(uiPrefs.ui_accent_color);
  }, [uiPrefs]);

  const saveUiPrefs = useMutation({
    mutationFn: async (payload: { ui_theme: "light" | "dark" | "system"; ui_accent_color: "blue" | "green" | "purple" }) => {
      const res = await apiFetch(`/api/admin/ui-preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        toast: { success: { message: "Apparence enregistrée" }, error: { enabled: true, message: "Échec d'enregistrement" } },
      });
      if (!res.ok) throw new Error("save_failed");
      return res.json();
    },
  });

  useEffect(() => {
    const storedTheme = (typeof window !== "undefined" ? localStorage.getItem("theme") : null) as
      | "light"
      | "dark"
      | "system"
      | null;
    const storedAccent = (typeof window !== "undefined" ? localStorage.getItem("accentColor") : null) as
      | "blue"
      | "green"
      | "purple"
      | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      applyTheme("light");
    }
    if (storedAccent) {
      setAccentColor(storedAccent);
      applyAccent(storedAccent);
    } else {
      applyAccent("blue");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!theme) return;
    const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => applyTheme(theme);
    // Apply immediately
    handle();
    try { localStorage.setItem("theme", theme); } catch { /* noop */ }
    // If system, keep in sync with OS changes
    if (theme === "system" && mql) {
      try {
        mql.addEventListener("change", handle);
        return () => mql.removeEventListener("change", handle);
      } catch {
        // Safari fallback
        // @ts-ignore
        mql.addListener && mql.addListener(handle);
        return () => {
          // @ts-ignore
          mql.removeListener && mql.removeListener(handle);
        };
      }
    }
  }, [theme]);

  useEffect(() => {
    if (!accentColor) return;
    applyAccent(accentColor);
    try { localStorage.setItem("accentColor", accentColor); } catch { /* noop */ }
  }, [accentColor]);

  function applyTheme(mode: "light" | "dark" | "system") {
    const root = document.documentElement;
    const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = mode === "system" ? (mql ? mql.matches : false) : (mode === "dark");
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  function applyAccent(color: "blue" | "green" | "purple") {
    const root = document.documentElement;
    const sets: Record<string, Record<string, string>> = {
      blue: {
        "--primary": "217 91% 60%",
        "--primary-foreground": "0 0% 100%",
        "--accent": "217 91% 95%",
        "--accent-foreground": "217 91% 35%",
        "--ring": "217 91% 60%",
        "--sidebar-primary": "217 91% 60%",
        "--sidebar-primary-foreground": "0 0% 100%",
        "--sidebar-accent": "217 91% 95%",
        "--sidebar-accent-foreground": "217 91% 35%",
        "--tab-active": "217 91% 60%",
        "--folder-hover": "217 91% 97%",
      },
      green: {
        "--primary": "142 70% 45%",
        "--primary-foreground": "0 0% 100%",
        "--accent": "142 60% 92%",
        "--accent-foreground": "142 70% 30%",
        "--ring": "142 70% 45%",
        "--sidebar-primary": "142 70% 45%",
        "--sidebar-primary-foreground": "0 0% 100%",
        "--sidebar-accent": "142 60% 20%",
        "--sidebar-accent-foreground": "142 70% 70%",
        "--tab-active": "142 70% 45%",
        "--folder-hover": "142 60% 96%",
      },
      purple: {
        "--primary": "262 83% 58%",
        "--primary-foreground": "0 0% 100%",
        "--accent": "262 70% 94%",
        "--accent-foreground": "262 70% 40%",
        "--ring": "262 83% 58%",
        "--sidebar-primary": "262 83% 58%",
        "--sidebar-primary-foreground": "0 0% 100%",
        "--sidebar-accent": "262 40% 22%",
        "--sidebar-accent-foreground": "262 83% 70%",
        "--tab-active": "262 83% 58%",
        "--folder-hover": "262 70% 96%",
      },
    };
    const set = sets[color];
    Object.entries(set).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  }

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
                    className="grid grid-cols-2 items-center text-xs px-3 py-2 border-t"
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
                  onChange={(e) => {
                    const v = e.target.value as "light" | "dark" | "system";
                    setTheme(v);
                    saveUiPrefs.mutate({ ui_theme: v, ui_accent_color: accentColor });
                  }}
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
                  onChange={(e) => {
                    const v = e.target.value as "blue" | "green" | "purple";
                    setAccentColor(v);
                    saveUiPrefs.mutate({ ui_theme: theme, ui_accent_color: v });
                  }}
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
      </div>
    </div>
  );
};
