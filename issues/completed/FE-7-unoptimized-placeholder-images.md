# Unoptimized Static Placeholder Images

## Description
The placeholder and fallback images stored in `frontend/public/static/images/` are significantly unoptimized:
- `Default_pfp.jpg` / `Default_pfp.png` are ~268 KB.
- `Project_placeholder.jpg` / `Project_placeholder.png` are ~526-561 KB.

These images are used as default fallbacks across the application (e.g., in `SmartImage.jsx`). Loading over 500 KB just for a placeholder image represents a major performance drag, increasing initial load times and wasting bandwidth, especially if many placeholders are displayed in a grid or on slower network connections.

## Location
- `frontend/public/static/images/Default_pfp.jpg`
- `frontend/public/static/images/Project_placeholder.png`

## Proposed Fix
Compress these placeholder images using tools like ImageOptim, TinyPNG, or convert them to WebP/AVIF formats. An avatar placeholder or project fallback image should easily be under 15-30 KB.
