/*
[rewrite_local]
^https:\/\/smp-api\.iyouke\.com\/dtapi\/p\/user\/userInfo url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/guagua.js
[MITM]
hostname = smp-api.iyouke.com
*/
const $ = new Env("guagua");
// iYouke (爱幽客) 签到脚本 (使用 MitM 从请求头获取 appId 和 Authorization)
let appId = null;
let authorization = null;
// 获取 appId 和 Authorization
if ($request) {
    // 这是 request 阶段，用于获取 userInfo 的请求头
    if ($request.url.includes("/dtapi/p/user/userInfo")) {
        console.log("=====userInfo请求=======");
        appId = $request.headers['appid'];
        authorization = $request.headers['Authorization']; // 直接从请求头获取 Authorization
        console.log("appid:" + appId);
        console.log("Authorization:" + authorization);
        // 存储 appId 和 Authorization
        $prefs.setValueForKey(appId, "iyouke_appid");
        $prefs.setValueForKey(authorization, "iyouke_authorization");
        $notification.post("首次使用", "AppId, Authorization已获取", "即将开始签到");
        // 获取成功立即签到
        sign();
    } else {
        $done({}); // 非 userInfo 请求，直接结束
    }
} else {
    // 检查是否已经获取过 appId 和 Authorization
    appId = $prefs.valueForKey("iyouke_appid");
    authorization = $prefs.valueForKey("iyouke_authorization");
    if (appId && authorization) {
        console.log("已存在 appid 和 Authorization，开始签到");
        sign();
    } else {
        console.log("未获取到 appid 和 Authorization，请先访问 userInfo");
        $notification.post("提示", "未获取到 appid 和 Authorization", "请先访问 iYouke userInfo 接口");
        $done({});
    }
}
function sign() {
    console.log("开始执行签到");
    // 获取当前日期
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}/${month}/${day}`;
    console.log("日期" + date);
    // 构造签到 URL
    const sign_url = `https://smp-api.iyouke.com/dtapi/pointsSign/user/sign?date=${date}`;
    console.log("签到url" + sign_url);
    // 配置文件
    const options = {
        url: sign_url,
        method: "GET",
        headers: {
            'Host': 'smp-api.iyouke.com',
            'Connection': 'keep-alive',
            'appId': appId, // 从 userInfo 获取的 appid
            'envVersion': 'release',
            'content-type': 'application/json',
            'Authorization': authorization, //  Authorization
            'xy-extra-data': `appid=${appId};version=2.10.95;envVersion=release;senceId=1089`,
            'version': '2.10.95',
            'Accept-Encoding': 'gzip,compress,br,deflate',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.57(0x18003932) NetType/4G Language/zh_CN',
            'Referer': `https://servicewechat.com/${appId}/10/page-frame.html`
        }
    };
    // 发送请求
    $task.fetch(options).then(response => {
            const data = response.body;
            try {
                const res = JSON.parse(data);
                var msgs = res.msg;
                const msg = `签到结果: ${msgs}`;
                $notification.post("签到", "执行结果", msg); // 别忘了推送
                console.log(msg);
            } catch (error) {
                console.log("Json解析失败")
                $notification.post("签到", "执行结果", "签到失败"); // 别忘了推送
            }
            $done()
        },
        reason => {
            console.log("请求失败");
            $notification.post("签到", "执行结果", "签到失败"); // 别忘了推送
            $done()
        })
}
// =================== Env 模板 ===================
function Env(name) {
    return new (class {
        constructor(name) {
            this.name = name;
            this.data = null;
            this.dataFile = "boxjs.dat";
            this.isQX = typeof $task !== "undefined";
            this.isLoon = typeof $loon !== "undefined";
            this.isSurge = typeof $httpClient !== "undefined" && typeof $loon === "undefined";
            this.isNode = typeof require === "function" && !this.isQX && !this.isSurge && !this.isLoon;
        }

        setdata(val, key) {
            if (this.isQX) return $prefs.setValueForKey(val, key);
            if (this.isSurge || this.isLoon) return $persistentStore.write(val, key);
        }

        msg(title = this.name, subtitle = "", message = "") {
            if (this.isQX) $notify(title, subtitle, message);
            if (this.isSurge || this.isLoon) $notification.post(title, subtitle, message);
        }
    })(name);
}
