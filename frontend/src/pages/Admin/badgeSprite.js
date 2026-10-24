import spriteCss from '../../assets/css/sprite.css?raw';

// A badge shows its art from one cell of the shared sprite (assets/css/sprite.css, written by
// backend/tools/make_sprite_sheet.py): `.badge` sets the sprite image and `.badge-<slug>` picks the cell. A slug
// with no rule of its own would show the sprite's first cell, so callers only draw the sprite for slugs listed here.
export const parseSpriteSlugs = (css) =>
    new Set(Array.from(css.matchAll(/\.badge-([\w-]+)\s*\{/g), (match) => match[1]));

const SPRITE_SLUGS = parseSpriteSlugs(spriteCss);

export const hasBadgeSprite = (slug) => SPRITE_SLUGS.has(slug);
