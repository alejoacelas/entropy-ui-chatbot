# Web Fetch Tool Testing Results

## Summary

After extensive testing, here are the findings about Claude's use of the `web_fetch` tool:

## ✅ When Claude DOES Use web_fetch

Claude successfully uses the `web_fetch` tool when:
- A **full URL** (including `https://`) is provided in the user message
- The URL domain matches the `allowedDomains` parameter

### Example that works:
```python
prompt = "Please summarize what's at https://resourceportal.antientropy.org/fiscal-sponsorship"
```

**Result:** Claude fetches the page and summarizes it.

## ❌ When Claude DOES NOT Use web_fetch

Claude does NOT use `web_fetch` when:
- Only a domain name is mentioned (without full URL)
- Asked to "check" or "fetch from" a domain without a specific URL
- Asked about content on a site without being given the exact URL

### Examples that DON'T work:
```python
# No full URL provided
"What does the Anti Entropy Resource Portal say about fiscal sponsorship?"
"Can you check resourceportal.antientropy.org for information about UK compliance?"
"Please fetch information from resourceportal.antientropy.org about GDPR"
```

**Result:** Claude asks for the specific URL or answers from its training data.

## Key Insight: allowedDomains is a Security Filter, Not an Enabler

The `allowedDomains` parameter:
- **RESTRICTS** which domains Claude can fetch from
- **DOES NOT** enable Claude to construct or infer URLs on its own
- Acts as a security measure to prevent fetching from unauthorized domains

Think of it as a whitelist/allowlist, not as a prompt to search those domains.

## Technical Details

### Correct Configuration

```python
from anthropic import Anthropic

client = Anthropic()

tools = [
    {
        "type": "web_fetch_20250910",
        "name": "web_fetch",
        "max_uses": 10,
        "allowed_domains": ["resourceportal.antientropy.org"],  # No https://
        "citations": {"enabled": True}
    }
]

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=2000,
    tools=tools,
    messages=[{
        "role": "user",
        "content": "Summarize https://resourceportal.antientropy.org/fiscal-sponsorship"
    }],
    extra_headers={
        "anthropic-beta": "web-fetch-2025-09-10"  # Required beta header
    }
)
```

### Response Structure

When web_fetch is used successfully, the response contains:
1. `server_tool_use` block with the URL
2. `web_fetch_tool_result` block with the fetched content
3. `text` block with Claude's response based on the fetched content

### Usage Stats

The usage object includes:
```json
"server_tool_use": {
  "web_search_requests": 0,
  "web_fetch_requests": 1
}
```

## Conclusion

**To use web_fetch effectively, users MUST provide full URLs in their messages.** The tool cannot discover or construct URLs based on domain names alone, even with `allowedDomains` configured.

For use cases where you want Claude to explore a domain without explicit URLs, consider:
1. Providing a list of known URLs upfront
2. Using web_search first to find relevant URLs, then web_fetch to get full content
3. Building a custom RAG (Retrieval-Augmented Generation) system with your domain's content
