import requests
import csv
import os
import re
import json
import time

# --------------------------------------------------------------------------------
# 1. CONFIGURATION
# --------------------------------------------------------------------------------
# PASTE YOUR COOKIE HERE
YOUR_COOKIE = """__stripe_mid=1ebd10bd-7567-4df5-816f-79a9b780842852846f; _fbp=fb.1.1699689886954.171100771; cf_clearance=_RJjbBs.CVgd42U1MO1ZKjKuTD.GNdDOVgzwpbDpooA-1746367538-1.2.1.1-9jqn.40lzWGvjocpB2ne1Z7IAWofVjqtuHrd4LYso32hZrN5Ri4ZJqE8nJFCsyZJGvzRmWB9t2WgydqSbzPQXINuNBt96YNSCAs6LIxbRXQnfqDBxaFLdIyQQgDorw_ckX1lgMQ0u8fZm82pMQTZGEdokVgLMMtyZkUrHHvI18M3RlTPA_Vda.NVdh5Ow_Zd477nSREgoYYn2LeePfSBPiK78Z8zx9bxvesYdaoE36RN1_hlWxuD_sPev4R3SS.MWaHLIMIVpOKsW9Ybsp4XL3uE7DmvRJOn2vEdlYdw0NbcOkzcIBb3OJ8YBmSMrHJQeXHZwuKp.qqlyiJZJASLtd76vgcO4Qgh1FVSf4lnRHlNSmftqVLs0STLWgdTy262; _ga_CLTH4TL5L8=deleted; _gid=GA1.2.770765999.1765210232; shaTagVal=production-2025-12-05-08-10-23; g_state={"i_l":0,"i_ll":1765290586837}; codecombat.sess=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7ImlkIjoiNjJkMjNkOTc1ZGFmZDYwMDI1ZjhjNTIwIiwiY3JlYXRlZCI6IjIwMjUtMTItMDlUMTY6MjE6NDQrMDA6MDAiLCJleHBpcmVzIjoiMjAyNi0wMS0wOVQxNjoyMTo0NCswMDowMCJ9fX0=; codecombat.sess.sig=rG2PpHOxz3a2Lt8gpoUQFvfxl2Q; _ga_CLTH4TL5L8=GS2.1.s1765295794$o393$g1$t1765297303$j59$l0$h0; _ga=GA1.1.1923261573.1699063009; fs_lua=1.1765297303868; fs_uid=#RQW5S#ee6f16b5-763c-410a-9ab0-03a5dde36753:c0e5f1b9-11a1-4e0b-ad53-e73a8a500185:1765295795651::2#8d074e9c#/1790492747; _gat=1"""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Cookie": YOUR_COOKIE.replace('\n', ''),
    "Accept": "application/json"
}

