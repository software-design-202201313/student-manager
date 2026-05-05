"""Kafka KRaft PoC smoke test (SMS-48, ADR-002 R-1 게이트).

토픽 생성 → produce 1건 → consume 1건 → payload 비교 → 토픽 정리.
컨테이너에 내장된 kafka CLI를 docker exec로 호출하므로 추가 Python 의존성이 없다.

Usage:
    python scripts/kafka_smoke.py [--container sm-kafka] [--topic sms.smoke]

Exit code 0 → PoC 통과 (ADR-002 R-1 ✅), 1 → 실패 (Redpanda fallback 트리거).
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import uuid


def run(cmd: list[str], *, input_: str | None = None, timeout: int = 30) -> str:
    """Run a command, raise on non-zero, return stdout."""
    result = subprocess.run(
        cmd,
        input=input_,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"command failed: {' '.join(cmd)}\nstderr: {result.stderr.strip()}"
        )
    return result.stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", default="sm-kafka")
    parser.add_argument("--topic", default="sms.smoke")
    parser.add_argument("--bootstrap", default="localhost:9092")
    args = parser.parse_args()

    topic = f"{args.topic}.{uuid.uuid4().hex[:8]}"
    payload = {"event_id": str(uuid.uuid4()), "marker": "kraft-poc-ok"}
    payload_json = json.dumps(payload, ensure_ascii=False)

    base = ["docker", "exec", "-i", args.container]
    bootstrap = ["--bootstrap-server", args.bootstrap]

    try:
        run(
            base
            + ["kafka-topics", "--create", "--topic", topic, "--partitions", "1", "--replication-factor", "1"]
            + bootstrap
        )
        print(f"[1/3] created topic {topic}", flush=True)

        run(
            base
            + ["kafka-console-producer", "--topic", topic, "--request-required-acks", "-1"]
            + bootstrap,
            input_=payload_json + "\n",
        )
        time.sleep(1)
        print("[2/3] produced 1 message", flush=True)

        out = run(
            base
            + [
                "kafka-console-consumer",
                "--topic",
                topic,
                "--from-beginning",
                "--max-messages",
                "1",
                "--timeout-ms",
                "10000",
            ]
            + bootstrap,
            timeout=30,
        )
        consumed = out.strip().splitlines()[-1] if out.strip() else ""
        print(f"[3/3] consumed: {consumed}", flush=True)

        if json.loads(consumed) != payload:
            print(f"FAIL: payload mismatch (sent={payload_json}, got={consumed})", file=sys.stderr)
            return 1

    finally:
        try:
            run(base + ["kafka-topics", "--delete", "--topic", topic] + bootstrap, timeout=15)
        except RuntimeError as exc:
            print(f"[cleanup] topic delete failed (non-fatal): {exc}", file=sys.stderr)

    print("PASS — Kafka KRaft round-trip OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
