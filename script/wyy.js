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

#----------  广告过滤 ----------#
# 热推、有话想说、分享一下、歌曲下的祝福等小提示、评论区、乐迷、星评等级、关注等图标
http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:batch|v2\/resource\/comment\/floor\/get) script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]评论区

# 推荐、home、主页
http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:homepage\/block\/page|link\/page\/rcmd\/(?:block\/resource\/multi\/refresh|resource\/show)) script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]主页, argument=[{PRGG},{PRRK},{PRDRD},{PRSCVPT},{PRST},{PRRR},{HMPR},{PRMST},{PRCN}]

# 底部Tab
http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/link\/home\/framework\/tab script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]底部Tab, argument=[{MY},{DT},{FX},{GZ}]

# 发现页
http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/link\/page\/discovery\/resource\/show script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]发现页

# 播放音效
# http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/song\/play\/more\/list\/v\d script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]播放音效

# 我的页面
http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/link\/position\/show\/resource script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]我的页面

# 显示未关注你的人
http-response ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/user\/follow\/users\/mixed\/get script-path = https://raw.githubusercontent.com/sooyaaabo/Loon/main/Script/NeteaseMusic/NeteaseMusicAds.js, requires-body = true, binary-body-mode = true, timeout = 20, tag = [网易云音乐]显示未关注你的人

[MitM]
hostname = interface*.music.163.com, ipv4.music.163.com
