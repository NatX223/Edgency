import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import {
  downloadAsset,
  GTE_LARGE_FP16,
  loadModel,
  ragIngest,
  ragReindex,
  ragSearch,
  unloadModel,
  type ModelProgressUpdate,
} from '@qvac/sdk';

// ─── Constants ────────────────────────────────────────────────────────────────

// Bump this string whenever the .md source file changes.
// Triggers a full re-ingest on next launch.
const RAG_VERSION = '1.0.0';
const RAG_VERSION_KEY = 'rag_version';

// QVAC workspace name for the medical knowledge base
const RAG_WORKSPACE = 'medical';

// Minimum chunks needed for ragReindex (k-means clustering)
const MIN_DOCS_FOR_REINDEX = 16;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RAGPhase =
  | 'idle'
  | 'downloading_model'
  | 'loading_model'
  | 'copying_assets'
  | 'ingesting'
  | 'reindexing'
  | 'ready'
  | 'error';

export interface RAGStatus {
  phase: RAGPhase;
  label: string;
  progress: number | null; // 0–100 or null
}

export interface RAGResult {
  content: string;
  score?: number;
}

export interface UseRAGReturn {
  status: RAGStatus;
  isReady: boolean;
  search: (query: string, topK?: number) => Promise<RAGResult[]>;
}

// ─── Asset copy helper ────────────────────────────────────────────────────────
// Copies a bundled asset to the app's document directory so QVAC
// can read it as a real filesystem path.

