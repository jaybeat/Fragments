#!/usr/bin/env python3
"""Segmenter pipeline runner.

Usage:
    python scripts/segmenter/run.py --episode-id jobs-lost-interview
    python scripts/segmenter/run.py --episode-id jobs-lost-interview --from-step 2
    python scripts/segmenter/run.py --episode-id jobs-lost-interview --force
"""

import argparse
import json
import logging
import os
import sys
import time

import yaml

# Ensure script directory is on path for absolute imports
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from lib.episode_loader import load_episode, episode_path
from lib.llm_client import LLMClient
from steps import (
    step1_tag_speakers,
    step2_segment_t,
    step3_segment_p,
    step4_quality_check,
    step5_finalize,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("segmenter")


def load_config(config_path: str) -> dict:
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def write_json(path: str, data: dict) -> None:
    ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def read_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_dotenv(project_root: str) -> None:
    """Load .env file into os.environ if present (mirrors tsx --env-file=.env)."""
    env_path = os.path.join(project_root, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = value.strip()


def run_step(
    step_num: int,
    step_name: str,
    output_path: str,
    run_fn,
    run_args: dict,
    model_key: str,
    force: bool,
) -> dict:
    if os.path.exists(output_path) and not force:
        logger.info(f"[Step {step_num}] Output exists, skipping: {output_path}")
        return read_json(output_path)

    step_start = time.time()
    started_at = time.strftime("%H:%M:%S")
    logger.info(f"[Step {step_num}] {step_name}... started at {started_at}")

    try:
        result, token_usage = run_fn(**run_args)
        write_json(output_path, result)
        elapsed = time.time() - step_start
        models = run_args["config"].get("models", {})
        if model_key in models:
            logger.info(
                f"  -> LLM call: {models[model_key]}, "
                f"input={token_usage['input_tokens']} tok, output={token_usage['output_tokens']} tok"
            )
        logger.info(f"  -> Output: {output_path}")
        logger.info(f"  -> Done in {elapsed:.1f}s")
        return result
    except Exception as e:
        logger.error(f"[Step {step_num}] Failed: {e}")
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Episode segmenter pipeline")
    parser.add_argument(
        "--episode-id",
        required=True,
        help="Episode ID (e.g. jobs-lost-interview)",
    )
    parser.add_argument(
        "--from-step",
        type=int,
        default=1,
        choices=range(1, 6),
        metavar="N",
        help="Start from step N (1-5)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rerun even if output exists",
    )
    args = parser.parse_args()

    # Resolve paths relative to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    _load_dotenv(project_root)

    config_path = os.path.join(script_dir, "config.yaml")
    prompts_dir = os.path.join(script_dir, "prompts")

    config = load_config(config_path)
    episodes_dir = os.path.join(project_root, config["paths"]["episodes_dir"])
    intermediate_dir = os.path.join(project_root, config["paths"]["intermediate_dir"])

    ep_path = episode_path(episodes_dir, args.episode_id)
    if not os.path.exists(ep_path):
        logger.error(f"Episode not found: {ep_path}")
        sys.exit(1)

    episode = load_episode(ep_path)
    ep_intermediate_dir = os.path.join(intermediate_dir, args.episode_id)
    ensure_dir(ep_intermediate_dir)

    api_key = os.environ.get(config["api"]["key_env"])
    if not api_key:
        logger.error(
            f"Environment variable {config['api']['key_env']} is not set.\n"
            f"  Run: cp .env.example .env  and fill in your key."
        )
        sys.exit(1)

    client = LLMClient(api_key)
    total_start = time.time()

    # Step 1
    step1_path = os.path.join(ep_intermediate_dir, "01_speakers.json")
    if args.from_step <= 1:
        step1_result = run_step(
            1,
            "Tag speakers",
            step1_path,
            step1_tag_speakers.run,
            {"episode": episode, "config": config, "client": client, "prompts_dir": prompts_dir},
            "step1",
            args.force,
        )
    else:
        step1_result = read_json(step1_path)
    speaker_assignments = step1_result["speaker_assignments"]

    # Step 2
    step2_path = os.path.join(ep_intermediate_dir, "02_t_segments.json")
    if args.from_step <= 2:
        step2_result = run_step(
            2,
            "Segment T",
            step2_path,
            step2_segment_t.run,
            {
                "episode": episode,
                "speaker_assignments": speaker_assignments,
                "config": config,
                "client": client,
                "prompts_dir": prompts_dir,
            },
            "step2",
            args.force,
        )
    else:
        step2_result = read_json(step2_path)
    t_segments = step2_result["t_segments"]

    # Step 3
    step3_path = os.path.join(ep_intermediate_dir, "03_p_segments.json")
    if args.from_step <= 3:
        step3_result = run_step(
            3,
            "Segment P",
            step3_path,
            step3_segment_p.run,
            {
                "episode": episode,
                "speaker_assignments": speaker_assignments,
                "t_segments": t_segments,
                "config": config,
                "client": client,
                "prompts_dir": prompts_dir,
            },
            "step3",
            args.force,
        )
    else:
        step3_result = read_json(step3_path)
    p_segments = step3_result["p_segments"]

    # Step 4
    step4_path = os.path.join(ep_intermediate_dir, "04_quality_report.json")
    if args.from_step <= 4:
        step4_result = run_step(
            4,
            "Quality check",
            step4_path,
            step4_quality_check.run,
            {
                "episode": episode,
                "t_segments": t_segments,
                "p_segments": p_segments,
                "config": config,
            },
            "step4",  # not used by LLM, but kept for consistency
            args.force,
        )
    else:
        step4_result = read_json(step4_path)

    # Step 5
    step5_path = os.path.join(episodes_dir, f"{args.episode_id}.analyzed.json")
    if args.from_step <= 5:
        step5_result = run_step(
            5,
            "Finalize",
            step5_path,
            step5_finalize.run,
            {
                "episode": episode,
                "speaker_assignments": speaker_assignments,
                "t_segments": t_segments,
                "p_segments": p_segments,
                "config": config,
            },
            "step5",  # not used by LLM
            args.force,
        )
    else:
        step5_result = read_json(step5_path)

    total_elapsed = time.time() - total_start
    logger.info(
        f"Total time: {total_elapsed:.1f}s, "
        f"Total tokens: {client.total_input_tokens + client.total_output_tokens}"
    )


if __name__ == "__main__":
    main()
