#!/usr/bin/env python3
"""
Test different prompt variations to see if Claude will use web_fetch
without full URLs being provided in the user message
"""

import os
import json
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Configure the web_fetch tool
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

# Test variations
test_cases = [
    {
        "name": "Test 1: Ask for specific resource portal content",
        "prompt": "What does the Anti Entropy Resource Portal say about fiscal sponsorship models?"
    },
    {
        "name": "Test 2: Request to check the resource portal",
        "prompt": "Can you check the Anti Entropy Resource Portal to tell me what fiscal sponsorship models they describe?"
    },
    {
        "name": "Test 3: Ask about specific/recent content",
        "prompt": "What are the latest guidelines on the Anti Entropy Resource Portal about UK nonprofit compliance?"
    },
    {
        "name": "Test 4: Explicit instruction to fetch",
        "prompt": "Please fetch information from the Anti Entropy Resource Portal about their GDPR compliance guide and summarize it."
    },
    {
        "name": "Test 5: Question about content you don't know",
        "prompt": "What specific templates does the Anti Entropy Resource Portal provide for board member codes of conduct?"
    },
]

def run_test(test_name, prompt):
    print("\n" + "=" * 80)
    print(f"{test_name}")
    print("=" * 80)
    print(f"Prompt: {prompt}\n")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2000,
            tools=tools,
            messages=[{"role": "user", "content": prompt}],
            extra_headers={"anthropic-beta": "web-fetch-2025-09-10"}
        )

        # Check if web_fetch was used
        used_web_fetch = any(
            block.type == "tool_use" and block.name == "web_fetch"
            for block in response.content
        )

        print(f"✅ Used web_fetch: {used_web_fetch}")

        if used_web_fetch:
            for block in response.content:
                if block.type == "tool_use" and block.name == "web_fetch":
                    print(f"   URL fetched: {block.input.get('url', 'N/A')}")
        else:
            # Print first part of text response
            for block in response.content:
                if block.type == "text":
                    print(f"   Response: {block.text[:200]}...")
                    break

        return used_web_fetch

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

# Run all tests
print("=" * 80)
print("TESTING: Can Claude use web_fetch without full URLs?")
print("Trying different prompt variations...")
print("=" * 80)

results = []
for test_case in test_cases:
    used_fetch = run_test(test_case["name"], test_case["prompt"])
    results.append((test_case["name"], used_fetch))

# Summary
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
for name, used_fetch in results:
    status = "✅ SUCCESS" if used_fetch else "❌ NO FETCH"
    print(f"{status}: {name}")

print("\n" + "=" * 80)
if any(used for _, used in results):
    print("CONCLUSION: At least one variation successfully triggered web_fetch!")
else:
    print("CONCLUSION: None of the variations triggered web_fetch.")
    print("\nClaude appears to require explicit URLs in the user message to use web_fetch,")
    print("or the guidance text discourages tool use in favor of answering from knowledge.")
print("=" * 80)
