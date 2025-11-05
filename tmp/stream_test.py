import anthropic
import json
import os

client = anthropic.Anthropic(
    # defaults to os.environ.get("ANTHROPIC_API_KEY")
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
)

with client.beta.messages.stream(
    model="claude-haiku-4-5-20251001",
    max_tokens=20000,
    temperature=1,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "did stalone write the script for rocky?"
                }
            ]
        }
    ],
    tools=[
        {
            "name": "web_search",
            "type": "web_search_20250305"
        }
    ],
    betas=["web-search-2025-03-05"]
) as stream:
    for event in stream:
        print("=" * 80)
        print(f"Event type: {type(event).__name__}")
        print(f"Event data: {json.dumps(event.model_dump(), indent=2, default=str)}")
        print("=" * 80)
        print()

