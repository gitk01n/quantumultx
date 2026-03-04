/*
------------------------------------------
Name: 无忧行
Author: @Levi
Date: 2025-11-29
Description: 脚本兼容：Surge、QuantumultX、Loon、Shadowrocket、Node.js(青龙)
变量名: wyx_data
变量值: token值，多账号用换行或&分割，也可以是JSON数组
------------------------------------------

⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
*/

/*
[rewrite_local]
^https:\/\/app\.jegotrip\.com\.cn\/api\/service\/.+\?.*token=.+ url script-request-body https://script.levifree.qzz.io/wyx.js

[mitm]
hostname = app.jegotrip.com.cn
*/

const $ = new Env("无忧行");
const ckName = "wyx_data";

// 增强的变量解析逻辑，适配青龙
let userCookie = ($.isNode() ? process.env[ckName] : $.getdata(ckName));
if (userCookie) {
    if (typeof userCookie === 'string') {
        try {
            userCookie = JSON.parse(userCookie);
        } catch (e) {
            // 如果不是JSON，尝试按换行或&分割
            userCookie = userCookie.split(/[\n&]/).filter(item => !!item);
        }
    }
    if (!Array.isArray(userCookie)) {
        userCookie = [userCookie];
    }
} else {
    userCookie = [];
}
$.userIdx = 0, $.userList = [], $.notifyMsg = [];
$.succCount = 0;
$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata('is_debug')) || 'false';

// 常量配置
const CONFIG = {
    ge: "93EFE107DDE6DE51",
    he: "online_jego_h5",
    fe: "01",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    referer: "https://cdn.jegotrip.com.cn/"
};

// 工具函数
const Utils = {
    // MD5 加密
    md5(text) {
        if (!$.CryptoJS) {
            $.log("❌ CryptoJS 未加载");
            return null;
        }
        return $.CryptoJS.MD5(text).toString();
    },

    // Base64 编码
    base64Encode(text) {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(text).toString('base64');
        } else if (typeof btoa !== 'undefined') {
            return btoa(unescape(encodeURIComponent(text)));
        }
        return null;
    },

    // Base64 解码
    base64Decode(text) {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(text, 'base64').toString();
        } else if (typeof atob !== 'undefined') {
            return decodeURIComponent(escape(atob(text)));
        }
        return null;
    },

    // 获取时间戳
    timestamp() {
        return Date.now();
    },

    // 随机数
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // 解密密钥
    decryptKey(encryptKey) {
        const t = this.base64Decode(encryptKey);
        const a = t.split(";");
        if (a && a.length === 3) {
            const c = CONFIG.ge + a[1];
            const n = this.md5(c);
            return n.substring(8, 24);
        }
        return null;
    },

    // 生成加密密钥
    geneEncryptKey() {
        const e = `${this.timestamp()}${this.randomInt(100, 999)}`;
        const i = CONFIG.ge + e;
        const a = this.md5(i).substring(8, 24);
        const c = `${CONFIG.he};${e};${CONFIG.fe}`;
        const t = this.base64Encode(c);
        return { key: a, sec: t };
    },

    // AES 加密
    aesEncrypt(text, key) {
        if (!$.CryptoJS) {
            $.log("❌ CryptoJS 未加载");
            return null;
        }
        const keyObj = $.CryptoJS.enc.Utf8.parse(key);
        const encrypted = $.CryptoJS.AES.encrypt(text, keyObj, {
            mode: $.CryptoJS.mode.ECB,
            padding: $.CryptoJS.pad.Pkcs7
        });
        return encrypted.toString();
    },

    // AES 解密
    aesDecrypt(encryptedText, key) {
        if (!$.CryptoJS) {
            $.log("❌ CryptoJS 未加载");
            return null;
        }
        const keyObj = $.CryptoJS.enc.Utf8.parse(key);
        const decrypted = $.CryptoJS.AES.decrypt(encryptedText, keyObj, {
            mode: $.CryptoJS.mode.ECB,
            padding: $.CryptoJS.pad.Pkcs7
        });
        return decrypted.toString($.CryptoJS.enc.Utf8);
    }
};

// 检查环境
async function checkEnv() {
    try {
        if (!userCookie?.length) throw new Error("no available accounts found");
        $.log(`\n[INFO] 检测到 ${userCookie?.length ?? 0} 个账号\n`);
        $.userList.push(...userCookie.map((o => new UserInfo(o))).filter(Boolean));
    } catch (o) {
        throw o;
    }
}

