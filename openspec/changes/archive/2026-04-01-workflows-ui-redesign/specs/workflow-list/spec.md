# Spec: workflow-list

## ADDED Requirements

### Requirement: Toolbar uses split two-zone layout

The workflow toolbar SHALL separate into two horizontal zones. The left zone contains the Search input with `flex: 1` and a maximum width of 320px. The right zone contains all auxiliary controls (Status filter, Sort selector, View toggle) right-aligned. The New Workflow button SHALL NOT appear inside the toolbar — it is elevated to the PageHeader.

#### Scenario: Toolbar renders in split layout on desktop

- **WHEN** the user views the Workflows homepage on a viewport wider than 768px
- **THEN** the toolbar displays Search on the left and auxiliary controls on the right

#### Scenario: Toolbar search input expands to fill available space

- **WHEN** the toolbar renders
- **THEN** the Search input expands to fill available horizontal space up to 320px

### Requirement: Empty state renders when no workflows exist

The list SHALL display an empty state component when the workflow list is empty. The empty state SHALL show an icon, a primary message, a secondary message, and a call-to-action button.

#### Scenario: Empty state shown when no workflows

- **WHEN** the user has no saved workflows and has not searched
- **THEN** the system displays the empty state with the message "创建你的第一个工作流" and a "New Workflow" button

#### Scenario: Empty state shown when search yields no results

- **WHEN** the user has typed in the search box but no workflows match
- **THEN** the system displays the empty state with the message "No workflows match your current filters."

### Requirement: Pagination displays below the list

When the total number of workflows exceeds the page size (10), the system SHALL display a pagination footer with page number buttons and a "Load More" button.

#### Scenario: Pagination shown when more than one page exists

- **WHEN** the total number of workflows is greater than 10
- **THEN** the pagination footer appears below the list with page numbers and a "Load More" button

### Requirement: View toggle is hidden until implemented

The grid/list view toggle buttons SHALL NOT be visible in the toolbar until the grid view is implemented.

#### Scenario: Grid view toggle hidden

- **WHEN** the toolbar renders
- **THEN** the List/Grid view toggle buttons are not rendered
