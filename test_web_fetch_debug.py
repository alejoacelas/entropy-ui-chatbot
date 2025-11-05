#!/usr/bin/env python3
"""
Debug version - print full response to see what's happening
"""

import os
import json
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

tools = [
    {
        "type": "web_fetch_20250910",
        "name": "web_fetch",
        "max_uses": 10,
        "allowed_domains": ["resourceportal.antientropy.org"],
        "citations": {
            "enabled": True
        }
    }
]

prompt = "Please summarize what's at https://resourceportal.antientropy.org/fiscal-sponsorship"

print("=" * 80)
print("DEBUGGING web_fetch")
print("=" * 80)
print(f"Prompt: {prompt}\n")

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4000,
    tools=tools,
    messages=[{"role": "user", "content": prompt}],
    extra_headers={"anthropic-beta": "web-fetch-2025-09-10"}
)

print("\nFULL RESPONSE:")
print(json.dumps(response.model_dump(), indent=2))

print("\n" + "=" * 80)
print("ANALYSIS:")
print("=" * 80)
print(f"Stop reason: {response.stop_reason}")
print(f"Content blocks: {len(response.content)}")

for i, block in enumerate(response.content):
    print(f"\nBlock {i}:")
    print(f"  Type: {block.type}")
    if block.type == "tool_use":
        print(f"  Tool name: {block.name}")
        print(f"  Tool input: {block.input}")
    elif block.type == "text":
        print(f"  Text (first 200 chars): {block.text[:200]}")

print("=" * 80)
