# Cursor AI Skills

> This folder contains AI agent skills for the Prism Editor project.
> These skills guide the Cursor AI agent to work with the project's
> OpenSpec-based development workflow.

## Structure

```
.cursor/
├── skills/
│   ├── _shared/
│   │   └── SHARED-LAYERS.md          # Layer mapping, validation commands
│   ├── openspec-apply/              # Apply a change (execute tasks)
│   ├── openspec-archive/            # Archive completed changes
│   ├── openspec-change-index/       # Batch-create sub-changes
│   ├── openspec-debug/              # Debug execution issues
│   ├── openspec-explore/            # Explore codebase structure
│   ├── openspec-meta-propose/      # Create meta-change
│   ├── openspec-propose/            # Create a new change
│   └── openspec-verify/             # Verify implementation
└── commands/
    └── opsx-*.md                    # CLI command aliases
```

## Skills Overview

| Skill | Purpose |
|-------|---------|
| `openspec-apply` | Execute tasks for a change with incremental verification |
| `openspec-verify` | Verify completeness / correctness / coherence |
| `openspec-propose` | Create a new change with artifacts |
| `openspec-archive` | Archive completed changes |
| `openspec-debug` | Debug issues in apply phase |
| `openspec-explore` | Explore codebase structure |
| `openspec-change-index` | Batch-create sub-changes from meta-change |
| `openspec-meta-propose` | Parse expert plan → meta-change |

## Usage

When working in this project, the Cursor AI agent will automatically
read and follow these skill files. You can also invoke them via the
`/opsx-*` commands in Cursor (e.g., `/opsx-verify`).

See the OpenSpec documentation in `openspec/` for the full workflow.
