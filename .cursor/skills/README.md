# Cursor AI Skills

> This folder contains AI agent skills for the Prism Editor project.
> These skills guide the Cursor AI agent to work with the project's
> OpenSpec-based development workflow.

## Structure

```
.cursor/skills/
├── _shared/
│   ├── SHARED-LAYERS.md       # Layer mapping, validation commands
│   ├── SKILL-INDEX.md         # Auto-generated skill index
│   ├── SKILL-SCHEMA.md        # Metadata schema definition
│   └── generate-skill-index.js # Index generation script
├── openspec-explore/           # Explore codebase structure
├── openspec-propose/           # Create a new change with artifacts
├── openspec-plan/              # Plan and derive sub-changes (non-default)
├── openspec-apply/             # Execute tasks with incremental verification
├── openspec-verify/            # Verify implementation consistency
├── openspec-archive/           # Archive completed changes
├── openspec-debug/            # Debug issues in apply phase
└── openspec-skill/            # Skill system maintenance (not exposed by default)
```

## Skills Overview

| Skill | Purpose |
|-------|---------|
| `openspec-explore` | Explore codebase structure |
| `openspec-propose` | Create a new change with artifacts; change_class triggers templates |
| `openspec-plan` | Derive sub-changes from expert documents (non-default capability) |
| `openspec-apply` | Execute tasks with incremental verification; checkbox-based checkpointing |
| `openspec-verify` | Verify implementation consistency (Full + coherence-lite) |
| `openspec-archive` | Archive completed changes |
| `openspec-debug` | Debug issues in apply phase |
| `openspec-skill` | Skill system maintenance (not exposed by default) |

## Usage

When working in this project, the Cursor AI agent will automatically
read and follow these skill files. You can invoke them via the
`/opsx-*` commands in Cursor (e.g., `/opsx-verify`).

See the OpenSpec documentation in `openspec/` for the full workflow.
