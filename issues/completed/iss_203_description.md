# System Analytics Chart Overflows Container on Mobile

## Description
On the System Analytics page, the "Transaction Flow" line chart is not fully responsive. The chart extends to the very edge of its container, and the right-most x-axis label ("Jun 10") is cut off on mobile viewports.

## Steps to Reproduce
1. Log in to an Admin account.
2. Emulate a mobile viewport (e.g., 390x844px).
3. Navigate to the System Analytics page (`/admin/analytics`).
4. Look at the "Transaction Flow" chart.
5. Inspect the x-axis labels on the right side.

## Expected Result
The chart should dynamically resize to fit the container with appropriate padding so that all labels remain fully visible.

## Actual Result
The x-axis labels on the far right are truncated, and the chart touches or spills slightly over the bounds of the card container.

## Impact
Low - The chart is mostly legible, but the visual cut-off reduces the quality of the UI.

## Screenshots
![System Analytics Chart Overflow](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_204_admin_analytics.png)
