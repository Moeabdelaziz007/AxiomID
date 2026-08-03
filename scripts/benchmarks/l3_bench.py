#!/usr/bin/env python3
"""
L3 Memory Benchmark - Python version for AxiomID/scripts/benchmarks
Measures end-to-end recall latency for the flat-TS kernel at scale.
"""

import json
import time
import statistics
import random
import math
import numpy as np
from typing import List, Dict, Any


def make_vector(dim: int, seed: int) -> np.ndarray:
    """Deterministic pseudo-random vector for benchmarks."""
    rng = np.random.RandomState(seed)
    v = rng.uniform(-1, 1, dim)
    return v.astype(np.float32)


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors."""
    dot = np.dot(a, b)
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(dot / (na * nb))


def truncate_matryoshka(emb: np.ndarray, dim: int = 256) -> np.ndarray:
    """Truncate embedding to Matryoshka dimension."""
    return emb[:dim]


def quantize_int8(emb: np.ndarray) -> tuple:
    """INT8 quantization with per-dim calibration."""
    max_abs = np.max(np.abs(emb))
    scale = max_abs / 127 if max_abs > 0 else 1.0
    q = np.clip(np.round(emb / scale), -127, 127).astype(np.int8)
    mean = np.zeros_like(emb, dtype=np.float32)
    scale_arr = np.full_like(emb, scale, dtype=np.float32)
    return q, mean, scale_arr


def dequantize_int8(q: np.ndarray, mean: np.ndarray, scale: np.ndarray) -> np.ndarray:
    """Dequantize INT8 back to float."""
    return q.astype(np.float32) * scale + mean


def bench_kernel(dim: int, iters: int = 100000) -> float:
    """Benchmark cosine similarity kernel."""
    a = make_vector(dim, 1)
    b = make_vector(dim, 2)
    
    # Warmup
    for _ in range(1000):
        cosine_sim(a, b)
    
    start = time.perf_counter()
    for _ in range(iters):
        cosine_sim(a, b)
    end = time.perf_counter()
    
    return (end - start) / iters * 1000  # ms per call


def build_facts(N: int, base_dim: int = 768) -> List[Dict]:
    """Build N deterministic facts."""
    facts = []
    for i in range(N):
        v = make_vector(base_dim, i + 1)
        facts.append({
            'id': f'f{i}',
            'factKey': f'k:{i}',
            'content': f'fact {i}',
            'serial': 1,
            'validFrom': 0,
            'validTo': None,
            'embedding': v,
            'mat256': truncate_matryoshka(v),
            'int8_data': None,  # Will be filled
            'int8_mean': None,
            'int8_scale': None,
        })
    return facts


def recall_flat(facts: List[Dict], query: np.ndarray, limit: int = 10, rescore_k: int = 64) -> List[tuple]:
    """Flat recall: mat256 first pass, then f32 rescore on top-k."""
    query_mat = truncate_matryoshka(query)
    
    # First pass: cosine on mat256
    scored = []
    for f in facts:
        s = cosine_sim(query_mat, f['mat256'])
        scored.append((f, s))
    
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:min(rescore_k, len(scored))]
    
    # Rescore on full f32
    rescored = [(f, cosine_sim(query, f['embedding'])) for f, _ in top]
    rescored.sort(key=lambda x: x[1], reverse=True)
    
    return rescored[:limit]


def percentile(arr: List[float], p: float) -> float:
    """Compute percentile."""
    sorted_arr = sorted(arr)
    idx = int(math.ceil(p / 100 * len(sorted_arr))) - 1
    return sorted_arr[max(0, idx)]


def run_bench(N: int, dim: int, iters: int = 5) -> Dict:
    """Run benchmark for given N and dimension."""
    facts = build_facts(N, base_dim=768)
    query = make_vector(768, 100)
    
    latencies = []
    for _ in range(iters):
        start = time.perf_counter()
        recall_flat(facts, query, limit=10, rescore_k=64)
        latencies.append((time.perf_counter() - start) * 1000)
    
    return {
        'N': N,
        'dim': dim,
        'p50': percentile(latencies, 50),
        'p95': percentile(latencies, 95),
        'p99': percentile(latencies, 99),
        'mean': statistics.mean(latencies),
    }


def main():
    print("=== L3 Kill-Rule Benchmark (Python) ===\n")
    
    results = []
    
    # Kernel benchmarks
    print("Kernel microbenchmarks:")
    for dim in [256, 768, 1024]:
        t_cosine = bench_kernel(dim)
        print(f"  cosineSim(d={dim}): {t_cosine:.4f} ms/call")
        
        for N in [10000, 50000, 100000]:
            t_recall = N * t_cosine + 64 * t_cosine + 0.5
            gate = ""
            if dim == 256 and N == 10000:
                if t_recall < 5:
                    gate = " -> PASS (SKIP WASM)"
                elif t_recall < 20:
                    gate = " -> PROFILE"
                else:
                    gate = " -> FAIL -> M4 WASM HNSW"
            print(f"  N={N:>6}: ~{t_recall:.2f}ms extrapolated{gate}")
            results.append({
                'dim': dim,
                'N': N,
                't_cosine': t_cosine,
                't_recall_extrapolated': t_recall
            })
        print()
    
    # End-to-end recall at N=100 (for model validation)
    print("End-to-end recall validation (N=100, d=256 first pass):")
    facts = build_facts(100, base_dim=768)
    query = make_vector(768, 100)
    
    # Warmup
    for _ in range(5):
        recall_flat(facts, make_vector(768, 100))
    
    latencies = []
    for _ in range(50):
        start = time.perf_counter()
        recall_flat(facts, query)
        latencies.append((time.perf_counter() - start) * 1000)
    
    p95 = percentile(latencies, 95)
    extrapolated = p95 * 100  # Extrapolate to N=10k
    
    print(f"  p50={percentile(latencies, 50):.2f}ms  p95={p95:.2f}ms  p99={percentile(latencies, 99):.2f}ms")
    print(f"  Extrapolated N=10k: ~{extrapolated:.1f}ms")
    if extrapolated < 5:
        print("  GATE: PASS (SKIP WASM)")
    elif extrapolated < 20:
        print("  GATE: PROFILE (I/O vs CPU?)")
    else:
        print("  GATE: FAIL -> M4 WASM HNSW")
    
    results.append({
        'dim': 256,
        'N': 100,
        'p50': percentile(latencies, 50),
        'p95': p95,
        'p99': percentile(latencies, 99),
        'extrapolated_10k': extrapolated
    })
    
    # Save results
    output = {
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'platform': 'python',
        'results': results
    }
    
    with open('bench/l3-kill-rule-results.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\nResults written to bench/l3-kill-rule-results.json")


if __name__ == '__main__':
    import json
    import math
    import os
    os.makedirs('bench', exist_ok=True)
    main()