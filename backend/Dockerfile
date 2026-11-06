FROM python:3.14-slim

# Borrow the uv program from its official image.
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies before copying the code, so Docker can reuse this step
# when only the code changes. --frozen installs exactly what uv.lock lists.
COPY pyproject.toml uv.lock ./
RUN UV_PYTHON_DOWNLOADS=never uv sync --frozen --no-dev

COPY app.py ./

# Run as a regular user rather than root.
RUN useradd --create-home appuser
USER appuser

EXPOSE 5000

# Tasks live in this process's memory, so there must be exactly 1 worker: each
# extra worker would get its own separate task list. Threads share that memory,
# so they can handle several requests at once.
CMD [".venv/bin/gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--access-logfile", "-", "app:app"]
