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
      - <a href="/bit-shift" data-discover="true">…</a> from <aside class="mobile-sidebar open">…</aside> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <a href="/bit-shift" data-discover="true">…</a> from <aside class="mobile-sidebar open">…</aside> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    32 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <a href="/bit-shift" data-discover="true">…</a> from <aside class="mobile-sidebar open">…</aside> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "Toggle Sidebar" [expanded] [active] [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - link "Classroom Chat Logo" [ref=e9] [cursor=pointer]:
        - /url: /
        - img "Classroom Chat Logo" [ref=e10]
      - navigation [ref=e11]:
        - list [ref=e12]:
          - listitem [ref=e13]:
            - button "Account" [ref=e14] [cursor=pointer]:
              - img [ref=e16]
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e23]:
        - generic [ref=e24] [cursor=pointer]:
          - img "ben" [ref=e25]
          - generic [ref=e27]: Change Photo
        - generic [ref=e28]:
          - heading "Mr. Mega" [level=1] [ref=e29]
          - paragraph [ref=e30]: "@ben"
          - link "Edit Profile" [ref=e31] [cursor=pointer]:
            - /url: /settings
            - img [ref=e32]
            - text: Edit Profile
        - generic [ref=e35]:
          - generic "62" [ref=e36]:
            - generic [ref=e37]: Ducks
            - generic [ref=e38]: "62"
          - generic [ref=e40]:
            - generic [ref=e41]: Levels
            - generic [ref=e42]: "835"
          - generic [ref=e44]:
            - generic [ref=e45]: Projects
            - generic [ref=e46]: "1"
          - generic "0.175" [ref=e48]:
            - generic [ref=e49]: Packets
            - generic [ref=e50]: "0.175"
          - generic "10,010,003,568.5" [ref=e52]:
            - generic [ref=e53]: Lifetime
            - generic [ref=e54]: 10B
      - generic [ref=e55]:
        - generic [ref=e56]:
          - generic [ref=e57]:
            - heading "About Me" [level=2] [ref=e59]:
              - img [ref=e60]
              - text: About Me
            - paragraph [ref=e64]: You haven't added a biography yet. Click 'Edit Profile' to tell your classmates about yourself!
          - generic [ref=e65]:
            - heading "Course Progress" [level=2] [ref=e67]:
              - img [ref=e68]
              - text: Course Progress
            - generic [ref=e71]:
              - generic [ref=e72]:
                - generic [ref=e73]:
                  - generic [ref=e74]: CodeCombat
                  - generic [ref=e75]: 100%
                - generic [ref=e78]: 570 Levels Completed
              - generic [ref=e79]:
                - generic [ref=e80]:
                  - generic [ref=e81]: Ozaria
                  - generic [ref=e82]: 84%
                - generic [ref=e85]: 265 Levels Completed
          - generic [ref=e86]:
            - heading "Certifications" [level=2] [ref=e88]:
              - img [ref=e89]
              - text: Certifications
            - generic [ref=e93]:
              - generic [ref=e97]:
                - heading "CS1" [level=4] [ref=e98]
                - text: Sep 2025
              - generic [ref=e102]:
                - heading "CS2" [level=4] [ref=e103]
                - text: Dec 2025
              - generic [ref=e107]:
                - heading "CS3" [level=4] [ref=e108]
                - text: Dec 2025
              - generic [ref=e112]:
                - heading "CS4" [level=4] [ref=e113]
                - text: Dec 2025
              - generic [ref=e117]:
                - heading "CS5" [level=4] [ref=e118]
                - text: Dec 2025
              - generic [ref=e122]:
                - heading "CS6" [level=4] [ref=e123]
                - text: Dec 2025
              - generic [ref=e127]:
                - heading "GD1" [level=4] [ref=e128]
                - text: Dec 2025
              - generic [ref=e132]:
                - heading "GD2" [level=4] [ref=e133]
                - text: Dec 2025
              - generic [ref=e137]:
                - heading "GD3" [level=4] [ref=e138]
                - text: Dec 2025
              - generic [ref=e142]:
                - heading "Junior" [level=4] [ref=e143]
                - text: Dec 2025
              - generic [ref=e147]:
                - heading "WD1" [level=4] [ref=e148]
                - text: Dec 2025
              - generic [ref=e152]:
                - heading "WD2" [level=4] [ref=e153]
                - text: Dec 2025
              - generic [ref=e157]:
                - heading "Ch1" [level=4] [ref=e158]
                - text: Dec 2025
              - generic [ref=e162]:
                - heading "Ch2" [level=4] [ref=e163]
                - text: Dec 2025
              - generic [ref=e167]:
                - heading "Ch3" [level=4] [ref=e168]
                - text: Dec 2025
              - generic [ref=e172]:
                - heading "Ch4" [level=4] [ref=e173]
                - text: Dec 2025
          - generic [ref=e174]:
            - heading "Recent Achievements" [level=2] [ref=e176]:
              - img [ref=e177]
              - text: Recent Achievements
            - generic [ref=e181]:
              - generic "Earn your first duck" [ref=e182]:
                - generic [ref=e184]:
                  - generic [ref=e185]: First Duck
                  - generic [ref=e186]: 9/27/2025
              - generic "Earn 10 ducks" [ref=e187]:
                - generic [ref=e189]:
                  - generic [ref=e190]: Duckling
                  - generic [ref=e191]: 9/27/2025
              - generic "Earn 50 ducks" [ref=e192]:
                - generic [ref=e194]:
                  - generic [ref=e195]: Duck Collector
                  - generic [ref=e196]: 9/27/2025
              - generic "Earn 100 ducks" [ref=e197]:
                - generic [ref=e199]:
                  - generic [ref=e200]: Pond Master
                  - generic [ref=e201]: 9/27/2025
              - generic "Earn 500 ducks" [ref=e202]:
                - generic [ref=e204]:
                  - generic [ref=e205]: Duck Hoarder
                  - generic [ref=e206]: 9/27/2025
              - generic "Earn 1000 ducks" [ref=e207]:
                - generic [ref=e209]:
                  - generic [ref=e210]: Duck Millionaire
                  - generic [ref=e211]: 9/27/2025
              - generic "Complete your first level" [ref=e212]:
                - generic [ref=e214]:
                  - generic [ref=e215]: Getting Started
                  - generic [ref=e216]: 9/27/2025
              - generic "Complete 5 levels" [ref=e217]:
                - generic [ref=e219]:
                  - generic [ref=e220]: Steady Steps
                  - generic [ref=e221]: 9/27/2025
              - generic "Complete 10 levels" [ref=e222]:
                - generic [ref=e224]:
                  - generic [ref=e225]: Challenge Conqueror
                  - generic [ref=e226]: 9/27/2025
              - generic "Complete your first level" [ref=e227]:
                - generic [ref=e229]:
                  - generic [ref=e230]: Novice Coder
                  - generic [ref=e231]: 9/27/2025
              - generic "Complete 5 levels" [ref=e232]:
                - generic [ref=e234]:
                  - generic [ref=e235]: Apprentice Adventurer
                  - generic [ref=e236]: 9/27/2025
              - generic "Complete 10 levels" [ref=e237]:
                - generic [ref=e239]:
                  - generic [ref=e240]: Coding Recruit
                  - generic [ref=e241]: 9/27/2025
              - generic "Add your first project" [ref=e242]:
                - generic [ref=e244]:
                  - generic [ref=e245]: First Project
                  - generic [ref=e246]: 9/27/2025
              - generic "Add 3 projects" [ref=e247]:
                - generic [ref=e249]:
                  - generic [ref=e250]: Portfolio Builder
                  - generic [ref=e251]: 9/27/2025
              - generic "Add 5 projects" [ref=e252]:
                - generic [ref=e254]:
                  - generic [ref=e255]: Project Master
                  - generic [ref=e256]: 9/27/2025
              - generic "Stay online for 2 hours in a session" [ref=e257]:
                - generic [ref=e259]:
                  - generic [ref=e260]: Dedicated Coder
                  - generic [ref=e261]: 9/27/2025
              - generic "Stay online for 3 hours in a session" [ref=e262]:
                - generic [ref=e264]:
                  - generic [ref=e265]: Marathoner
                  - generic [ref=e266]: 9/27/2025
              - generic "Stay online for 8 hours in a session" [ref=e267]:
                - generic [ref=e269]:
                  - generic [ref=e270]: You There?
                  - generic [ref=e271]: 9/27/2025
              - generic "Complete your first bit shift" [ref=e272]:
                - generic [ref=e274]:
                  - generic [ref=e275]: Trade Initiate
                  - generic [ref=e276]: 9/27/2025
              - generic "Complete your 10 bit shifts" [ref=e277]:
                - generic [ref=e279]:
                  - generic [ref=e280]: Experienced Trader
                  - generic [ref=e281]: 9/27/2025
              - generic "Complete your 50 bit shifts" [ref=e282]:
                - generic [ref=e284]:
                  - generic [ref=e285]: Master Trader
                  - generic [ref=e286]: 9/27/2025
              - generic "Complete a challenge 2 weeks in a row" [ref=e287]:
                - generic [ref=e289]:
                  - generic [ref=e290]: On the Board
                  - generic [ref=e291]: 9/27/2025
              - generic "Send your first message in chat" [ref=e292]:
                - generic [ref=e294]:
                  - generic [ref=e295]: Hello World
                  - generic [ref=e296]: 9/27/2025
              - generic "Send 10 chat messages" [ref=e297]:
                - generic [ref=e299]:
                  - generic [ref=e300]: Chatterbox
                  - generic [ref=e301]: 9/27/2025
              - generic "Send 50 chat messages" [ref=e302]:
                - generic [ref=e304]:
                  - generic [ref=e305]: Talkative Duck
                  - generic [ref=e306]: 9/27/2025
              - generic "Submit completion certificate for CS1" [ref=e307]:
                - generic [ref=e309]:
                  - generic [ref=e310]: CS1
                  - generic [ref=e311]: 9/30/2025
              - generic "Complete 25 levels" [ref=e312]:
                - generic [ref=e314]:
                  - generic [ref=e315]: Learning Machine
                  - generic [ref=e316]: 12/6/2025
              - generic "Complete 25 levels" [ref=e317]:
                - generic [ref=e319]:
                  - generic [ref=e320]: Script Squire
                  - generic [ref=e321]: 12/7/2025
              - generic "Complete 50 levels" [ref=e322]:
                - generic [ref=e324]:
                  - generic [ref=e325]: Algorithm Adept
                  - generic [ref=e326]: 12/7/2025
              - generic "Complete 100 levels" [ref=e327]:
                - generic [ref=e329]:
                  - generic [ref=e330]: Code Knight
                  - generic [ref=e331]: 12/7/2025
              - generic "Complete 200 levels" [ref=e332]:
                - generic [ref=e334]:
                  - generic [ref=e335]: Master Programmer
                  - generic [ref=e336]: 12/7/2025
              - generic "Submit completion certificate for CS2" [ref=e337]:
                - generic [ref=e339]:
                  - generic [ref=e340]: CS2
                  - generic [ref=e341]: 12/12/2025
              - generic "Submit completion certificate for CS3" [ref=e342]:
                - generic [ref=e344]:
                  - generic [ref=e345]: CS3
                  - generic [ref=e346]: 12/12/2025
              - generic "Submit completion certificate for CS4" [ref=e347]:
                - generic [ref=e349]:
                  - generic [ref=e350]: CS4
                  - generic [ref=e351]: 12/12/2025
              - generic "Submit completion certificate for CS5" [ref=e352]:
                - generic [ref=e354]:
                  - generic [ref=e355]: CS5
                  - generic [ref=e356]: 12/12/2025
              - generic "Submit completion certificate for CS6" [ref=e357]:
                - generic [ref=e359]:
                  - generic [ref=e360]: CS6
                  - generic [ref=e361]: 12/12/2025
              - generic "Submit completion certificate for GD1" [ref=e362]:
                - generic [ref=e364]:
                  - generic [ref=e365]: GD1
                  - generic [ref=e366]: 12/12/2025
              - generic "Submit completion certificate for GD2" [ref=e367]:
                - generic [ref=e369]:
                  - generic [ref=e370]: GD2
                  - generic [ref=e371]: 12/12/2025
              - generic "Submit completion certificate for GD3" [ref=e372]:
                - generic [ref=e374]:
                  - generic [ref=e375]: GD3
                  - generic [ref=e376]: 12/12/2025
              - generic "Submit completion certificate for Junior" [ref=e377]:
                - generic [ref=e379]:
                  - generic [ref=e380]: Junior
                  - generic [ref=e381]: 12/12/2025
              - generic "Submit completion certificate for WD1" [ref=e382]:
                - generic [ref=e384]:
                  - generic [ref=e385]: WD1
                  - generic [ref=e386]: 12/12/2025
              - generic "Submit completion certificate for WD2" [ref=e387]:
                - generic [ref=e389]:
                  - generic [ref=e390]: WD2
                  - generic [ref=e391]: 12/12/2025
              - generic "Complete 50 levels" [ref=e392]:
                - generic [ref=e394]:
                  - generic [ref=e395]: Halfway Hero
                  - generic [ref=e396]: 12/12/2025
              - generic "Complete 100 levels" [ref=e397]:
                - generic [ref=e399]:
                  - generic [ref=e400]: Marathon Learner
                  - generic [ref=e401]: 12/12/2025
              - generic "Complete 150 levels" [ref=e402]:
                - generic [ref=e404]:
                  - generic [ref=e405]: Advanced Adventurer
                  - generic [ref=e406]: 12/12/2025
              - generic "Complete 200 levels" [ref=e407]:
                - generic [ref=e409]:
                  - generic [ref=e410]: Master Coder
                  - generic [ref=e411]: 12/12/2025
              - generic "Complete all 265 levels" [ref=e412]:
                - generic [ref=e414]:
                  - generic [ref=e415]: Ultimate Ozaria Champion
                  - generic [ref=e416]: 12/12/2025
              - generic "Complete 300 levels" [ref=e417]:
                - generic [ref=e419]:
                  - generic [ref=e420]: Code Champion
                  - generic [ref=e421]: 12/12/2025
              - generic "Complete 400 levels" [ref=e422]:
                - generic [ref=e424]:
                  - generic [ref=e425]: Legendary Coder
                  - generic [ref=e426]: 12/12/2025
              - generic "Complete 500 levels" [ref=e427]:
                - generic [ref=e429]:
                  - generic [ref=e430]: Heroic Hacker
                  - generic [ref=e431]: 12/12/2025
              - generic "Complete all 570 levels" [ref=e432]:
                - generic [ref=e434]:
                  - generic [ref=e435]: CodeCombat Conqueror
                  - generic [ref=e436]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch1" [ref=e437]:
                - generic [ref=e439]:
                  - generic [ref=e440]: Ch1
                  - generic [ref=e441]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch2" [ref=e442]:
                - generic [ref=e444]:
                  - generic [ref=e445]: Ch2
                  - generic [ref=e446]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch3" [ref=e447]:
                - generic [ref=e449]:
                  - generic [ref=e450]: Ch3
                  - generic [ref=e451]: 12/12/2025
              - generic "Completion certificate for Ozaria Ch4" [ref=e452]:
                - generic [ref=e454]:
                  - generic [ref=e455]: Ch4
                  - generic [ref=e456]: 12/12/2025
          - generic [ref=e457]:
            - heading "Technical Skills" [level=2] [ref=e459]:
              - img [ref=e460]
              - text: Technical Skills
            - generic [ref=e465]:
              - generic [ref=e466]: Git & GitHub
              - generic [ref=e467]: Lvl
        - generic [ref=e468]:
          - generic [ref=e469]:
            - generic [ref=e470]:
              - heading "Projects Portfolio" [level=2] [ref=e471]:
                - img [ref=e472]
                - text: Projects Portfolio
              - link "Add Project" [ref=e476] [cursor=pointer]:
                - /url: /project/new
                - img [ref=e477]
                - text: Add Project
            - generic [ref=e480]:
              - img "Classroom Chat" [ref=e482] [cursor=pointer]
              - generic [ref=e483]:
                - heading "Classroom Chat" [level=3] [ref=e484]
                - generic [ref=e485]:
                  - img [ref=e486]
                  - text: Well done, Mr. Mega!!...
                - paragraph [ref=e489]: I made the app you are using!...
                - generic [ref=e490]:
                  - button "Details" [ref=e491] [cursor=pointer]
                  - button "Edit Project" [ref=e492] [cursor=pointer]:
                    - img [ref=e493]
          - generic [ref=e496]:
            - heading "Coding Activity" [level=2] [ref=e498]:
              - img [ref=e499]
              - text: Coding Activity
            - generic [ref=e503]:
              - generic [ref=e504]:
                - generic [ref=e505]: Jun
                - generic [ref=e506]: Jul
                - generic [ref=e507]: Aug
                - generic [ref=e508]: Sep
                - generic [ref=e509]: Oct
                - generic [ref=e510]: Nov
                - generic [ref=e511]: Dec
                - generic [ref=e512]: Jan
                - generic [ref=e513]: Feb
                - generic [ref=e514]: Mar
                - generic [ref=e515]: Apr
                - generic [ref=e516]: May
              - generic [ref=e517]:
                - generic [ref=e518]:
                  - generic [ref=e520]: Mon
                  - generic [ref=e522]: Wed
                  - generic [ref=e524]: Fri
                - generic [ref=e526]:
                  - generic [ref=e527]:
                    - generic "0 activity on unknown" [ref=e528]
                    - generic "0 activity on 2025-06-01" [ref=e529]
                    - generic "0 activity on 2025-06-08" [ref=e530]
                    - generic "0 activity on 2025-06-15" [ref=e531]
                    - generic "0 activity on 2025-06-22" [ref=e532]
                    - generic "0 activity on 2025-06-29" [ref=e533]
                    - generic "0 activity on 2025-07-06" [ref=e534]
                    - generic "0 activity on 2025-07-13" [ref=e535]
                    - generic "0 activity on 2025-07-20" [ref=e536]
                    - generic "0 activity on 2025-07-27" [ref=e537]
                    - generic "0 activity on 2025-08-03" [ref=e538]
                    - generic "0 activity on 2025-08-10" [ref=e539]
                    - generic "0 activity on 2025-08-17" [ref=e540]
                    - generic "0 activity on 2025-08-24" [ref=e541]
                    - generic "0 activity on 2025-08-31" [ref=e542]
                    - generic "0 activity on 2025-09-07" [ref=e543]
                    - generic "0 activity on 2025-09-14" [ref=e544]
                    - generic "0 activity on 2025-09-21" [ref=e545]
                    - generic "0 activity on 2025-09-28" [ref=e546]
                    - generic "0 activity on 2025-10-05" [ref=e547]
                    - generic "0 activity on 2025-10-12" [ref=e548]
                    - generic "0 activity on 2025-10-19" [ref=e549]
                    - generic "0 activity on 2025-10-26" [ref=e550]
                    - generic "0 activity on 2025-11-02" [ref=e551]
                    - generic "0 activity on 2025-11-09" [ref=e552]
                    - generic "0 activity on 2025-11-16" [ref=e553]
                    - generic "0 activity on 2025-11-23" [ref=e554]
                    - generic "0 activity on 2025-11-30" [ref=e555]
                    - generic "0 activity on 2025-12-07" [ref=e556]
                    - generic "0 activity on 2025-12-14" [ref=e557]
                    - generic "0 activity on 2025-12-21" [ref=e558]
                    - generic "0 activity on 2025-12-28" [ref=e559]
                    - generic "0 activity on 2026-01-04" [ref=e560]
                    - generic "0 activity on 2026-01-11" [ref=e561]
                    - generic "0 activity on 2026-01-18" [ref=e562]
                    - generic "0 activity on 2026-01-25" [ref=e563]
                    - generic "0 activity on 2026-02-01" [ref=e564]
                    - generic "0 activity on 2026-02-08" [ref=e565]
                    - generic "0 activity on 2026-02-15" [ref=e566]
                    - generic "0 activity on 2026-02-22" [ref=e567]
                    - generic "0 activity on 2026-03-01" [ref=e568]
                    - generic "0 activity on 2026-03-08" [ref=e569]
                    - generic "0 activity on 2026-03-15" [ref=e570]
                    - generic "0 activity on 2026-03-22" [ref=e571]
                    - generic "0 activity on 2026-03-29" [ref=e572]
                    - generic "0 activity on 2026-04-05" [ref=e573]
                    - generic "0 activity on 2026-04-12" [ref=e574]
                    - generic "0 activity on 2026-04-19" [ref=e575]
                    - generic "0 activity on 2026-04-26" [ref=e576]
                    - generic "0 activity on 2026-05-03" [ref=e577]
                    - generic "0 activity on 2026-05-10" [ref=e578]
                    - generic "0 activity on 2026-05-17" [ref=e579]
                    - generic "0 activity on 2026-05-24" [ref=e580]
                  - generic [ref=e581]:
                    - generic "0 activity on unknown" [ref=e582]
                    - generic "0 activity on 2025-06-02" [ref=e583]
                    - generic "0 activity on 2025-06-09" [ref=e584]
                    - generic "0 activity on 2025-06-16" [ref=e585]
                    - generic "0 activity on 2025-06-23" [ref=e586]
                    - generic "0 activity on 2025-06-30" [ref=e587]
                    - generic "0 activity on 2025-07-07" [ref=e588]
                    - generic "0 activity on 2025-07-14" [ref=e589]
                    - generic "0 activity on 2025-07-21" [ref=e590]
                    - generic "0 activity on 2025-07-28" [ref=e591]
                    - generic "0 activity on 2025-08-04" [ref=e592]
                    - generic "0 activity on 2025-08-11" [ref=e593]
                    - generic "0 activity on 2025-08-18" [ref=e594]
                    - generic "0 activity on 2025-08-25" [ref=e595]
                    - generic "0 activity on 2025-09-01" [ref=e596]
                    - generic "0 activity on 2025-09-08" [ref=e597]
                    - generic "0 activity on 2025-09-15" [ref=e598]
                    - generic "0 activity on 2025-09-22" [ref=e599]
                    - generic "0 activity on 2025-09-29" [ref=e600]
                    - generic "0 activity on 2025-10-06" [ref=e601]
                    - generic "0 activity on 2025-10-13" [ref=e602]
                    - generic "0 activity on 2025-10-20" [ref=e603]
                    - generic "0 activity on 2025-10-27" [ref=e604]
                    - generic "0 activity on 2025-11-03" [ref=e605]
                    - generic "0 activity on 2025-11-10" [ref=e606]
                    - generic "0 activity on 2025-11-17" [ref=e607]
                    - generic "0 activity on 2025-11-24" [ref=e608]
                    - generic "0 activity on 2025-12-01" [ref=e609]
                    - generic "0 activity on 2025-12-08" [ref=e610]
                    - generic "0 activity on 2025-12-15" [ref=e611]
                    - generic "0 activity on 2025-12-22" [ref=e612]
                    - generic "0 activity on 2025-12-29" [ref=e613]
                    - generic "0 activity on 2026-01-05" [ref=e614]
                    - generic "0 activity on 2026-01-12" [ref=e615]
                    - generic "0 activity on 2026-01-19" [ref=e616]
                    - generic "0 activity on 2026-01-26" [ref=e617]
                    - generic "0 activity on 2026-02-02" [ref=e618]
                    - generic "0 activity on 2026-02-09" [ref=e619]
                    - generic "0 activity on 2026-02-16" [ref=e620]
                    - generic "0 activity on 2026-02-23" [ref=e621]
                    - generic "0 activity on 2026-03-02" [ref=e622]
                    - generic "0 activity on 2026-03-09" [ref=e623]
                    - generic "0 activity on 2026-03-16" [ref=e624]
                    - generic "0 activity on 2026-03-23" [ref=e625]
                    - generic "0 activity on 2026-03-30" [ref=e626]
                    - generic "0 activity on 2026-04-06" [ref=e627]
                    - generic "0 activity on 2026-04-13" [ref=e628]
                    - generic "0 activity on 2026-04-20" [ref=e629]
                    - generic "0 activity on 2026-04-27" [ref=e630]
                    - generic "0 activity on 2026-05-04" [ref=e631]
                    - generic "0 activity on 2026-05-11" [ref=e632]
                    - generic "0 activity on 2026-05-18" [ref=e633]
                    - generic "0 activity on 2026-05-25" [ref=e634]
                  - generic [ref=e635]:
                    - generic "0 activity on unknown" [ref=e636]
                    - generic "0 activity on 2025-06-03" [ref=e637]
                    - generic "0 activity on 2025-06-10" [ref=e638]
                    - generic "0 activity on 2025-06-17" [ref=e639]
                    - generic "0 activity on 2025-06-24" [ref=e640]
                    - generic "0 activity on 2025-07-01" [ref=e641]
                    - generic "0 activity on 2025-07-08" [ref=e642]
                    - generic "0 activity on 2025-07-15" [ref=e643]
                    - generic "0 activity on 2025-07-22" [ref=e644]
                    - generic "0 activity on 2025-07-29" [ref=e645]
                    - generic "0 activity on 2025-08-05" [ref=e646]
                    - generic "0 activity on 2025-08-12" [ref=e647]
                    - generic "0 activity on 2025-08-19" [ref=e648]
                    - generic "0 activity on 2025-08-26" [ref=e649]
                    - generic "0 activity on 2025-09-02" [ref=e650]
                    - generic "0 activity on 2025-09-09" [ref=e651]
                    - generic "0 activity on 2025-09-16" [ref=e652]
                    - generic "0 activity on 2025-09-23" [ref=e653]
                    - generic "0 activity on 2025-09-30" [ref=e654]
                    - generic "0 activity on 2025-10-07" [ref=e655]
                    - generic "0 activity on 2025-10-14" [ref=e656]
                    - generic "0 activity on 2025-10-21" [ref=e657]
                    - generic "0 activity on 2025-10-28" [ref=e658]
                    - generic "0 activity on 2025-11-04" [ref=e659]
                    - generic "0 activity on 2025-11-11" [ref=e660]
                    - generic "0 activity on 2025-11-18" [ref=e661]
                    - generic "0 activity on 2025-11-25" [ref=e662]
                    - generic "0 activity on 2025-12-02" [ref=e663]
                    - generic "0 activity on 2025-12-09" [ref=e664]
                    - generic "0 activity on 2025-12-16" [ref=e665]
                    - generic "0 activity on 2025-12-23" [ref=e666]
                    - generic "0 activity on 2025-12-30" [ref=e667]
                    - generic "0 activity on 2026-01-06" [ref=e668]
                    - generic "0 activity on 2026-01-13" [ref=e669]
                    - generic "0 activity on 2026-01-20" [ref=e670]
                    - generic "0 activity on 2026-01-27" [ref=e671]
                    - generic "0 activity on 2026-02-03" [ref=e672]
                    - generic "0 activity on 2026-02-10" [ref=e673]
                    - generic "0 activity on 2026-02-17" [ref=e674]
                    - generic "0 activity on 2026-02-24" [ref=e675]
                    - generic "0 activity on 2026-03-03" [ref=e676]
                    - generic "0 activity on 2026-03-10" [ref=e677]
                    - generic "0 activity on 2026-03-17" [ref=e678]
                    - generic "0 activity on 2026-03-24" [ref=e679]
                    - generic "0 activity on 2026-03-31" [ref=e680]
                    - generic "0 activity on 2026-04-07" [ref=e681]
                    - generic "0 activity on 2026-04-14" [ref=e682]
                    - generic "0 activity on 2026-04-21" [ref=e683]
                    - generic "0 activity on 2026-04-28" [ref=e684]
                    - generic "0 activity on 2026-05-05" [ref=e685]
                    - generic "0 activity on 2026-05-12" [ref=e686]
                    - generic "0 activity on 2026-05-19" [ref=e687]
                    - generic "0 activity on 2026-05-26" [ref=e688]
                  - generic [ref=e689]:
                    - generic "0 activity on unknown" [ref=e690]
                    - generic "0 activity on 2025-06-04" [ref=e691]
                    - generic "0 activity on 2025-06-11" [ref=e692]
                    - generic "0 activity on 2025-06-18" [ref=e693]
                    - generic "0 activity on 2025-06-25" [ref=e694]
                    - generic "0 activity on 2025-07-02" [ref=e695]
                    - generic "0 activity on 2025-07-09" [ref=e696]
                    - generic "0 activity on 2025-07-16" [ref=e697]
                    - generic "0 activity on 2025-07-23" [ref=e698]
                    - generic "0 activity on 2025-07-30" [ref=e699]
                    - generic "0 activity on 2025-08-06" [ref=e700]
                    - generic "0 activity on 2025-08-13" [ref=e701]
                    - generic "0 activity on 2025-08-20" [ref=e702]
                    - generic "0 activity on 2025-08-27" [ref=e703]
                    - generic "0 activity on 2025-09-03" [ref=e704]
                    - generic "0 activity on 2025-09-10" [ref=e705]
                    - generic "0 activity on 2025-09-17" [ref=e706]
                    - generic "0 activity on 2025-09-24" [ref=e707]
                    - generic "0 activity on 2025-10-01" [ref=e708]
                    - generic "0 activity on 2025-10-08" [ref=e709]
                    - generic "0 activity on 2025-10-15" [ref=e710]
                    - generic "0 activity on 2025-10-22" [ref=e711]
                    - generic "0 activity on 2025-10-29" [ref=e712]
                    - generic "0 activity on 2025-11-05" [ref=e713]
                    - generic "0 activity on 2025-11-12" [ref=e714]
                    - generic "0 activity on 2025-11-19" [ref=e715]
                    - generic "0 activity on 2025-11-26" [ref=e716]
                    - generic "0 activity on 2025-12-03" [ref=e717]
                    - generic "0 activity on 2025-12-10" [ref=e718]
                    - generic "0 activity on 2025-12-17" [ref=e719]
                    - generic "0 activity on 2025-12-24" [ref=e720]
                    - generic "0 activity on 2025-12-31" [ref=e721]
                    - generic "0 activity on 2026-01-07" [ref=e722]
                    - generic "0 activity on 2026-01-14" [ref=e723]
                    - generic "0 activity on 2026-01-21" [ref=e724]
                    - generic "0 activity on 2026-01-28" [ref=e725]
                    - generic "0 activity on 2026-02-04" [ref=e726]
                    - generic "0 activity on 2026-02-11" [ref=e727]
                    - generic "0 activity on 2026-02-18" [ref=e728]
                    - generic "0 activity on 2026-02-25" [ref=e729]
                    - generic "0 activity on 2026-03-04" [ref=e730]
                    - generic "0 activity on 2026-03-11" [ref=e731]
                    - generic "0 activity on 2026-03-18" [ref=e732]
                    - generic "0 activity on 2026-03-25" [ref=e733]
                    - generic "0 activity on 2026-04-01" [ref=e734]
                    - generic "0 activity on 2026-04-08" [ref=e735]
                    - generic "0 activity on 2026-04-15" [ref=e736]
                    - generic "0 activity on 2026-04-22" [ref=e737]
                    - generic "0 activity on 2026-04-29" [ref=e738]
                    - generic "0 activity on 2026-05-06" [ref=e739]
                    - generic "0 activity on 2026-05-13" [ref=e740]
                    - generic "0 activity on 2026-05-20" [ref=e741]
                    - generic "0 activity on 2026-05-27" [ref=e742]
                  - generic [ref=e743]:
                    - generic "0 activity on unknown" [ref=e744]
                    - generic "0 activity on 2025-06-05" [ref=e745]
                    - generic "0 activity on 2025-06-12" [ref=e746]
                    - generic "0 activity on 2025-06-19" [ref=e747]
                    - generic "0 activity on 2025-06-26" [ref=e748]
                    - generic "0 activity on 2025-07-03" [ref=e749]
                    - generic "0 activity on 2025-07-10" [ref=e750]
                    - generic "0 activity on 2025-07-17" [ref=e751]
                    - generic "0 activity on 2025-07-24" [ref=e752]
                    - generic "0 activity on 2025-07-31" [ref=e753]
                    - generic "0 activity on 2025-08-07" [ref=e754]
                    - generic "0 activity on 2025-08-14" [ref=e755]
                    - generic "0 activity on 2025-08-21" [ref=e756]
                    - generic "0 activity on 2025-08-28" [ref=e757]
                    - generic "0 activity on 2025-09-04" [ref=e758]
                    - generic "0 activity on 2025-09-11" [ref=e759]
                    - generic "0 activity on 2025-09-18" [ref=e760]
                    - generic "0 activity on 2025-09-25" [ref=e761]
                    - generic "0 activity on 2025-10-02" [ref=e762]
                    - generic "0 activity on 2025-10-09" [ref=e763]
                    - generic "0 activity on 2025-10-16" [ref=e764]
                    - generic "0 activity on 2025-10-23" [ref=e765]
                    - generic "0 activity on 2025-10-30" [ref=e766]
                    - generic "0 activity on 2025-11-06" [ref=e767]
                    - generic "0 activity on 2025-11-13" [ref=e768]
                    - generic "0 activity on 2025-11-20" [ref=e769]
                    - generic "0 activity on 2025-11-27" [ref=e770]
                    - generic "0 activity on 2025-12-04" [ref=e771]
                    - generic "0 activity on 2025-12-11" [ref=e772]
                    - generic "0 activity on 2025-12-18" [ref=e773]
                    - generic "0 activity on 2025-12-25" [ref=e774]
                    - generic "0 activity on 2026-01-01" [ref=e775]
                    - generic "0 activity on 2026-01-08" [ref=e776]
                    - generic "0 activity on 2026-01-15" [ref=e777]
                    - generic "0 activity on 2026-01-22" [ref=e778]
                    - generic "0 activity on 2026-01-29" [ref=e779]
                    - generic "0 activity on 2026-02-05" [ref=e780]
                    - generic "0 activity on 2026-02-12" [ref=e781]
                    - generic "0 activity on 2026-02-19" [ref=e782]
                    - generic "0 activity on 2026-02-26" [ref=e783]
                    - generic "0 activity on 2026-03-05" [ref=e784]
                    - generic "0 activity on 2026-03-12" [ref=e785]
                    - generic "0 activity on 2026-03-19" [ref=e786]
                    - generic "0 activity on 2026-03-26" [ref=e787]
                    - generic "0 activity on 2026-04-02" [ref=e788]
                    - generic "0 activity on 2026-04-09" [ref=e789]
                    - generic "0 activity on 2026-04-16" [ref=e790]
                    - generic "0 activity on 2026-04-23" [ref=e791]
                    - generic "0 activity on 2026-04-30" [ref=e792]
                    - generic "0 activity on 2026-05-07" [ref=e793]
                    - generic "0 activity on 2026-05-14" [ref=e794]
                    - generic "0 activity on 2026-05-21" [ref=e795]
                    - generic "0 activity on 2026-05-28" [ref=e796]
                  - generic [ref=e797]:
                    - generic "0 activity on unknown" [ref=e798]
                    - generic "0 activity on 2025-06-06" [ref=e799]
                    - generic "0 activity on 2025-06-13" [ref=e800]
                    - generic "0 activity on 2025-06-20" [ref=e801]
                    - generic "0 activity on 2025-06-27" [ref=e802]
                    - generic "0 activity on 2025-07-04" [ref=e803]
                    - generic "0 activity on 2025-07-11" [ref=e804]
                    - generic "0 activity on 2025-07-18" [ref=e805]
                    - generic "0 activity on 2025-07-25" [ref=e806]
                    - generic "0 activity on 2025-08-01" [ref=e807]
                    - generic "0 activity on 2025-08-08" [ref=e808]
                    - generic "0 activity on 2025-08-15" [ref=e809]
                    - generic "0 activity on 2025-08-22" [ref=e810]
                    - generic "0 activity on 2025-08-29" [ref=e811]
                    - generic "0 activity on 2025-09-05" [ref=e812]
                    - generic "0 activity on 2025-09-12" [ref=e813]
                    - generic "0 activity on 2025-09-19" [ref=e814]
                    - generic "0 activity on 2025-09-26" [ref=e815]
                    - generic "0 activity on 2025-10-03" [ref=e816]
                    - generic "0 activity on 2025-10-10" [ref=e817]
                    - generic "0 activity on 2025-10-17" [ref=e818]
                    - generic "0 activity on 2025-10-24" [ref=e819]
                    - generic "0 activity on 2025-10-31" [ref=e820]
                    - generic "0 activity on 2025-11-07" [ref=e821]
                    - generic "0 activity on 2025-11-14" [ref=e822]
                    - generic "0 activity on 2025-11-21" [ref=e823]
                    - generic "0 activity on 2025-11-28" [ref=e824]
                    - generic "0 activity on 2025-12-05" [ref=e825]
                    - generic "835 activity on 2025-12-12" [ref=e826]
                    - generic "0 activity on 2025-12-19" [ref=e827]
                    - generic "0 activity on 2025-12-26" [ref=e828]
                    - generic "0 activity on 2026-01-02" [ref=e829]
                    - generic "0 activity on 2026-01-09" [ref=e830]
                    - generic "0 activity on 2026-01-16" [ref=e831]
                    - generic "0 activity on 2026-01-23" [ref=e832]
                    - generic "0 activity on 2026-01-30" [ref=e833]
                    - generic "0 activity on 2026-02-06" [ref=e834]
                    - generic "0 activity on 2026-02-13" [ref=e835]
                    - generic "0 activity on 2026-02-20" [ref=e836]
                    - generic "0 activity on 2026-02-27" [ref=e837]
                    - generic "0 activity on 2026-03-06" [ref=e838]
                    - generic "0 activity on 2026-03-13" [ref=e839]
                    - generic "0 activity on 2026-03-20" [ref=e840]
                    - generic "0 activity on 2026-03-27" [ref=e841]
                    - generic "0 activity on 2026-04-03" [ref=e842]
                    - generic "0 activity on 2026-04-10" [ref=e843]
                    - generic "0 activity on 2026-04-17" [ref=e844]
                    - generic "0 activity on 2026-04-24" [ref=e845]
                    - generic "0 activity on 2026-05-01" [ref=e846]
                    - generic "0 activity on 2026-05-08" [ref=e847]
                    - generic "0 activity on 2026-05-15" [ref=e848]
                    - generic "0 activity on 2026-05-22" [ref=e849]
                    - generic "0 activity on 2026-05-29" [ref=e850]
                  - generic [ref=e851]:
                    - generic "0 activity on 2025-05-31" [ref=e852]
                    - generic "0 activity on 2025-06-07" [ref=e853]
                    - generic "0 activity on 2025-06-14" [ref=e854]
                    - generic "0 activity on 2025-06-21" [ref=e855]
                    - generic "0 activity on 2025-06-28" [ref=e856]
                    - generic "0 activity on 2025-07-05" [ref=e857]
                    - generic "0 activity on 2025-07-12" [ref=e858]
                    - generic "0 activity on 2025-07-19" [ref=e859]
                    - generic "0 activity on 2025-07-26" [ref=e860]
                    - generic "0 activity on 2025-08-02" [ref=e861]
                    - generic "0 activity on 2025-08-09" [ref=e862]
                    - generic "0 activity on 2025-08-16" [ref=e863]
                    - generic "0 activity on 2025-08-23" [ref=e864]
                    - generic "0 activity on 2025-08-30" [ref=e865]
                    - generic "0 activity on 2025-09-06" [ref=e866]
                    - generic "0 activity on 2025-09-13" [ref=e867]
                    - generic "0 activity on 2025-09-20" [ref=e868]
                    - generic "0 activity on 2025-09-27" [ref=e869]
                    - generic "0 activity on 2025-10-04" [ref=e870]
                    - generic "0 activity on 2025-10-11" [ref=e871]
                    - generic "0 activity on 2025-10-18" [ref=e872]
                    - generic "0 activity on 2025-10-25" [ref=e873]
                    - generic "0 activity on 2025-11-01" [ref=e874]
                    - generic "0 activity on 2025-11-08" [ref=e875]
                    - generic "0 activity on 2025-11-15" [ref=e876]
                    - generic "0 activity on 2025-11-22" [ref=e877]
                    - generic "0 activity on 2025-11-29" [ref=e878]
                    - generic "0 activity on 2025-12-06" [ref=e879]
                    - generic "0 activity on 2025-12-13" [ref=e880]
                    - generic "0 activity on 2025-12-20" [ref=e881]
                    - generic "0 activity on 2025-12-27" [ref=e882]
                    - generic "0 activity on 2026-01-03" [ref=e883]
                    - generic "0 activity on 2026-01-10" [ref=e884]
                    - generic "0 activity on 2026-01-17" [ref=e885]
                    - generic "0 activity on 2026-01-24" [ref=e886]
                    - generic "0 activity on 2026-01-31" [ref=e887]
                    - generic "0 activity on 2026-02-07" [ref=e888]
                    - generic "0 activity on 2026-02-14" [ref=e889]
                    - generic "0 activity on 2026-02-21" [ref=e890]
                    - generic "0 activity on 2026-02-28" [ref=e891]
                    - generic "0 activity on 2026-03-07" [ref=e892]
                    - generic "0 activity on 2026-03-14" [ref=e893]
                    - generic "0 activity on 2026-03-21" [ref=e894]
                    - generic "0 activity on 2026-03-28" [ref=e895]
                    - generic "0 activity on 2026-04-04" [ref=e896]
                    - generic "0 activity on 2026-04-11" [ref=e897]
                    - generic "0 activity on 2026-04-18" [ref=e898]
                    - generic "0 activity on 2026-04-25" [ref=e899]
                    - generic "0 activity on 2026-05-02" [ref=e900]
                    - generic "0 activity on 2026-05-09" [ref=e901]
                    - generic "0 activity on 2026-05-16" [ref=e902]
                    - generic "0 activity on 2026-05-23" [ref=e903]
                    - generic "0 activity on 2026-05-30" [ref=e904]
              - generic [ref=e905]:
                - generic [ref=e906]: Less
                - generic [ref=e913]: More
          - generic [ref=e915]:
            - heading "Digital Notebook" [level=2] [ref=e916]:
              - img [ref=e917]
              - text: Digital Notebook
            - generic [ref=e920]:
              - button "Scan Note" [ref=e921] [cursor=pointer]:
                - img [ref=e922]
              - button "Upload Note" [ref=e925] [cursor=pointer]:
                - img [ref=e926]
  - complementary [ref=e932]:
    - generic [ref=e933]:
      - img "Logo" [ref=e935]
      - button [ref=e936] [cursor=pointer]:
        - img [ref=e937]
    - navigation [ref=e940]:
      - list [ref=e941]:
        - listitem [ref=e942]:
          - link "Profile" [ref=e943] [cursor=pointer]:
            - /url: /profile
            - img [ref=e944]
            - text: Profile
        - listitem [ref=e947]:
          - link "Admin Panel" [ref=e948] [cursor=pointer]:
            - /url: /admin
            - img [ref=e949]
            - text: Admin Panel
        - listitem [ref=e951]:
          - link "Achievements" [ref=e952] [cursor=pointer]:
            - /url: /achievements
            - img [ref=e953]
            - text: Achievements
        - listitem [ref=e956]:
          - link "Certificate" [ref=e957] [cursor=pointer]:
            - /url: /submit-certificate
            - img [ref=e958]
            - text: Certificate
        - listitem [ref=e962]:
          - link "Challenge" [ref=e963] [cursor=pointer]:
            - /url: /submit-challenge
            - img [ref=e964]
            - text: Challenge
        - listitem [ref=e966]:
          - link "Bit Shift" [ref=e967] [cursor=pointer]:
            - /url: /bit-shift
            - img [ref=e968]
            - text: Bit Shift
        - listitem [ref=e973]:
          - link "Record" [ref=e974] [cursor=pointer]:
            - /url: https://benmega.github.io/screen-recorder/
            - img [ref=e975]
            - text: Record
        - listitem [ref=e978]:
          - link "History" [ref=e979] [cursor=pointer]:
            - /url: /history
            - img [ref=e980]
            - text: History
    - button "Logout" [ref=e983] [cursor=pointer]:
      - img [ref=e984]
      - text: Logout
  - contentinfo [ref=e987]:
    - paragraph [ref=e988]: © 2026 Classroom Chat. All Rights Reserved.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
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
  27 |     // Set tutorial bypass
  28 |     await page.evaluate(() => {
  29 |       localStorage.setItem('hasSeenTutorial', 'true');
  30 |     });
  31 |     
  32 |     // 1. Home / Chat Page
  33 |     console.log('Navigating to Chat...');
  34 |     await page.goto('http://localhost:5173/');
  35 |     await page.waitForTimeout(3000);
  36 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_home.png') });
  37 | 
  38 |     // 2. Profile page
  39 |     console.log('Navigating to Profile...');
  40 |     await page.goto('http://localhost:5173/profile');
  41 |     await page.waitForTimeout(3000);
  42 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_profile.png') });
  43 | 
  44 |     // 3. Open Sidebar / Hamburger Menu (on Profile page where it's visible)
  45 |     console.log('Opening hamburger menu on Profile page...');
  46 |     const hamburger = page.locator('header button.hamburger-toggle').first();
  47 |     if (await hamburger.isVisible()) {
  48 |       await hamburger.click();
  49 |       await page.waitForTimeout(1000);
  50 |       await page.screenshot({ path: path.join(screenshotsDir, 'mobile_sidebar_open.png') });
  51 |       
  52 |       // Close sidebar by clicking overlay or close button
  53 |       const closeBtn = page.locator('.mobile-sidebar .sidebar-close, .mobile-overlay').first();
> 54 |       await closeBtn.click();
     |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  55 |       await page.waitForTimeout(500);
  56 |     } else {
  57 |       console.log('Hamburger menu not found on Profile page!');
  58 |     }
  59 | 
  60 |     // 4. Achievements page
  61 |     console.log('Navigating to Achievements...');
  62 |     await page.goto('http://localhost:5173/achievements');
  63 |     await page.waitForTimeout(3000);
  64 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_achievements.png') });
  65 | 
  66 |     // 5. Bit-Shift page
  67 |     console.log('Navigating to Bit-Shift...');
  68 |     await page.goto('http://localhost:5173/bit-shift');
  69 |     await page.waitForTimeout(3000);
  70 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_bit_shift.png') });
  71 | 
  72 |     // 6. Admin Panel
  73 |     console.log('Navigating to Admin Panel...');
  74 |     await page.goto('http://localhost:5173/admin');
  75 |     await page.waitForTimeout(3000);
  76 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin.png') });
  77 | 
  78 |     // 7. Admin Advanced Panel
  79 |     console.log('Navigating to Admin Advanced...');
  80 |     await page.goto('http://localhost:5173/admin/advanced');
  81 |     await page.waitForTimeout(3000);
  82 |     await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin_advanced.png') });
  83 | 
  84 |     console.log('Mobile UI Audit Navigation complete!');
  85 |   });
  86 | });
  87 | 
```