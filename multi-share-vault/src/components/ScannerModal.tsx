import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Dynamsoft from "dwt";
import { apiFetch } from "@/lib/api";

type ScannedPage = {
  id: number;
  dataUrl: string;
  bufferIndex?: number;
};

type ScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  folderId?: number | null;
  serviceId?: number | null;
  onUploaded?: () => void;
};

function createMockPageDataUrl(pageNumber: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const hue = (pageNumber * 57) % 360;
  ctx.fillStyle = `hsl(${hue} 70% 92%)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let y = 80; y < canvas.height; y += 48) {
    ctx.fillRect(60, y, canvas.width - 120, 2);
  }

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.font = "bold 48px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(`Page ${pageNumber}`, 60, 90);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "24px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("Aperçu scan (mock)", 60, 140);

  return canvas.toDataURL("image/png");
}

export const ScannerModal = ({ isOpen, onClose, folderId, serviceId, onUploaded }: ScannerModalProps) => {
  const [step, setStep] = useState<"connect" | "scan">("connect");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [resourcesOk, setResourcesOk] = useState<boolean | null>(null);

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [documentName, setDocumentName] = useState("Document scanné");

  const dwtContainerId = "dwtcontrolContainer";
  const dwtObjectRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);

  const productKey = import.meta.env.VITE_DWT_PRODUCT_KEY as string | undefined;
  const hasProductKey = Boolean(productKey && productKey.trim().length > 0);

  const hasWebTwain = useMemo(() => Boolean((Dynamsoft as any)?.DWT), []);
  const viteMode = import.meta.env.MODE as string | undefined;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const envPresent = typeof import.meta.env !== "undefined";

  const canSave = useMemo(() => pages.length > 0 && documentName.trim().length > 0, [pages.length, documentName]);

  useEffect(() => {
    if (!isOpen) return;
    setStep("connect");
    setConnecting(false);
    setConnected(false);
    setResourcesOk(null);
    setPages([]);
    setScanLoading(false);
    setDocumentName("Document scanné");
    initAttemptedRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Quick check: are static DWT resources actually reachable?
    fetch(`/dwt-resources/dynamsoft.webtwain.min.mjs?ts=${Date.now()}`, { method: 'GET' })
      .then((r) => setResourcesOk(r.ok))
      .catch(() => setResourcesOk(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initAttemptedRef.current) return;
    if (!hasWebTwain || !hasProductKey) return;
    initAttemptedRef.current = true;

    setConnecting(true);
    initWebTwain()
      .then((ok) => {
        if (!ok) return;
        setConnected(true);
        setStep("scan");
        toast.success("Scanner prêt (WebTWAIN)");
      })
      .finally(() => setConnecting(false));
  }, [hasProductKey, hasWebTwain, isOpen]);

  const initWebTwain = async () => {
    if (!hasWebTwain) {
      toast.error("WebTWAIN (Dynamsoft) non détecté (lib dwt)");
      return false;
    }

    if (!hasProductKey) {
      toast.error("Clé WebTWAIN manquante (VITE_DWT_PRODUCT_KEY)");
      return false;
    }

    // Surface WebTWAIN init errors (service / CORS / resources)
    try {
      if (typeof (Dynamsoft as any).DWT.RegisterEvent === 'function') {
        (Dynamsoft as any).DWT.RegisterEvent('OnWebTwainError', (errorCode: any, errorString: any) => {
          // Keep it visible in both toast and console
          // eslint-disable-next-line no-console
          console.error('WebTWAIN OnWebTwainError', errorCode, errorString);
          toast.error(String(errorString || errorCode || 'WebTWAIN error'));
        });
      }
    } catch {
      // ignore
    }

    (Dynamsoft as any).DWT.ProductKey = productKey;
    (Dynamsoft as any).DWT.ResourcesPath = "/dwt-resources";
    (Dynamsoft as any).DWT.IfCheckCORS = true;
    (Dynamsoft as any).DWT.Containers = [
      {
        WebTwainId: "dwtObject",
        ContainerId: dwtContainerId,
        Width: "0px",
        Height: "0px",
      },
    ];

    await (Dynamsoft as any).DWT.Load();
    dwtObjectRef.current = (Dynamsoft as any).DWT.GetWebTwain(dwtContainerId);

    if (!dwtObjectRef.current) {
      toast.error("WebTWAIN non prêt");
      return false;
    }

    return true;
  };

  const handleConnect = async () => {
    if (!hasWebTwain) {
      toast.error("WebTWAIN (Dynamsoft) non détecté sur ce poste");
      return;
    }
    setConnecting(true);
    try {
      const ok = await initWebTwain();
      if (!ok) return;
      setConnected(true);
      setStep("scan");
      toast.success("Scanner prêt (WebTWAIN)");
    } finally {
      setConnecting(false);
    }
  };

  const tryScanWithWebTwain = async (): Promise<boolean> => {
    const dwt = dwtObjectRef.current;
    if (!dwt) return false;

    try {
      const beforeCount = typeof dwt.HowManyImagesInBuffer === "number" ? (dwt.HowManyImagesInBuffer as number) : 0;

      const pixelTypeEnum = (Dynamsoft as any)?.DWT?.EnumDWT_PixelType;
      const deviceConfiguration: any = {
        IfShowUI: false,
        PixelType: pixelTypeEnum?.TWPT_RGB,
        Resolution: 300,
        IfFeederEnabled: true,
        IfDuplexEnabled: false,
        IfDisableSourceAfterAcquire: true,
        IfGetImageInfo: true,
        IfGetExtImageInfo: true,
        extendedImageInfoQueryLevel: 0,
        IfCloseSourceAfterAcquire: true,
      };

      if (typeof dwt.SelectSourceAsync === "function") {
        await dwt.SelectSourceAsync();
      }

      if (typeof dwt.OpenSource === "function") {
        try { dwt.OpenSource(); } catch { /* ignore */ }
      }

      if (typeof dwt.AcquireImageAsync === "function") {
        await dwt.AcquireImageAsync(deviceConfiguration);
      } else if (typeof dwt.AcquireImage === "function") {
        await new Promise<void>((resolve, reject) => {
          try {
            if (typeof dwt.AcquireImage === "function") {
              dwt.AcquireImage(
                deviceConfiguration,
                () => {
                  try { if (typeof dwt.CloseSource === "function") dwt.CloseSource(); } catch { /* ignore */ }
                  resolve();
                },
                (_errorCode: number, errorString: string) => {
                  try { if (typeof dwt.CloseSource === "function") dwt.CloseSource(); } catch { /* ignore */ }
                  reject(new Error(errorString));
                },
              );
              return;
            }
            reject(new Error("AcquireImage non disponible"));
          } catch (e) {
            try { if (typeof dwt.CloseSource === "function") dwt.CloseSource(); } catch { /* ignore */ }
            reject(e);
          }
        });
      } else {
        return false;
      }

      const afterCount = typeof dwt.HowManyImagesInBuffer === "number" ? (dwt.HowManyImagesInBuffer as number) : 0;
      if (afterCount <= beforeCount) return true;

      const imageType = (Dynamsoft as any)?.DWT?.EnumDWT_ImageType?.IT_PNG;
      if (!imageType || typeof dwt.ConvertToBase64 !== "function") {
        toast.message("Scan OK, mais conversion miniatures non configurée (fallback mock)");
        return false;
      }

      const newIndices: number[] = [];
      for (let i = beforeCount; i < afterCount; i += 1) newIndices.push(i);

      const thumbs: ScannedPage[] = [];
      for (let i = 0; i < newIndices.length; i += 1) {
        const idx = newIndices[i];
        const base64: string = await new Promise((resolve, reject) => {
          dwt.ConvertToBase64(
            [idx],
            imageType,
            (result: string) => resolve(result),
            (error: any) => reject(error),
          );
        });
        thumbs.push({
          id: Date.now() + i,
          dataUrl: `data:image/png;base64,${base64}`,
          bufferIndex: idx,
        });
      }
      setPages((prev) => [...prev, ...thumbs]);

      return true;
    } catch (e: any) {
      toast.error(e?.message || "Échec du scan WebTWAIN");
      return false;
    }
  };

  const handleMockScan = async () => {
    if (!connected) return;
    setScanLoading(true);
    try {
      if (hasWebTwain) {
        const ok = await tryScanWithWebTwain();
        if (ok) {
          toast.success("Scan terminé");
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 600));
      setPages((prev) => {
        const start = prev.length + 1;
        const next: ScannedPage[] = [0, 1, 2].map((i) => ({
          id: Date.now() + i,
          dataUrl: createMockPageDataUrl(start + i),
        }));
        return [...prev, ...next];
      });
      toast.success("Pages scannées ajoutées");
    } finally {
      setScanLoading(false);
    }
  };

  const removePage = (id: number) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const exportSelectedToBlob = async (): Promise<{ blob: Blob; mime: string; ext: string } | null> => {
    const dwt = dwtObjectRef.current;
    if (!dwt) return null;

    const indices = pages
      .map((p) => p.bufferIndex)
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => a - b);

    if (indices.length === 0) return null;

    const enumType = (Dynamsoft as any)?.DWT?.EnumDWT_ImageType;
    const pdfType = enumType?.IT_PDF;
    const pngType = enumType?.IT_PNG;

    const typeToUse = pdfType || pngType;
    if (!typeToUse || typeof dwt.ConvertToBlob !== "function") return null;

    const blob: Blob = await new Promise((resolve, reject) => {
      dwt.ConvertToBlob(
        indices,
        typeToUse,
        (result: Blob) => resolve(result),
        (errorCode: any, errorString: any) => reject(new Error(String(errorString || errorCode))),
      );
    });

    if (pdfType) return { blob, mime: "application/pdf", ext: "pdf" };
    return { blob, mime: "image/png", ext: "png" };
  };

  const handleSave = async () => {
    if (!canSave) return;
    const name = documentName.trim();
    const targetFolderId = typeof folderId === "number" ? folderId : null;
    const targetServiceId = typeof serviceId === "number" ? serviceId : null;

    if (targetFolderId === null && targetServiceId === null) {
      toast.error("Impossible d’enregistrer: dossier/service non déterminé");
      return;
    }

    try {
      const exported = await exportSelectedToBlob();
      if (!exported) {
        toast.error("Export WebTWAIN impossible");
        return;
      }

      const safeBase = name || "Document scanné";
      const file = new File([exported.blob], `${safeBase}.${exported.ext}`, { type: exported.mime });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      if (targetFolderId !== null) fd.append("folder_id", String(targetFolderId));
      if (targetFolderId === null && targetServiceId !== null) fd.append("service_id", String(targetServiceId));

      const res = await apiFetch("/api/documents", {
        method: "POST",
        body: fd,
        toast: { error: { enabled: true, message: "Échec de l’enregistrement" } },
      });
      if (!res.ok) return;

      toast.success(`Enregistré: ${name} (${pages.length} page(s))`);
      onUploaded?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Échec de l’enregistrement");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Scanner</DialogTitle>
          <DialogDescription>
            {step === "connect" ? "Connectez-vous au scanner pour démarrer un scan." : "Lancez un scan, supprimez les pages inutiles puis enregistrez."}
          </DialogDescription>
        </DialogHeader>

        {step === "connect" && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground border rounded-md p-4">
              {!hasWebTwain ? (
                <div>
                  WebTWAIN (Dynamsoft) n’est pas disponible sur ce poste. Installe/active le service WebTWAIN puis recharge la page.
                </div>
              ) : !hasProductKey ? (
                <div>
                  WebTWAIN est détecté, mais la clé n’est pas configurée. Ajoute <span className="font-medium">VITE_DWT_PRODUCT_KEY</span> dans <span className="font-medium">.env.development</span> puis redémarre le serveur.
                </div>
              ) : connecting ? (
                <div>
                  Connexion au scanner…
                </div>
              ) : (
                <div>
                  WebTWAIN détecté et clé configurée.
                </div>
              )}

              <div className="mt-3 text-xs text-muted-foreground">
                <div><span className="font-medium">Origin:</span> {origin || "?"}</div>
                <div><span className="font-medium">Vite mode:</span> {viteMode ?? "?"}</div>
                <div><span className="font-medium">import.meta.env:</span> {envPresent ? "ok" : "absent"}</div>
                <div><span className="font-medium">Clé détectée:</span> {hasProductKey ? "oui" : "non"}</div>
                <div><span className="font-medium">Ressources /dwt-resources:</span> {resourcesOk === null ? "test…" : (resourcesOk ? "ok" : "404/erreur")}</div>
              </div>
            </div>

            <div id={dwtContainerId} className="h-0 w-0 overflow-hidden" />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="button" onClick={handleConnect} disabled={connecting || !hasWebTwain || !hasProductKey}>
                Réessayer
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "scan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">Scanner:</span> WebTWAIN
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => { setConnected(false); setStep("connect"); }}>
                  Changer de scanner
                </Button>
                <Button type="button" onClick={handleMockScan} disabled={scanLoading}>
                  {scanLoading ? "Scan…" : "Lancer un scan"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium">Pages scannées ({pages.length})</div>
              {pages.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
                  Aucun scan pour le moment. Clique sur « Lancer un scan ».
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {pages.map((p, idx) => (
                    <div key={p.id} className="border rounded-md overflow-hidden bg-card">
                      <div className="aspect-[3/4] bg-muted">
                        <img src={p.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground truncate">Page {idx + 1}</div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePage(p.id)}>
                          Retirer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <div className="text-xs font-medium">Nom du document</div>
                <Input value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="Ex: Facture - Décembre" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onClose}>Fermer</Button>
                <Button type="button" onClick={handleSave} disabled={!canSave}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
