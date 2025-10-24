import { useState } from "react";
import { X, Users, Building, Shield, Globe, Calendar, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SharePermissions, ShareTarget, SharedAccess } from "@/types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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
  const [permissions, setPermissions] = useState<SharePermissions>({
    read: true,
    write: false,
    delete: false,
  });
  const [expirationDate, setExpirationDate] = useState("");
  const [notify, setNotify] = useState(true);
  const [sharedAccesses, setSharedAccesses] = useState<SharedAccess[]>([
    {
      id: 1,
      target_type: "service",
      target_name: "Ressources Humaines",
      permissions: { read: true, write: true, delete: false },
      created_at: "2024-01-15"
    }
  ]);

  const handleShare = () => {
    const newAccess: SharedAccess = {
      id: sharedAccesses.length + 1,
      target_type: shareTarget,
      target_name: shareTarget === "all" ? "Tous les utilisateurs" : "Nouveau partage",
      permissions,
      expires_at: expirationDate || undefined,
      created_at: new Date().toISOString().split('T')[0]
    };
    
    setSharedAccesses([...sharedAccesses, newAccess]);
    
    toast.success("Partage effectué avec succès !", {
      description: `Le dossier "${folderName}" a été partagé. ${notify ? "Les destinataires ont été notifiés." : ""}`,
    });
    
    // Reset form
    setPermissions({ read: true, write: false, delete: false });
    setExpirationDate("");
  };

  const handleRevoke = (accessId: number) => {
    setSharedAccesses(sharedAccesses.filter(a => a.id !== accessId));
    toast.success("Accès révoqué");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partager le dossier</DialogTitle>
          <DialogDescription>
            Gérez les droits d'accès pour "{folderName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Share target selection */}
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
              
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="role" id="role" />
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="role" className="cursor-pointer flex-1">
                  Rôle
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="all" id="all" />
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="all" className="cursor-pointer flex-1">
                  Tous les utilisateurs
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Droits d'accès</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="read"
                  checked={permissions.read}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, read: !!checked })
                  }
                />
                <Label htmlFor="read" className="cursor-pointer">
                  👁️ Lecture
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="write"
                  checked={permissions.write}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, write: !!checked })
                  }
                />
                <Label htmlFor="write" className="cursor-pointer">
                  ✍️ Écriture
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete"
                  checked={permissions.delete}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, delete: !!checked })
                  }
                />
                <Label htmlFor="delete" className="cursor-pointer">
                  🗑️ Suppression
                </Label>
              </div>
            </div>
          </div>

          {/* Expiration date */}
          <div className="space-y-2">
            <Label htmlFor="expiration">Date d'expiration (optionnel)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="expiration"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notify option */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Label htmlFor="notify" className="cursor-pointer">
              Notifier les destinataires par email
            </Label>
            <Switch
              id="notify"
              checked={notify}
              onCheckedChange={setNotify}
            />
          </div>

          {/* Current shared accesses */}
          {sharedAccesses.length > 0 && (
            <div className="space-y-2">
              <Label>Accès actuels</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sharedAccesses.map((access) => (
                  <div key={access.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{access.target_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {access.target_type === 'user' && 'Utilisateur'}
                          {access.target_type === 'service' && 'Service'}
                          {access.target_type === 'role' && 'Rôle'}
                          {access.target_type === 'all' && 'Tous'}
                        </Badge>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {access.permissions.read && <span>👁️ Lecture</span>}
                        {access.permissions.write && <span>✍️ Écriture</span>}
                        {access.permissions.delete && <span>🗑️ Suppression</span>}
                      </div>
                      {access.expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expire le {new Date(access.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(access.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleShare}>
            Partager
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
