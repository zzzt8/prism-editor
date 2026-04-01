# Spec: page-header

## ADDED Requirements

### Requirement: PageHeader contains title, subtitle, and primary CTA

The page header bar SHALL display the page title ("Workflows") and a subtitle paragraph on the left. The "New Workflow" primary button SHALL appear on the right side of the header, vertically centered with the title.

#### Scenario: Header displays title and New Workflow button on same baseline

- **WHEN** the Workflows page renders
- **THEN** the "Workflows" title and the "+ New Workflow" button are vertically centered on the same horizontal line

#### Scenario: Subtitle renders below title in header

- **WHEN** the header renders
- **THEN** the subtitle text renders below the title with 4px margin-top

### Requirement: PageHeader replaces standalone Hero section

There SHALL NOT be a separate Hero section with a 40px top margin. The page title and subtitle SHALL live inside the PageHeader component with no additional outer margin.

#### Scenario: Page title is part of header, not a separate section

- **WHEN** the Workflows page renders
- **THEN** the "Workflows" heading is inside the sticky header bar, not in a separate Hero section below the header