// 自动抓包逻辑
async function getCookie() {
    try {
        if ($request && $request.method === 'OPTIONS') return;

        const url = $request.url;
        $.log(`[抓包] 捕获URL: ${url}`);

        const token = url.match(/[?&]token=([^&]+)/)?.[1];

        if (!token) {
            $.log("❌ URL中未找到token参数");
            $.msg($.name, "抓包失败", "URL中未找到token参数");
            return;
        }

        $.log(`[抓包] 提取token: ${token.substring(0, 8)}...（长度:${token.length}）`);

        if (token.length !== 32) {
            $.log(`❌ token长度不正确: ${token.length}位，应为32位`);
            $.msg($.name, "抓包失败", `token长度不正确（${token.length}位，应为32位）`);
            return;
        }

        const newData = {
            "token": token,
            "userName": `${token.substring(0, 4)}****${token.substring(28)}`
        };

        const index = userCookie.findIndex(e => e.token == newData.token);

        if (index !== -1) {
            userCookie[index] = newData;
            $.log(`[抓包] 更新已存在的账号: ${newData.userName}`);
            $.msg($.name, `🔄账号[${newData.userName}]更新token成功!`, ``);
        } else {
            userCookie.push(newData);
            $.log(`[抓包] 新增账号: ${newData.userName}`);
            $.msg($.name, `🎉新增账号[${newData.userName}]成功!`, ``);
        }

        $.setjson(userCookie, ckName);
        $.log(`[抓包] 当前共有 ${userCookie.length} 个账号`);
    } catch (e) {
        $.log("❌ 抓取逻辑异常: ", e);
        $.msg($.name, "抓包异常", e.message || "未知错误");
    }
}

// 用户类
class UserInfo {
    constructor(user) {
        this.index = ++$.userIdx;
        this.ckStatus = true;
        this.token = user.token || user;
        this.userName = user?.userName || `用户${this.index}`;
        this.baseUrl = `https://app.jegotrip.com.cn`;
        this.headers = {
            "User-Agent": CONFIG.userAgent,
            "Referer": CONFIG.referer,
            "Content-Type": "application/json"
        };
    }

    // 通用请求方法
    async fetch(o) {
        const options = typeof o === 'string' ? { url: o } : o;
        const url = new URL(options.url || '', this.baseUrl).href;

        let res = await httpRequest({
            ...options,
            headers: options.headers || this.headers,
            url: url
        });
        await $.wait(1000);
        debug(res, url.replace(/\/+$/, '').substring(url.lastIndexOf('/') + 1));
        return res;
    }

    // 查询总积分
    async queryTotalScore() {
        try {
            const encryptKey = Utils.geneEncryptKey();
            const requestUrl = `/api/service/member/v1/expireRewardQuery?token=${this.token}&h_token=${this.token}&lang=zh_CN`;

            const body = {
                sec: encryptKey.sec,
                body: Utils.aesEncrypt("{}", encryptKey.key)
            };

            const response = await this.fetch({
                url: requestUrl,
                body: JSON.stringify(body)
            });

            if (response?.code === "0") {
                const decryptKey = Utils.decryptKey(response.sec);
                const decryptData = Utils.aesDecrypt(response.body, decryptKey);
                const data = JSON.parse(decryptData);
                const totalScore = data.tripcoins || 0;
                $.log(`✅ 查询成功，共有 ${totalScore} 点积分`);
                return totalScore;
            } else {
                $.log(`❌ 查询积分失败: ${response?.message || "未知错误"}`);
                return 0;
            }
        } catch (e) {
            $.log("❌ 查询积分异常: ", e);
            return 0;
        }
    }

    // 获取签到任务ID
    async getCheckinTaskId() {
        try {
            const encryptKey = Utils.geneEncryptKey();
            const requestUrl = `/api/service/v1/mission/sign/querySign?token=${this.token}&h_token=${this.token}&lang=zh_CN`;

            const body = {
                sec: encryptKey.sec,
                body: Utils.aesEncrypt("{}", encryptKey.key)
            };

            const response = await this.fetch({
                url: requestUrl,
                body: JSON.stringify(body)
            });

            if (response?.code === "0") {
                const decryptKey = Utils.decryptKey(response.sec);
                const decryptData = Utils.aesDecrypt(response.body, decryptKey);
                const tasks = JSON.parse(decryptData);

                $.log(`[任务列表] 共 ${tasks.length} 个任务`);

                // 显示所有任务的状态
                tasks.forEach((task, idx) => {
                    $.log(`  任务${idx + 1}: ID=${task.id}, isSign=${task.isSign}, name=${task.name || '未知'}`);
                });

                // 从后往前查找未签到的任务
                for (let i = tasks.length - 1; i >= 0; i--) {
                    const task = tasks[i];
                    $.log(`[检查任务${i + 1}] ID:${task.id}, isSign:${task.isSign}`);
                    if (task.isSign === 2) { // 2表示未签到
                        $.log(`✅ 找到未签到任务: ID=${task.id}`);
                        return task.id;
                    }
                }

                $.log(`🔁 所有任务已完成，今日已签到`);
                return null;
            } else {
                $.log(`❌ 获取任务ID失败: ${response?.message || "未知错误"}`);
                return null;
            }
        } catch (e) {
            $.log("❌ 获取任务ID异常: ", e);
            return null;
        }
    }

