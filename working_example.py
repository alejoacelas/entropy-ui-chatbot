#!/usr/bin/env python3
"""
Working example of web_fetch tool usage

This demonstrates that Claude CAN use web_fetch successfully,
but ONLY when provided with full URLs in the user message.
"""

import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Configure web_fetch tool with allowed domain
tools = [
    {
        "type": "web_fetch_20250910",
        "name": "web_fetch",
        "max_uses": 10,
        "allowed_domains": ["resourceportal.antientropy.org"],
        "citations": {"enabled": True}
    }
]

# This works - full URL provided
prompt = """
Please fetch and summarize the following pages from the Anti Entropy Resource Portal:
1. https://resourceportal.antientropy.org/fiscal-sponsorship
2. https://resourceportal.antientropy.org/fiscal-sponsorship-models

Compare the two pages and tell me what additional information is in the second page.
"""

print("=" * 80)
print("WORKING EXAMPLE: web_fetch with full URLs")
print("=" * 80)
print(f"\nPrompt:\n{prompt}\n")
print("Calling Anthropic API...")
print("=" * 80)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4000,
    tools=tools,
    messages=[{"role": "user", "content": prompt}],
    extra_headers={"anthropic-beta": "web-fetch-2025-09-10"}
)

# Display results
print("\nRESULT:")
print("=" * 80)

web_fetch_count = sum(
    1 for block in response.content
    if hasattr(block, 'type') and block.type == "server_tool_use"
)

print(f"✅ web_fetch was used {web_fetch_count} time(s)\n")

# Show URLs fetched
for block in response.content:
    if hasattr(block, 'type') and block.type == "server_tool_use":
        print(f"   Fetched: {block.input.get('url')}")

# Show Claude's response
print("\nClaude's Response:")
print("-" * 80)
for block in response.content:
    if hasattr(block, 'type') and block.type == "text":
        print(block.text)

print("\n" + "=" * 80)
print("SUCCESS! Claude used web_fetch when given full URLs.")
print("=" * 80)
