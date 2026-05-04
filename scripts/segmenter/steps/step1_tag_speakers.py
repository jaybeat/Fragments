import json
import logging
import os

from lib.llm_client import LLMClient
from lib.episode_loader import build_tagged_turns

logger = logging.getLogger(__name__)

STEP1_SCHEMA = {
    "type": "object",
    "properties": {
        "speaker_assignments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "turn_index": {"type": "integer"},
                    "speaker": {"type": "string"},
                },
                "required": ["turn_index", "speaker"],
                "propertyOrdering": ["turn_index", "speaker"],
            },
        }
    },
    "required": ["speaker_assignments"],
    "propertyOrdering": ["speaker_assignments"],
}


def run(episode: dict, config: dict, client: LLMClient, prompts_dir: str) -> tuple[dict, dict]:
    """Step 1: Tag speakers for every turn.

    Returns:
        (output_dict, token_usage_dict)
    """
    episode_id = episode["id"]
    turns = episode["turns"]
    n_turns = len(turns)

    # Build prompt
    tagged_turns = build_tagged_turns(episode, speaker_assignments=None)
    prompt_template_path = os.path.join(prompts_dir, "01_speaker_tagging.txt")
    with open(prompt_template_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()
    prompt = prompt_template.replace("{tagged_turns}", tagged_turns)

    model = config["models"]["step1"]
    result, token_usage = client.call(
        prompt,
        model=model,
        response_schema=STEP1_SCHEMA,
        temperature=0.4,
    )

    speaker_assignments = result.get("speaker_assignments", [])

    # Validate coverage
    expected_indices = set(range(n_turns))
    actual_indices = {a["turn_index"] for a in speaker_assignments}

    missing = expected_indices - actual_indices
    extra = actual_indices - expected_indices
    if missing:
        raise ValueError(f"Step 1 missing turn indices: {sorted(missing)}")
    if extra:
        raise ValueError(f"Step 1 extra turn indices: {sorted(extra)}")

    # Sort by turn_index
    speaker_assignments.sort(key=lambda x: x["turn_index"])

    output = {
        "episode_id": episode_id,
        "speaker_assignments": speaker_assignments,
    }
    return output, token_usage
