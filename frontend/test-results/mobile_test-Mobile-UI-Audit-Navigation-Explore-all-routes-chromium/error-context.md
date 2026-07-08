# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile_test.spec.js >> Mobile UI Audit Navigation >> Explore all routes
- Location: tests-e2e\mobile_test.spec.js:19:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/chat" until "load"
  navigated to "http://localhost:5173/"
  navigated to "http://localhost:5173/"
  navigated to "http://localhost:5173/chat"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - text: Chat Submit Work Learning Path Achievements BitShift Reward Shop Profile Admin Panel Settings Logout
  - main [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e10]:
        - textbox "What's on your mind, Mr. Mega?" [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]:
            - generic [ref=e14]: For
            - button "Classes" [ref=e16] [cursor=pointer]:
              - img [ref=e17]
              - generic [ref=e22]: Classes
              - img [ref=e23]
            - button "Students" [ref=e26] [cursor=pointer]:
              - img [ref=e27]
              - generic [ref=e30]: Students
              - img [ref=e31]
            - generic "Send to everyone" [ref=e33] [cursor=pointer]:
              - checkbox "Global" [ref=e34]
              - img [ref=e35]
              - text: Global
            - generic "Send to online users" [ref=e38] [cursor=pointer]:
              - checkbox "Live" [ref=e39]
              - img [ref=e40]
              - text: Live
          - generic [ref=e46]:
            - button "Add emoji" [ref=e48] [cursor=pointer]:
              - img [ref=e49]
            - button "Post message" [disabled] [ref=e52]:
              - img [ref=e53]
              - text: Post
      - generic [ref=e57]:
        - generic [ref=e59]:
          - link "Jaiboon" [ref=e60] [cursor=pointer]:
            - /url: /profile/jaiboon
            - img "Jaiboon" [ref=e62]
          - generic [ref=e63]:
            - generic [ref=e64]:
              - generic [ref=e65]: Jaiboon
              - generic [ref=e67]:
                - img [ref=e68]
                - text: Tue1730 CS 3b
              - generic [ref=e73]: 06:55 PM
            - generic [ref=e74]:
              - link "https://www.typinggames.zone/space-type" [ref=e76] [cursor=pointer]:
                - /url: https://www.typinggames.zone/space-type
              - button "Delete Post" [ref=e77] [cursor=pointer]:
                - img [ref=e78]
        - generic [ref=e82]:
          - link "Jaiboon" [ref=e83] [cursor=pointer]:
            - /url: /profile/jaiboon
            - img "Jaiboon" [ref=e85]
          - generic [ref=e86]:
            - generic [ref=e87]:
              - generic [ref=e88]: Jaiboon
              - generic [ref=e90]:
                - img [ref=e91]
                - text: Tue1730 CS 3b
              - generic [ref=e96]: 06:54 PM
            - generic [ref=e97]:
              - link "https://www.typinggames.zone/snake" [ref=e99] [cursor=pointer]:
                - /url: https://www.typinggames.zone/snake
              - button "Delete Post" [ref=e100] [cursor=pointer]:
                - img [ref=e101]
        - generic [ref=e105]:
          - link "Jaiboon" [ref=e106] [cursor=pointer]:
            - /url: /profile/jaiboon
            - img "Jaiboon" [ref=e108]
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e111]: Jaiboon
              - generic [ref=e113]:
                - img [ref=e114]
                - text: Tue1730 CS 3b
              - generic [ref=e119]: 06:53 PM
            - generic [ref=e120]:
              - link "https://www.typinggames.zone/space-type" [ref=e122] [cursor=pointer]:
                - /url: https://www.typinggames.zone/space-type
              - button "Delete Post" [ref=e123] [cursor=pointer]:
                - img [ref=e124]
        - generic [ref=e128]:
          - link "Jaiboon" [ref=e129] [cursor=pointer]:
            - /url: /profile/jaiboon
            - img "Jaiboon" [ref=e131]
          - generic [ref=e132]:
            - generic [ref=e133]:
              - generic [ref=e134]: Jaiboon
              - generic [ref=e135]:
                - generic [ref=e136]:
                  - img [ref=e137]
                  - text: Live
                - generic [ref=e143]:
                  - img [ref=e144]
                  - text: Tue1730 CS 3b
                - generic "Mr. Mega, Fuji, Phayu, FujiP, Jaiboon" [ref=e149]:
                  - img [ref=e150]
                  - text: 5 Students
              - generic [ref=e153]: 06:52 PM
            - generic [ref=e154]:
              - generic [ref=e155]: .........................................
              - button "Delete Post" [ref=e156] [cursor=pointer]:
                - img [ref=e157]
        - generic [ref=e161]:
          - link "FujiP" [ref=e162] [cursor=pointer]:
            - /url: /profile/fujip
            - img "FujiP" [ref=e164]
          - generic [ref=e165]:
            - generic [ref=e166]:
              - generic [ref=e167]: FujiP
              - generic [ref=e169]:
                - img [ref=e170]
                - text: Sat1430 CS2 PY
              - generic [ref=e175]: 06:51 PM
            - generic [ref=e176]:
              - generic [ref=e177]: ...
              - button "Delete Post" [ref=e178] [cursor=pointer]:
                - img [ref=e179]
        - generic [ref=e183]:
          - link "Poon" [ref=e184] [cursor=pointer]:
            - /url: /profile/poon
            - img "Poon" [ref=e186]
          - generic [ref=e187]:
            - generic [ref=e188]:
              - generic [ref=e189]: Poon
              - generic [ref=e190]:
                - generic [ref=e191]:
                  - img [ref=e192]
                  - text: Live
                - generic [ref=e198]:
                  - img [ref=e199]
                  - text: Sat1430 CS2 PY
                - generic "Mr. Mega, Fuji, Phayu, Poon, FujiP, Jaiboon" [ref=e204]:
                  - img [ref=e205]
                  - text: 6 Students
              - generic [ref=e208]: 06:50 PM
            - generic [ref=e209]:
              - generic [ref=e210]: no ones live?
              - button "Delete Post" [ref=e211] [cursor=pointer]:
                - img [ref=e212]
        - generic [ref=e216]:
          - link "Poon" [ref=e217] [cursor=pointer]:
            - /url: /profile/poon
            - img "Poon" [ref=e219]
          - generic [ref=e220]:
            - generic [ref=e221]:
              - generic [ref=e222]: Poon
              - generic [ref=e223]:
                - generic [ref=e224]:
                  - img [ref=e225]
                  - text: Live
                - generic [ref=e231]:
                  - img [ref=e232]
                  - text: Sat1430 CS2 PY
                - generic "Mr. Mega, Fuji, Phayu, Poon, FujiP, Jaiboon" [ref=e237]:
                  - img [ref=e238]
                  - text: 6 Students
              - generic [ref=e241]: 06:48 PM
            - generic [ref=e242]:
              - generic [ref=e243]: send me a new game pls
              - button "Delete Post" [ref=e244] [cursor=pointer]:
                - img [ref=e245]
        - generic [ref=e249]:
          - link "Mr. Mega" [ref=e250] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e252]
          - generic [ref=e253]:
            - generic [ref=e254]:
              - generic [ref=e255]: Mr. Mega
              - generic [ref=e256]:
                - generic [ref=e257]:
                  - img [ref=e258]
                  - text: Live
                - generic "Mr. Mega, Fuji, Phayu, Poon, FujiP" [ref=e264]:
                  - img [ref=e265]
                  - text: 5 Students
              - generic [ref=e268]: 06:44 PM
            - generic [ref=e269]:
              - generic [ref=e270]:
                - text: Game 0 -
                - link "https://www.coolmathgames.com/0-color-hoops" [ref=e271] [cursor=pointer]:
                  - /url: https://www.coolmathgames.com/0-color-hoops
                - text: Game 1 -
                - link "https://www.typinggames.zone/supertux" [ref=e272] [cursor=pointer]:
                  - /url: https://www.typinggames.zone/supertux
              - button "Delete Post" [ref=e273] [cursor=pointer]:
                - img [ref=e274]
        - generic [ref=e278]:
          - link "Fuji" [ref=e279] [cursor=pointer]:
            - /url: /profile/fuji
            - img "Fuji" [ref=e281]
          - generic [ref=e282]:
            - generic [ref=e283]:
              - generic [ref=e284]: Fuji
              - generic [ref=e286]:
                - img [ref=e287]
                - text: Tue1730 CS 3b
              - generic [ref=e292]: 05:58 PM
            - generic [ref=e293]:
              - generic [ref=e294]: "VM926:1 Uncaught Error: React has blocked a javascript: URL as a security precaution. at <anonymous>:1:7 (anonymous) @ VM926:1"
              - button "Delete Post" [ref=e295] [cursor=pointer]:
                - img [ref=e296]
        - generic [ref=e300]:
          - link "Fuji" [ref=e301] [cursor=pointer]:
            - /url: /profile/fuji
            - img "Fuji" [ref=e303]
          - generic [ref=e304]:
            - generic [ref=e305]:
              - generic [ref=e306]: Fuji
              - generic [ref=e308]:
                - img [ref=e309]
                - text: Tue1730 CS 3b
              - generic [ref=e314]: 05:57 PM
            - generic [ref=e315]:
              - generic [ref=e316]: Hello, World!
              - button "Delete Post" [ref=e317] [cursor=pointer]:
                - img [ref=e318]
        - generic [ref=e322]:
          - link "Phayu" [ref=e323] [cursor=pointer]:
            - /url: /profile/phayu
            - img "Phayu" [ref=e325]
          - generic [ref=e326]:
            - generic [ref=e327]:
              - generic [ref=e328]: Phayu
              - generic [ref=e330]:
                - img [ref=e331]
                - text: Tue1730 CS 3b
              - generic [ref=e336]: 05:54 PM
            - generic [ref=e337]:
              - generic [ref=e338]: Hello, World!
              - button "Delete Post" [ref=e339] [cursor=pointer]:
                - img [ref=e340]
        - generic [ref=e344]:
          - link "Phayu" [ref=e345] [cursor=pointer]:
            - /url: /profile/phayu
            - img "Phayu" [ref=e347]
          - generic [ref=e348]:
            - generic [ref=e349]:
              - generic [ref=e350]: Phayu
              - generic [ref=e352]:
                - img [ref=e353]
                - text: Tue1730 CS 3b
              - generic [ref=e358]: 05:53 PM
            - generic [ref=e359]:
              - generic [ref=e360]: hello world
              - button "Delete Post" [ref=e361] [cursor=pointer]:
                - img [ref=e362]
        - generic [ref=e366]:
          - link "Phayu" [ref=e367] [cursor=pointer]:
            - /url: /profile/phayu
            - img "Phayu" [ref=e369]
          - generic [ref=e370]:
            - generic [ref=e371]:
              - generic [ref=e372]: Phayu
              - generic [ref=e374]:
                - img [ref=e375]
                - text: Tue1730 CS 3b
              - generic [ref=e380]: 05:53 PM
            - generic [ref=e381]:
              - generic [ref=e382]: hello
              - button "Delete Post" [ref=e383] [cursor=pointer]:
                - img [ref=e384]
        - generic [ref=e388]:
          - link "Estelle" [ref=e389] [cursor=pointer]:
            - /url: /profile/estelle
            - img "Estelle" [ref=e391]
          - generic [ref=e392]:
            - generic [ref=e393]:
              - generic [ref=e394]: Estelle
              - generic "Sat1300 CS 3 PY, SAT1300 CS3 C++" [ref=e396]:
                - img [ref=e397]
                - text: 2 Classes
              - generic [ref=e402]: 07:11 PM
            - generic [ref=e403]:
              - generic [ref=e404]: hi
              - button "Delete Post" [ref=e405] [cursor=pointer]:
                - img [ref=e406]
        - generic [ref=e410]:
          - link "Estelle" [ref=e411] [cursor=pointer]:
            - /url: /profile/estelle
            - img "Estelle" [ref=e413]
          - generic [ref=e414]:
            - generic [ref=e415]:
              - generic [ref=e416]: Estelle
              - generic "Sat1300 CS 3 PY, SAT1300 CS3 C++" [ref=e418]:
                - img [ref=e419]
                - text: 2 Classes
              - generic [ref=e424]: 07:11 PM
            - generic [ref=e425]:
              - generic [ref=e426]: hi
              - button "Delete Post" [ref=e427] [cursor=pointer]:
                - img [ref=e428]
        - generic [ref=e432]:
          - link "Sky" [ref=e433] [cursor=pointer]:
            - /url: /profile/sky
            - img "Sky" [ref=e435]
          - generic [ref=e436]:
            - generic [ref=e437]:
              - generic [ref=e438]: Sky
              - generic [ref=e439]: 08:41 AM
            - generic [ref=e440]:
              - generic [ref=e441]: Hello, World! Oh wait, it's not my class. My bad
              - button "Delete Post" [ref=e442] [cursor=pointer]:
                - img [ref=e443]
        - generic [ref=e447]:
          - link "Mr. Mega" [ref=e448] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e450]
          - generic [ref=e451]:
            - generic [ref=e452]:
              - generic [ref=e453]: Mr. Mega
              - img "Global Post" [ref=e455]
              - generic [ref=e458]: 06:56 PM
            - generic [ref=e459]:
              - generic [ref=e460]:
                - text: Game 0 -
                - link "https://www.typinggames.zone/alphabet-breakout" [ref=e461] [cursor=pointer]:
                  - /url: https://www.typinggames.zone/alphabet-breakout
                - text: Game 0 -
                - link "https://www.typinggames.zone/dragon-typing-homerow" [ref=e462] [cursor=pointer]:
                  - /url: https://www.typinggames.zone/dragon-typing-homerow
              - button "Delete Post" [ref=e463] [cursor=pointer]:
                - img [ref=e464]
        - generic [ref=e468]:
          - link "Mr. Mega" [ref=e469] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e471]
          - generic [ref=e472]:
            - generic [ref=e473]:
              - generic [ref=e474]: Mr. Mega
              - generic [ref=e476]:
                - img [ref=e477]
                - text: Yuu Yuu
              - generic [ref=e480]: 06:54 PM
            - generic [ref=e481]:
              - generic [ref=e482]: cd frontend python -m http.server 5500
              - button "Delete Post" [ref=e483] [cursor=pointer]:
                - img [ref=e484]
        - generic [ref=e488]:
          - link "Jaiboon" [ref=e489] [cursor=pointer]:
            - /url: /profile/jaiboon
            - img "Jaiboon" [ref=e491]
          - generic [ref=e492]:
            - generic [ref=e493]:
              - generic [ref=e494]: Jaiboon
              - generic [ref=e496]:
                - img [ref=e497]
                - text: Tue1730 CS 3b
              - generic [ref=e502]: 06:51 PM
            - generic [ref=e503]:
              - link "https://beinternetawesome.withgoogle.com/en_us/interland/landing/kind-kingdom" [ref=e505] [cursor=pointer]:
                - /url: https://beinternetawesome.withgoogle.com/en_us/interland/landing/kind-kingdom
              - button "Delete Post" [ref=e506] [cursor=pointer]:
                - img [ref=e507]
        - generic [ref=e511]:
          - link "Mr. Mega" [ref=e512] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e514]
          - generic [ref=e515]:
            - generic [ref=e516]:
              - generic [ref=e517]: Mr. Mega
              - generic [ref=e518]:
                - generic [ref=e519]:
                  - img [ref=e520]
                  - text: Live
                - generic "FujiP, Jaiboon" [ref=e526]:
                  - img [ref=e527]
                  - text: 2 Students
              - generic [ref=e530]: 06:45 PM
            - generic [ref=e531]:
              - generic [ref=e532]:
                - text: Game 0 -
                - link "https://www.typinggames.zone/alphabet-breakout" [ref=e533] [cursor=pointer]:
                  - /url: https://www.typinggames.zone/alphabet-breakout
                - text: Game 0 -
                - link "https://www.typinggames.zone/dragon-typing-homerow" [ref=e534] [cursor=pointer]:
                  - /url: https://www.typinggames.zone/dragon-typing-homerow
              - button "Delete Post" [ref=e535] [cursor=pointer]:
                - img [ref=e536]
        - generic [ref=e540]:
          - link "Alice" [ref=e541] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e543]
          - generic [ref=e544]:
            - generic [ref=e545]:
              - generic [ref=e546]: Alice
              - generic [ref=e548]:
                - img [ref=e549]
                - text: Sat1430 CS2 PY
              - generic [ref=e554]: 03:19 PM
            - generic [ref=e555]:
              - generic [ref=e556]: rt
              - button "Delete Post" [ref=e557] [cursor=pointer]:
                - img [ref=e558]
        - generic [ref=e562]:
          - link "Alice" [ref=e563] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e565]
          - generic [ref=e566]:
            - generic [ref=e567]:
              - generic [ref=e568]: Alice
              - generic [ref=e570]:
                - img [ref=e571]
                - text: Sat1430 CS2 PY
              - generic [ref=e576]: 03:10 PM
            - generic [ref=e577]:
              - generic [ref=e578]: gfvc
              - button "Delete Post" [ref=e579] [cursor=pointer]:
                - img [ref=e580]
        - generic [ref=e584]:
          - link "Alice" [ref=e585] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e587]
          - generic [ref=e588]:
            - generic [ref=e589]:
              - generic [ref=e590]: Alice
              - generic [ref=e592]:
                - img [ref=e593]
                - text: Sat1430 CS2 PY
              - generic [ref=e598]: 03:09 PM
            - generic [ref=e599]:
              - generic [ref=e600]: c
              - button "Delete Post" [ref=e601] [cursor=pointer]:
                - img [ref=e602]
        - generic [ref=e606]:
          - link "Alice" [ref=e607] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e609]
          - generic [ref=e610]:
            - generic [ref=e611]:
              - generic [ref=e612]: Alice
              - generic [ref=e614]:
                - img [ref=e615]
                - text: Sat1430 CS2 PY
              - generic [ref=e620]: 03:09 PM
            - generic [ref=e621]:
              - generic [ref=e622]: xc
              - button "Delete Post" [ref=e623] [cursor=pointer]:
                - img [ref=e624]
        - generic [ref=e628]:
          - link "Alice" [ref=e629] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e631]
          - generic [ref=e632]:
            - generic [ref=e633]:
              - generic [ref=e634]: Alice
              - generic [ref=e636]:
                - img [ref=e637]
                - text: Sat1430 CS2 PY
              - generic [ref=e642]: 03:09 PM
            - generic [ref=e643]:
              - generic [ref=e644]: vfc
              - button "Delete Post" [ref=e645] [cursor=pointer]:
                - img [ref=e646]
        - generic [ref=e650]:
          - link "Alice" [ref=e651] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e653]
          - generic [ref=e654]:
            - generic [ref=e655]:
              - generic [ref=e656]: Alice
              - generic [ref=e658]:
                - img [ref=e659]
                - text: Sat1430 CS2 PY
              - generic [ref=e664]: 03:09 PM
            - generic [ref=e665]:
              - generic [ref=e666]: tgfdvc
              - button "Delete Post" [ref=e667] [cursor=pointer]:
                - img [ref=e668]
        - generic [ref=e672]:
          - link "Alice" [ref=e673] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e675]
          - generic [ref=e676]:
            - generic [ref=e677]:
              - generic [ref=e678]: Alice
              - generic [ref=e680]:
                - img [ref=e681]
                - text: Sat1430 CS2 PY
              - generic [ref=e686]: 03:09 PM
            - generic [ref=e687]:
              - generic [ref=e688]: dgfxvc
              - button "Delete Post" [ref=e689] [cursor=pointer]:
                - img [ref=e690]
        - generic [ref=e694]:
          - link "Alice" [ref=e695] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e697]
          - generic [ref=e698]:
            - generic [ref=e699]:
              - generic [ref=e700]: Alice
              - generic [ref=e702]:
                - img [ref=e703]
                - text: Sat1430 CS2 PY
              - generic [ref=e708]: 03:09 PM
            - generic [ref=e709]:
              - generic [ref=e710]: egrdfvxc
              - button "Delete Post" [ref=e711] [cursor=pointer]:
                - img [ref=e712]
        - generic [ref=e716]:
          - link "Alice" [ref=e717] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e719]
          - generic [ref=e720]:
            - generic [ref=e721]:
              - generic [ref=e722]: Alice
              - generic [ref=e724]:
                - img [ref=e725]
                - text: Sat1430 CS2 PY
              - generic [ref=e730]: 03:09 PM
            - generic [ref=e731]:
              - generic [ref=e732]: fghcbv
              - button "Delete Post" [ref=e733] [cursor=pointer]:
                - img [ref=e734]
        - generic [ref=e738]:
          - link "Alice" [ref=e739] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e741]
          - generic [ref=e742]:
            - generic [ref=e743]:
              - generic [ref=e744]: Alice
              - generic [ref=e746]:
                - img [ref=e747]
                - text: Sat1430 CS2 PY
              - generic [ref=e752]: 03:09 PM
            - generic [ref=e753]:
              - generic [ref=e754]: srgx
              - button "Delete Post" [ref=e755] [cursor=pointer]:
                - img [ref=e756]
        - generic [ref=e760]:
          - link "Alice" [ref=e761] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e763]
          - generic [ref=e764]:
            - generic [ref=e765]:
              - generic [ref=e766]: Alice
              - generic [ref=e768]:
                - img [ref=e769]
                - text: Sat1430 CS2 PY
              - generic [ref=e774]: 03:09 PM
            - generic [ref=e775]:
              - generic [ref=e776]: gr
              - button "Delete Post" [ref=e777] [cursor=pointer]:
                - img [ref=e778]
        - generic [ref=e782]:
          - link "Alice" [ref=e783] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e785]
          - generic [ref=e786]:
            - generic [ref=e787]:
              - generic [ref=e788]: Alice
              - generic [ref=e790]:
                - img [ref=e791]
                - text: Sat1430 CS2 PY
              - generic [ref=e796]: 03:09 PM
            - generic [ref=e797]:
              - generic [ref=e798]: zfzf
              - button "Delete Post" [ref=e799] [cursor=pointer]:
                - img [ref=e800]
        - generic [ref=e804]:
          - link "Zhangsu" [ref=e805] [cursor=pointer]:
            - /url: /profile/zhangsu
            - img "Zhangsu" [ref=e807]
          - generic [ref=e808]:
            - generic [ref=e809]:
              - generic [ref=e810]: Zhangsu
              - generic [ref=e812]:
                - img [ref=e813]
                - text: Sat1430 CS2 PY
              - generic [ref=e818]: 03:01 PM
            - generic [ref=e819]:
              - generic [ref=e820]: Ronaldo better better better
              - button "Delete Post" [ref=e821] [cursor=pointer]:
                - img [ref=e822]
        - generic [ref=e826]:
          - link "Alice" [ref=e827] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e829]
          - generic [ref=e830]:
            - generic [ref=e831]:
              - generic [ref=e832]: Alice
              - generic [ref=e834]:
                - img [ref=e835]
                - text: Sat1430 CS2 PY
              - generic [ref=e840]: 03:00 PM
            - generic [ref=e841]:
              - generic [ref=e842]: Shunlu said Messy cool is Ronaldo's better than I was on the sea
              - button "Delete Post" [ref=e843] [cursor=pointer]:
                - img [ref=e844]
        - generic [ref=e848]:
          - link "Zhangsu" [ref=e849] [cursor=pointer]:
            - /url: /profile/zhangsu
            - img "Zhangsu" [ref=e851]
          - generic [ref=e852]:
            - generic [ref=e853]:
              - generic [ref=e854]: Zhangsu
              - generic [ref=e856]:
                - img [ref=e857]
                - text: Sat1430 CS2 PY
              - generic [ref=e862]: 03:00 PM
            - generic [ref=e863]:
              - generic [ref=e864]: Ronaldo is better than bozo Messi
              - button "Delete Post" [ref=e865] [cursor=pointer]:
                - img [ref=e866]
        - generic [ref=e870]:
          - link "Zhangsu" [ref=e871] [cursor=pointer]:
            - /url: /profile/zhangsu
            - img "Zhangsu" [ref=e873]
          - generic [ref=e874]:
            - generic [ref=e875]:
              - generic [ref=e876]: Zhangsu
              - generic [ref=e877]:
                - generic [ref=e878]:
                  - img [ref=e879]
                  - text: Live
                - generic [ref=e885]:
                  - img [ref=e886]
                  - text: Sat1430 CS2 PY
                - generic "Mr. Mega, Alice, Zhangsu" [ref=e891]:
                  - img [ref=e892]
                  - text: 3 Students
              - generic [ref=e895]: 02:57 PM
            - generic [ref=e896]:
              - generic [ref=e897]: Hi my name is MJ
              - button "Delete Post" [ref=e898] [cursor=pointer]:
                - img [ref=e899]
        - generic [ref=e903]:
          - link "Mr. Mega" [ref=e904] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e906]
          - generic [ref=e907]:
            - generic [ref=e908]:
              - generic [ref=e909]: Mr. Mega
              - generic [ref=e911]:
                - img [ref=e912]
                - text: Alice
              - generic [ref=e915]: 02:57 PM
            - generic [ref=e916]:
              - generic [ref=e917]: Hi Alice
              - button "Delete Post" [ref=e918] [cursor=pointer]:
                - img [ref=e919]
        - generic [ref=e923]:
          - link "Mr. Mega" [ref=e924] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e926]
          - generic [ref=e927]:
            - generic [ref=e928]:
              - generic [ref=e929]: Mr. Mega
              - generic [ref=e931]:
                - img [ref=e932]
                - text: Zhangsu
              - generic [ref=e935]: 02:57 PM
            - generic [ref=e936]:
              - generic [ref=e937]: Hi zhangsu
              - button "Delete Post" [ref=e938] [cursor=pointer]:
                - img [ref=e939]
        - generic [ref=e943]:
          - link "Zhangsu" [ref=e944] [cursor=pointer]:
            - /url: /profile/zhangsu
            - img "Zhangsu" [ref=e946]
          - generic [ref=e947]:
            - generic [ref=e948]:
              - generic [ref=e949]: Zhangsu
              - generic [ref=e951]:
                - img [ref=e952]
                - text: Sat1430 CS2 PY
              - generic [ref=e957]: 02:54 PM
            - generic [ref=e958]:
              - generic [ref=e959]: "\"Hello, World!\""
              - button "Delete Post" [ref=e960] [cursor=pointer]:
                - img [ref=e961]
        - generic [ref=e965]:
          - link "Alice" [ref=e966] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e968]
          - generic [ref=e969]:
            - generic [ref=e970]:
              - generic [ref=e971]: Alice
              - generic [ref=e973]:
                - img [ref=e974]
                - text: Sat1430 CS2 PY
              - generic [ref=e979]: 02:54 PM
            - generic [ref=e980]:
              - generic [ref=e981]: "\"Hello,World!\""
              - button "Delete Post" [ref=e982] [cursor=pointer]:
                - img [ref=e983]
        - generic [ref=e987]:
          - link "Alice" [ref=e988] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e990]
          - generic [ref=e991]:
            - generic [ref=e992]:
              - generic [ref=e993]: Alice
              - generic [ref=e995]:
                - img [ref=e996]
                - text: Sat1430 CS2 PY
              - generic [ref=e1001]: 02:53 PM
            - generic [ref=e1002]:
              - generic [ref=e1003]: "\"Hello'Wrold!\""
              - button "Delete Post" [ref=e1004] [cursor=pointer]:
                - img [ref=e1005]
        - generic [ref=e1009]:
          - link "Alice" [ref=e1010] [cursor=pointer]:
            - /url: /profile/alice
            - img "Alice" [ref=e1012]
          - generic [ref=e1013]:
            - generic [ref=e1014]:
              - generic [ref=e1015]: Alice
              - generic [ref=e1017]:
                - img [ref=e1018]
                - text: Sat1430 CS2 PY
              - generic [ref=e1023]: 02:53 PM
            - generic [ref=e1024]:
              - generic [ref=e1025]: "\"Hello'World!\""
              - button "Delete Post" [ref=e1026] [cursor=pointer]:
                - img [ref=e1027]
        - generic [ref=e1031]:
          - link "Zhangsu" [ref=e1032] [cursor=pointer]:
            - /url: /profile/zhangsu
            - img "Zhangsu" [ref=e1034]
          - generic [ref=e1035]:
            - generic [ref=e1036]:
              - generic [ref=e1037]: Zhangsu
              - generic [ref=e1039]:
                - img [ref=e1040]
                - text: Sat1430 CS2 PY
              - generic [ref=e1045]: 02:51 PM
            - generic [ref=e1046]:
              - generic [ref=e1047]: what's up guys
              - button "Delete Post" [ref=e1048] [cursor=pointer]:
                - img [ref=e1049]
        - generic [ref=e1053]:
          - link "Zhangsu" [ref=e1054] [cursor=pointer]:
            - /url: /profile/zhangsu
            - img "Zhangsu" [ref=e1056]
          - generic [ref=e1057]:
            - generic [ref=e1058]:
              - generic [ref=e1059]: Zhangsu
              - generic [ref=e1061]:
                - img [ref=e1062]
                - text: Sat1430 CS2 PY
              - generic [ref=e1067]: 02:50 PM
            - generic [ref=e1068]:
              - generic [ref=e1069]: bbbb
              - button "Delete Post" [ref=e1070] [cursor=pointer]:
                - img [ref=e1071]
        - generic [ref=e1075]:
          - link "Anda" [ref=e1076] [cursor=pointer]:
            - /url: /profile/anda
            - img "Anda" [ref=e1078]
          - generic [ref=e1079]:
            - generic [ref=e1080]:
              - generic [ref=e1081]: Anda
              - generic [ref=e1083]:
                - img [ref=e1084]
                - text: Sat900 CS 4
              - generic [ref=e1089]: 09:01 AM
            - generic [ref=e1090]:
              - generic [ref=e1091]: Hello, World!
              - button "Delete Post" [ref=e1092] [cursor=pointer]:
                - img [ref=e1093]
        - generic [ref=e1097]:
          - link "Anda" [ref=e1098] [cursor=pointer]:
            - /url: /profile/anda
            - img "Anda" [ref=e1100]
          - generic [ref=e1101]:
            - generic [ref=e1102]:
              - generic [ref=e1103]: Anda
              - generic [ref=e1105]:
                - img [ref=e1106]
                - text: Sat900 CS 4
              - generic [ref=e1111]: 09:00 AM
            - generic [ref=e1112]:
              - generic [ref=e1113]: Hello, World
              - button "Delete Post" [ref=e1114] [cursor=pointer]:
                - img [ref=e1115]
        - generic [ref=e1119]:
          - link "Anda" [ref=e1120] [cursor=pointer]:
            - /url: /profile/anda
            - img "Anda" [ref=e1122]
          - generic [ref=e1123]:
            - generic [ref=e1124]:
              - generic [ref=e1125]: Anda
              - generic [ref=e1127]:
                - img [ref=e1128]
                - text: Sat900 CS 4
              - generic [ref=e1133]: 09:00 AM
            - generic [ref=e1134]:
              - generic [ref=e1135]: hello
              - button "Delete Post" [ref=e1136] [cursor=pointer]:
                - img [ref=e1137]
        - generic [ref=e1141]:
          - link "Mr. Mega" [ref=e1142] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e1144]
          - generic [ref=e1145]:
            - generic [ref=e1146]:
              - generic [ref=e1147]: Mr. Mega
              - generic [ref=e1149]:
                - img [ref=e1150]
                - text: ai teacher
              - generic [ref=e1153]: 09:30 PM
            - generic [ref=e1154]:
              - generic [ref=e1155]: test
              - button "Delete Post" [ref=e1156] [cursor=pointer]:
                - img [ref=e1157]
        - generic [ref=e1161]:
          - link "Mr. Mega" [ref=e1162] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e1164]
          - generic [ref=e1165]:
            - generic [ref=e1166]:
              - generic [ref=e1167]: Mr. Mega
              - generic [ref=e1169]:
                - img [ref=e1170]
                - text: ai teacher
              - generic [ref=e1173]: 09:29 PM
            - generic [ref=e1174]:
              - generic [ref=e1175]: test
              - button "Delete Post" [ref=e1176] [cursor=pointer]:
                - img [ref=e1177]
        - generic [ref=e1181]:
          - link "Mr. Mega" [ref=e1182] [cursor=pointer]:
            - /url: /profile/mr-mega
            - img "Mr. Mega" [ref=e1184]
          - generic [ref=e1185]:
            - generic [ref=e1186]:
              - generic [ref=e1187]: Mr. Mega
              - generic [ref=e1189]:
                - img [ref=e1190]
                - text: ai teacher
              - generic [ref=e1193]: 09:29 PM
            - generic [ref=e1194]:
              - generic [ref=e1195]: test
              - button "Delete Post" [ref=e1196] [cursor=pointer]:
                - img [ref=e1197]