async function copyAssetToFilesystem(
  moduleId: number,
  filename: string
): Promise<string> {
  const destPath = `${FileSystem.Directory}rag/${filename}`;
  const destDir  = `${FileSystem.Directory}rag/`;

  // Ensure the directory exists
  const dirInfo = await FileSystem.getInfoAsync(destDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
  }

  // Download (copies from bundle) the asset to a real file path
  const asset = await Asset.fromModule(moduleId).downloadAsync();
  if (!asset.localUri) throw new Error(`Asset ${filename} has no localUri after download`);

  await FileSystem.copyAsync({ from: asset.localUri, to: destPath });
  return destPath;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRAG(): UseRAGReturn {
  const embeddingsModelIdRef = useRef<string | null>(null);
  const cancelledRef         = useRef(false);

  const [status, setStatus] = useState<RAGStatus>({
    phase:    'idle',
    label:    'Preparing knowledge base…',
    progress: null,
  });

  const setPhase = (
    phase: RAGPhase,
    label: string,
    progress: number | null = null
  ) => {
    if (!cancelledRef.current) {
      setStatus({ phase, label, progress });
    }
  };

  // ── Main init effect ────────────────────────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false;

    (async () => {
      try {
        // ── Step 1: Check if we already ingested this version ────────────────
        const storedVersion = await AsyncStorage.getItem(RAG_VERSION_KEY);
        const needsIngest   = storedVersion !== RAG_VERSION;

        if (!needsIngest) {
          // Workspace already built — nothing to do, ready immediately
          setPhase('ready', 'Knowledge base ready');
          return;
        }

        // ── Step 2: Download embeddings model weights ────────────────────────
        setPhase('downloading_model', 'Downloading knowledge model…', 0);

        await downloadAsset({
          assetSrc: GTE_LARGE_FP16,
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelledRef.current) {
              setPhase('downloading_model', 'Downloading knowledge model…', Math.round(p.percentage));
            }
          },
        });

        if (cancelledRef.current) return;

        // ── Step 3: Load embeddings model ────────────────────────────────────
        setPhase('loading_model', 'Loading knowledge model…', 0);

        const embModelId = await loadModel({
          modelSrc:    GTE_LARGE_FP16,
          modelType:   'embeddings',
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelledRef.current) {
              setPhase('loading_model', 'Loading knowledge model…', Math.round(p.percentage));
            }
          },
        });

        if (cancelledRef.current) return;
        embeddingsModelIdRef.current = embModelId;

        // ── Step 4: Copy bundled .md asset to real filesystem path ───────────
        setPhase('copying_assets', 'Preparing documents…');

        const medicalDocPath = await copyAssetToFilesystem(
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('../assets/rag/medical-emergency.md'),
          'medical-emergency.md'
        );

        if (cancelledRef.current) return;

        // ── Step 5: Read the file content ────────────────────────────────────
        const medicalDocText = await FileSystem.readAsStringAsync(medicalDocPath);

        // Split on ## headers to get pre-chunked sections (each ~350 chars)
        // This respects our carefully crafted chunk boundaries from the .md file
        const rawSections = medicalDocText
          .split(/\n(?=## )/)
          .map(s => s.trim())
          .filter(s => s.length > 30 && !s.startsWith('#\n') && !s.startsWith('# Medical'));

        if (cancelledRef.current) return;

        // ── Step 6: Ingest into QVAC workspace ──────────────────────────────
        setPhase('ingesting', `Indexing ${rawSections.length} medical protocols…`, 0);

        // Delete old workspace if it exists (version changed)
        try {
          const { ragDeleteWorkspace } = await import('@qvac/sdk');
          await ragDeleteWorkspace({ workspace: RAG_WORKSPACE });
        } catch (_) {
          // Workspace may not exist on first run — that's fine
        }

        await ragIngest({
          modelId:   embModelId,
          documents: rawSections,
          workspace: RAG_WORKSPACE,
          onProgress: (stage: string, current: number, total: number) => {
            if (!cancelledRef.current) {
              const pct = total > 0 ? Math.round((current / total) * 100) : 0;
              setPhase('ingesting', `Indexing protocols… ${stage} ${current}/${total}`, pct);
            }
          },
        });

        if (cancelledRef.current) return;

        // ── Step 7: Reindex for optimal search (needs ≥16 docs) ─────────────
        if (rawSections.length >= MIN_DOCS_FOR_REINDEX) {
          setPhase('reindexing', 'Optimising search index…');
          try {
            await ragReindex({
              workspace: RAG_WORKSPACE,
              onProgress: (stage: string, current: number, total: number) => {
                if (!cancelledRef.current) {
                  const pct = total > 0 ? Math.round((current / total) * 100) : null;
                  setPhase('reindexing', `Optimising search index… ${stage}`, pct);
                }
              },
            });
          } catch (e) {
            // Reindex failure is non-fatal — search still works without it
            console.warn('[useRAG] reindex failed (non-fatal):', e);
          }
        }

        if (cancelledRef.current) return;

        // ── Step 8: Unload embeddings model to free memory for LLM ──────────
        await unloadModel({
          modelId:      embModelId,
          clearStorage: false,
        });
        embeddingsModelIdRef.current = null;

        // ── Step 9: Persist version so we skip ingestion next launch ─────────
        await AsyncStorage.setItem(RAG_VERSION_KEY, RAG_VERSION);

        setPhase('ready', 'Knowledge base ready');
      } catch (e: any) {
        if (!cancelledRef.current) {
          console.error('[useRAG] init failed:', e?.message ?? String(e));
          setPhase('error', `Knowledge base unavailable: ${e?.message ?? String(e)}`);
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
      // Unload embeddings model if still loaded at unmount
      const id = embeddingsModelIdRef.current;
      if (id) {
        void unloadModel({ modelId: id, clearStorage: false }).catch(() => {});
        embeddingsModelIdRef.current = null;
      }
    };
  }, []);

  // ── Search function ─────────────────────────────────────────────────────────
  // Loads the embeddings model briefly, searches, then unloads it.
  // This keeps memory free for the LLM between searches.
  const search = useCallback(async (
    query: string,
    topK = 3
  ): Promise<RAGResult[]> => {
    if (status.phase !== 'ready') {
      console.warn('[useRAG] search called before ready');
      return [];
    }

    let searchModelId: string | null = null;

    try {
      // Load embeddings model for this search
      searchModelId = await loadModel({
        modelSrc:  GTE_LARGE_FP16,
        modelType: 'embeddings',
      });

      const results = await ragSearch({
        modelId:   searchModelId,
        query,
        topK,
        workspace: RAG_WORKSPACE,
      });

      // Unload immediately after search to free memory for LLM
      await unloadModel({ modelId: searchModelId, clearStorage: false });
      searchModelId = null;

      return results.map(r => ({
        // content: r.content ?? r.text ?? String(r),
        content: r.content ?? String(r),
        score:   r.score,
      }));
    } catch (e: any) {
      console.error('[useRAG] search failed:', e?.message ?? String(e));
      // Always try to unload on error
      if (searchModelId) {
        await unloadModel({ modelId: searchModelId, clearStorage: false }).catch(() => {});
      }
      return [];
    }
  }, [status.phase]);

  return {
    status,
    isReady: status.phase === 'ready',
    search,
  };
}