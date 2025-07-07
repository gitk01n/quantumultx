/*
[rewrite_local]
^https:\/\/smp-api\.iyouke\.com\/dtapi\/p\/user\/userInfo url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/guagua.js
[MITM]
hostname = smp-api.iyouke.com
*/
const $ = new Env("guagua");
// 获取 appid, Authorization 并签到的函数
function fetchAppIdAndAuthAndSignIn(headers) {
    // 从 userInfo 请求头中提取 appid 和 Authorization
    const appId = headers['appid'];    // App ID
    const authorization = headers['authorization']; // Authorization
    if (!appId || !authorization) {
        console.log('未找到 appid 或 Authorization');
        $done({});
        return;
    }
    console.log('appid 已获取：' + appId);
    console.log('Authorization 已获取：' + authorization);
    signIn(appId, authorization);  // 调用签到函数
}
function signIn(appId, authorization) {
    // 从你提供的请求体中提取信息
    const baseUrl = "https://smp-api.iyouke.com/dtapi/pointsSign/user/sign";  // URL 基本部分
    const version = "2.10.95";
    const envVersion = "release";
    // 获取当前日期，并格式化为 YYYY/MM/DD 形式
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;
    // 构建完整的签到 URL
    const signInUrl = `${baseUrl}?date=${dateStr}`;
    // 构建请求头
    const signInHeaders = {
        "Host": "smp-api.iyouke.com",
        "Connection": "keep-alive",
        "appId": appId,  // 使用从 userInfo 获取的 appid
        "envVersion": envVersion,
        "content-type": "application/json",
        "Authorization": authorization, // 使用从 userInfo 获取的 Authorization
        "xy-extra-data": `appid=${appId};version=${version};envVersion=${envVersion};senceId=1089`,
        "version": version,
        "Accept-Encoding": "gzip,compress,br,deflate",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.57(0x18003932) NetType/4G Language/zh_CN",
        "Referer": `https://servicewechat.com/${appId}/10/page-frame.html`
    };
    // 构建请求选项
    const options = {
        hostname: 'smp-api.iyouke.com',
        path: `${baseUrl}?date=${dateStr}`,
        method: 'GET',
        headers: signInHeaders  // 使用构建的请求头
    };
    // 发送请求 - 使用 $task.fetch 代替 https 模块
     $task.fetch(options).then(response => {
        const data = response.body;
        try {
            const responseJson = JSON.parse(data);
            console.log(`签到接口响应: ${data}`); // 打印原始 JSON 字符串
            // 在这里可以根据 responseJson 的内容判断签到是否成功
            if (responseJson.success) { // 根据你实际的 JSON 结构判断
                console.log("签到成功！");
            } else {
                console.log("签到失败。");
                console.log(`错误信息: ${responseJson.message}`); // 打印错误信息
            }
        } catch (error) {
            console.error(`JSON 解析出错: ${error}`);
        } finally {
            $done({}); //  确保在所有情况下都调用 $done
        }
    }, reason => {
        console.log(reason.error);
        $done();
    });
}
// 获取请求头
const headers = $request.headers;
//  在脚本开始时，调用获取 appid, Authorization 并签到的函数
fetchAppIdAndAuthAndSignIn(headers);
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
