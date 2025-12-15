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

function normalizeDataUrlFromDwtBase64(raw: string, fallbackMime = "image/png"): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;
  // WebTWAIN sometimes returns base64 with whitespace/newlines
  const cleaned = trimmed.replace(/\s+/g, "");
  return `data:${fallbackMime};base64,${cleaned}`;
}

function extractBase64StringFromDwt(result: any): string {
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    const first = result[0];
    if (typeof first === "string") return first;
  }
  if (result && typeof result === "object") {
    if (typeof (result as any)._content === "string") return (result as any)._content;
    const candidates = [
      (result as any).base64,
      (result as any).Base64,
      (result as any).data,
      (result as any).Data,
      (result as any).strBase64,
      (result as any).StrBase64,
      (result as any).value,
      (result as any).Value,
    ];
    for (const c of candidates) {
      if (typeof c === "string") return c;
    }
  }
  return "";
}

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
  const [view, setView] = useState<"main" | "merge" | "select">("main");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [resourcesOk, setResourcesOk] = useState<boolean | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [sourceSelected, setSourceSelected] = useState(false);

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
    setView("main");
    setConnecting(false);
    setSuspendModal(false);
    setResourcesOk(null);
    setSources([]);
    setSelectedSourceIndex(null);
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
    initWebTwain().catch(() => { /* ignore */ });
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

    // Populate available sources (avoid blocking SelectSource dialog)
    try {
      const dwt = dwtObjectRef.current;
      const names: string[] | undefined = typeof dwt.GetSourceNameItems === "function" ? dwt.GetSourceNameItems() : undefined;
      if (Array.isArray(names) && names.length > 0) {
        setSources(names);
        setSelectedSourceIndex((prev) => (typeof prev === "number" ? prev : 0));
      } else if (typeof dwt.SourceCount === "number" && typeof dwt.GetSourceNameItems === "function") {
        const list = dwt.GetSourceNameItems();
        if (Array.isArray(list) && list.length > 0) {
          setSources(list);
          setSelectedSourceIndex((prev) => (typeof prev === "number" ? prev : 0));
        }
      }
    } catch {
      // ignore
    }

    return true;
  };

  const stopScanner = () => {
    const dwt = dwtObjectRef.current;
    try {
      if (dwt && typeof dwt.CloseSource === "function") dwt.CloseSource();
    } catch { /* ignore */ }
    setConnected(false);
    setSourceSelected(false);
    toast.message("Scanner arrêté");
  };

  const changeScanner = async () => {
    setView("select");
    setConnecting(true);
    try {
      await handleConnect();
      // If connect succeeded, return to main view.
      setView("main");
    } finally {
      setConnecting(false);
    }
  };

  const refreshSources = () => {
    const dwt = dwtObjectRef.current;
    if (!dwt) return;
    try {
      const names: string[] | undefined = typeof dwt.GetSourceNameItems === "function" ? dwt.GetSourceNameItems() : undefined;
      if (Array.isArray(names)) {
        setSources(names);
        setSelectedSourceIndex((prev) => {
          if (typeof prev === "number" && prev >= 0 && prev < names.length) return prev;
          return names.length > 0 ? 0 : null;
        });
      }
    } catch {
      // ignore
    }
  };

  const handleConnect = async () => {
    if (!hasWebTwain) {
      toast.error("WebTWAIN (Dynamsoft) non détecté sur ce poste");
      return;
    }
    if (!hasProductKey) {
      toast.error("Clé WebTWAIN manquante (VITE_DWT_PRODUCT_KEY)");
      return;
    }
    setConnecting(true);
    try {
      const ok = await initWebTwain();
      if (!ok) return;

      // User-requested flow: show the native source selection dialog on connect.
      const dwt = dwtObjectRef.current;
      if (dwt && typeof dwt.SelectSourceAsync === "function") {
        try {
          // Hide our own modal while the native source picker is open.
          setSuspendModal(true);
          await dwt.SelectSourceAsync();
          setSourceSelected(true);
        } catch (e: any) {
          toast.error(e?.message || "Sélection du scanner annulée/échouée");
          return;
        } finally {
          setSuspendModal(false);
        }
      } else if (dwt && typeof selectedSourceIndex === "number" && typeof dwt.SelectSourceByIndex === "function") {
        try {
          dwt.SelectSourceByIndex(selectedSourceIndex);
          setSourceSelected(true);
        } catch {
          // ignore
        }
      }

      setConnected(true);
      toast.success("Scanner connecté");
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

      // Avoid re-opening the source selection dialog if user already selected a source during "connect".
      if (!sourceSelected) {
        if (typeof selectedSourceIndex === "number" && typeof dwt.SelectSourceByIndex === "function") {
          dwt.SelectSourceByIndex(selectedSourceIndex);
          setSourceSelected(true);
        } else if (typeof dwt.SelectSourceAsync === "function") {
          await dwt.SelectSourceAsync();
          setSourceSelected(true);
        }
      }

      if (typeof dwt.OpenSource === "function") {
        try { dwt.OpenSource(); } catch { /* ignore */ }
      }

      const withTimeout = async <T,>(p: Promise<T>, ms: number) => Promise.race<T>([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout scanner (sélection source bloquée ?)")), ms)),
      ]);

      if (typeof dwt.AcquireImageAsync === "function") {
        await withTimeout(dwt.AcquireImageAsync(deviceConfiguration), 45000);
      } else if (typeof dwt.AcquireImage === "function") {
        await withTimeout(new Promise<void>((resolve, reject) => {
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
        }), 45000);
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
        const base64Raw: any = await new Promise((resolve, reject) => {
          dwt.ConvertToBase64(
            [idx],
            imageType,
            (result: any) => resolve(result),
            (error: any) => reject(error),
          );
        });
        const base64 = extractBase64StringFromDwt(base64Raw);
        if (!base64) {
          // eslint-disable-next-line no-console
          console.warn("WebTWAIN ConvertToBase64 returned non-string", base64Raw);
        }

        const dataUrl = normalizeDataUrlFromDwtBase64(base64, "image/png");
        if (!dataUrl) {
          thumbs.push({
            id: Date.now() + i,
            dataUrl: createMockPageDataUrl(i + 1),
            bufferIndex: idx,
          });
          continue;
        }
        thumbs.push({
          id: Date.now() + i,
          dataUrl,
          bufferIndex: idx,
        });
      }
      setPages((prev) => [...prev, ...thumbs]);

      return true;
    } catch (e: any) {
      try { if (typeof dwt.CloseSource === "function") dwt.CloseSource(); } catch { /* ignore */ }
      toast.error(e?.message || "Échec du scan WebTWAIN");
      return false;
    }
  };

  const handleAddPage = async () => {
    if (!connected) return;
    setScanLoading(true);
    try {
      if (hasWebTwain) {
        const ok = await tryScanWithWebTwain();
        if (ok) {
          toast.success("Page ajoutée");
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
      toast.success("Page ajoutée");
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
    <Dialog open={isOpen && !suspendModal} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Scanner</DialogTitle>
              <DialogDescription>
                {view === 'merge' ? 'Fusionnez et nommez votre document avant l’enregistrement.' : 'Ajoutez des pages scannées puis fusionnez le document.'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPages([]);
                  setView('main');
                }}
              >
                Vider
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={changeScanner}
              >
                Changer scanner
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id={dwtContainerId} className="h-0 w-0 overflow-hidden" />

        {view === 'select' && (
          <div className="space-y-4">
            <div className="border rounded-md p-6 text-sm text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Sélection du scanner</div>
              <div>
                Une fenêtre de sélection va s’ouvrir. Choisis ton scanner, puis reviens ici.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setView("main")}>
                Annuler
              </Button>
              <Button type="button" onClick={changeScanner} disabled={connecting || !hasWebTwain || !hasProductKey}>
                {connecting ? "Ouverture…" : "Choisir un scanner"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {view === 'main' && (
          <div className="space-y-4">
            <div className="min-h-[320px] border rounded-md bg-background">
              {pages.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                  Aucun document scanné pour le moment.
                </div>
              ) : (
                <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {pages.map((p) => (
                    <div key={p.id} className="relative border rounded-md overflow-hidden">
                      <img src={p.dataUrl} alt="Page" className="w-full h-44 object-cover" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removePage(p.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="w-full flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPage}
                  disabled={!connected || scanLoading}
                >
                  {scanLoading ? 'Scan…' : 'Ajouter une page'}
                </Button>

                {!connected ? (
                  <Button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting || !hasWebTwain || !hasProductKey}
                  >
                    {connecting ? 'Connexion…' : 'Se connecter au scanner'}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={stopScanner}>
                    Arrêter
                  </Button>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setView('merge')}
                  disabled={pages.length === 0}
                >
                  Fusionner
                </Button>
              </div>
            </DialogFooter>

            {(!hasWebTwain || !hasProductKey || resourcesOk === false) && (
              <div className="text-xs text-muted-foreground border rounded-md p-3">
                {!hasWebTwain ? 'WebTWAIN non disponible sur ce poste.' : null}
                {hasWebTwain && !hasProductKey ? 'Clé WebTWAIN manquante (VITE_DWT_PRODUCT_KEY).' : null}
                {resourcesOk === false ? 'Ressources WebTWAIN introuvables (/dwt-resources).' : null}
                <div className="mt-2">
                  <span className="font-medium">Origin:</span> {origin || '?'} — <span className="font-medium">Mode:</span> {viteMode ?? '?'} — <span className="font-medium">env:</span> {envPresent ? 'ok' : 'absent'}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'merge' && (
          <div className="space-y-4">
            <div className="border rounded-md p-4 text-sm">
              <div className="font-medium mb-1">Fusion du document</div>
              <div className="text-muted-foreground">
                Donnez un nom à votre document puis enregistrez-le.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium">Nom du document</div>
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Nom d’inscription / Nom du document"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setView('main')}>
                Retour
              </Button>
              <Button type="button" onClick={handleSave} disabled={!canSave}>
                Enregistrer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScannerModal;