    // 签到逻辑
    async checkin() {
        try {
            // 先获取任务ID
            const taskId = await this.getCheckinTaskId();
            if (!taskId) {
                return { success: true, message: "今日已签到" };
            }

            const encryptKey = Utils.geneEncryptKey();
            const requestUrl = `/api/service/v1/mission/sign/userSign?token=${this.token}&h_token=${this.token}&lang=zh_CN`;

            const requestBody = JSON.stringify({ signConfigId: taskId });
            const body = {
                sec: encryptKey.sec,
                body: Utils.aesEncrypt(requestBody, encryptKey.key)
            };

            const response = await this.fetch({
                url: requestUrl,
                body: JSON.stringify(body)
            });

            // 调试输出
            debug(response, "签到响应");

            if (response?.code === "0") {
                $.log(`✅ 签到成功`);
                return { success: true, message: "签到成功" };
            } else {
                const errMsg = response?.message || response?.msg || "未知错误";
                $.log(`❌ 签到失败 [code: ${response?.code}]: ${errMsg}`);
                $.log(`完整响应: ${JSON.stringify(response)}`);
                return { success: false, message: `签到失败: ${errMsg}` };
            }
        } catch (e) {
            $.log("❌ 签到异常: ", e);
            return { success: false, message: "签到异常" };
        }
    }
}

// 主逻辑
async function main() {
    for (let user of $.userList) {
        $.log(`\n------------- 账号${user.index} -------------\n`);
        try {
            if (user.ckStatus) {
                const pointBefore = await user.queryTotalScore() ?? 0;
                const signResult = await user.checkin();
                const pointAfter = await user.queryTotalScore() ?? 0;
                const pointDiff = pointAfter - pointBefore;

                // 格式化积分显示
                let pointMsg = `积分:${pointBefore}`;
                if (pointDiff > 0) {
                    pointMsg += ` (+${pointDiff}) → ${pointAfter}`;
                } else if (pointDiff < 0) {
                    pointMsg += ` (${pointDiff}) → ${pointAfter}`;
                } else {
                    // 无变化
                    pointMsg = `积分:${pointBefore}`;
                }

                $.notifyMsg.push(`[${user.userName}] ${signResult.message}, ${pointMsg}`);
                if (signResult.success) $.succCount++;
            } else {
                $.log(`[${user?.userName}] ck已失效，用户需要去登录`);
                $.notifyMsg.push(`[${user?.userName}] ck已失效，请重新登录`);
            }
        } catch (e) {
            $.logErr(e);
            $.notifyMsg.push(`[${user?.userName}] 执行异常: ${e.message || e}`);
        }
    }
    $.title = `共${$.userList.length}个账号,成功${$.succCount}个,失败${$.userList.length - $.succCount}个`;
    await sendMsg($.notifyMsg.join("\n"));
}

// 加载CryptoJS模块
async function loadCryptoJS() {
    let code = '';
    if ($.isNode()) {
        try {
            code = require('crypto-js');
            return code;
        } catch (e) {
            console.log("❌ Node.js环境缺少 crypto-js 依赖，请运行: npm install crypto-js");
            throw e;
        }
    } else {
        code = $.getdata('CryptoJS_code') || '';
    }
    //node环境
    if ($.isNode()) return code;
    //ios环境
    if (code && Object.keys(code).length) {
        console.log(`[INFO] 缓存中存在CryptoJS代码, 跳过下载\n`);
        eval(code);
        return createCryptoJS();
    }
    console.log(`[INFO] 开始下载CryptoJS代码\n`);
    return new Promise(async (resolve) => {
        $.getScript(
            'https://fastly.jsdelivr.net/gh/Sliverkiss/QuantumultX@main/Utils/CryptoJS.min.js'
        ).then((fn) => {
            $.setdata(fn, 'CryptoJS_code');
            eval(fn);
            const CryptoJS = createCryptoJS();
            console.log(`[INFO] CryptoJS加载成功, 请继续\n`);
            resolve(CryptoJS);
        });
    });
}

