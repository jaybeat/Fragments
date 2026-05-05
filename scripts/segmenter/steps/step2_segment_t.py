import json
import logging
import os

from lib.llm_client import LLMClient
from lib.episode_loader import build_tagged_turns

logger = logging.getLogger(__name__)

STEP2_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "subtitle": {"type": "string"},
        "t_segments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "start_turn_index": {"type": "integer"},
                    "end_turn_index": {"type": "integer"},
                    "topic": {"type": "string"},
                    "summary": {"type": "string"},
                },
                "required": ["id", "start_turn_index", "end_turn_index", "topic", "summary"],
                "propertyOrdering": ["id", "start_turn_index", "end_turn_index", "topic", "summary"],
            },
        }
    },
    "required": ["title", "subtitle", "t_segments"],
    "propertyOrdering": ["title", "subtitle", "t_segments"],
}


def run(
    episode: dict,
    speaker_assignments: list[dict],
    config: dict,
    client: LLMClient,
    prompts_dir: str,
) -> tuple[dict, dict]:
    """Step 2: Segment interview into topic-level T segments.

    Returns:
        (output_dict, token_usage_dict)
    """
    episode_id = episode["id"]
    turns = episode["turns"]
    n_turns = len(turns)
    duration = episode["duration"]

    tagged_turns = build_tagged_turns(episode, speaker_assignments)
    prompt_template_path = os.path.join(prompts_dir, "02_t_segmentation.txt")
    with open(prompt_template_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()
    prompt = prompt_template.replace("{tagged_turns}", tagged_turns)

    model = config["models"]["step2"]
    result, token_usage = client.call(
        prompt,
        model=model,
        response_schema=STEP2_SCHEMA,
        temperature=0.4,
    )

    title = result.get("title", "")
    subtitle = result.get("subtitle", "")
    t_segments = result.get("t_segments", [])

    # Validate contiguity and coverage
    if not t_segments:
        raise ValueError("Step 2 returned empty t_segments")

    if t_segments[0]["start_turn_index"] != 0:
        raise ValueError(
            f"First T segment must start at turn 0, got {t_segments[0]['start_turn_index']}"
        )

    # Tolerate common off-by-one on the last segment (LLM sometimes counts 1-based)
    last_end = t_segments[-1]["end_turn_index"]
    if last_end == n_turns:
        logger.warning(
            f"Capping last T segment end_turn_index from {last_end} to {n_turns - 1}"
        )
        t_segments[-1]["end_turn_index"] = n_turns - 1
    elif last_end < n_turns - 1:
        # LLM sometimes omits trailing turns (e.g. credits); extend last segment to cover them
        logger.warning(
            f"Extending last T segment end_turn_index from {last_end} to {n_turns - 1}"
        )
        t_segments[-1]["end_turn_index"] = n_turns - 1
    elif last_end != n_turns - 1:
        raise ValueError(
            f"Last T segment must end at turn {n_turns - 1}, got {last_end}"
        )

    for i in range(1, len(t_segments)):
        prev_end = t_segments[i - 1]["end_turn_index"]
        cur_start = t_segments[i]["start_turn_index"]
        if cur_start != prev_end + 1:
            raise ValueError(
                f"T segment gap at index {i}: previous ends at {prev_end}, current starts at {cur_start}"
            )

    # Compute start_sec / end_sec from turn indices
    for seg in t_segments:
        start_idx = seg["start_turn_index"]
        end_idx = seg["end_turn_index"]
        seg["start_sec"] = int(turns[start_idx]["start"])
        if end_idx + 1 < n_turns:
            seg["end_sec"] = int(turns[end_idx + 1]["start"])
        else:
            seg["end_sec"] = duration

    output = {
        "episode_id": episode_id,
        "title": title,
        "subtitle": subtitle,
        "t_segments": t_segments,
    }
    return output, token_usage
