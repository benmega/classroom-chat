# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile_test.spec.js >> Mobile UI Audit Navigation >> Explore all routes
- Location: tests-e2e\mobile_test.spec.js:19:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.mobile-sidebar .sidebar-close, .mobile-overlay').first()
    - locator resolved to <div class="mobile-overlay show"></div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <nav class="sidebar-nav">…</nav> from <aside class="mobile-sidebar open">…</aside> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <nav class="sidebar-nav">…</nav> from <aside class="mobile-sidebar open">…</aside> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    28 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <nav class="sidebar-nav">…</nav> from <aside class="mobile-sidebar open">…</aside> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "Toggle Sidebar" [expanded] [active] [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - link "Classroom Chat Logo ClassroomChat" [ref=e9] [cursor=pointer]:
        - /url: /chat
        - img "Classroom Chat Logo" [ref=e11]
        - generic [ref=e12]: ClassroomChat
      - navigation [ref=e13]:
        - list [ref=e14]:
          - listitem [ref=e15]:
            - button "Account" [ref=e16] [cursor=pointer]:
              - img [ref=e18]
  - main [ref=e22]:
    - generic [ref=e23]:
      - generic [ref=e26]:
        - generic [ref=e27] [cursor=pointer]:
          - img "ben" [ref=e28]
          - generic [ref=e30]: Change Photo
        - generic [ref=e31]:
          - heading "Mr. Mega" [level=1] [ref=e32]
          - paragraph [ref=e33]: "@ben"
          - link "Edit Profile" [ref=e34] [cursor=pointer]:
            - /url: /settings
            - img [ref=e35]
            - text: Edit Profile
        - generic [ref=e38]:
          - generic "66" [ref=e39]:
            - generic [ref=e40]: Ducks
            - generic [ref=e41]: "66"
          - generic [ref=e43]:
            - generic [ref=e44]: Levels
            - generic [ref=e45]: "835"
          - generic [ref=e47]:
            - generic [ref=e48]: Projects
            - generic [ref=e49]: "2"
          - generic "0.175" [ref=e51]:
            - generic [ref=e52]: Packets
            - generic [ref=e53]: "0.175"
          - generic "10,010,003,572.5" [ref=e55]:
            - generic [ref=e56]: Lifetime
            - generic [ref=e57]: 10B
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]:
            - heading "About Me" [level=2] [ref=e62]:
              - img [ref=e63]
              - text: About Me
            - paragraph [ref=e67]: You haven't added a biography yet. Click 'Edit Profile' to tell your classmates about yourself!
          - generic [ref=e68]:
            - generic [ref=e69]:
              - heading "Course Progress" [level=2] [ref=e70]:
                - img [ref=e71]
                - text: Course Progress
              - link "Submit Challenge" [ref=e73] [cursor=pointer]:
                - /url: /submit-work#challenge
                - img [ref=e74]
            - generic [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e78]:
                  - generic [ref=e79]: CodeCombat
                  - generic [ref=e80]: 100%
                - generic [ref=e83]: 570 Levels Completed
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - generic [ref=e86]: Ozaria
                  - generic [ref=e87]: 84%
                - generic [ref=e90]: 265 Levels Completed
          - generic [ref=e91]:
            - generic [ref=e92]:
              - heading "Certifications" [level=2] [ref=e93]:
                - img [ref=e94]
                - text: Certifications
              - link "Submit Certificate" [ref=e97] [cursor=pointer]:
                - /url: /submit-work#certificate
                - img [ref=e98]
            - generic [ref=e100]:
              - generic [ref=e104] [cursor=pointer]:
                - heading "CS1" [level=4] [ref=e105]
                - generic [ref=e106]: Sep 2025
              - generic [ref=e110] [cursor=pointer]:
                - heading "CS2" [level=4] [ref=e111]
                - generic [ref=e112]: Dec 2025
              - generic [ref=e116] [cursor=pointer]:
                - heading "CS3" [level=4] [ref=e117]
                - generic [ref=e118]: Dec 2025
              - generic [ref=e122] [cursor=pointer]:
                - heading "CS4" [level=4] [ref=e123]
                - generic [ref=e124]: Dec 2025
              - generic [ref=e128] [cursor=pointer]:
                - heading "CS5" [level=4] [ref=e129]
                - generic [ref=e130]: Dec 2025
              - generic [ref=e134] [cursor=pointer]:
                - heading "CS6" [level=4] [ref=e135]
                - generic [ref=e136]: Dec 2025
              - generic [ref=e140] [cursor=pointer]:
                - heading "GD1" [level=4] [ref=e141]
                - generic [ref=e142]: Dec 2025
              - generic [ref=e146] [cursor=pointer]:
                - heading "GD2" [level=4] [ref=e147]
                - generic [ref=e148]: Dec 2025
              - generic [ref=e152] [cursor=pointer]:
                - heading "GD3" [level=4] [ref=e153]
                - generic [ref=e154]: Dec 2025
              - generic [ref=e158] [cursor=pointer]:
                - heading "Junior" [level=4] [ref=e159]
                - generic [ref=e160]: Dec 2025
              - generic [ref=e164] [cursor=pointer]:
                - heading "WD1" [level=4] [ref=e165]
                - generic [ref=e166]: Dec 2025
              - generic [ref=e170] [cursor=pointer]:
                - heading "WD2" [level=4] [ref=e171]
                - generic [ref=e172]: Dec 2025
              - generic [ref=e176] [cursor=pointer]:
                - heading "Ch1" [level=4] [ref=e177]
                - generic [ref=e178]: Dec 2025
              - generic [ref=e182] [cursor=pointer]:
                - heading "Ch2" [level=4] [ref=e183]
                - generic [ref=e184]: Dec 2025
              - generic [ref=e188] [cursor=pointer]:
                - heading "Ch3" [level=4] [ref=e189]
                - generic [ref=e190]: Dec 2025
              - generic [ref=e194] [cursor=pointer]:
                - heading "Ch4" [level=4] [ref=e195]
                - generic [ref=e196]: Dec 2025
          - generic [ref=e197]:
            - generic [ref=e198]:
              - heading "Recent Achievements" [level=2] [ref=e199]:
                - img [ref=e200]
                - text: Recent Achievements
              - link "View All Achievements" [ref=e203] [cursor=pointer]:
                - /url: /achievements
                - img [ref=e204]
            - generic [ref=e206]:
              - generic "Earn your first duck" [ref=e207] [cursor=pointer]:
                - generic [ref=e209]:
                  - generic [ref=e210]: First Duck
                  - generic [ref=e211]: 9/27/2025
              - generic "Earn 10 ducks" [ref=e212] [cursor=pointer]:
                - generic [ref=e214]:
                  - generic [ref=e215]: Duckling
                  - generic [ref=e216]: 9/27/2025
              - generic "Earn 50 ducks" [ref=e217] [cursor=pointer]:
                - generic [ref=e219]:
                  - generic [ref=e220]: Duck Collector
                  - generic [ref=e221]: 9/27/2025
              - generic "Earn 100 ducks" [ref=e222] [cursor=pointer]:
                - generic [ref=e224]:
                  - generic [ref=e225]: Pond Master
                  - generic [ref=e226]: 9/27/2025
              - generic "Earn 500 ducks" [ref=e227] [cursor=pointer]:
                - generic [ref=e229]:
                  - generic [ref=e230]: Duck Hoarder
                  - generic [ref=e231]: 9/27/2025
              - generic "Earn 1000 ducks" [ref=e232] [cursor=pointer]:
                - generic [ref=e234]:
                  - generic [ref=e235]: Duck Millionaire
                  - generic [ref=e236]: 9/27/2025
              - generic "Complete your first level" [ref=e237] [cursor=pointer]:
                - generic [ref=e239]:
                  - generic [ref=e240]: Getting Started
                  - generic [ref=e241]: 9/27/2025
              - generic "Complete 5 levels" [ref=e242] [cursor=pointer]:
                - generic [ref=e244]:
                  - generic [ref=e245]: Steady Steps
                  - generic [ref=e246]: 9/27/2025
              - generic "Complete 10 levels" [ref=e247] [cursor=pointer]:
                - generic [ref=e249]:
                  - generic [ref=e250]: Challenge Conqueror
                  - generic [ref=e251]: 9/27/2025
              - generic "Complete your first level" [ref=e252] [cursor=pointer]:
                - generic [ref=e254]:
                  - generic [ref=e255]: Novice Coder
                  - generic [ref=e256]: 9/27/2025
              - generic "Complete 5 levels" [ref=e257] [cursor=pointer]:
                - generic [ref=e259]:
                  - generic [ref=e260]: Apprentice Adventurer
                  - generic [ref=e261]: 9/27/2025
              - generic "Complete 10 levels" [ref=e262] [cursor=pointer]:
                - generic [ref=e264]:
                  - generic [ref=e265]: Coding Recruit
                  - generic [ref=e266]: 9/27/2025
              - generic "Add your first project" [ref=e267] [cursor=pointer]:
                - generic [ref=e269]:
                  - generic [ref=e270]: First Project
                  - generic [ref=e271]: 9/27/2025
              - generic "Add 3 projects" [ref=e272] [cursor=pointer]:
                - generic [ref=e274]:
                  - generic [ref=e275]: Portfolio Builder
                  - generic [ref=e276]: 9/27/2025
              - generic "Add 5 projects" [ref=e277] [cursor=pointer]:
                - generic [ref=e279]:
                  - generic [ref=e280]: Project Master
                  - generic [ref=e281]: 9/27/2025
              - generic "Stay online for 2 hours in a session" [ref=e282] [cursor=pointer]:
                - generic [ref=e284]:
                  - generic [ref=e285]: Dedicated Coder
                  - generic [ref=e286]: 9/27/2025
              - generic "Stay online for 3 hours in a session" [ref=e287] [cursor=pointer]:
                - generic [ref=e289]:
                  - generic [ref=e290]: Marathoner
                  - generic [ref=e291]: 9/27/2025
              - generic "Stay online for 8 hours in a session" [ref=e292] [cursor=pointer]:
                - generic [ref=e294]:
                  - generic [ref=e295]: You There?
                  - generic [ref=e296]: 9/27/2025
              - generic "Complete your first bit shift" [ref=e297] [cursor=pointer]:
                - generic [ref=e299]:
                  - generic [ref=e300]: Trade Initiate
                  - generic [ref=e301]: 9/27/2025
              - generic "Complete your 10 bit shifts" [ref=e302] [cursor=pointer]:
                - generic [ref=e304]:
                  - generic [ref=e305]: Experienced Trader
                  - generic [ref=e306]: 9/27/2025
              - generic "Complete your 50 bit shifts" [ref=e307] [cursor=pointer]:
                - generic [ref=e309]:
                  - generic [ref=e310]: Master Trader
                  - generic [ref=e311]: 9/27/2025
              - generic "Complete a challenge 2 weeks in a row" [ref=e312] [cursor=pointer]:
                - generic [ref=e314]:
                  - generic [ref=e315]: On the Board
                  - generic [ref=e316]: 9/27/2025
              - generic "Send your first message in chat" [ref=e317] [cursor=pointer]:
                - generic [ref=e319]:
                  - generic [ref=e320]: Hello World
                  - generic [ref=e321]: 9/27/2025
              - generic "Send 10 chat messages" [ref=e322] [cursor=pointer]:
                - generic [ref=e324]:
                  - generic [ref=e325]: Chatterbox
                  - generic [ref=e326]: 9/27/2025
              - generic "Send 50 chat messages" [ref=e327] [cursor=pointer]:
                - generic [ref=e329]:
                  - generic [ref=e330]: Talkative Duck
                  - generic [ref=e331]: 9/27/2025
              - generic "Submit completion certificate for CS1" [ref=e332] [cursor=pointer]:
                - generic [ref=e334]:
                  - generic [ref=e335]: CS1
                  - generic [ref=e336]: 9/30/2025
              - generic "Complete 25 levels" [ref=e337] [cursor=pointer]:
                - generic [ref=e339]:
                  - generic [ref=e340]: Learning Machine
                  - generic [ref=e341]: 12/6/2025
              - generic "Complete 25 levels" [ref=e342] [cursor=pointer]:
                - generic [ref=e344]:
                  - generic [ref=e345]: Script Squire
                  - generic [ref=e346]: 12/7/2025
              - generic "Complete 50 levels" [ref=e347] [cursor=pointer]:
                - generic [ref=e349]:
                  - generic [ref=e350]: Algorithm Adept
                  - generic [ref=e351]: 12/7/2025
              - generic "Complete 100 levels" [ref=e352] [cursor=pointer]:
                - generic [ref=e354]:
                  - generic [ref=e355]: Code Knight
                  - generic [ref=e356]: 12/7/2025
              - generic "Complete 200 levels" [ref=e357] [cursor=pointer]:
                - generic [ref=e359]:
                  - generic [ref=e360]: Master Programmer
                  - generic [ref=e361]: 12/7/2025
              - generic "Submit completion certificate for CS2" [ref=e362] [cursor=pointer]:
                - generic [ref=e364]:
                  - generic [ref=e365]: CS2
                  - generic [ref=e366]: 12/12/2025
              - generic "Submit completion certificate for CS3" [ref=e367] [cursor=pointer]:
                - generic [ref=e369]:
                  - generic [ref=e370]: CS3
                  - generic [ref=e371]: 12/12/2025
              - generic "Submit completion certificate for CS4" [ref=e372] [cursor=pointer]:
                - generic [ref=e374]:
                  - generic [ref=e375]: CS4
                  - generic [ref=e376]: 12/12/2025
              - generic "Submit completion certificate for CS5" [ref=e377] [cursor=pointer]:
                - generic [ref=e379]:
                  - generic [ref=e380]: CS5
                  - generic [ref=e381]: 12/12/2025
              - generic "Submit completion certificate for CS6" [ref=e382] [cursor=pointer]:
                - generic [ref=e384]:
                  - generic [ref=e385]: CS6
                  - generic [ref=e386]: 12/12/2025
              - generic "Submit completion certificate for GD1" [ref=e387] [cursor=pointer]:
                - generic [ref=e389]:
                  - generic [ref=e390]: GD1
                  - generic [ref=e391]: 12/12/2025
              - generic "Submit completion certificate for GD2" [ref=e392] [cursor=pointer]:
                - generic [ref=e394]:
                  - generic [ref=e395]: GD2
                  - generic [ref=e396]: 12/12/2025
              - generic "Submit completion certificate for GD3" [ref=e397] [cursor=pointer]:
                - generic [ref=e399]:
                  - generic [ref=e400]: GD3
                  - generic [ref=e401]: 12/12/2025
              - generic "Submit completion certificate for Junior" [ref=e402] [cursor=pointer]:
                - generic [ref=e404]:
                  - generic [ref=e405]: Junior
                  - generic [ref=e406]: 12/12/2025
              - generic "Submit completion certificate for WD1" [ref=e407] [cursor=pointer]:
                - generic [ref=e409]:
                  - generic [ref=e410]: WD1
                  - generic [ref=e411]: 12/12/2025
              - generic "Submit completion certificate for WD2" [ref=e412] [cursor=pointer]:
                - generic [ref=e414]:
                  - generic [ref=e415]: WD2
                  - generic [ref=e416]: 12/12/2025
              - generic "Complete 50 levels" [ref=e417] [cursor=pointer]:
                - generic [ref=e419]:
                  - generic [ref=e420]: Halfway Hero
                  - generic [ref=e421]: 12/12/2025
              - generic "Complete 100 levels" [ref=e422] [cursor=pointer]:
                - generic [ref=e424]:
                  - generic [ref=e425]: Marathon Learner
                  - generic [ref=e426]: 12/12/2025
              - generic "Complete 150 levels" [ref=e427] [cursor=pointer]:
                - generic [ref=e429]:
                  - generic [ref=e430]: Advanced Adventurer
                  - generic [ref=e431]: 12/12/2025
              - generic "Complete 200 levels" [ref=e432] [cursor=pointer]:
                - generic [ref=e434]:
                  - generic [ref=e435]: Master Coder
                  - generic [ref=e436]: 12/12/2025
              - generic "Complete all 265 levels" [ref=e437] [cursor=pointer]:
                - generic [ref=e439]:
                  - generic [ref=e440]: Ultimate Ozaria Champion
                  - generic [ref=e441]: 12/12/2025
              - generic "Complete 300 levels" [ref=e442] [cursor=pointer]:
                - generic [ref=e444]:
                  - generic [ref=e445]: Code Champion
                  - generic [ref=e446]: 12/12/2025
              - generic "Complete 400 levels" [ref=e447] [cursor=pointer]:
                - generic [ref=e449]:
                  - generic [ref=e450]: Legendary Coder
                  - generic [ref=e451]: 12/12/2025
              - generic "Complete 500 levels" [ref=e452] [cursor=pointer]:
                - generic [ref=e454]:
                  - generic [ref=e455]: Heroic Hacker
                  - generic [ref=e456]: 12/12/2025
              - generic "Complete all 570 levels" [ref=e457] [cursor=pointer]:
                - generic [ref=e459]:
                  - generic [ref=e460]: CodeCombat Conqueror
                  - generic [ref=e461]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch1" [ref=e462] [cursor=pointer]:
                - generic [ref=e464]:
                  - generic [ref=e465]: Ch1
                  - generic [ref=e466]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch2" [ref=e467] [cursor=pointer]:
                - generic [ref=e469]:
                  - generic [ref=e470]: Ch2
                  - generic [ref=e471]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch3" [ref=e472] [cursor=pointer]:
                - generic [ref=e474]:
                  - generic [ref=e475]: Ch3
                  - generic [ref=e476]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch4" [ref=e477] [cursor=pointer]:
                - generic [ref=e479]:
                  - generic [ref=e480]: Ch4
                  - generic [ref=e481]: 12/12/2025
          - generic [ref=e482]:
            - heading "Technical Skills" [level=2] [ref=e484]:
              - img [ref=e485]
              - text: Technical Skills
            - generic [ref=e490]:
              - generic [ref=e491]: Git & GitHub
              - generic [ref=e492]: Lvl
        - generic [ref=e493]:
          - generic [ref=e494]:
            - generic [ref=e495]:
              - heading "Projects Portfolio" [level=2] [ref=e496]:
                - img [ref=e497]
                - text: Projects Portfolio
              - link "Add Project" [ref=e501] [cursor=pointer]:
                - /url: /project/new
                - img [ref=e502]
                - text: Add Project
            - generic [ref=e504]:
              - generic [ref=e505]:
                - img "Classroom Chat" [ref=e507] [cursor=pointer]
                - generic [ref=e508]:
                  - heading "Classroom Chat" [level=3] [ref=e509]
                  - generic [ref=e510]:
                    - img [ref=e511]
                    - text: Well done, Mr. Mega!!...
                  - paragraph [ref=e514]: I made the app you are using!...
                  - generic [ref=e515]:
                    - button "Details" [ref=e516] [cursor=pointer]
                    - button "Edit Project" [ref=e517] [cursor=pointer]:
                      - img [ref=e518]
              - generic [ref=e521]:
                - img "go!" [ref=e523] [cursor=pointer]
                - generic [ref=e524]:
                  - heading "go!" [level=3] [ref=e525]
                  - paragraph [ref=e526]: ...
                  - generic [ref=e527]:
                    - button "Details" [ref=e528] [cursor=pointer]
                    - button "Edit Project" [ref=e529] [cursor=pointer]:
                      - img [ref=e530]
          - generic [ref=e533]:
            - heading "Coding Activity" [level=2] [ref=e535]:
              - img [ref=e536]
              - text: Coding Activity
            - generic [ref=e540]:
              - generic [ref=e541]:
                - generic [ref=e542]: Jun
                - generic [ref=e543]: Jul
                - generic [ref=e544]: Aug
                - generic [ref=e545]: Sep
                - generic [ref=e546]: Oct
                - generic [ref=e547]: Nov
                - generic [ref=e548]: Dec
                - generic [ref=e549]: Jan
                - generic [ref=e550]: Feb
                - generic [ref=e551]: Mar
                - generic [ref=e552]: Apr
                - generic [ref=e553]: May
              - generic [ref=e554]:
                - generic [ref=e555]:
                  - generic [ref=e557]: Mon
                  - generic [ref=e559]: Wed
                  - generic [ref=e561]: Fri
                - generic [ref=e563]:
                  - generic [ref=e564]:
                    - generic "completed 0 of levels on unknown" [ref=e565]
                    - generic "completed 0 of levels on 2025-06-08" [ref=e566]
                    - generic "completed 0 of levels on 2025-06-15" [ref=e567]
                    - generic "completed 0 of levels on 2025-06-22" [ref=e568]
                    - generic "completed 0 of levels on 2025-06-29" [ref=e569]
                    - generic "completed 0 of levels on 2025-07-06" [ref=e570]
                    - generic "completed 0 of levels on 2025-07-13" [ref=e571]
                    - generic "completed 0 of levels on 2025-07-20" [ref=e572]
                    - generic "completed 0 of levels on 2025-07-27" [ref=e573]
                    - generic "completed 0 of levels on 2025-08-03" [ref=e574]
                    - generic "completed 0 of levels on 2025-08-10" [ref=e575]
                    - generic "completed 0 of levels on 2025-08-17" [ref=e576]
                    - generic "completed 0 of levels on 2025-08-24" [ref=e577]
                    - generic "completed 0 of levels on 2025-08-31" [ref=e578]
                    - generic "completed 0 of levels on 2025-09-07" [ref=e579]
                    - generic "completed 0 of levels on 2025-09-14" [ref=e580]
                    - generic "completed 0 of levels on 2025-09-21" [ref=e581]
                    - generic "completed 0 of levels on 2025-09-28" [ref=e582]
                    - generic "completed 0 of levels on 2025-10-05" [ref=e583]
                    - generic "completed 0 of levels on 2025-10-12" [ref=e584]
                    - generic "completed 0 of levels on 2025-10-19" [ref=e585]
                    - generic "completed 0 of levels on 2025-10-26" [ref=e586]
                    - generic "completed 0 of levels on 2025-11-02" [ref=e587]
                    - generic "completed 0 of levels on 2025-11-09" [ref=e588]
                    - generic "completed 0 of levels on 2025-11-16" [ref=e589]
                    - generic "completed 0 of levels on 2025-11-23" [ref=e590]
                    - generic "completed 0 of levels on 2025-11-30" [ref=e591]
                    - generic "completed 0 of levels on 2025-12-07" [ref=e592]
                    - generic "completed 0 of levels on 2025-12-14" [ref=e593]
                    - generic "completed 0 of levels on 2025-12-21" [ref=e594]
                    - generic "completed 0 of levels on 2025-12-28" [ref=e595]
                    - generic "completed 0 of levels on 2026-01-04" [ref=e596]
                    - generic "completed 0 of levels on 2026-01-11" [ref=e597]
                    - generic "completed 0 of levels on 2026-01-18" [ref=e598]
                    - generic "completed 0 of levels on 2026-01-25" [ref=e599]
                    - generic "completed 0 of levels on 2026-02-01" [ref=e600]
                    - generic "completed 0 of levels on 2026-02-08" [ref=e601]
                    - generic "completed 0 of levels on 2026-02-15" [ref=e602]
                    - generic "completed 0 of levels on 2026-02-22" [ref=e603]
                    - generic "completed 0 of levels on 2026-03-01" [ref=e604]
                    - generic "completed 0 of levels on 2026-03-08" [ref=e605]
                    - generic "completed 0 of levels on 2026-03-15" [ref=e606]
                    - generic "completed 0 of levels on 2026-03-22" [ref=e607]
                    - generic "completed 0 of levels on 2026-03-29" [ref=e608]
                    - generic "completed 0 of levels on 2026-04-05" [ref=e609]
                    - generic "completed 0 of levels on 2026-04-12" [ref=e610]
                    - generic "completed 0 of levels on 2026-04-19" [ref=e611]
                    - generic "completed 0 of levels on 2026-04-26" [ref=e612]
                    - generic "completed 0 of levels on 2026-05-03" [ref=e613]
                    - generic "completed 0 of levels on 2026-05-10" [ref=e614]
                    - generic "completed 0 of levels on 2026-05-17" [ref=e615]
                    - generic "completed 0 of levels on 2026-05-24" [ref=e616]
                    - generic "completed 0 of levels on 2026-05-31" [ref=e617]
                  - generic [ref=e618]:
                    - generic "completed 0 of levels on unknown" [ref=e619]
                    - generic "completed 0 of levels on 2025-06-09" [ref=e620]
                    - generic "completed 0 of levels on 2025-06-16" [ref=e621]
                    - generic "completed 0 of levels on 2025-06-23" [ref=e622]
                    - generic "completed 0 of levels on 2025-06-30" [ref=e623]
                    - generic "completed 0 of levels on 2025-07-07" [ref=e624]
                    - generic "completed 0 of levels on 2025-07-14" [ref=e625]
                    - generic "completed 0 of levels on 2025-07-21" [ref=e626]
                    - generic "completed 0 of levels on 2025-07-28" [ref=e627]
                    - generic "completed 0 of levels on 2025-08-04" [ref=e628]
                    - generic "completed 0 of levels on 2025-08-11" [ref=e629]
                    - generic "completed 0 of levels on 2025-08-18" [ref=e630]
                    - generic "completed 0 of levels on 2025-08-25" [ref=e631]
                    - generic "completed 0 of levels on 2025-09-01" [ref=e632]
                    - generic "completed 0 of levels on 2025-09-08" [ref=e633]
                    - generic "completed 0 of levels on 2025-09-15" [ref=e634]
                    - generic "completed 0 of levels on 2025-09-22" [ref=e635]
                    - generic "completed 0 of levels on 2025-09-29" [ref=e636]
                    - generic "completed 0 of levels on 2025-10-06" [ref=e637]
                    - generic "completed 0 of levels on 2025-10-13" [ref=e638]
                    - generic "completed 0 of levels on 2025-10-20" [ref=e639]
                    - generic "completed 0 of levels on 2025-10-27" [ref=e640]
                    - generic "completed 0 of levels on 2025-11-03" [ref=e641]
                    - generic "completed 0 of levels on 2025-11-10" [ref=e642]
                    - generic "completed 0 of levels on 2025-11-17" [ref=e643]
                    - generic "completed 0 of levels on 2025-11-24" [ref=e644]
                    - generic "completed 0 of levels on 2025-12-01" [ref=e645]
                    - generic "completed 0 of levels on 2025-12-08" [ref=e646]
                    - generic "completed 0 of levels on 2025-12-15" [ref=e647]
                    - generic "completed 0 of levels on 2025-12-22" [ref=e648]
                    - generic "completed 0 of levels on 2025-12-29" [ref=e649]
                    - generic "completed 0 of levels on 2026-01-05" [ref=e650]
                    - generic "completed 0 of levels on 2026-01-12" [ref=e651]
                    - generic "completed 0 of levels on 2026-01-19" [ref=e652]
                    - generic "completed 0 of levels on 2026-01-26" [ref=e653]
                    - generic "completed 0 of levels on 2026-02-02" [ref=e654]
                    - generic "completed 0 of levels on 2026-02-09" [ref=e655]
                    - generic "completed 0 of levels on 2026-02-16" [ref=e656]
                    - generic "completed 0 of levels on 2026-02-23" [ref=e657]
                    - generic "completed 0 of levels on 2026-03-02" [ref=e658]
                    - generic "completed 0 of levels on 2026-03-09" [ref=e659]
                    - generic "completed 0 of levels on 2026-03-16" [ref=e660]
                    - generic "completed 0 of levels on 2026-03-23" [ref=e661]
                    - generic "completed 0 of levels on 2026-03-30" [ref=e662]
                    - generic "completed 0 of levels on 2026-04-06" [ref=e663]
                    - generic "completed 0 of levels on 2026-04-13" [ref=e664]
                    - generic "completed 0 of levels on 2026-04-20" [ref=e665]
                    - generic "completed 0 of levels on 2026-04-27" [ref=e666]
                    - generic "completed 0 of levels on 2026-05-04" [ref=e667]
                    - generic "completed 0 of levels on 2026-05-11" [ref=e668]
                    - generic "completed 0 of levels on 2026-05-18" [ref=e669]
                    - generic "completed 0 of levels on 2026-05-25" [ref=e670]
                    - generic "completed 0 of levels on 2026-06-01" [ref=e671]
                  - generic [ref=e672]:
                    - generic "completed 0 of levels on unknown" [ref=e673]
                    - generic "completed 0 of levels on 2025-06-10" [ref=e674]
                    - generic "completed 0 of levels on 2025-06-17" [ref=e675]
                    - generic "completed 0 of levels on 2025-06-24" [ref=e676]
                    - generic "completed 0 of levels on 2025-07-01" [ref=e677]
                    - generic "completed 0 of levels on 2025-07-08" [ref=e678]
                    - generic "completed 0 of levels on 2025-07-15" [ref=e679]
                    - generic "completed 0 of levels on 2025-07-22" [ref=e680]
                    - generic "completed 0 of levels on 2025-07-29" [ref=e681]
                    - generic "completed 0 of levels on 2025-08-05" [ref=e682]
                    - generic "completed 0 of levels on 2025-08-12" [ref=e683]
                    - generic "completed 0 of levels on 2025-08-19" [ref=e684]
                    - generic "completed 0 of levels on 2025-08-26" [ref=e685]
                    - generic "completed 0 of levels on 2025-09-02" [ref=e686]
                    - generic "completed 0 of levels on 2025-09-09" [ref=e687]
                    - generic "completed 0 of levels on 2025-09-16" [ref=e688]
                    - generic "completed 0 of levels on 2025-09-23" [ref=e689]
                    - generic "completed 0 of levels on 2025-09-30" [ref=e690]
                    - generic "completed 0 of levels on 2025-10-07" [ref=e691]
                    - generic "completed 0 of levels on 2025-10-14" [ref=e692]
                    - generic "completed 0 of levels on 2025-10-21" [ref=e693]
                    - generic "completed 0 of levels on 2025-10-28" [ref=e694]
                    - generic "completed 0 of levels on 2025-11-04" [ref=e695]
                    - generic "completed 0 of levels on 2025-11-11" [ref=e696]
                    - generic "completed 0 of levels on 2025-11-18" [ref=e697]
                    - generic "completed 0 of levels on 2025-11-25" [ref=e698]
                    - generic "completed 0 of levels on 2025-12-02" [ref=e699]
                    - generic "completed 0 of levels on 2025-12-09" [ref=e700]
                    - generic "completed 0 of levels on 2025-12-16" [ref=e701]
                    - generic "completed 0 of levels on 2025-12-23" [ref=e702]
                    - generic "completed 0 of levels on 2025-12-30" [ref=e703]
                    - generic "completed 0 of levels on 2026-01-06" [ref=e704]
                    - generic "completed 0 of levels on 2026-01-13" [ref=e705]
                    - generic "completed 0 of levels on 2026-01-20" [ref=e706]
                    - generic "completed 0 of levels on 2026-01-27" [ref=e707]
                    - generic "completed 0 of levels on 2026-02-03" [ref=e708]
                    - generic "completed 0 of levels on 2026-02-10" [ref=e709]
                    - generic "completed 0 of levels on 2026-02-17" [ref=e710]
                    - generic "completed 0 of levels on 2026-02-24" [ref=e711]
                    - generic "completed 0 of levels on 2026-03-03" [ref=e712]
                    - generic "completed 0 of levels on 2026-03-10" [ref=e713]
                    - generic "completed 0 of levels on 2026-03-17" [ref=e714]
                    - generic "completed 0 of levels on 2026-03-24" [ref=e715]
                    - generic "completed 0 of levels on 2026-03-31" [ref=e716]
                    - generic "completed 0 of levels on 2026-04-07" [ref=e717]
                    - generic "completed 0 of levels on 2026-04-14" [ref=e718]
                    - generic "completed 0 of levels on 2026-04-21" [ref=e719]
                    - generic "completed 0 of levels on 2026-04-28" [ref=e720]
                    - generic "completed 0 of levels on 2026-05-05" [ref=e721]
                    - generic "completed 0 of levels on 2026-05-12" [ref=e722]
                    - generic "completed 0 of levels on 2026-05-19" [ref=e723]
                    - generic "completed 0 of levels on 2026-05-26" [ref=e724]
                    - generic "completed 0 of levels on 2026-06-02" [ref=e725]
                  - generic [ref=e726]:
                    - generic "completed 0 of levels on unknown" [ref=e727]
                    - generic "completed 0 of levels on 2025-06-11" [ref=e728]
                    - generic "completed 0 of levels on 2025-06-18" [ref=e729]
                    - generic "completed 0 of levels on 2025-06-25" [ref=e730]
                    - generic "completed 0 of levels on 2025-07-02" [ref=e731]
                    - generic "completed 0 of levels on 2025-07-09" [ref=e732]
                    - generic "completed 0 of levels on 2025-07-16" [ref=e733]
                    - generic "completed 0 of levels on 2025-07-23" [ref=e734]
                    - generic "completed 0 of levels on 2025-07-30" [ref=e735]
                    - generic "completed 0 of levels on 2025-08-06" [ref=e736]
                    - generic "completed 0 of levels on 2025-08-13" [ref=e737]
                    - generic "completed 0 of levels on 2025-08-20" [ref=e738]
                    - generic "completed 0 of levels on 2025-08-27" [ref=e739]
                    - generic "completed 0 of levels on 2025-09-03" [ref=e740]
                    - generic "completed 0 of levels on 2025-09-10" [ref=e741]
                    - generic "completed 0 of levels on 2025-09-17" [ref=e742]
                    - generic "completed 0 of levels on 2025-09-24" [ref=e743]
                    - generic "completed 0 of levels on 2025-10-01" [ref=e744]
                    - generic "completed 0 of levels on 2025-10-08" [ref=e745]
                    - generic "completed 0 of levels on 2025-10-15" [ref=e746]
                    - generic "completed 0 of levels on 2025-10-22" [ref=e747]
                    - generic "completed 0 of levels on 2025-10-29" [ref=e748]
                    - generic "completed 0 of levels on 2025-11-05" [ref=e749]
                    - generic "completed 0 of levels on 2025-11-12" [ref=e750]
                    - generic "completed 0 of levels on 2025-11-19" [ref=e751]
                    - generic "completed 0 of levels on 2025-11-26" [ref=e752]
                    - generic "completed 0 of levels on 2025-12-03" [ref=e753]
                    - generic "completed 0 of levels on 2025-12-10" [ref=e754]
                    - generic "completed 0 of levels on 2025-12-17" [ref=e755]
                    - generic "completed 0 of levels on 2025-12-24" [ref=e756]
                    - generic "completed 0 of levels on 2025-12-31" [ref=e757]
                    - generic "completed 0 of levels on 2026-01-07" [ref=e758]
                    - generic "completed 0 of levels on 2026-01-14" [ref=e759]
                    - generic "completed 0 of levels on 2026-01-21" [ref=e760]
                    - generic "completed 0 of levels on 2026-01-28" [ref=e761]
                    - generic "completed 0 of levels on 2026-02-04" [ref=e762]
                    - generic "completed 0 of levels on 2026-02-11" [ref=e763]
                    - generic "completed 0 of levels on 2026-02-18" [ref=e764]
                    - generic "completed 0 of levels on 2026-02-25" [ref=e765]
                    - generic "completed 0 of levels on 2026-03-04" [ref=e766]
                    - generic "completed 0 of levels on 2026-03-11" [ref=e767]
                    - generic "completed 0 of levels on 2026-03-18" [ref=e768]
                    - generic "completed 0 of levels on 2026-03-25" [ref=e769]
                    - generic "completed 0 of levels on 2026-04-01" [ref=e770]
                    - generic "completed 0 of levels on 2026-04-08" [ref=e771]
                    - generic "completed 0 of levels on 2026-04-15" [ref=e772]
                    - generic "completed 0 of levels on 2026-04-22" [ref=e773]
                    - generic "completed 0 of levels on 2026-04-29" [ref=e774]
                    - generic "completed 0 of levels on 2026-05-06" [ref=e775]
                    - generic "completed 0 of levels on 2026-05-13" [ref=e776]
                    - generic "completed 0 of levels on 2026-05-20" [ref=e777]
                    - generic "completed 0 of levels on 2026-05-27" [ref=e778]
                    - generic "completed 0 of levels on 2026-06-03" [ref=e779]
                  - generic [ref=e780]:
                    - generic "completed 0 of levels on unknown" [ref=e781]
                    - generic "completed 0 of levels on 2025-06-12" [ref=e782]
                    - generic "completed 0 of levels on 2025-06-19" [ref=e783]
                    - generic "completed 0 of levels on 2025-06-26" [ref=e784]
                    - generic "completed 0 of levels on 2025-07-03" [ref=e785]
                    - generic "completed 0 of levels on 2025-07-10" [ref=e786]
                    - generic "completed 0 of levels on 2025-07-17" [ref=e787]
                    - generic "completed 0 of levels on 2025-07-24" [ref=e788]
                    - generic "completed 0 of levels on 2025-07-31" [ref=e789]
                    - generic "completed 0 of levels on 2025-08-07" [ref=e790]
                    - generic "completed 0 of levels on 2025-08-14" [ref=e791]
                    - generic "completed 0 of levels on 2025-08-21" [ref=e792]
                    - generic "completed 0 of levels on 2025-08-28" [ref=e793]
                    - generic "completed 0 of levels on 2025-09-04" [ref=e794]
                    - generic "completed 0 of levels on 2025-09-11" [ref=e795]
                    - generic "completed 0 of levels on 2025-09-18" [ref=e796]
                    - generic "completed 0 of levels on 2025-09-25" [ref=e797]
                    - generic "completed 0 of levels on 2025-10-02" [ref=e798]
                    - generic "completed 0 of levels on 2025-10-09" [ref=e799]
                    - generic "completed 0 of levels on 2025-10-16" [ref=e800]
                    - generic "completed 0 of levels on 2025-10-23" [ref=e801]
                    - generic "completed 0 of levels on 2025-10-30" [ref=e802]
                    - generic "completed 0 of levels on 2025-11-06" [ref=e803]
                    - generic "completed 0 of levels on 2025-11-13" [ref=e804]
                    - generic "completed 0 of levels on 2025-11-20" [ref=e805]
                    - generic "completed 0 of levels on 2025-11-27" [ref=e806]
                    - generic "completed 0 of levels on 2025-12-04" [ref=e807]
                    - generic "completed 0 of levels on 2025-12-11" [ref=e808]
                    - generic "completed 0 of levels on 2025-12-18" [ref=e809]
                    - generic "completed 0 of levels on 2025-12-25" [ref=e810]
                    - generic "completed 0 of levels on 2026-01-01" [ref=e811]
                    - generic "completed 0 of levels on 2026-01-08" [ref=e812]
                    - generic "completed 0 of levels on 2026-01-15" [ref=e813]
                    - generic "completed 0 of levels on 2026-01-22" [ref=e814]
                    - generic "completed 0 of levels on 2026-01-29" [ref=e815]
                    - generic "completed 0 of levels on 2026-02-05" [ref=e816]
                    - generic "completed 0 of levels on 2026-02-12" [ref=e817]
                    - generic "completed 0 of levels on 2026-02-19" [ref=e818]
                    - generic "completed 0 of levels on 2026-02-26" [ref=e819]
                    - generic "completed 0 of levels on 2026-03-05" [ref=e820]
                    - generic "completed 0 of levels on 2026-03-12" [ref=e821]
                    - generic "completed 0 of levels on 2026-03-19" [ref=e822]
                    - generic "completed 0 of levels on 2026-03-26" [ref=e823]
                    - generic "completed 0 of levels on 2026-04-02" [ref=e824]
                    - generic "completed 0 of levels on 2026-04-09" [ref=e825]
                    - generic "completed 0 of levels on 2026-04-16" [ref=e826]
                    - generic "completed 0 of levels on 2026-04-23" [ref=e827]
                    - generic "completed 0 of levels on 2026-04-30" [ref=e828]
                    - generic "completed 0 of levels on 2026-05-07" [ref=e829]
                    - generic "completed 0 of levels on 2026-05-14" [ref=e830]
                    - generic "completed 0 of levels on 2026-05-21" [ref=e831]
                    - generic "completed 0 of levels on 2026-05-28" [ref=e832]
                    - generic "completed 0 of levels on 2026-06-04" [ref=e833]
                  - generic [ref=e834]:
                    - generic "completed 0 of levels on unknown" [ref=e835]
                    - generic "completed 0 of levels on 2025-06-13" [ref=e836]
                    - generic "completed 0 of levels on 2025-06-20" [ref=e837]
                    - generic "completed 0 of levels on 2025-06-27" [ref=e838]
                    - generic "completed 0 of levels on 2025-07-04" [ref=e839]
                    - generic "completed 0 of levels on 2025-07-11" [ref=e840]
                    - generic "completed 0 of levels on 2025-07-18" [ref=e841]
                    - generic "completed 0 of levels on 2025-07-25" [ref=e842]
                    - generic "completed 0 of levels on 2025-08-01" [ref=e843]
                    - generic "completed 0 of levels on 2025-08-08" [ref=e844]
                    - generic "completed 0 of levels on 2025-08-15" [ref=e845]
                    - generic "completed 0 of levels on 2025-08-22" [ref=e846]
                    - generic "completed 0 of levels on 2025-08-29" [ref=e847]
                    - generic "completed 0 of levels on 2025-09-05" [ref=e848]
                    - generic "completed 0 of levels on 2025-09-12" [ref=e849]
                    - generic "completed 0 of levels on 2025-09-19" [ref=e850]
                    - generic "completed 0 of levels on 2025-09-26" [ref=e851]
                    - generic "completed 0 of levels on 2025-10-03" [ref=e852]
                    - generic "completed 0 of levels on 2025-10-10" [ref=e853]
                    - generic "completed 0 of levels on 2025-10-17" [ref=e854]
                    - generic "completed 0 of levels on 2025-10-24" [ref=e855]
                    - generic "completed 0 of levels on 2025-10-31" [ref=e856]
                    - generic "completed 0 of levels on 2025-11-07" [ref=e857]
                    - generic "completed 0 of levels on 2025-11-14" [ref=e858]
                    - generic "completed 0 of levels on 2025-11-21" [ref=e859]
                    - generic "completed 0 of levels on 2025-11-28" [ref=e860]
                    - generic "completed 0 of levels on 2025-12-05" [ref=e861]
                    - generic "completed 835 of levels on 2025-12-12" [ref=e862]
                    - generic "completed 0 of levels on 2025-12-19" [ref=e863]
                    - generic "completed 0 of levels on 2025-12-26" [ref=e864]
                    - generic "completed 0 of levels on 2026-01-02" [ref=e865]
                    - generic "completed 0 of levels on 2026-01-09" [ref=e866]
                    - generic "completed 0 of levels on 2026-01-16" [ref=e867]
                    - generic "completed 0 of levels on 2026-01-23" [ref=e868]
                    - generic "completed 0 of levels on 2026-01-30" [ref=e869]
                    - generic "completed 0 of levels on 2026-02-06" [ref=e870]
                    - generic "completed 0 of levels on 2026-02-13" [ref=e871]
                    - generic "completed 0 of levels on 2026-02-20" [ref=e872]
                    - generic "completed 0 of levels on 2026-02-27" [ref=e873]
                    - generic "completed 0 of levels on 2026-03-06" [ref=e874]
                    - generic "completed 0 of levels on 2026-03-13" [ref=e875]
                    - generic "completed 0 of levels on 2026-03-20" [ref=e876]
                    - generic "completed 0 of levels on 2026-03-27" [ref=e877]
                    - generic "completed 0 of levels on 2026-04-03" [ref=e878]
                    - generic "completed 0 of levels on 2026-04-10" [ref=e879]
                    - generic "completed 0 of levels on 2026-04-17" [ref=e880]
                    - generic "completed 0 of levels on 2026-04-24" [ref=e881]
                    - generic "completed 0 of levels on 2026-05-01" [ref=e882]
                    - generic "completed 0 of levels on 2026-05-08" [ref=e883]
                    - generic "completed 0 of levels on 2026-05-15" [ref=e884]
                    - generic "completed 0 of levels on 2026-05-22" [ref=e885]
                    - generic "completed 0 of levels on 2026-05-29" [ref=e886]
                    - generic "completed 0 of levels on 2026-06-05" [ref=e887]
                  - generic [ref=e888]:
                    - generic "completed 0 of levels on 2025-06-07" [ref=e889]
                    - generic "completed 0 of levels on 2025-06-14" [ref=e890]
                    - generic "completed 0 of levels on 2025-06-21" [ref=e891]
                    - generic "completed 0 of levels on 2025-06-28" [ref=e892]
                    - generic "completed 0 of levels on 2025-07-05" [ref=e893]
                    - generic "completed 0 of levels on 2025-07-12" [ref=e894]
                    - generic "completed 0 of levels on 2025-07-19" [ref=e895]
                    - generic "completed 0 of levels on 2025-07-26" [ref=e896]
                    - generic "completed 0 of levels on 2025-08-02" [ref=e897]
                    - generic "completed 0 of levels on 2025-08-09" [ref=e898]
                    - generic "completed 0 of levels on 2025-08-16" [ref=e899]
                    - generic "completed 0 of levels on 2025-08-23" [ref=e900]
                    - generic "completed 0 of levels on 2025-08-30" [ref=e901]
                    - generic "completed 0 of levels on 2025-09-06" [ref=e902]
                    - generic "completed 0 of levels on 2025-09-13" [ref=e903]
                    - generic "completed 0 of levels on 2025-09-20" [ref=e904]
                    - generic "completed 0 of levels on 2025-09-27" [ref=e905]
                    - generic "completed 0 of levels on 2025-10-04" [ref=e906]
                    - generic "completed 0 of levels on 2025-10-11" [ref=e907]
                    - generic "completed 0 of levels on 2025-10-18" [ref=e908]
                    - generic "completed 0 of levels on 2025-10-25" [ref=e909]
                    - generic "completed 0 of levels on 2025-11-01" [ref=e910]
                    - generic "completed 0 of levels on 2025-11-08" [ref=e911]
                    - generic "completed 0 of levels on 2025-11-15" [ref=e912]
                    - generic "completed 0 of levels on 2025-11-22" [ref=e913]
                    - generic "completed 0 of levels on 2025-11-29" [ref=e914]
                    - generic "completed 0 of levels on 2025-12-06" [ref=e915]
                    - generic "completed 0 of levels on 2025-12-13" [ref=e916]
                    - generic "completed 0 of levels on 2025-12-20" [ref=e917]
                    - generic "completed 0 of levels on 2025-12-27" [ref=e918]
                    - generic "completed 0 of levels on 2026-01-03" [ref=e919]
                    - generic "completed 0 of levels on 2026-01-10" [ref=e920]
                    - generic "completed 0 of levels on 2026-01-17" [ref=e921]
                    - generic "completed 0 of levels on 2026-01-24" [ref=e922]
                    - generic "completed 0 of levels on 2026-01-31" [ref=e923]
                    - generic "completed 0 of levels on 2026-02-07" [ref=e924]
                    - generic "completed 0 of levels on 2026-02-14" [ref=e925]
                    - generic "completed 0 of levels on 2026-02-21" [ref=e926]
                    - generic "completed 0 of levels on 2026-02-28" [ref=e927]
                    - generic "completed 0 of levels on 2026-03-07" [ref=e928]
                    - generic "completed 0 of levels on 2026-03-14" [ref=e929]
                    - generic "completed 0 of levels on 2026-03-21" [ref=e930]
                    - generic "completed 0 of levels on 2026-03-28" [ref=e931]
                    - generic "completed 0 of levels on 2026-04-04" [ref=e932]
                    - generic "completed 0 of levels on 2026-04-11" [ref=e933]
                    - generic "completed 0 of levels on 2026-04-18" [ref=e934]
                    - generic "completed 0 of levels on 2026-04-25" [ref=e935]
                    - generic "completed 0 of levels on 2026-05-02" [ref=e936]
                    - generic "completed 0 of levels on 2026-05-09" [ref=e937]
                    - generic "completed 0 of levels on 2026-05-16" [ref=e938]
                    - generic "completed 0 of levels on 2026-05-23" [ref=e939]
                    - generic "completed 0 of levels on 2026-05-30" [ref=e940]
                    - generic "completed 0 of levels on 2026-06-06" [ref=e941]
              - generic [ref=e942]:
                - generic [ref=e943]: Less
                - generic [ref=e950]: More
          - generic [ref=e952]:
            - heading "Digital Notebook" [level=2] [ref=e953]:
              - img [ref=e954]
              - text: Digital Notebook
            - generic [ref=e957]:
              - button "Scan Note" [ref=e958] [cursor=pointer]:
                - img [ref=e959]
              - button "Upload Note" [ref=e962] [cursor=pointer]:
                - img [ref=e963]
  - complementary [ref=e969]:
    - generic [ref=e970]:
      - img "Logo" [ref=e972]
      - button [ref=e973] [cursor=pointer]:
        - img [ref=e974]
    - navigation [ref=e977]:
      - list [ref=e978]:
        - listitem [ref=e979]:
          - link "Chat" [ref=e980] [cursor=pointer]:
            - /url: /
            - img [ref=e981]
            - text: Chat
        - listitem [ref=e984]:
          - link "Profile" [ref=e985] [cursor=pointer]:
            - /url: /profile
            - img [ref=e986]
            - text: Profile
        - listitem [ref=e989]:
          - link "Admin Panel" [ref=e990] [cursor=pointer]:
            - /url: /admin
            - img [ref=e991]
            - text: Admin Panel
        - listitem [ref=e993]:
          - link "Submit Work" [ref=e994] [cursor=pointer]:
            - /url: /submit-work
            - img [ref=e995]
            - text: Submit Work
        - listitem [ref=e999]:
          - link "Bit Shift" [ref=e1000] [cursor=pointer]:
            - /url: /bit-shift
            - img [ref=e1001]
            - text: Bit Shift
        - listitem [ref=e1006]:
          - link "Record" [ref=e1007] [cursor=pointer]:
            - /url: https://benmega.github.io/screen-recorder/
            - img [ref=e1008]
            - text: Record
    - button "Logout" [ref=e1012] [cursor=pointer]:
      - img [ref=e1013]
      - text: Logout
  - contentinfo [ref=e1016]:
    - paragraph [ref=e1017]: © 2026 Classroom Chat. All Rights Reserved.
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
  20 |     // Enable console logging
  21 |     page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
  22 | 
  23 |     console.log('Logging in as admin...');
  24 |     await page.goto('http://localhost:8000/dev-login?role=admin');
  25 |     await page.waitForURL('**/localhost:5173/**', { timeout: 10000 });
  26 |     
  27 |     // 1. Home / Chat Page
  28 |     console.log('Navigating to Chat...');
  29 |     await page.goto('http://localhost:5173/');
  30 |     await page.waitForTimeout(3000);
  31 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_home.png') });
  32 | 
  33 |     // 2. Profile page
  34 |     console.log('Navigating to Profile...');
  35 |     await page.goto('http://localhost:5173/profile');
  36 |     await page.waitForTimeout(3000);
  37 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_profile.png') });
  38 | 
  39 |     // 3. Open Sidebar / Hamburger Menu (on Profile page where it's visible)
  40 |     console.log('Opening hamburger menu on Profile page...');
  41 |     const hamburger = page.locator('header button.hamburger-toggle').first();
  42 |     if (await hamburger.isVisible()) {
  43 |       await hamburger.click();
  44 |       await page.waitForTimeout(1000);
  45 |       await page.screenshot({ path: path.join(screenshotsDir, 'mobile_sidebar_open.png') });
  46 |       
  47 |       // Close sidebar by clicking overlay or close button
  48 |       const closeBtn = page.locator('.mobile-sidebar .sidebar-close, .mobile-overlay').first();
> 49 |       await closeBtn.click();
     |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  50 |       await page.waitForTimeout(500);
  51 |     } else {
  52 |       console.log('Hamburger menu not found on Profile page!');
  53 |     }
  54 | 
  55 |     // 4. Achievements page
  56 |     console.log('Navigating to Achievements...');
  57 |     await page.goto('http://localhost:5173/achievements');
  58 |     await page.waitForTimeout(3000);
  59 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_achievements.png') });
  60 | 
  61 |     // 5. Bit-Shift page
  62 |     console.log('Navigating to Bit-Shift...');
  63 |     await page.goto('http://localhost:5173/bit-shift');
  64 |     await page.waitForTimeout(3000);
  65 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_bit_shift.png') });
  66 | 
  67 |     // 6. Admin Panel
  68 |     console.log('Navigating to Admin Panel...');
  69 |     await page.goto('http://localhost:5173/admin');
  70 |     await page.waitForTimeout(3000);
  71 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin.png') });
  72 | 
  73 |     // 7. Admin Advanced Panel
  74 |     console.log('Navigating to Admin Advanced...');
  75 |     await page.goto('http://localhost:5173/admin/advanced');
  76 |     await page.waitForTimeout(3000);
  77 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin_advanced.png') });
  78 | 
  79 |     console.log('Mobile UI Audit Navigation complete!');
  80 |   });
  81 | });
  82 | 
```