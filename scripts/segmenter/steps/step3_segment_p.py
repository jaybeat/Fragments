import json
import logging
import os

from lib.llm_client import LLMClient
from lib.episode_loader import build_tagged_turns

logger = logging.getLogger(__name__)

STEP3_SCHEMA = {
    "type": "object",
    "properties": {
        "t_segment_id": {"type": "string"},
        "p_segments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "start_turn_index": {"type": "integer"},
                    "end_turn_index": {"type": "integer"},
                    "question": {"type": "string"},
                    "insight": {"type": "string"},
                    "domain": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "fine_tags": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "domain_note": {"type": "string"},
                },
                "required": ["id", "start_turn_index", "end_turn_index", "question", "insight", "domain", "fine_tags"],
                "propertyOrdering": ["id", "start_turn_index", "end_turn_index", "question", "insight", "domain", "fine_tags", "domain_note"],
            },
        },
    },
    "required": ["t_segment_id", "p_segments"],
    "propertyOrdering": ["t_segment_id", "p_segments"],
}


def _get_speaker(turn_index: int, speaker_assignments: list[dict]) -> str | None:
    return next(
        (a["speaker"] for a in speaker_assignments if a["turn_index"] == turn_index),
        None,
    )


def _snap_to_guest(
    p_start: int,
    p_end: int,
    t_start: int,
    t_end: int,
    speaker_assignments: list[dict],
) -> tuple[int, int] | None:
    """Adjust P-segment endpoints so both are Guest.

    Moves start forward and end backward within the T-segment bounds
    until both endpoints are Guest. Returns None if no valid range remains.
    """
    # Move start forward to next Guest
    while p_start <= t_end and _get_speaker(p_start, speaker_assignments) != "Guest":
        p_start += 1
    # Move end backward to previous Guest
    while p_end >= t_start and _get_speaker(p_end, speaker_assignments) != "Guest":
        p_end -= 1
    if p_start > p_end:
        return None
    return p_start, p_end


def run(
    episode: dict,
    speaker_assignments: list[dict],
    t_segments: list[dict],
    config: dict,
    client: LLMClient,
    prompts_dir: str,
) -> tuple[dict, dict]:
    """Step 3: Within each T segment, extract P segments with labels.

    Returns:
        (output_dict, token_usage_dict)
    """
    episode_id = episode["id"]
    turns = episode["turns"]
    n_turns = len(turns)
    duration = episode["duration"]
    valid_domains = set(config["domain_taxonomy"])

    prompt_template_path = os.path.join(prompts_dir, "03_p_segmentation.txt")
    with open(prompt_template_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    all_p_segments = []
    total_token_usage = {"input_tokens": 0, "output_tokens": 0}

    model = config["models"]["step3"]

    for t_seg in t_segments:
        t_id = t_seg["id"]
        t_start = t_seg["start_turn_index"]
        t_end = t_seg["end_turn_index"]

        # Build sub-episode with only this T segment's turns
        sub_turns = turns[t_start : t_end + 1]
        sub_assignments = [a for a in speaker_assignments if t_start <= a["turn_index"] <= t_end]
        sub_episode = {"turns": sub_turns}

        tagged_turns = build_tagged_turns(sub_episode, sub_assignments, base_index=t_start)
        prompt = (
            prompt_template
            .replace("{t_topic}", t_seg["topic"])
            .replace("{t_summary}", t_seg["summary"])
            .replace("{tagged_turns}", tagged_turns)
        )

        result, token_usage = client.call(
            prompt,
            model=model,
            response_schema=STEP3_SCHEMA,
            temperature=0.4,
        )
        total_token_usage["input_tokens"] += token_usage["input_tokens"]
        total_token_usage["output_tokens"] += token_usage["output_tokens"]

        raw_p_segments = result.get("p_segments", [])

        for p in raw_p_segments:
            p_start = p["start_turn_index"]
            p_end = p["end_turn_index"]

            # Bounds check (strict)
            if p_start < t_start or p_end > t_end:
                logger.warning(
                    f"Skipping P segment {p['id']}: bounds {p_start}-{p_end} exceed "
                    f"T segment {t_id} bounds {t_start}-{t_end}"
                )
                continue

            # Snap endpoints to Guest
            adjusted = _snap_to_guest(p_start, p_end, t_start, t_end, speaker_assignments)
            if adjusted is None:
                logger.warning(
                    f"Skipping P segment {p['id']}: no Guest endpoints within "
                    f"T segment {t_id}"
                )
                continue
            p_start, p_end = adjusted
            p["start_turn_index"] = p_start
            p["end_turn_index"] = p_end

            # Validate domain
            for d in p["domain"]:
                if d not in valid_domains and d != "其他":
                    raise ValueError(
                        f"P segment {p['id']} has invalid domain '{d}'"
                    )

            # Compute start_sec / end_sec
            p["start_sec"] = int(turns[p_start]["start"])
            if p_end + 1 < n_turns:
                p["end_sec"] = int(turns[p_end + 1]["start"])
            else:
                p["end_sec"] = duration

            p["parent_t_id"] = t_id
            all_p_segments.append(p)

    # Regenerate IDs to ensure consistency (LLM sometimes returns wrong IDs)
    # Group by parent_t_id and renumber
    from collections import defaultdict
    by_parent = defaultdict(list)
    for p in all_p_segments:
        by_parent[p["parent_t_id"]].append(p)

    all_p_segments = []
    for t_id in sorted(by_parent.keys(), key=lambda x: int(x[1:]) if x.startswith("T") and x[1:].isdigit() else x):
        segs = by_parent[t_id]
        segs.sort(key=lambda x: x["start_turn_index"])
        for i, p in enumerate(segs, start=1):
            p["id"] = f"{t_id}_P{i}"
            all_p_segments.append(p)

    # Sort by start_turn_index
    all_p_segments.sort(key=lambda x: x["start_turn_index"])

    output = {
        "episode_id": episode_id,
        "p_segments": all_p_segments,
    }
    return output, total_token_usage