# PASTE THE RAW JSON LIST OF COURSES HERE
COURSE_INSTANCES_RAW = r"""[{"_id":"630cc1ed3dfad800254437c2","members":["630edf0bf4fadb0023878b80","63c509de54faee001f38fb3c","63c508b994f9290023e5cc12","63c6602494f9290023ed2fca","65cc67c092a186ece3a479a8","62890e31d92fe50023ba60f1","67bd816d87a924c4d88881e7"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"630cc1ebf015ca0023096d74","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"636609502cd169001fa7ba7c","members":["6305a2fd839b5c00240ecb6a","6305a45aa739a40025127668","6305a57f81304600248b06ac","6305a1a6839b5c00240ec8a8","63058fc0aecf340025bab9c6","6305a3c1a739a40025127439","68579d102c712fdfaaaed3bb"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"6366094e2cd169001fa7ba28","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"6365e692d63d88001fb41d51","members":["630edf0bf4fadb0023878b80"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"630cc1ebf015ca0023096d74","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":3}},{"_id":"63a663707dac99003d7a285d","members":["632460a304206a0023b48456","632460d404206a0023b48754","648309e9d93a30001946f1ff","645e2dc8aeeac90019ee535e","688897878bfd74271d66ddb8"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"63a6636f0cc8f4001f271058","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"63b8f675004f2c0020ecf5f1","members":["630edf0bf4fadb0023878b80"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"630cc1ebf015ca0023096d74","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":2}},{"_id":"64070c8cc2041709e2606dc6","members":["64682a6cf6c7a70030a123ae","64f6f073b2496f001710e80a","64f6ef6bb2496f001710e1f8","65d466347d1beaa5106f0fbe","65af7ec55fede936333c64b5","65d467017bdbd1f772148f3c"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"64070c8ac2041709e2606ced","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"64070d53dda53309ed2fd385","members":[],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"64070c8ac2041709e2606ced","__v":0,"stats":{"projectsCreated":2}},{"_id":"647abc518e07f300557849ac","members":[],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"647abc508e07f3005578497c","__v":0},{"_id":"647abe7fc427760019599a51","members":["630edf0bf4fadb0023878b80","63c509de54faee001f38fb3c","63c508b994f9290023e5cc12","63c6602494f9290023ed2fca","65cc67c092a186ece3a479a8"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"630cc1ebf015ca0023096d74","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"649ac4fc8995ee01725a92ea","members":["6305a4e4aecf340025bafe9d","65103991e4ff9e002f424275","63da05292aea190023bab613","653799676e8ca200194d3407","63da05ac49ece0001f4dc566","63da05e649ece0001f4dc5d9","63da061249ece0001f4dc6ba","65d466347d1beaa5106f0fbe"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"649ac4fb3963a0006bc2df43","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"6551b1d5e810cc001e9b5383","members":["64a11a15613bee0419f928a7","64a11a23ccc95303e307c78f","64e1aff8d3a10b004075c565","632460a304206a0023b48456","659a3e7e54f2c52d8854a35c","693515af0c9527130b478d7b"],"ownerID":"62d23d975dafd60025f8c520","aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"6551b1d4a3312d0019a9be2f","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"659d0ae34133cf6dee595108","ownerID":"62d23d975dafd60025f8c520","members":["65af7ec55fede936333c64b5","65d466347d1beaa5106f0fbe","64f6f073b2496f001710e80a","64f6ef6bb2496f001710e1f8","65d467017bdbd1f772148f3c"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"64070c8ac2041709e2606ced","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"65c8697c1d05785e4fe4abee","ownerID":"62d23d975dafd60025f8c520","members":["64a11a15613bee0419f928a7","64a11a23ccc95303e307c78f","64e1aff8d3a10b004075c565","659a3e7e54f2c52d8854a35c","632460a304206a0023b48456","693515af0c9527130b478d7b"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"6551b1d4a3312d0019a9be2f","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":5}},{"_id":"65c6e1b517ba273b66e009ce","ownerID":"62d23d975dafd60025f8c520","members":["632460d404206a0023b48754","645e2dc8aeeac90019ee535e","648309e9d93a30001946f1ff"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"63a6636f0cc8f4001f271058","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":6}},{"_id":"65c719cf093710ebac8154a2","ownerID":"62d23d975dafd60025f8c520","members":["6305a45aa739a40025127668","6305a3c1a739a40025127439","6305a57f81304600248b06ac","63058fc0aecf340025bab9c6","6305a2fd839b5c00240ecb6a","6305a1a6839b5c00240ec8a8"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"6366094e2cd169001fa7ba28","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":10}},{"_id":"663a06800c7a0f02620a3f81","ownerID":"62d23d975dafd60025f8c520","members":["63da05292aea190023bab613","63da061249ece0001f4dc6ba","65103991e4ff9e002f424275","6305a4e4aecf340025bafe9d","63da05ac49ece0001f4dc566","653799676e8ca200194d3407"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"649ac4fb3963a0006bc2df43","__v":0,"startLockedLevel":"none","stats":{"projectsCreated":0}},{"_id":"663de608483c9240bb4d8cbf","ownerID":"62d23d975dafd60025f8c520","members":["6305a45aa739a40025127668","6305a57f81304600248b06ac","63058fc0aecf340025bab9c6","6305a1a6839b5c00240ec8a8","6305a3c1a739a40025127439","6305a2fd839b5c00240ecb6a","68579d102c712fdfaaaed3bb"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"6366094e2cd169001fa7ba28","__v":0,"stats":{"projectsCreated":0}},{"_id":"6643320efd63b5c0bff3e947","ownerID":"62d23d975dafd60025f8c520","members":[],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"64070c8ac2041709e2606ced","__v":0,"stats":{"projectsCreated":0}},{"_id":"66480de53fdad8b35938b574","ownerID":"62d23d975dafd60025f8c520","members":["632460d404206a0023b48754","648309e9d93a30001946f1ff","645e2dc8aeeac90019ee535e"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"63a6636f0cc8f4001f271058","__v":0,"stats":{"projectsCreated":0}},{"_id":"6652d7c38be978664cdb98dc","ownerID":"62d23d975dafd60025f8c520","members":["632460a304206a0023b48456"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"6551b1d4a3312d0019a9be2f","__v":0},{"_id":"669377ea949ab93194ae02eb","ownerID":"62d23d975dafd60025f8c520","members":["663f28255a4b64c06c9f946d","663f27205a4b64c06c9f89a3","663f2877bb844d05e1b64318","663f27e4bb844d05e1b63fcd","663f284f5a4b64c06c9f9551","67384f1a93a419bc7d199564","67de68338a9dba3f5841fe43","683eb9574ddb360adb1764a6","684d2660acfe0b210d03d93b"],"aceConfig":{},"courseID":"65f32b6c87c07dbeb5ba1936","classroomID":"669377e937c0a139b661277d","__v":0,"startLockedLevel":"none"},{"_id":"669b1c4d5737a5276ff7ccc6","ownerID":"62d23d975dafd60025f8c520","members":["6713132e818a6b4beb49f433","67131f6fe2e3f8833575783e","67131fbeb76f33a228bc469a","67131fed818a6b4beb4bc4ac","67132007818a6b4beb4bcdc7","64572066c7d3b10018d0dde2","645720b539298a00184c5f0a","645720da39298a00184c610f","64571f9969152e00177c3b9f","67ab0f591e85268e378fc924","6472d9996875830018da878d","67bd816d87a924c4d88881e7"],"aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"669b1d555737a5276ff7f77e","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"663b25f11c568468efc8adde","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"669f83c6071f3814a39a224b","ownerID":"62d23d975dafd60025f8c520","members":["63da061249ece0001f4dc6ba","653799676e8ca200194d3407","6305a4e4aecf340025bafe9d","65103991e4ff9e002f424275","63da05292aea190023bab613"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"649ac4fb3963a0006bc2df43","__v":0},{"_id":"66efb998c69f7a87b543da64","ownerID":"62d23d975dafd60025f8c520","members":["64a11a23ccc95303e307c78f","64e1aff8d3a10b004075c565","632460a304206a0023b48456","693515af0c9527130b478d7b"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"6551b1d4a3312d0019a9be2f","__v":0},{"_id":"670e425b4963ee928f480dc8","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1"],"aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"670e42549670d525a323419e","__v":0},{"_id":"6717683349cc76fac636f75b","ownerID":"62d23d975dafd60025f8c520","members":["64f6ef6bb2496f001710e1f8","64f6f073b2496f001710e80a","65d467017bdbd1f772148f3c","65d466347d1beaa5106f0fbe","65af7ec55fede936333c64b5"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"64070c8ac2041709e2606ced","__v":0},{"_id":"6720a2e0c920a153eddeba87","ownerID":"62d23d975dafd60025f8c520","courseID":"663b25f11c568468efc8adde","classroomID":"64070c8ac2041709e2606ced","members":[],"aceConfig":{},"__v":0},{"_id":"6720a507c920a153eddf47bd","ownerID":"62d23d975dafd60025f8c520","members":[],"aceConfig":{},"courseID":"65f32b6c87c07dbeb5ba1936","classroomID":"64070c8ac2041709e2606ced","__v":0},{"_id":"672edd3e2f9b5d22cf15af22","ownerID":"62d23d975dafd60025f8c520","members":["63c509de54faee001f38fb3c","63c6602494f9290023ed2fca","63c508b994f9290023e5cc12","630edf0bf4fadb0023878b80","62890e31d92fe50023ba60f1","65cc67c092a186ece3a479a8","67bd816d87a924c4d88881e7"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"630cc1ebf015ca0023096d74","__v":0},{"_id":"672ee568e22a1e84d8920233","ownerID":"62d23d975dafd60025f8c520","courseID":"663b25f11c568468efc8adde","classroomID":"630cc1ebf015ca0023096d74","members":["62890e31d92fe50023ba60f1","67bd816d87a924c4d88881e7"],"aceConfig":{},"__v":0},{"_id":"67459136296d4acb089fe12f","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2","645720b539298a00184c5f0a"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753babbeb7dafb4fd8081de","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"65f32b6c87c07dbeb5ba1936","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753bac7eb7dafb4fd808398","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753bacbf4a9620b8512887d","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753bad3a332c25782794b05","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2","645720b539298a00184c5f0a"],"aceConfig":{},"courseID":"57b621e7ad86a6efb5737e64","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753bad96783907a17025484","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"5789587aad86a6efb5737020","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753bae16783907a17025580","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2","645720b539298a00184c5f0a"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753baea6783907a1702566e","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8d","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753baf06783907a17025768","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"569ed916efa72b0ced971447","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753baf5eb7dafb4fd808a18","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"5817d673e85d1220db624ca4","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"6753cde0271f79d251146da9","ownerID":"62d23d975dafd60025f8c520","members":["64572066c7d3b10018d0dde2"],"aceConfig":{},"courseID":"5a0df02b8f2391437740f74f","classroomID":"669b1c4cfbef2636ccbc5e69","__v":0},{"_id":"675576095625a55d2a562196","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1","630edf0bf4fadb0023878b80","63c508b994f9290023e5cc12","64d870dfe73153002efb424c","67bd816d87a924c4d88881e7"],"aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"6778ad43d376f16d7e428ff5","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1","64d870dfe73153002efb424c","630edf0bf4fadb0023878b80","63c508b994f9290023e5cc12","67bd816d87a924c4d88881e7"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"6778e52383e88a2c7405fd9f","ownerID":"62d23d975dafd60025f8c520","members":["663f27e4bb844d05e1b64318","67384f1a93a419bc7d199564","663f27205a4b64c06c9f89a3","663f284f5a4b64c06c9f9551","663f28255a4b64c06c9f946d","663f2877bb844d05e1b64318","67de68338a9dba3f5841fe43","683eb9574ddb360adb1764a6","684d2660acfe0b210d03d93b"],"aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"669377e937c0a139b661277d","__v":0},{"_id":"678386086abc631bd4a22c98","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1","64d870dfe73153002efb424c","63c508b994f9290023e5cc12"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"6783860e3cd133da24963b82","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1","63c508b994f9290023e5cc12"],"aceConfig":{},"courseID":"57b621e7ad86a6efb5737e64","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"67864715c09813cc0694e512","ownerID":"62d23d975dafd60025f8c520","members":["63058fc0aecf340025bab9c6","6305a1a6839b5c00240ec8a8","6305a45aa739a40025127668","6305a57f81304600248b06ac","6305a3c1a739a40025127439","6305a2fd839b5c00240ecb6a"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"6366094e2cd169001fa7ba28","__v":0},{"_id":"67864bf36abc631bd411e3ee","ownerID":"62d23d975dafd60025f8c520","members":["63da061249ece0001f4dc6ba"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"649ac4fb3963a0006bc2df43","__v":0},{"_id":"678b2623c250beb1210f9875","ownerID":"62d23d975dafd60025f8c520","members":["64d870dfe73153002efb424c","63c508b994f9290023e5cc12"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"678b56dc6ccb2a9d3b8bd700","ownerID":"62d23d975dafd60025f8c520","members":["6305a2fd839b5c00240ecb6a","6305a57f81304600248b06ac","6305a45aa739a40025127668","6305a3c1a739a40025127439"],"aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"678b56da3fa31bbfe4eea1c4","__v":0},{"_id":"678b56ec3fa31bbfe4eea340","ownerID":"62d23d975dafd60025f8c520","members":["632460a304206a0023b48456"],"aceConfig":{},"courseID":"560f1a9f22961295f9427742","classroomID":"678b56ea92eef90eb4c37231","__v":0},{"_id":"679f0bf12152e5d6c64e0e26","ownerID":"62d23d975dafd60025f8c520","members":["632460a304206a0023b48456"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"678b56ea92eef90eb4c37231","__v":0},{"_id":"679f0bf7fffa3473ac34e55f","ownerID":"62d23d975dafd60025f8c520","members":["632460a304206a0023b48456"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"678b56ea92eef90eb4c37231","__v":0},{"_id":"67bd8bd3dd735c0b9e47e1b5","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1","67bd816d87a924c4d88881e7"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8d","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"67de38e68a9dba3f583b1a44","ownerID":"62d23d975dafd60025f8c520","members":["67bd816d87a924c4d88881e7"],"aceConfig":{},"courseID":"5a0df02b8f2391437740f74f","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"67de58c7f68cba9772c2523f","ownerID":"62d23d975dafd60025f8c520","members":["6305a45aa739a40025127668","6305a57f81304600248b06ac","63058fc0aecf340025bab9c6","6305a1a6839b5c00240ec8a8","6305a3c1a739a40025127439","6305a2fd839b5c00240ecb6a"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"6366094e2cd169001fa7ba28","__v":0},{"_id":"680778cd26620284f38a5d70","ownerID":"62d23d975dafd60025f8c520","courseID":"663b25f11c568468efc8adde","classroomID":"649ac4fb3963a0006bc2df43","members":["65d466347d1beaa5106f0fbe"],"aceConfig":{},"__v":0},{"_id":"6843a1c1c55ab738e968ca9d","ownerID":"62d23d975dafd60025f8c520","members":["663f27205a4b64c06c9f89a3","663f27e4bb844d05e1b64318","663f284f5a4b64c06c9f9551","663f2877bb844d05e1b64318","683eb9574ddb360adb1764a6","67de68338a9dba3f5841fe43"],"aceConfig":{},"courseID":"5789587aad86a6efb573701e","classroomID":"669377e937c0a139b661277d","__v":0},{"_id":"684595aa9f35a12bd95cb825","ownerID":"62d23d975dafd60025f8c520","members":["63c508b994f9290023e5cc12"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"684595b92c34ab1caca8d8a5","ownerID":"62d23d975dafd60025f8c520","members":["63c508b994f9290023e5cc12"],"aceConfig":{},"courseID":"5789587aad86a6efb5737020","classroomID":"675576077a41df06bfccf725","__v":0},{"_id":"68688a04332dcd245092e288","ownerID":"62d23d975dafd60025f8c520","members":["645e2dc8aeeac90019ee535e"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"63a6636f0cc8f4001f271058","__v":0},{"_id":"68688a2076036a9c9f9b7cef","ownerID":"62d23d975dafd60025f8c520","members":["645e2dc8aeeac90019ee535e","632460d404206a0023b48754"],"aceConfig":{},"courseID":"57b621e7ad86a6efb5737e64","classroomID":"63a6636f0cc8f4001f271058","__v":0},{"_id":"6868c3c5332dcd24509e4cb4","ownerID":"62d23d975dafd60025f8c520","members":["6305a45aa739a40025127668","6305a57f81304600248b06ac","63058fc0aecf340025bab9c6","6305a1a6839b5c00240ec8a8","6305a3c1a739a40025127439","6305a2fd839b5c00240ecb6a"],"aceConfig":{},"courseID":"57b621e7ad86a6efb5737e64","classroomID":"6366094e2cd169001fa7ba28","__v":0},{"_id":"687e1646334eec8635ecb3f9","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1","63c509de54faee001f38fb3c","63c6602494f9290023ed2fca","63c508b994f9290023e5cc12","630edf0bf4fadb0023878b80"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8d","classroomID":"630cc1ebf015ca0023096d74","__v":0},{"_id":"687e165c64684c387ab41d52","ownerID":"62d23d975dafd60025f8c520","members":["62890e31d92fe50023ba60f1"],"aceConfig":{},"courseID":"5a0df02b8f2391437740f74f","classroomID":"630cc1ebf015ca0023096d74","__v":0},{"_id":"688d83854098dfb8f532ec09","ownerID":"62d23d975dafd60025f8c520","courseID":"663b25f11c568468efc8adde","classroomID":"63a6636f0cc8f4001f271058","members":["688897878bfd74271d66ddb8"],"aceConfig":{},"__v":0},{"_id":"68b25e253c3942dda6814db2","ownerID":"62d23d975dafd60025f8c520","members":["663f27205a4b64c06c9f89a3","663f27e4bb844d05e1b63fcd","663f284f5a4b64c06c9f9551","663f2877bb844d05e1b64318","684d2660acfe0b210d03d93b"],"aceConfig":{},"courseID":"5789587aad86a6efb573701f","classroomID":"669377e937c0a139b661277d","__v":0},{"_id":"68e0894d739be74099049d97","ownerID":"62d23d975dafd60025f8c520","members":["632460d404206a0023b48754"],"aceConfig":{},"courseID":"5789587aad86a6efb5737020","classroomID":"63a6636f0cc8f4001f271058","__v":0},{"_id":"68e089567c77ee34544fd1e4","ownerID":"62d23d975dafd60025f8c520","members":["632460d404206a0023b48754"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"63a6636f0cc8f4001f271058","__v":0},{"_id":"68e20bb0d244691021092a01","ownerID":"62d23d975dafd60025f8c520","members":["64a11a23ccc95303e307c78f","632460a304206a0023b48456","693515af0c9527130b478d7b"],"aceConfig":{},"courseID":"57b621e7ad86a6efb5737e64","classroomID":"6551b1d4a3312d0019a9be2f","__v":0},{"_id":"68e9fd635602bcd6f880ba80","ownerID":"62d23d975dafd60025f8c520","courseID":"663b25f11c568468efc8adde","classroomID":"6366094e2cd169001fa7ba28","members":["68579d102c712fdfaaaed3bb"],"aceConfig":{},"__v":0},{"_id":"6905bf151e958fe77ee8ee04","ownerID":"62d23d975dafd60025f8c520","members":["663f27e4bb844d05e1b64318","663f284f5a4b64c06c9f9551","663f2877bb844d05e1b64318","684d2660acfe0b210d03d93b","663f27205a4b64c06c9f9551","683eb9574ddb360adb1764a6"],"aceConfig":{},"courseID":"5632661322961295f9428638","classroomID":"669377e937c0a139b661277d","__v":0},{"_id":"691313e898ca4e8238ba42ca","ownerID":"62d23d975dafd60025f8c520","members":["63da061249ece0001f4dc6ba","6305a4e4aecf340025bafe9d","653799676e8ca200194d3407"],"aceConfig":{},"courseID":"57b621e7ad86a6efb5737e64","classroomID":"649ac4fb3963a0006bc2df43","__v":0},{"_id":"691313f28ec24a19e8490ab0","ownerID":"62d23d975dafd60025f8c520","members":["63da061249ece0001f4dc6ba","6305a4e4aecf340025bafe9d","653799676e8ca200194d3407"],"aceConfig":{},"courseID":"5789587aad86a6efb5737020","classroomID":"649ac4fb3963a0006bc2df43","__v":0},{"_id":"691313f741c36f5d563bc1ce","ownerID":"62d23d975dafd60025f8c520","members":["63da061249ece0001f4dc6ba","6305a4e4aecf340025bafe9d","653799676e8ca200194d3407"],"aceConfig":{},"courseID":"56462f935afde0c6fd30fc8c","classroomID":"649ac4fb3963a0006bc2df43","__v":0},{"_id":"693516160c9527130b479ca1","ownerID":"62d23d975dafd60025f8c520","courseID":"663b25f11c568468efc8adde","classroomID":"6551b1d4a3312d0019a9be2f","members":["693515af0c9527130b478d7b"],"aceConfig":{},"__v":0}]"""

