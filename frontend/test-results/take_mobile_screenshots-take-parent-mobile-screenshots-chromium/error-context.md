# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: take_mobile_screenshots.spec.js >> take parent mobile screenshots
- Location: tests-e2e\take_mobile_screenshots.spec.js:41:1

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:react-babel] C:\\Users\\Ben\\AntiGravity\\classroom-chat\\frontend\\src\\pages\\General\\Shop.jsx: Unexpected character '�'. (1:0) 4 | \x00"
  - generic [ref=e5]: C:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/General/Shop.jsx:1:0
  - generic [ref=e6]: "1 | ��i\x00m\x00p\x00o\x00r\x00t\x00 \x00R\x00e\x00a\x00c\x00t\x00,\x00 \x00{\x00 \x00u\x00s\x00e\x00S\x00t\x00a\x00t\x00e\x00,\x00 \x00u\x00s\x00e\x00E\x00f\x00f\x00e\x00c\x00t\x00 \x00}\x00 \x00f\x00r\x00o\x00m\x00 \x00'\x00r\x00e\x00a\x00c\x00t\x00'\x00;\x00 \x00 | ^ 2 | \x00i\x00m\x00p\x00o\x00r\x00t\x00 \x00{\x00 \x00S\x00h\x00i\x00e\x00l\x00d\x00,\x00 \x00U\x00n\x00l\x00o\x00c\x00k\x00,\x00 \x00S\x00t\x00a\x00r\x00,\x00 \x00L\x00o\x00a\x00d\x00e\x00r\x002\x00,\x00 \x00S\x00h\x00o\x00p\x00p\x00i\x00n\x00g\x00C\x00a\x00r\x00t\x00 \x00}\x00 \x00f\x00r\x00o\x00m\x00 \x00'\x00l\x00u\x00c\x00i\x00d\x00e\x00-\x00r\x00e\x00a\x00c\x00t\x00'\x00;\x00 \x00 3 | \x00i\x00m\x00p\x00o\x00r\x00t\x00 \x00t\x00o\x00a\x00s\x00t\x00 \x00f\x00r\x00o\x00m\x00 \x00'\x00r\x00e\x00a\x00c\x00t\x00-\x00h\x00o\x00t\x00-\x00t\x00o\x00a\x00s\x00t\x00'\x00;\x00 \x00"
  - generic [ref=e7]: at constructor (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:365:19) at JSXParserMixin.raise (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:6599:19) at JSXParserMixin.getTokenFromCode (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:6306:16) at JSXParserMixin.getTokenFromCode (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:4797:11) at JSXParserMixin.nextToken (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:5782:10) at JSXParserMixin.parse (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:14486:10) at parse (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:14522:38) at parser (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\parser\index.js:41:34) at parser.next (<anonymous>) at normalizeFile (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\transformation\normalize-file.js:64:37) at normalizeFile.next (<anonymous>) at run (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\transformation\index.js:22:50) at run.next (<anonymous>) at transform (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\transform.js:22:33) at transform.next (<anonymous>) at step (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:261:32) at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:273:13 at async.call.result.err.err (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:223:11) at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:189:28 at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\gensync-utils\async.js:67:7 at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:113:33 at step (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:287:14) at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:273:13 at async.call.result.err.err (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:223:11
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.js
    - text: .
```