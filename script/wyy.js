[Script]
#----------  会员解锁 ----------#
# 播放会员歌曲
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:v1\/artist\/top\/song|v3\/discovery\/recommend\/songs) script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放会员歌曲, enable={Music163_VIP_Shared}
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/v3\/song\/detail script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放会员歌曲, enable={Music163_VIP_Shared}
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/song\/(?:chorus|enhance\/|play\/|type\/detail\/get) script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放会员歌曲, enable={Music163_VIP_Shared}

# 播放器会员皮肤
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/playermode\/ script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放器会员皮肤, enable={Music163_VIP_Shared}

# 搜索结果会员歌曲
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/search\/(?:complex\/page|complex\/rec\/song\/get|song\/list\/page) script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]搜索结果会员歌曲, enable={Music163_VIP_Shared}

# 侧边栏会员等级
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/vipnewcenter\/app\/resource\/newaccountpage script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]侧边栏会员等级, enable={Music163_VIP_Shared}

# 歌单列表会员认证
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/w?e?api\/(?:homepage\/|v6\/)?playlist\/ script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]歌单列表会员认证, enable={Music163_VIP_Shared}

# 会员认证
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/vipauth\/app\/auth\/(soundquality\/)?query script-path = https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]会员认证, enable={Music163_VIP_Shared}

[MitM]
hostname = interface*.music.163.com, ipv4.music.163.com
