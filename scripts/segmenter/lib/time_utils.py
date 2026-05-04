def format_seconds(sec: int) -> str:
    """Convert seconds to HH:MM:SS format."""
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def parse_hhmmss(text: str) -> int:
    """Convert HH:MM:SS or MM:SS to seconds."""
    parts = text.strip().split(":")
    if len(parts) == 3:
        h, m, s = map(int, parts)
        return h * 3600 + m * 60 + s
    elif len(parts) == 2:
        m, s = map(int, parts)
        return m * 60 + s
    elif len(parts) == 1:
        return int(parts[0])
    else:
        raise ValueError(f"Invalid time format: {text}")
