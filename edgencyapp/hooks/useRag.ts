import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import {
  downloadAsset,
  GTE_LARGE_FP16,
  loadModel,
  ragIngest,
  ragReindex,
  ragSearch,
  unloadModel,
  type LoadModelOptions,
  type ModelProgressUpdate,
} from '@qvac/sdk';

// ─── Constants ────────────────────────────────────────────────────────────────

// Bump this string whenever ANY .md source file changes.
// Triggers a full re-ingest of all workspaces on next launch.
const RAG_VERSION = '1.3.0';
const RAG_VERSION_KEY = 'rag_version';

// QVAC workspace names — one per knowledge domain
const WORKSPACE_MEDICAL = 'medical';   // WHO prehospital protocols     (68 chunks)
const WORKSPACE_GENERAL = 'general';   // FEMA earthquake + landslide   (34 chunks)
const WORKSPACE_WATER   = 'water';     // FEMA flood + tsunami           (29 chunks)
const WORKSPACE_STORM   = 'storm';     // FEMA thunderstorm + lightning  (17 chunks)

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
  const destPath = `${FileSystem.documentDirectory}rag/${filename}`;
  const destDir  = `${FileSystem.documentDirectory}rag/`;

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

// If a previous run crashed before unloading, the model stays registered.
// Rather than hard-failing, extract the ID from the error and reuse it.
async function safeLoadModel(
  params: LoadModelOptions
): Promise<string> {
  try {
    return await loadModel(params);
  } catch (e: any) {
    const match = e?.message?.match(/Model with ID "([^"]+)" is already registered/);
    if (match) return match[1] as string;
    throw e;
  }
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

        const embModelId = await safeLoadModel({
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

        // ── Step 4: Copy both bundled .md assets to real filesystem paths ────
        setPhase('copying_assets', 'Preparing documents…');

        const [medicalDocPath, generalDocPath, waterDocPath, stormDocPath] = await Promise.all([
          copyAssetToFilesystem(
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('../assets/rag/medical-emergency.md'),
            'medical-emergency.md'
          ),
          copyAssetToFilesystem(
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('../assets/rag/earthquake-landslide.md'),
            'earthquake-landslide.md'
          ),
          copyAssetToFilesystem(
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('../assets/rag/flood-tsunami.md'),
            'flood-tsunami.md'
          ),
          copyAssetToFilesystem(
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('../assets/rag/thunderstorm-lightning.md'),
            'thunderstorm-lightning.md'
          ),
        ]);

        if (cancelledRef.current) return;

        // ── Step 5: Read and chunk all four files ────────────────────────────
        const [medicalDocText, generalDocText, waterDocText, stormDocText] = await Promise.all([
          FileSystem.readAsStringAsync(medicalDocPath),
          FileSystem.readAsStringAsync(generalDocPath),
          FileSystem.readAsStringAsync(waterDocPath),
          FileSystem.readAsStringAsync(stormDocPath),
        ]);

        // Split on ## headers — respects our carefully crafted chunk boundaries
        const chunkDoc = (text: string, skipPrefix: string) =>
          text
            .split(/\n(?=## )/)
            .map(s => s.trim())
            .filter(s => s.length > 30 && !s.startsWith('#\n') && !s.startsWith(skipPrefix));

        const medicalChunks = chunkDoc(medicalDocText, '# Medical');
        const generalChunks = chunkDoc(generalDocText, '# Earthquake');
        const waterChunks   = chunkDoc(waterDocText,   '# Flood');
        const stormChunks   = chunkDoc(stormDocText,   '# Thunderstorm');

        if (cancelledRef.current) return;

        // ── Step 6: Clear old workspaces if version changed ──────────────────
        try {
          const { ragDeleteWorkspace } = await import('@qvac/sdk');
          await Promise.allSettled([
            ragDeleteWorkspace({ workspace: WORKSPACE_MEDICAL }),
            ragDeleteWorkspace({ workspace: WORKSPACE_GENERAL }),
            ragDeleteWorkspace({ workspace: WORKSPACE_WATER }),
            ragDeleteWorkspace({ workspace: WORKSPACE_STORM }),
          ]);
        } catch (_) {
          // Workspaces may not exist on first run — that's fine
        }

        // ── Step 7a: Ingest medical protocols ────────────────────────────────
        // progress: null while current===0 → shows indeterminate bar during cold-start
        setPhase('ingesting', `Indexing ${medicalChunks.length} medical protocols…`, null);

        await ragIngest({
          modelId:   embModelId,
          documents: medicalChunks,
          workspace: WORKSPACE_MEDICAL,
          onProgress: (stage: string, current: number, total: number) => {
            if (!cancelledRef.current) {
              const pct = current > 0 && total > 0 ? Math.round((current / total) * 100) : null;
              setPhase('ingesting', `Medical protocols… ${current}/${total}`, pct);
            }
          },
        });

        if (cancelledRef.current) return;

        // ── Step 7b: Ingest earthquake + landslide protocols ─────────────────
        setPhase('ingesting', `Indexing ${generalChunks.length} disaster protocols…`, null);

        await ragIngest({
          modelId:   embModelId,
          documents: generalChunks,
          workspace: WORKSPACE_GENERAL,
          onProgress: (stage: string, current: number, total: number) => {
            if (!cancelledRef.current) {
              const pct = current > 0 && total > 0 ? Math.round((current / total) * 100) : null;
              setPhase('ingesting', `Disaster protocols… ${current}/${total}`, pct);
            }
          },
        });

        if (cancelledRef.current) return;

        // ── Step 7c: Ingest flood + tsunami protocols ─────────────────────────
        setPhase('ingesting', `Indexing ${waterChunks.length} flood & tsunami protocols…`, null);

        await ragIngest({
          modelId:   embModelId,
          documents: waterChunks,
          workspace: WORKSPACE_WATER,
          onProgress: (stage: string, current: number, total: number) => {
            if (!cancelledRef.current) {
              const pct = current > 0 && total > 0 ? Math.round((current / total) * 100) : null;
              setPhase('ingesting', `Flood & tsunami protocols… ${current}/${total}`, pct);
            }
          },
        });

        if (cancelledRef.current) return;

        // ── Step 7d: Ingest thunderstorm + lightning protocols ────────────────
        setPhase('ingesting', `Indexing ${stormChunks.length} storm protocols…`, null);

        await ragIngest({
          modelId:   embModelId,
          documents: stormChunks,
          workspace: WORKSPACE_STORM,
          onProgress: (stage: string, current: number, total: number) => {
            if (!cancelledRef.current) {
              const pct = current > 0 && total > 0 ? Math.round((current / total) * 100) : null;
              setPhase('ingesting', `Storm protocols… ${current}/${total}`, pct);
            }
          },
        });

        if (cancelledRef.current) return;

        // ── Step 8: Reindex all four workspaces for optimal search ───────────
        // medical: 68, general: 34, water: 29, storm: 17 — all ≥16
        setPhase('reindexing', 'Optimising search indexes…');
        try {
          await Promise.allSettled([
            medicalChunks.length >= MIN_DOCS_FOR_REINDEX
              ? ragReindex({
                  workspace: WORKSPACE_MEDICAL,
                  onProgress: (stage: string, current: number, total: number) => {
                    if (!cancelledRef.current) {
                      const pct = total > 0 ? Math.round((current / total) * 100) : null;
                      setPhase('reindexing', `Optimising medical index… ${stage}`, pct);
                    }
                  },
                })
              : Promise.resolve(),
            generalChunks.length >= MIN_DOCS_FOR_REINDEX
              ? ragReindex({
                  workspace: WORKSPACE_GENERAL,
                  onProgress: (stage: string, current: number, total: number) => {
                    if (!cancelledRef.current) {
                      const pct = total > 0 ? Math.round((current / total) * 100) : null;
                      setPhase('reindexing', `Optimising disaster index… ${stage}`, pct);
                    }
                  },
                })
              : Promise.resolve(),
            waterChunks.length >= MIN_DOCS_FOR_REINDEX
              ? ragReindex({
                  workspace: WORKSPACE_WATER,
                  onProgress: (stage: string, current: number, total: number) => {
                    if (!cancelledRef.current) {
                      const pct = total > 0 ? Math.round((current / total) * 100) : null;
                      setPhase('reindexing', `Optimising flood & tsunami index… ${stage}`, pct);
                    }
                  },
                })
              : Promise.resolve(),
            stormChunks.length >= MIN_DOCS_FOR_REINDEX
              ? ragReindex({
                  workspace: WORKSPACE_STORM,
                  onProgress: (stage: string, current: number, total: number) => {
                    if (!cancelledRef.current) {
                      const pct = total > 0 ? Math.round((current / total) * 100) : null;
                      setPhase('reindexing', `Optimising storm index… ${stage}`, pct);
                    }
                  },
                })
              : Promise.resolve(),
          ]);
        } catch (e) {
          console.warn('[useRAG] reindex failed (non-fatal):', e);
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
  // Queries ALL THREE workspaces in parallel, merges results, and returns
  // the top-K by score. A medical question gets WHO chunks, an earthquake
  // question gets FEMA general chunks, a flood question gets water chunks,
  // and a cross-hazard question (e.g. "tsunami injury") gets the best from all.
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
      searchModelId = await safeLoadModel({
        modelSrc:  GTE_LARGE_FP16,
        modelType: 'embeddings',
      });

      // Search all four workspaces in parallel
      const [medicalResults, generalResults, waterResults, stormResults] = await Promise.allSettled([
        ragSearch({ modelId: searchModelId, query, topK, workspace: WORKSPACE_MEDICAL }),
        ragSearch({ modelId: searchModelId, query, topK, workspace: WORKSPACE_GENERAL }),
        ragSearch({ modelId: searchModelId, query, topK, workspace: WORKSPACE_WATER }),
        ragSearch({ modelId: searchModelId, query, topK, workspace: WORKSPACE_STORM }),
      ]);

      // Unload immediately to free memory for LLM
      await unloadModel({ modelId: searchModelId, clearStorage: false });
      searchModelId = null;

      // Merge all candidates, sort by score, return global top-K
      const combined: RAGResult[] = [];

      for (const result of [medicalResults, generalResults, waterResults, stormResults]) {
        if (result.status === 'fulfilled') {
          combined.push(...result.value.map(r => ({
            content: r.content ?? String(r),
            score:   r.score ?? 0,
          })));
        }
      }

      combined.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return combined.slice(0, topK);

    } catch (e: any) {
      console.error('[useRAG] search failed:', e?.message ?? String(e));
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
