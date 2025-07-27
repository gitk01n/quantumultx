// https://raw.githubusercontent.com/Keywos/rule/main/script/wy/js/wyres.js
// https://raw.githubusercontent.com/anyehttp/quantumult-x/main/headers/wyy.js
// https://raw.githubusercontent.com/sooyaaabo/Loon/refs/heads/main/Script/NeteaseMusic/NeteaseMusicVIP.js
[Script]
#----------  会员解锁 ----------#
# 播放会员歌曲
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:v1\/artist\/top\/song|v3\/discovery\/recommend\/songs) script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放会员歌曲, enable={Music163_VIP_Shared}
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/v3\/song\/detail script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放会员歌曲, enable={Music163_VIP_Shared}
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/song\/(?:chorus|enhance\/|play\/|type\/detail\/get) script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放会员歌曲, enable={Music163_VIP_Shared}

# 播放器会员皮肤
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/playermode\/ script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]播放器会员皮肤, enable={Music163_VIP_Shared}

# 搜索结果会员歌曲
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/search\/(?:complex\/page|complex\/rec\/song\/get|song\/list\/page) script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]搜索结果会员歌曲, enable={Music163_VIP_Shared}

# 侧边栏会员等级
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/vipnewcenter\/app\/resource\/newaccountpage script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]侧边栏会员等级, enable={Music163_VIP_Shared}

# 歌单列表会员认证
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/w?e?api\/(?:homepage\/|v6\/)?playlist\/ script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]歌单列表会员认证, enable={Music163_VIP_Shared}

# 会员认证
http-request ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/vipauth\/app\/auth\/(soundquality\/)?query script-path = https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/NeteaseVip.js, requires-body = false, binary-body-mode = false, timeout = 20, tag = [网易云音乐]会员认证, enable={Music163_VIP_Shared}

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

[Rewrite]
# 新版加密通用
# ^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/e?api\/(?:batch|v\d\/resource\/comment\/floor\/get|homepage\/block\/page|link\/page\/rcmd\/(block\/resource\/multi\/refresh|resource\/show)|user\/follow\/users\/mixed\/get|link\/home\/framework\/tab|link\/position\/show\/resource|link\/page\/discovery\/resource\/show) header-del x-aeapi
^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/e?api\/(?:batch|homepage\/block\/page|v\d\/(?:resource\/comment\/floor\/get|user\/detail\/\d+|discovery\/recommend\/songs|playlist\/detail)|link\/page\/rcmd\/(?:block\/resource\/multi\/refresh|resource\/show)|user\/follow\/users\/mixed\/get|link\/home\/framework\/tab|link\/position\/show\/resource|link\/page\/discovery\/resource\/show|mine\/(?:collect|rn)\/header\/info|vipnewcenter\/app\/resource\/newaccountpage|music-vip-membership\/(?:client|front)\/vip\/info|playlist\/privilege|search\/complex\/page) header-replace x-aeapi false
^https?:\/\/interface\d?\.music\.163\.com\/e?api\/vip\/cashier\/tspopup\/get reject-200

# 开屏广告
^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/e?api\/(ocpc\/)?ad\/ mock-response-body data-type=text

# 今日运势 商城 Beat专区 音乐收藏家 | type:ACTIVITY | 低至5.2折
^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:delivery\/(batch-)?deliver|moment\/tab\/info\/|side-bar\/mini-program\/music-service\/account|yunbei\/account\/entrance\/) reject-dict

# 播放页 歌名下方 乐迷团｜关注｜播放页提示｜音乐应用红点｜播放提示
^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:community\/friends\/fans-group\/artist\/group\/|mine\/applet\/redpoint|music\/songshare\/text\/recommend\/|resniche\/position\/play\/new\/|resniche\/tspopup\/show|resource\/comments?\/musiciansaid\/|user\/sub\/artist) reject-dict
^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/(?:ios\/version|mlivestream\/entrance\/playpage\/|link\/position\/show\/strategy|link\/scene\/show\/resource|v1\/content\/exposure\/comment\/banner\/) reject-dict

# 搜索页 搜索词 热搜卡片 猜你喜欢 我的应用下方提醒
^https?:\/\/(?:ipv4|interface\d?)\.music\.163.com\/w?e?api\/search\/default mock-response-body data-type=text
^https?:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/w?eapi\/(?:activity\/bonus\/playpage\/time\/query|resource-exposure\/|search\/(?:chart\/|rcmd\/keyword\/|specialkeyword\/)) reject-dict

# 主页播客推荐
^https:\/\/(?:ipv4|interface\d?)\.music\.163\.com\/eapi\/my\/podcast\/tab\/recommend reject-dict
[MitM]
hostname = interface*.music.163.com, ipv4.music.163.com
