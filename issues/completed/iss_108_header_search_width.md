# Oversized Global Search Bar at 1440px

## Description
The global search bar in the header expands to a very large width at 1440px, which feels disproportionate to the other header elements and occupies unnecessary horizontal space.

## Steps to Reproduce
1. Open the application at 1440px width.
2. Observe the search bar in the top-center of the header.

## Expected Result
The search bar should have a `max-width` to maintain a balanced and premium appearance on larger screens.

## Actual Result
The search bar stretches significantly, appearing oversized.

## Root Cause
The global search bar in the header was using a default `max-width` of 400px, which felt disproportionately large on wider screens (e.g., 1440px). Additionally, the expansion logic on focus was targeting the inner wrapper but not the outer container, which sometimes prevented the intended expansion or caused layout inconsistencies.

## Resolution
- Reduced default `max-width` of `.user-search-container` from 400px to 300px in `Layout.css`.
- Updated focus logic to apply `max-width: 450px` to the container itself using `:focus-within`, ensuring a smooth expansion when the user interacts with the search bar.
- Added a `transition` for `max-width` to provide a premium, animated feel during expansion.

## Changed Files
- [Layout.css](file:///c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/components/Layout/Layout.css)

## Evidence
![Fixed Global Search Bar](file:///C:/Users/Ben/.gemini/antigravity/brain/3535c99a-d44e-4788-9a48-8e8e42712f72/iss_108_fixed_1778816491722.png)
