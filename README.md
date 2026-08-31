## Requirements

- Atum: Checking for valid runs to avoid logging practice world or manually create world.
- SpeedrunIGT: Stats
- Hermes & Hermes Core:

## Setup

```bash
uv sync    # install all dependencies (runtime + dev)
```

## Dev Commands

```bash
uv run poe dev    # dev server + browser-sync hot reload (http://localhost:3000)
uv run poe lint       # ruff check
uv run poe format     # ruff format
uv run poe typecheck  # pyright
```

## Naming Conventions (Python)

`*_dir` for directories or any path that points to more files
`*_path` for a specific target
IO & Errors: explicitly open with "utf-8" and catch with OSError, DecodeError, KeyError
