import json
import logging

logger = logging.getLogger(__name__)


def run(
    episode: dict,
    t_segments: list[dict],
    p_segments: list[dict],
    config: dict,
) -> dict:
    """Step 4: Automated quality check.

    Returns:
        quality_report dict
    """
    episode_id = episode["id"]
    duration = episode["duration"]
    thresholds = config["quality_thresholds"]

    total_p_duration = sum(p["end_sec"] - p["start_sec"] for p in p_segments)
    p_coverage_ratio = total_p_duration / duration if duration > 0 else 0

    warnings = []

    # Coverage ratio
    if p_coverage_ratio < thresholds["p_coverage_min"] or p_coverage_ratio > thresholds["p_coverage_max"]:
        warnings.append({
            "type": "coverage_out_of_range",
            "ratio": round(p_coverage_ratio, 2),
            "message": f"P 段总时长占比 {p_coverage_ratio:.2f}, 超出 [{thresholds['p_coverage_min']}, {thresholds['p_coverage_max']}] 范围",
        })

    # Individual P duration
    for p in p_segments:
        p_dur = p["end_sec"] - p["start_sec"]
        if p_dur < thresholds["p_duration_min_sec"]:
            warnings.append({
                "type": "too_short_p",
                "p_id": p["id"],
                "duration_sec": p_dur,
                "message": f"P 段 {p['id']} 时长仅 {p_dur} 秒,可能切坏了",
            })
        if p_dur > thresholds["p_duration_max_sec"]:
            warnings.append({
                "type": "too_long_p",
                "p_id": p["id"],
                "duration_sec": p_dur,
                "message": f"P 段 {p['id']} 时长 {p_dur} 秒,超过 {thresholds['p_duration_max_sec']} 秒",
            })

    # Domain "其他" ratio
    if p_segments:
        other_count = sum(1 for p in p_segments if "其他" in p.get("domain", []))
        other_ratio = other_count / len(p_segments)
        if other_ratio > thresholds["domain_other_max_ratio"]:
            warnings.append({
                "type": "too_many_other_domain",
                "ratio": round(other_ratio, 2),
                "message": f"domain 为'其他'的 P 段占比 {other_ratio:.2f},超过阈值 {thresholds['domain_other_max_ratio']}",
            })

    # Question similarity
    if len(p_segments) >= 2:
        try:
            from sentence_transformers import SentenceTransformer
            import numpy as np

            model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            questions = [p["question"] for p in p_segments]
            embeddings = model.encode(questions, convert_to_numpy=True)
            # Normalize
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
            sim_matrix = np.dot(embeddings, embeddings.T)

            for i in range(len(p_segments)):
                for j in range(i + 1, len(p_segments)):
                    sim = float(sim_matrix[i][j])
                    if sim > thresholds["question_similarity_max"]:
                        warnings.append({
                            "type": "similar_questions",
                            "p_id_1": p_segments[i]["id"],
                            "p_id_2": p_segments[j]["id"],
                            "similarity": round(sim, 3),
                            "message": f"P 段 {p_segments[i]['id']} 与 {p_segments[j]['id']} question 相似度 {sim:.3f}",
                        })
        except Exception as e:
            logger.warning(f"Sentence similarity check skipped: {e}")

    # T segments with no P segments
    t_ids_with_p = {p["parent_t_id"] for p in p_segments}
    for t in t_segments:
        if t["id"] not in t_ids_with_p:
            warnings.append({
                "type": "t_segment_with_no_p",
                "t_id": t["id"],
                "message": f"T 段 {t['id']} 没有 P 段(info)",
            })

    # Determine status
    severe_warnings = [w for w in warnings if w["type"] != "t_segment_with_no_p"]
    if len(p_segments) == 0:
        status = "error"
    elif severe_warnings:
        status = "warning"
    else:
        status = "ok"

    output = {
        "episode_id": episode_id,
        "summary": {
            "total_t_segments": len(t_segments),
            "total_p_segments": len(p_segments),
            "p_coverage_ratio": round(p_coverage_ratio, 2),
            "audio_duration_sec": duration,
            "p_total_duration_sec": total_p_duration,
            "status": status,
        },
        "warnings": warnings,
    }
    return output, {"input_tokens": 0, "output_tokens": 0}