```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | import * as fs from 'fs';
  3  | import * as path from 'path';
  4  | 
  5  | test.use({
  6  |   viewport: { width: 390, height: 844 },
  7  |   userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  8  |   hasTouch: true,
  9  |   isMobile: true,
  10 | });
  11 | 
  12 | test.describe('Mobile UI Audit Navigation', () => {
  13 |   const screenshotsDir = path.resolve('..', 'issues', 'screenshots');
  14 |   
  15 |   if (!fs.existsSync(screenshotsDir)) {
  16 |     fs.mkdirSync(screenshotsDir, { recursive: true });
  17 |   }
  18 | 
  19 |   test('Explore all routes', async ({ page }) => {
  20 |     test.slow(); // This audit test visits many pages — triple the default timeout
  21 |     // Enable console logging
  22 |     page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
  23 | 
  24 |     console.log('Logging in as admin...');
  25 |     await page.goto('/api/dev-login?role=admin');
> 26 |     await page.waitForURL('**/chat', { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  27 |     
  28 |     // 1. Home / Chat Page
  29 |     console.log('Navigating to Chat...');
  30 |     await page.goto('http://localhost:5173/');
  31 |     await page.waitForTimeout(3000);
  32 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_home.png') });
  33 | 
  34 |     // 2. Profile page
  35 |     console.log('Navigating to Profile...');
  36 |     await page.goto('http://localhost:5173/profile');
  37 |     await page.waitForTimeout(3000);
  38 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_profile.png') });
  39 | 
  40 |     // 3. Open Sidebar / Hamburger Menu (on Profile page where it's visible)
  41 |     console.log('Opening hamburger menu on Profile page...');
  42 |     const hamburger = page.locator('header button.hamburger-toggle').first();
  43 |     if (await hamburger.isVisible()) {
  44 |       await hamburger.click();
  45 |       await page.waitForTimeout(1000);
  46 |       await page.screenshot({ path: path.join(screenshotsDir, 'mobile_sidebar_open.png') });
  47 |       
  48 |       // Close sidebar by clicking overlay or close button
  49 |       const closeBtn = page.locator('.mobile-sidebar .sidebar-close, .mobile-overlay').first();
  50 |       await closeBtn.click({ force: true });
  51 |       await page.waitForTimeout(500);
  52 |     } else {
  53 |       console.log('Hamburger menu not found on Profile page!');
  54 |     }
  55 | 
  56 |     // 4. Achievements page
  57 |     console.log('Navigating to Achievements...');
  58 |     await page.goto('http://localhost:5173/achievements');
  59 |     await page.waitForTimeout(3000);
  60 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_achievements.png') });
  61 | 
  62 |     // 5. Bit-Shift page
  63 |     console.log('Navigating to Bit-Shift...');
  64 |     await page.goto('http://localhost:5173/bit-shift');
  65 |     await page.waitForTimeout(3000);
  66 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_bit_shift.png') });
  67 | 
  68 |     // 6. Admin Panel
  69 |     console.log('Navigating to Admin Panel...');
  70 |     await page.goto('http://localhost:5173/admin');
  71 |     await page.waitForTimeout(3000);
  72 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin.png') });
  73 | 
  74 |     // 7. Admin Advanced Panel
  75 |     console.log('Navigating to Admin Advanced...');
  76 |     await page.goto('http://localhost:5173/admin/advanced');
  77 |     await page.waitForTimeout(3000);
  78 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin_advanced.png') });
  79 | 
  80 |     console.log('Mobile UI Audit Navigation complete!');
  81 |   });
  82 | });
  83 | 
```