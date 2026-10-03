# assets-src

Full-resolution source images that are **not served** by the app.

## achievement_badges/

Original badge artwork (mostly 512x512, four are about 1300px). The served copies in
`frontend/static/images/achievement_badges/` are downscaled to at most 256px, which is
twice the 128px sprite cell.

`backend/tools/make_sprite_sheet.py` builds the sprite from the **served** copies, not
from this folder, because admin badge uploads are written only to the served folder.
To change a badge's artwork, add the original here, then save a copy of at most 256px
under the same file name in the served folder and rebuild the sprite.