// 简单延迟函数
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 发送消息
async function sendMsg(a, e) {
    if ($.isNode()) {
        // 优先使用用户提供的 BarkNotify
        if (typeof BarkNotify === 'function') {
            const barkKey = process.env.BARK_PUSH || process.env.BARK_KEY;
            if (barkKey) {
                await BarkNotify($, barkKey, `${$.name} ${$.title || ""}`, a);
            }
        }

        // 尝试调用青龙通用的 sendNotify
        try {
            const notify = require('./sendNotify');
            if (notify && notify.sendNotify) {
                await notify.sendNotify(`${$.name} ${$.title || ""}`, a);
            }
        } catch (err) {
            // console.log("未找到 sendNotify 模块");
        }
    } else {
        a && $.msg($.name, $.title || "", a, e);
    }
}

// Debug函数
function debug(g, e = "debug") {
    "true" === $.is_debug && ($.log(`\n-----------${e}------------\n`), $.log("string" == typeof g ? g : $.toStr(g) || `debug error => t=${g}`), $.log(`\n-----------${e}------------\n`));
}

//主程序执行入口
!(async () => {
    $.CryptoJS = await loadCryptoJS();
    if (typeof $request != "undefined") {
        await getCookie();
    } else {
        await checkEnv();
        await main();
    }
})()
    .catch((e) => { $.logErr(e), $.msg($.name, `⛔️ script run error!`, e.message || e) })
    .finally(() => $.done());

/** ---------------------------------固定不动区域----------------------------------------- */
// prettier-ignore
//请求函数函数二次封装
function httpRequest(options, method) { typeof (method) === 'undefined' ? ('body' in options ? method = 'post' : method = 'get') : method = method; return new Promise((resolve) => { $[method](options, (err, resp, data) => { try { if (err) { console.log(`${method}请求失败`); $.logErr(err); resolve(null) } else { if (data) { try { const parsed = JSON.parse(data); resolve(parsed) } catch (e) { console.log(`⚠️ 响应不是JSON格式，原始数据: ${data.substring(0, 200)}`); resolve(data) } } else { console.log(`请求api返回数据为空`); resolve(null) } } } catch (e) { $.logErr(e, resp); resolve(null) } }) }) }
//Bark APP notify
async function BarkNotify(c, k, t, b) { for (let i = 0; i < 3; i++) { console.log(`🔷Bark notify >> Start push (${i + 1})`); const s = await new Promise((n) => { c.post({ url: 'https://api.day.app/push', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t, body: b, device_key: k, ext_params: { group: t } }) }, (e, r, d) => r && r.status == 200 ? n(1) : n(d || e)) }); if (s === 1) { console.log('✅Push success!'); break } else { console.log(`❌Push failed! >> ${s.message || s}`) } } };
//From chavyleung's Env.js
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, a) => { s.call(this, t, (t, s, r) => { t ? a(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const a = this.getdata(t); if (a) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, a) => e(a)) }) } runScript(t, e) { return new Promise(s => { let a = this.getdata("@chavy_boxjs_userCfgs.httpapi"); a = a ? a.replace(/\n/g, "").trim() : a; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [i, o] = a.split("@"), n = { url: `http://${o}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": i, Accept: "*/*" }, timeout: r }; this.post(n, (t, e, a) => s(a)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e); if (!s && !a) return {}; { const a = s ? t : e; try { return JSON.parse(this.fs.readFileSync(a)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : a ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const a = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of a) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, a) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[a + 1]) >> 0 == +e[a + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, a] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, a, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, a, r] = /^@(.*?)\.(.*?)$/.exec(e), i = this.getval(a), o = a ? "null" === i ? null : i || "{}" : "{}"; try { const e = JSON.parse(o); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), a) } catch (e) { const i = {}; this.lodash_set(i, r, t), s = this.setval(JSON.stringify(i), a) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: a, statusCode: r, headers: i, rawBody: o } = t, n = s.decode(o, this.encoding); e(null, { status: a, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: a, response: r } = t; e(a, r, r && s.decode(r.rawBody, this.encoding)) }) } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let a = require("iconv-lite"); this.initGotEnv(t); const { url: r, ...i } = t; this.got[s](r, i).then(t => { const { statusCode: s, statusCode: r, headers: i, rawBody: o } = t, n = a.decode(o, this.encoding); e(null, { status: s, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: s, response: r } = t; e(s, r, r && a.decode(r.rawBody, this.encoding)) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let a = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in a) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? a[e] : ("00" + a[e]).substr(("" + a[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let a = t[s]; null != a && "" !== a && ("object" == typeof a && (a = JSON.stringify(a)), e += `${s}=${a}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", a = "", r) { const i = t => { switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } case "Loon": { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } case "Quantumult X": { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl, a = t["update-pasteboard"] || t.updatePasteboard; return { "open-url": e, "media-url": s, "update-pasteboard": a } } case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, a, i(r)); break; case "Quantumult X": $notify(e, s, a, i(r)); break; case "Node.js": }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), a && t.push(a), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, t.stack) } } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
