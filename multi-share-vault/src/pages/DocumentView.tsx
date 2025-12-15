import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type DocumentMeta = {
  id: number;
  name?: string;
  mime_type?: string | null;
  created_at?: string;
  created_by_name?: string | null;
};

const DocumentView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const docId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [mime, setMime] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    const cleanup = () => {
      if (createdUrl) {
        try { URL.revokeObjectURL(createdUrl); } catch { /* ignore */ }
        createdUrl = null;
      }
    };

    const run = async () => {
      if (typeof docId !== "number") return;
      setLoading(true);
      setMeta(null);
      setMime(null);
      setText(null);
      setUrl(null);
      cleanup();
      try {
        const res = await apiFetch(`/api/documents/${docId}`, { toast: { error: { enabled: true, message: "Impossible de charger le document" } } });
        if (!res.ok) return;
        const m = (await res.json()) as DocumentMeta;
        if (cancelled) return;
        setMeta(m);
        const mt = (m?.mime_type ?? null) as string | null;
        setMime(mt);

        const fileRes = await fetch(`/api/documents/${docId}/download?ts=${Date.now()}` as RequestInfo, { credentials: 'include', cache: 'no-store' as RequestCache });
        if (!fileRes.ok) return;

        if (mt && mt.startsWith('text/')) {
          const t = await fileRes.text();
          if (!cancelled) setText(t);
          return;
        }

        const blob = await fileRes.blob();
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(createdUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [docId]);

  if (typeof docId !== "number") {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-muted-foreground">Document invalide.</div>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>
    );
  }

  const title = (meta?.name ?? `Document #${docId}`).replace(/\.[^.]+$/, "");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {meta?.created_by_name ? `Téléversé par ${meta.created_by_name}` : ""}
            {meta?.created_at ? `${meta?.created_by_name ? " • " : ""}${new Date(meta.created_at).toLocaleString('fr-FR')}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Retour
          </Button>
          <Button
            type="button"
            onClick={() => {
              const a = document.createElement('a');
              a.href = `/api/documents/${docId}/download`;
              a.download = meta?.name ?? `document-${docId}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            Télécharger
          </Button>
        </div>
      </div>

      <div className="rounded border bg-background p-2 min-h-[60vh]">
        {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}

        {!loading && text !== null && (
          <pre className="w-full h-full overflow-auto p-4 bg-muted rounded text-sm whitespace-pre-wrap break-words">{text}</pre>
        )}

        {!loading && text === null && url && (
          mime?.startsWith('image/') ? (
            <img src={url} alt={meta?.name ?? "document"} className="max-w-full h-auto object-contain" />
          ) : mime?.startsWith('video/') ? (
            <video src={url} controls className="w-full h-full" />
          ) : mime?.startsWith('audio/') ? (
            <audio src={url} controls className="w-full" />
          ) : (mime?.includes('pdf')) ? (
            <object data={url} type="application/pdf" className="w-full h-[75vh] border rounded">
              <a href={url} target="_blank" rel="noreferrer">Ouvrir le PDF</a>
            </object>
          ) : (
            <iframe src={url} title={meta?.name ?? "document"} className="w-full h-[75vh] border rounded" />
          )
        )}

        {!loading && text === null && !url && (
          <div className="text-sm text-muted-foreground">Aperçu indisponible.</div>
        )}
      </div>
    </div>
  );
};

export default DocumentView;