URL_LEVELS = "https://codecombat.com/db/classroom-courses-data?language=python"
FILENAME = '../instance/migration/master_challenge_log.csv'


# --------------------------------------------------------------------------------
# 2. HELPER FUNCTIONS
# --------------------------------------------------------------------------------
def fetch_json(url, description):
    print(f"Fetching {description}...")
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {description}: {e}")
        if 'response' in locals() and response.status_code == 401:
            print("(!) AUTH ERROR: Cookie expired.")
        return []


def build_student_map(members_data):
    s_map = {}
    for s in members_data:
        name = f"{s.get('firstName', '')} {s.get('lastName', '')}".strip()
        if not name: name = s.get('name', 'Unknown')
        s_map[s['_id']] = name
    return s_map


def build_level_map(levels_data):
    l_map = {}
    for campaign in levels_data:
        for level in campaign.get('levels', []):
            if 'original' in level and 'name' in level:
                l_map[level['original']] = level['name']
    return l_map


def get_context(url):
    domain = "CodeCombat" if "codecombat" in url else "Ozaria" if "ozaria" in url else "Studio.Code"
    match = re.search(r'/classroom/([a-fA-F0-9]{24})', url)
    instance = match.group(1) if match else None
    return domain, instance


# --------------------------------------------------------------------------------
# 3. MAIN EXECUTION LOOP
# --------------------------------------------------------------------------------
def main():
    # 1. Parse Input & Get Unique Classrooms
    try:
        course_instances = json.loads(COURSE_INSTANCES_RAW)
        # Extract unique classroom IDs to avoid duplicate API calls
        unique_classrooms = set(item['classroomID'] for item in course_instances if 'classroomID' in item)
        print(f"Found {len(course_instances)} course instances across {len(unique_classrooms)} unique classrooms.")
    except json.JSONDecodeError:
        print("Error parsing the raw JSON list.")
        return

    # 2. Fetch Global Level Data (Once)
    levels_data = fetch_json(URL_LEVELS, "Global Course Data")
    level_map = build_level_map(levels_data)

    all_rows = []

    # 3. Iterate Through Each Classroom
    for index, class_id in enumerate(unique_classrooms):
        print(f"\n--- Processing Classroom {index + 1}/{len(unique_classrooms)} (ID: {class_id}) ---")

        # Build URLs dynamically
        url_members = f"https://codecombat.com/db/classroom/{class_id}/members?project=firstName,lastName,name&memberLimit=100"
        url_sessions = f"https://codecombat.com/db/classroom/{class_id}/member-sessions?memberLimit=100"

        # Fetch Data
        members_data = fetch_json(url_members, "Members")
        sessions_data = fetch_json(url_sessions, "Sessions")

        if not members_data or not sessions_data:
            print(f"Skipping classroom {class_id} (No data returned)")
            continue

        # Build Student Map for this class
        student_map = build_student_map(members_data)
        domain, instance = get_context(url_sessions)

        # Process Sessions
        count = 0
        for entry in sessions_data:
            if not entry.get('state', {}).get('complete', False):
                continue

            uid = entry.get('creator')
            lid = entry.get('level', {}).get('original')

            all_rows.append({
                'username': student_map.get(uid, f"Unknown_Student_{uid}"),
                'domain': domain,
                'challenge_name': level_map.get(lid, f"Unknown_Level_{lid}"),
                'timestamp': entry.get('changed', '').replace('Z', ''),
                'course_id': '',
                'course_instance': instance,  # This is the Classroom ID
                'helper': ''
            })
            count += 1
        print(f"Added {count} completed levels from this class.")

        # Sleep briefly to be nice to the API
        time.sleep(1)

    # 4. Save Master CSV
    if all_rows:
        file_exists = os.path.isfile(FILENAME)
        fields = ['username', 'domain', 'challenge_name', 'timestamp', 'course_id', 'course_instance', 'helper']

        with open(FILENAME, 'w', newline='', encoding='utf-8') as f:  # 'w' overwrites to create a clean new master file
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(all_rows)

        print(f"\nSUCCESS! Wrote {len(all_rows)} total rows to {FILENAME}")
    else:
        print("\nNo data found.")


if __name__ == "__main__":
    main()
