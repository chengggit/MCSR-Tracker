# MCSR Tracker

A local tracker for Minecraft Speedrunning with a web dashboard that runs entirely on your computer.

> **Note:** This tracker is built with Any% Glitchless in mind, and will probably not work with other categories.

## Features

- Fully local, no account or login required
- Automatic run tracking
- Web dashboard for viewing run statistics
- Run history and split data
- Save seed when `/seed` is run

## Installation

### Requirements

- Python 3.14+
- **Required Mods:**
  - Atum
  - SpeedrunIGT
  - Hermes
  - Hermes Core

Please refer to the [Minecraft Speedrunning public resources](https://www.minecraftspeedrunning.com/public-resources/tools-and-resources) to download the required mods.

### Automatic Installation

You can inspect the [install script](./install.py) before running it.

#### Linux

Default installation path: `$XDG_DATA_HOME/mcsr-tracker` (defaults to `~/.local/share/mcsr-tracker`)

```bash
curl -fsSL https://raw.githubusercontent.com/chengggit/MCSR-Tracker/main/install.py | python
```

#### Windows

Default installation path: `%LOCALAPPDATA%\mcsr-tracker`

```powershell
irm https://raw.githubusercontent.com/chengggit/MCSR-Tracker/main/install.py | py
```

Follow the on-screen instructions after installation to make `mcsr` a global command.

### Manual Installation

1. Download `mcsr_tracker-<version>-py3-none-any.whl` from the [latest release](../../releases/latest).
2. Follow the commands below to create a Python virtual environment and install the tracker.

#### Linux

```bash
python -m venv venv
source venv/bin/activate
pip install path/to/mcsr_tracker-<version>-py3-none-any.whl
```

After installation, run:

```bash
mcsr setup
```

#### Windows

```powershell
python -m venv venv
venv\Scripts\activate
python -m pip install C:\path\to\mcsr_tracker-<version>-py3-none-any.whl
```

After installation, run:

```bash
mcsr setup
```

### From Source

With pip:

```bash
git clone https://github.com/chengggit/MCSR-Tracker.git
cd MCSR-Tracker
python -m venv venv

# Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install .
```

After installation, run:

```bash
mcsr setup
```

With uv:

```bash
git clone https://github.com/chengggit/MCSR-Tracker.git
cd MCSR-Tracker
uv sync --no-dev
```

After installation, run:

```bash
mcsr setup
```

## Usage

Start the tracker:

```bash
mcsr track <instance-name>
```

Start the tracker and open the web dashboard:

```bash
mcsr track <instance-name> --dashboard
```

Start the web dashboard:

```bash
mcsr dashboard
```

More commands and options can be found with:

```bash
mcsr --help
```

## Development

### Prerequisites

- Python 3.14+
- [uv](https://docs.astral.sh/uv/)
- Node.js

Clone the repository and install dependencies:

```bash
git clone https://github.com/chengggit/MCSR-Tracker.git
cd MCSR-Tracker
uv sync
npm install
```

### Development Commands

```bash
uv run poe dev            # Start the development server with hot reload
uv run poe lint           # Lint the project
uv run poe fix            # Lint and automatically fix issues
uv run poe format         # Format the project
uv run poe format-check   # Check formatting
uv run poe typecheck      # Run type checking
```

### API

The API is available at: <http://127.0.0.1:8000/api>

Interactive API documentation with Swagger UI: <http://127.0.0.1:8000/docs>

Alternative API documentation with ReDoc: <http://127.0.0.1:8000/redoc>

## License

This project is licensed under the [MIT License](LICENSE).

## Contribution

All contributions are welcome!
