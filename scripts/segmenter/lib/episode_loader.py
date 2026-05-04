import json
import os
from .time_utils import format_seconds


def load_episode(path: str) -> dict:
    """Load and return an episode JSON dict."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Episode JSON not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_tagged_turns(
    episode: dict,
    speaker_assignments: list[dict] | None = None,
    base_index: int = 0,
) -> str:
    """Build the tagged transcript string fed to LLM prompts.

    Format without speakers:
      [idx=0, t=00:00:00] Text...

    Format with speakers:
      [idx=0, t=00:00:00, Host] Text...

    Args:
        base_index: offset added to each turn index (used when sending a T-segment
                    subset so indices remain absolute).
    """
    turns = episode["turns"]
    lines = []
    for i, turn in enumerate(turns):
        idx = base_index + i
        t = format_seconds(int(turn["start"]))
        text = turn["text"]
        if speaker_assignments is not None:
            speaker = next(
                (a["speaker"] for a in speaker_assignments if a["turn_index"] == idx),
                "Unknown",
            )
            lines.append(f"[idx={idx}, t={t}, {speaker}] {text}")
        else:
            lines.append(f"[idx={idx}, t={t}] {text}")
    return "\n".join(lines)


def episode_path(episodes_dir: str, episode_id: str) -> str:
    return os.path.join(episodes_dir, f"{episode_id}.json")
