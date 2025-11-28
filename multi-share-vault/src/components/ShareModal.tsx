import { useState } from "react";
import { X, Users, Building, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShareTarget, Service, Employee } from "@/types";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getVisibleServicesFromApi, getEnterpriseUsersFromApi } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  folderId: number;
}

export const ShareModal = ({
  isOpen,
  onClose,
  folderName,
  folderId,
}: ShareModalProps) => {
  const [shareTarget, setShareTarget] = useState<ShareTarget["type"]>("user");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const { user } = useAuth();
  const { data: services } = useQuery<Service[]>({
    queryKey: ["visible-services", user?.id ?? 0],
    queryFn: getVisibleServicesFromApi,
    staleTime: 60_000,
  });
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["enterprise-users", user?.id ?? 0],
    queryFn: getEnterpriseUsersFromApi,
    // l'endpoint est admin-only; si non-admin, ça retournera [] via helper
    staleTime: 60_000,
  });

  const handleShare = () => {
    const servicesCount = shareTarget === "service" ? selectedServiceIds.length : 0;
    const usersCount = shareTarget === "user" ? selectedUserIds.length : 0;

    if (servicesCount === 0 && usersCount === 0) {
      toast.error("Sélectionnez au moins un service ou un utilisateur.");
      return;
    }

    toast.success("Partage effectué avec succès !", {
      description:
        shareTarget === "service"
          ? `${servicesCount} service(s) ont été ajoutés au partage de "${folderName}" (simulation).`
          : `${usersCount} utilisateur(s) ont été ajoutés au partage de "${folderName}" (simulation).`,
    });

    setSelectedServiceIds([]);
    setSelectedUserIds([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partager le document</DialogTitle>
          <DialogDescription>
            Choisissez les services ou utilisateurs avec qui partager "{folderName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Share target selection (user or service only) */}
          <div className="space-y-3">
            <Label>Partager avec</Label>
            <RadioGroup value={shareTarget} onValueChange={(value) => setShareTarget(value as ShareTarget["type"])}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="user" id="user" />
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="user" className="cursor-pointer flex-1">
                  Utilisateur spécifique
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="service" id="service" />
                <Building className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="service" className="cursor-pointer flex-1">
                  Service
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Liste des services ou utilisateurs de l'entreprise */}
          {shareTarget === "service" && (
            <div className="space-y-2">
              <Label>Services de l'entreprise</Label>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {(services ?? []).map((service) => {
                  const checked = selectedServiceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() =>
                        setSelectedServiceIds((prev) =>
                          prev.includes(service.id)
                            ? prev.filter((id) => id !== service.id)
                            : [...prev, service.id]
                        )
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left text-sm transition-colors ${
                        checked
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <span>{service.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {shareTarget === "user" && (
            <div className="space-y-2">
              <Label>Utilisateurs de l'entreprise</Label>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {(employees ?? []).map((emp) => {
                  const checked = selectedUserIds.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() =>
                        setSelectedUserIds((prev) =>
                          prev.includes(emp.id)
                            ? prev.filter((id) => id !== emp.id)
                            : [...prev, emp.id]
                        )
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left text-sm transition-colors ${
                        checked
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <span>{`${emp.first_name} ${emp.last_name}`.trim()}</span>
                      <span className="text-xs text-muted-foreground">{emp.email}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} aria-label="Annuler">
            <X className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Annuler</span>
          </Button>
          <Button onClick={handleShare} aria-label="Partager">
            <Share2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Partager</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
