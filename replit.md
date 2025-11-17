# Overview

This is an AI chatbot application built with Next.js 15 and React 19. The application provides a conversational interface powered by Anthropic's Claude models, featuring advanced UI components for displaying AI responses, reasoning processes, code blocks, and web search capabilities. The project uses modern web technologies including Tailwind CSS v4, shadcn/ui components, and the Vercel AI SDK for streaming AI interactions.

# Recent Changes

**November 11, 2025** - Enhanced Citation Support & Bug Fixes
- Added AI SDK patches (`/patches/`) for web search citation support from Anthropic
  - `@ai-sdk/anthropic` patch: Handles `web_search_result_location` citation types
  - `ai` SDK patch: Adds citation message parts to streaming schema
- Added questionnaire component (`/components/questionnaire.tsx`) for collecting organizational context
- Fixed deployment type error in `wrapContextMessage` function signature
- Configured ANTHROPIC_API_KEY environment variable
- Port 5000 confirmed working for both development and production

**October 19, 2025** - Migrated from Vercel to Replit
- Configured Next.js dev and production servers to bind to 0.0.0.0:5000 for Replit compatibility
- Installed all npm dependencies
- Set up development workflow for automatic server restarts
- Configured deployment settings for production publishing (autoscale)
- Removed Turbopack flags for better stability in Replit environment

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: Next.js 15 with App Router and React Server Components (RSC)
- Uses the new App Router architecture with file-based routing
- Leverages React 19 for latest features and performance improvements
- Client-side interactivity managed through `'use client'` directives

**Styling System**: Tailwind CSS v4 with CSS Variables
- Custom design system using CSS custom properties for theming
- Dark mode support through CSS variable customization
- Component styling via `class-variance-authority` for type-safe variant management
- Custom Tailwind configuration integrated with shadcn/ui component library

**UI Component Library**: shadcn/ui (New York style variant)
- Radix UI primitives for accessible, unstyled components
- Custom-styled components in `/components/ui/`
- Lucide React for consistent iconography
- Component aliases configured for clean imports (`@/components`, `@/lib`, etc.)

**State Management**: React hooks with AI SDK
- `useChat` hook from `@ai-sdk/react` for AI conversation state
- Local component state using React hooks (useState, useContext)
- Controllable state patterns using Radix UI's `useControllableState`

## AI Integration

**AI Provider**: Anthropic Claude via Vercel AI SDK
- Primary models: Claude 4.5 Sonnet (configurable)
- Streaming responses with `streamText` function
- Extended reasoning capabilities with thinking budget (16,000 tokens)
- Maximum output tokens: 16,000
- Route timeout: 120 seconds for longer reasoning tasks

**AI Features**:
- **Web Search Integration**: Optional web search and web fetch tools using Anthropic's built-in tools
- **Extended Thinking**: Enabled reasoning mode with dedicated token budget for complex problem-solving
- **Streaming Responses**: Real-time message streaming using Vercel AI SDK
- **System Prompts**: File-based system prompts loaded from `/prompts/system.txt`
- **Message Conversion**: Automatic conversion between UI messages and model-compatible formats

**Custom AI UI Components** (`/components/ai-elements/`):
- Conversation management with auto-scroll behavior
- Message display with role-based styling (user/assistant)
- Response rendering with Markdown support via `streamdown`
- Code block syntax highlighting using `react-syntax-highlighter`
- Reasoning/thinking process visualization with collapsible sections
- Tool execution tracking and display
- Source citation system
- Interactive prompt input with file attachments, model selection, and action menu
- Token usage tracking with cost estimation via `tokenlens`
- Canvas/flow diagrams using `@xyflow/react`
- Artifact display for generated content

## API Architecture

**API Route**: `/app/api/chat/route.ts`
- POST endpoint for chat message processing
- Handles streaming text generation
- Manages system prompt loading and caching
- Configurable web search tool integration
- Extended execution time (maxDuration: 120s)

**Request/Response Flow**:
1. Client sends messages array, model selection, and feature flags
2. Server loads cached system prompt
3. Conditionally attaches web search tools based on request
4. Streams AI response back to client
5. Client renders streaming response in real-time

## Code Quality and Tooling

**Linting and Formatting**: Biome
- Configured for TypeScript, React, and Next.js best practices
- Automatic import organization
- Format-on-save support with 2-space indentation
- Ignores build artifacts and dependencies

**TypeScript Configuration**:
- Strict mode enabled for type safety
- Path aliases for clean imports (`@/*`)
- Next.js plugin for enhanced IDE support
- ES2017 target for modern JavaScript features

## Development Workflow

**Development Server**: Runs on port 5000, accessible on all network interfaces (0.0.0.0)
- Hot module replacement for instant feedback
- Custom port configuration for development and production

**Build Process**: Next.js optimized production builds
- Automatic code splitting
- Font optimization using `next/font` with Geist Sans and Geist Mono
- Asset optimization and minification

# External Dependencies

## AI and Machine Learning
- **@ai-sdk/anthropic** (v2.0.33): Anthropic Claude API integration
- **@ai-sdk/react** (v2.0.76): React hooks for AI SDK
- **ai** (v5.0.76): Vercel AI SDK core library
- **tokenlens** (v1.3.1): Token usage tracking and cost estimation

## UI Component Libraries
- **@radix-ui/***: Collection of accessible, unstyled UI primitives
  - Avatar, Collapsible, Dialog, Dropdown Menu, Hover Card, Progress, Scroll Area, Select, Slot, Tooltip
- **@xyflow/react** (v12.8.6): Interactive node-based flow diagrams
- **lucide-react** (v0.546.0): Icon library
- **embla-carousel-react** (v8.6.0): Carousel/slider component
- **cmdk** (v1.1.1): Command menu component

## Utilities and Helpers
- **clsx** (v2.1.1) + **tailwind-merge** (v3.3.1): Conditional className management
- **class-variance-authority** (v0.7.1): Type-safe component variants
- **nanoid** (v5.1.6): Unique ID generation
- **zod** (v4.1.12): Schema validation

## Content Rendering
- **streamdown** (v1.4.0): Streaming Markdown parser
- **react-syntax-highlighter** (v15.6.6): Code syntax highlighting
- **motion** (v12.23.24): Animation library

## React Utilities
- **use-stick-to-bottom** (v1.1.1): Auto-scroll to bottom behavior for conversations

## Development Tools
- **@biomejs/biome** (v2.2.0): Fast linter and formatter
- **@tailwindcss/postcss** (v4): Tailwind CSS v4 PostCSS integration
- **tailwindcss** (v4): Utility-first CSS framework
- **TypeScript types**: Type definitions for Node, React, and React DOM

## Framework
- **next** (v15.5.6): React framework with App Router
- **react** (v19.1.0) + **react-dom** (v19.1.0): React library and DOM renderer