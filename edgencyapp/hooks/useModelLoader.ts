import { useState, useEffect, useRef } from "react";
import {
  downloadAsset,
  GEMMA4_2B_MULTIMODAL_Q4_K_M,
  LLAMA_TOOL_CALLING_1B_INST_Q4_K,
  MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
  loadModel,
  type ModelProgressUpdate,
  unloadModel,
  VERBOSITY,
} from "@qvac/sdk";
import type { IncidentType } from "@/components/home/IncidentCard";
import type React from "react";

const MEDPSY_URL = 'https://huggingface.co/buckets/NatXeth/MedPsy-1.7B-GGUF-bucket/resolve/medpsy-1.7b-q4_k_m-imat.gguf?download=true';

export type ModelStatus = "idle" | "downloading" | "loading" | "ready" | "error";

interface P2PConfig {
  isLoaded: boolean;
  mode: string;
  providerPublicKey?: string | null;
}

interface ModelLoaderOptions {
  incidentType: IncidentType | null;
  speedMode: boolean;
  p2pConfig: P2PConfig;
  logActionRef: React.MutableRefObject<(action: any) => void>;
}

export function useModelLoader({ incidentType, speedMode, p2pConfig, logActionRef }: ModelLoaderOptions) {
  const [modelId,     setModelId]     = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const modelIdRef   = useRef<string | null>(null);
  const modelTypeRef = useRef<'medical' | 'general'>('general');

  useEffect(() => {
    if (!p2pConfig.isLoaded) return;
    let cancelled = false;
    const isMedical = incidentType === 'medical';
    const isSpeed = !isMedical && speedMode;
    const isDelegating = p2pConfig.mode === 'consumer' && !!p2pConfig.providerPublicKey;
    const modelDisplayName = isMedical
      ? 'MedPsy 1.7B Q4_K_M'
      : isSpeed
        ? 'Llama Tool Calling 1B Q4_K'
        : 'Gemma 4 2B Multimodal Q4_K_M';

    (async () => {
      try {
        void logActionRef.current({ actionType: 'model_load_start', message: `Loading ${modelDisplayName}`, metadata: { modelName: modelDisplayName, incidentType, device: 'gpu', mode: isDelegating ? 'p2p' : 'local' } });
        setModelStatus("idle");
        setModelId(null);
        setDownloadPct(null);

        let id: string;

        if (isDelegating) {
          // ── Delegate mode: skip local download, route inference to peer ──
          setModelStatus("loading");
          const modelSrc = isMedical ? MEDPSY_URL : isSpeed ? LLAMA_TOOL_CALLING_1B_INST_Q4_K : GEMMA4_2B_MULTIMODAL_Q4_K_M;
          id = await loadModel({
            modelSrc,
            modelType: "llamacpp-completion",
            delegate: {
              providerPublicKey: p2pConfig.providerPublicKey!,
              timeout: 60_000,
            },
          } as any);
          modelTypeRef.current = isMedical ? 'medical' : 'general';
        } else {
          // ── Local mode: download then load on-device ──────────────────────
          setModelStatus("downloading");

          if (isMedical) {
            await downloadAsset({ assetSrc: MEDPSY_URL, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
          } else if (isSpeed) {
            await downloadAsset({ assetSrc: LLAMA_TOOL_CALLING_1B_INST_Q4_K, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
          } else {
            await downloadAsset({ assetSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
            await downloadAsset({ assetSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
          }

          if (cancelled) return;
          setModelStatus("loading");
          setDownloadPct(null);

          if (isMedical) {
            id = await loadModel({ modelSrc: MEDPSY_URL, modelType: "llamacpp-completion", modelConfig: { device: "gpu", ctx_size: 4096, verbosity: VERBOSITY.ERROR }, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
            modelTypeRef.current = 'medical';
          } else if (isSpeed) {
            id = await loadModel({ modelSrc: LLAMA_TOOL_CALLING_1B_INST_Q4_K, modelType: "llamacpp-completion", modelConfig: { device: "gpu", ctx_size: 2048, verbosity: VERBOSITY.ERROR }, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
            modelTypeRef.current = 'general';
          } else {
            id = await loadModel({ modelSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M, modelType: "llamacpp-completion", modelConfig: { device: "gpu", ctx_size: 4096, verbosity: VERBOSITY.ERROR, tools: true, projectionModelSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16 }, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
            modelTypeRef.current = 'general';
          }
        }

        if (cancelled) return;
        modelIdRef.current = id;
        setModelId(id);
        setModelStatus("ready");
        setDownloadPct(null);
        void logActionRef.current({ actionType: 'model_load_complete', message: `Model ready: ${modelDisplayName}`, metadata: { modelId: id, modelName: modelDisplayName, device: 'gpu', mode: isDelegating ? 'p2p' : 'local', incidentType } });
      } catch (e: any) {
        if (!cancelled) {
          setModelStatus("error");
          void logActionRef.current({ actionType: 'model_load_error', message: `Model load failed: ${e?.message ?? String(e)}`, metadata: { modelName: modelDisplayName, incidentType } });
          console.error("[QVAC] Init failed:", e?.message ?? String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      const id = modelIdRef.current;
      modelIdRef.current = null;
      if (id) void unloadModel({ modelId: id, clearStorage: false }).catch(() => {});
    };
  }, [incidentType, speedMode, p2pConfig.isLoaded, p2pConfig.mode, p2pConfig.providerPublicKey]);

  return { modelId, modelIdRef, modelTypeRef, modelStatus, downloadPct };
}
