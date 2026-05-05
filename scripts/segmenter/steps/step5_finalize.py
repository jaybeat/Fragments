import json
import logging
import os

logger = logging.getLogger(__name__)


def run(
    episode: dict,
    speaker_assignments: list[dict],
    t_segments: list[dict],
    p_segments: list[dict],
    config: dict,
    step2_output: dict = None,
) -> dict:
    """Step 5: Produce final analyzed.json.

    Returns:
        final episode dict with who, t_segments, p_segments
    """
    episode_id = episode["id"]
    speaker_name_map = config.get("speaker_name_map", {})
    # Priority: 1) explicit config mapping, 2) episode JSON speakerName, 3) fallback "Guest"
    default_guest_name = speaker_name_map.get(
        episode_id, episode.get("speakerName") or "Guest"
    )

    # Deep copy episode as base
    analyzed = json.loads(json.dumps(episode, ensure_ascii=False))

    # Override title/subtitle from step2 if present
    if step2_output:
        if "title" in step2_output and step2_output["title"]:
            analyzed["title"] = step2_output["title"]
        if "subtitle" in step2_output and step2_output["subtitle"]:
            analyzed["subtitle"] = step2_output["subtitle"]

    # Fill who fields
    who_map = {}
    for a in speaker_assignments:
        speaker = a["speaker"]
        if speaker == "Host":
            who_map[a["turn_index"]] = "Host"
        elif speaker == "Guest":
            who_map[a["turn_index"]] = default_guest_name
        else:
            # Speaker A / B / C etc.
            who_map[a["turn_index"]] = speaker

    for i, turn in enumerate(analyzed["turns"]):
        turn["who"] = who_map.get(i, "Unknown")

    # Build t_segments without turn_index fields
    final_t_segments = []
    for t in t_segments:
        final_t_segments.append({
            "id": t["id"],
            "start_sec": t["start_sec"],
            "end_sec": t["end_sec"],
            "topic": t["topic"],
            "summary": t["summary"],
        })

    # Build p_segments without turn_index fields, with duration_sec and transcript
    final_p_segments = []
    turns = episode["turns"]
    for p in p_segments:
        start_idx = p["start_turn_index"]
        end_idx = p["end_turn_index"]

        # Build transcript: Guest-only text within the P segment
        transcript_parts = []
        for idx in range(start_idx, end_idx + 1):
            speaker = next(
                (a["speaker"] for a in speaker_assignments if a["turn_index"] == idx),
                None,
            )
            if speaker == "Guest":
                transcript_parts.append(turns[idx]["text"])

        transcript = " ".join(transcript_parts)

        final_p_segments.append({
            "id": p["id"],
            "parent_t_id": p["parent_t_id"],
            "start_sec": p["start_sec"],
            "end_sec": p["end_sec"],
            "duration_sec": p["end_sec"] - p["start_sec"],
            "question": p["question"],
            "insight": p["insight"],
            "domain": p["domain"],
            "fine_tags": p["fine_tags"],
            "transcript": transcript,
        })

    analyzed["t_segments"] = final_t_segments
    analyzed["p_segments"] = final_p_segments

    return analyzed, {"input_tokens": 0, "output_tokens": 0}
