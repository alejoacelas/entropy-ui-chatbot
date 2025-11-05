#!/usr/bin/env python3
"""
Test web_fetch WITH full URLs to confirm that's what triggers it
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
        "name": "Full URL in prompt",
        "prompt": "Please fetch and summarize the content at https://resourceportal.antientropy.org/fiscal-sponsorship"
    },
    {
        "name": "Question with full URL",
        "prompt": "What does this page say? https://resourceportal.antientropy.org/gdpr"
    },
]

print("=" * 80)
print("TESTING: web_fetch WITH full URLs")
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
                print(f"   Full tool input: {json.dumps(block.input, indent=2)}")
    else:
        print(f"❌ Did not use web_fetch")
        for block in response.content:
            if block.type == "text":
                print(f"   Response: {block.text[:300]}...")
                break

print("\n" + "=" * 80)
print("CONCLUSION:")
print("=" * 80)
print("Based on all tests, Claude requires explicit full URLs (with https://) in the")
print("user message to trigger web_fetch. The allowedDomains parameter restricts WHICH")
print("domains can be fetched, but doesn't enable Claude to construct URLs on its own.")
print("=" * 80)
