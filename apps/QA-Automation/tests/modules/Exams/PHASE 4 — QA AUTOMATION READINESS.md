PHASE 4 — QA AUTOMATION READINESS (Playwright First)

Every React component generated during migration must be Playwright automation-ready.

The implementation must not change the UI or business logic. Only improve the HTML structure and accessibility so that stable selectors are available for automation.

Stable Selectors

Every interactive element must have a stable and unique data-testid.

Examples:

<TextField
    data-testid="student-name-input"
/>

<Button
    data-testid="save-button"
/>

<Select
    data-testid="school-dropdown"
/>

<Checkbox
    data-testid="is-active-checkbox"
/>

<RadioGroup
    data-testid="gender-radio-group"
/>

<Table
    data-testid="student-table"
/>

Never use dynamic values inside data-testid.

❌ Wrong

data-testid={`student-${id}`}

✅ Correct

data-testid="student-table"
Naming Convention

Follow a consistent naming convention.

screen-element-action

Examples:

student-name-input

student-code-input

save-button

cancel-button

delete-button

search-input

status-dropdown

class-table

teacher-dialog

submit-button

close-button

pagination-next

pagination-previous
Accessible Components

Every control should expose proper accessibility attributes.

Examples:

<TextField
    label="Student Name"
    aria-label="Student Name"
/>

Buttons

<Button
    aria-label="Save Student"
>

Icons

<IconButton
    aria-label="Delete Student"
>
Tables

Every table should include

data-testid="student-table"

<thead>

<tbody>

stable column headers

Each row action should have

data-testid="edit-button"

data-testid="delete-button"

data-testid="view-button"

Do not rely on row index or CSS selectors.

Forms

Each input should include

data-testid

name

id

label

aria-label

Example

<TextField
    id="studentName"
    name="studentName"
    label="Student Name"
    data-testid="student-name-input"
    aria-label="Student Name"
/>
Dialogs

Dialogs should include

data-testid="student-dialog"

role="dialog"

aria-labelledby

aria-describedby
Loaders

Every loader should expose

data-testid="page-loader"
Empty State
data-testid="empty-state"
Error Messages
data-testid="validation-message"

data-testid="api-error-message"
Toast/Snackbar
data-testid="success-toast"

data-testid="error-toast"
Search & Filters
search-input

reset-filter-button

apply-filter-button

class-dropdown

status-dropdown
Pagination
pagination-next

pagination-previous

pagination-size

pagination-current-page
Tabs
general-tab

parent-tab

documents-tab

fees-tab
File Upload
upload-button

choose-file

remove-file

preview-file
Date Picker
admission-date-picker

dob-picker
Grid Actions
edit-button

delete-button

view-button

download-button

Avoid using row indexes for selectors.

Automation Constraints

Do NOT use selectors based on:

CSS classes
MUI-generated classes
nth-child
XPath
Element indexes
Text that may change due to localization

The generated UI should allow Playwright to use:

page.getByTestId(...)

as the primary locator strategy.

Component Rules

Whenever an existing reusable component is used:

Preserve its API.
Add data-testid support only if the component does not already expose it.
Do not duplicate reusable components.
Do not change the visual appearance.
Accessibility

Every interactive element must be keyboard accessible.

Ensure:

Proper labels
Proper roles
Proper tab order
Focus visibility
Screen reader compatibility
Definition of Done (QA Ready)

A screen is complete only if:

Every interactive element has a stable data-testid.
No Playwright test requires CSS selectors, XPath, or indexes.
Every form control is accessible.
Tables expose stable selectors.
Dialogs expose stable selectors.
Loaders, errors, empty states, and toasts expose stable selectors.
Existing business logic is unchanged.
Existing APIs are unchanged.
Existing validations are unchanged.
Existing UI design system is preserved.
The screen can be automated immediately using Playwright without modifying the React code.