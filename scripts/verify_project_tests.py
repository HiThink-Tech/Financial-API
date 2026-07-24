#!/usr/bin/env python3
"""Run the two independent project test suites in parallel.

Contract-specific and internal-Skill checks remain close to their owning workflows;
this entrypoint intentionally governs only the Python SDK and public CLI tests.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from time import monotonic


@dataclass(frozen=True)
class Gate:
    name: str
    command: tuple[str, ...]
    cwd: Path


@dataclass(frozen=True)
class GateResult:
    gate: Gate
    returncode: int
    duration_seconds: float
    stdout: str
    stderr: str


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def build_gates(root: Path, python: str) -> list[Gate]:
    return [
        Gate("python-sdk", (python, "-m", "pytest", "python/tests/", "-q"), root),
        Gate(
            "cli-release-smoke",
            ("node", "scripts/release-smoke.mjs"),
            root / "hithink-finance-cli",
        ),
    ]


def run_gate(gate: Gate) -> GateResult:
    started = monotonic()
    completed = subprocess.run(
        gate.command,
        cwd=gate.cwd,
        check=False,
        capture_output=True,
        text=True,
    )
    return GateResult(
        gate=gate,
        returncode=completed.returncode,
        duration_seconds=monotonic() - started,
        stdout=completed.stdout,
        stderr=completed.stderr,
    )


def run_all(gates: list[Gate]) -> list[GateResult]:
    with ThreadPoolExecutor(max_workers=len(gates)) as executor:
        futures = [executor.submit(run_gate, gate) for gate in gates]
        return sorted(
            (future.result() for future in as_completed(futures)),
            key=lambda result: result.gate.name,
        )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Python SDK and CLI release-smoke tests in parallel."
    )
    parser.add_argument("--dry-run", action="store_true", help="Print gates without running them.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable output.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    gates = build_gates(repo_root(), sys.executable)
    if args.dry_run:
        print(
            json.dumps(
                {
                    "parallel": True,
                    "gates": [
                        {
                            "name": gate.name,
                            "command": list(gate.command),
                            "cwd": str(gate.cwd),
                        }
                        for gate in gates
                    ],
                },
                ensure_ascii=False,
                indent=2 if args.json else None,
            )
        )
        return 0

    results = run_all(gates)
    payload = {
        "parallel": True,
        "results": [
            {
                "name": result.gate.name,
                "returncode": result.returncode,
                "duration_seconds": round(result.duration_seconds, 3),
            }
            for result in results
        ],
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for result in results:
            state = "PASS" if result.returncode == 0 else "FAIL"
            print(f"{state} {result.gate.name} ({result.duration_seconds:.1f}s)")
            if result.returncode != 0:
                if result.stdout:
                    print(result.stdout.rstrip())
                if result.stderr:
                    print(result.stderr.rstrip(), file=sys.stderr)
    return 0 if all(result.returncode == 0 for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
