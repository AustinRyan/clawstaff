# Contributing to ClawStaff

Thanks for your interest in contributing to ClawStaff! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/clawstaff.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run the build: `npm run build`
7. Push and open a PR

## Development Setup

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Run the full setup (optional — creates agents, configures OpenClaw)
npm run setup
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard pages (overview, messages, performance, etc.)
│   ├── api/                # API routes (agent stats, messages, moltbook)
│   └── page.tsx            # Landing page
├── components/             # React components
│   ├── sidebar.tsx         # Dashboard sidebar navigation
│   ├── demo-banner.tsx     # Demo mode indicator
│   └── demo/               # Demo mode components (animations, effects)
├── lib/                    # Core libraries
│   ├── agent-data/         # Agent data layer (filesystem parser, hooks, types)
│   ├── moltbook/           # Moltbook API client, reputation, privacy filter
│   ├── scout/              # Prospect discovery and outreach
│   └── demo-mode.ts        # Demo mode flag
scripts/
├── setup.sh                # Interactive setup script
├── onboard.ts              # Agent creation CLI
├── generate-workspace.ts   # Workspace generator (template engine)
└── moltbook/               # Moltbook registration and heartbeat
docs/                       # Documentation guides
workspaces/                 # Generated agent workspace templates
```

## What to Contribute

### New Vertical Templates
The most impactful contribution. Each vertical template lives in `scripts/generate-workspace.ts` in the `TEMPLATES` object. See [docs/creating-verticals.md](docs/creating-verticals.md) for a step-by-step guide.

### Dashboard Improvements
The dashboard is in `src/app/dashboard/`. It uses Next.js 14 App Router, TypeScript, Tailwind CSS, and recharts for charts.

### Scout Discovery Engines
Scout's discovery pipeline is in `src/lib/scout/discovery.ts`. New vertical-specific discovery engines help find more prospects.

### Moltbook Integration
The Moltbook client is in `src/lib/moltbook/`. Improvements to the privacy filter, content generation, or reputation scoring are welcome.

### Documentation
Always welcome. Our docs live in `docs/` and the README.

## Code Style

- TypeScript with strict mode
- Tailwind CSS for styling (no CSS-in-JS)
- Follow existing patterns in the codebase
- Use the project's design tokens (see README for colors)
- Keep components focused — one file per component
- Prefer editing existing files over creating new ones

## Design Tokens

If you're working on UI, use these colors (defined in `tailwind.config.ts`):

| Token | Value | Usage |
|-------|-------|-------|
| `bg-background` | `#0a0a0f` | Page background |
| `bg-card` | `#12121e` | Card backgrounds |
| `border-border` | `#1a1a2e` | Borders |
| `text-accent` | `#ff6b35` | Primary accent |
| `text-secondary` | `#f7c948` | Secondary accent |
| `text-text` | `#e8e6e3` | Body text |
| `text-text-muted` | `#6b6b7b` | Muted text |

## Commit Messages

Use conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code refactoring
- `test:` — tests
- `chore:` — maintenance

## Pull Requests

- Keep PRs focused on a single change
- Include a clear description of what and why
- Add screenshots for UI changes
- Make sure `npm run build` passes
- Reference any related issues

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, Node version, OpenClaw version)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
