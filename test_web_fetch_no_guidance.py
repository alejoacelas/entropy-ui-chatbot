#!/usr/bin/env python3
"""
Test web_fetch WITHOUT the guidance text that discourages tool use
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

test_cases = [
    {
        "name": "Simple question about portal",
        "prompt": "What does the Anti Entropy Resource Portal say about fiscal sponsorship?"
    },
    {
        "name": "Explicit request to fetch",
        "prompt": "Please fetch and summarize information from resourceportal.antientropy.org about GDPR compliance."
    },
    {
        "name": "Question with domain hint",
        "prompt": "Can you check resourceportal.antientropy.org for information about UK nonprofit compliance?"
    },
    {
        "name": "Direct instruction with domain",
        "prompt": "Fetch the content from resourceportal.antientropy.org/fiscal-sponsorship and tell me what it says."
    },
]

print("=" * 80)
print("TESTING: web_fetch WITHOUT guidance text")
print("=" * 80)

for test_case in test_cases:
    print(f"\n{test_case['name']}")
    print(f"Prompt: {test_case['prompt']}\n")

    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2000,
        tools=tools,
        messages=[{"role": "user", "content": test_case["prompt"]}],
        extra_headers={"anthropic-beta": "web-fetch-2025-09-10"}
    )

    used_web_fetch = any(
        block.type == "tool_use" and block.name == "web_fetch"
        for block in response.content
    )

    if used_web_fetch:
        print(f"✅ SUCCESS! Used web_fetch")
        for block in response.content:
            if block.type == "tool_use" and block.name == "web_fetch":
                print(f"   URL: {block.input.get('url', 'N/A')}")
                print(f"   Full input: {json.dumps(block.input, indent=2)}")
    else:
        print(f"❌ Did not use web_fetch")
        for block in response.content:
            if block.type == "text":
                print(f"   Response: {block.text[:250]}...")
                break

print("\n" + "=" * 80)
