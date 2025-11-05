# Web Fetch Tool Testing - Results Summary

## Question
Can Claude use the `web_fetch` tool if the URL is not passed in full within user messages, when only the `allowedDomains` parameter is configured?

## Answer: NO

**Claude requires full URLs (including `https://`) in user messages to use the web_fetch tool.**

The `allowedDomains` parameter acts as a security filter/whitelist, not as an enabler for Claude to discover or construct URLs.

---

## What We Tested

### Test 1: Original prompt with guidance (fiscal sponsorship question)
- **Configuration**: `allowedDomains: ["resourceportal.antientropy.org"]`
- **Prompt**: Long guidance text + "What is fiscal sponsorship?"
- **Result**: ❌ Did NOT use web_fetch - answered from knowledge base

### Test 2: Variations without full URLs
Tried multiple prompt styles:
- "What does the Anti Entropy Resource Portal say about X?"
- "Can you check the Anti Entropy Resource Portal..."
- "Please fetch information from resourceportal.antientropy.org..."
- **Result**: ❌ Did NOT use web_fetch - Claude asks for specific URLs

### Test 3: Same prompts without guidance text
Removed the guidance to eliminate any directive against tool use
- **Result**: ❌ Still did NOT use web_fetch - Claude asks for specific URLs

### Test 4: With full URLs ✅
Provided complete URLs in the prompt:
- "Please summarize https://resourceportal.antientropy.org/fiscal-sponsorship"
- **Result**: ✅ SUCCESS - Claude used web_fetch and fetched the pages

---

## Key Findings

### How allowedDomains Works
```python
tools = [{
    "type": "web_fetch_20250910",
    "name": "web_fetch",
    "allowed_domains": ["resourceportal.antientropy.org"],  # Security whitelist
}]
```

- **Purpose**: Restrict which domains Claude CAN fetch from
- **Not for**: Enabling Claude to discover/construct URLs
- **Behavior**: Only allows fetching from specified domains; rejects others

### What Claude Needs
```
✅ Full URL with scheme:
   "Summarize https://resourceportal.antientropy.org/fiscal-sponsorship"

❌ Domain only:
   "Check resourceportal.antientropy.org for information about X"

❌ Implicit reference:
   "What does the Resource Portal say about X?"
```

### Response Structure (when successful)
```json
{
  "content": [
    {"type": "server_tool_use", "name": "web_fetch", "input": {"url": "..."}},
    {"type": "web_fetch_tool_result", "content": {...}},
    {"type": "text", "text": "Claude's summary..."}
  ]
}
```

---

## Files Created

1. **`test_web_fetch.py`** - Initial test with guidance text
2. **`test_web_fetch_variations.py`** - Multiple prompt variations
3. **`test_web_fetch_no_guidance.py`** - Tests without guidance text
4. **`test_web_fetch_full_urls.py`** - Tests with full URLs
5. **`test_web_fetch_debug.py`** - Debug script showing full response
6. **`working_example.py`** - Clean working example ✅
7. **`FINDINGS.md`** - Detailed findings document
8. **`README_WEB_FETCH_TEST.md`** - This summary

---

## Working Example

See `working_example.py` for a complete, working implementation that successfully uses web_fetch with full URLs.

```bash
python working_example.py
```

---

## Conclusion

**For your use case**: If you want Claude to access the Anti Entropy Resource Portal without users providing full URLs, you'll need an alternative approach:

### Options:
1. **Provide a URL list**: Give Claude a predefined list of portal URLs in the system prompt
2. **Use web_search first**: Let Claude search for URLs, then fetch them
3. **Custom RAG system**: Index the portal content and provide it via a custom tool
4. **Accept full URLs**: Require users to provide complete URLs in their questions

The `allowedDomains` parameter alone cannot enable Claude to explore a domain without explicit URLs.
