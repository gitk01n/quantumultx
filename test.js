/*
------------------------------------------
@Date: 2026.07.08 (QuantumultX修复版)
@Description: 趣淘优选 永久ck，一天100+积分
@Author: Sliverkiss (修复版 by AI)
------------------------------------------
脚本兼容：QuantumultX
功能：
1. 自动获取Token (通过重写)
2. 每日签到任务
3. 视频任务 (每天10次)
4. 播种 & 收割
5. 积分统计

使用说明：
1. 配置重写规则自动获取Token
2. 配置定时任务每天自动执行

new Env("趣淘优选");
cron 15 8,16 * * *  qwyx.js

[rewrite_local]
^https:\/\/api\.quwayouxuan\.com\/login\/third\.do url script-response-body https://raw.githubusercontent.com/你的仓库/qwyx.js

[MITM]
hostname = api.quwayouxuan.com

⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄露或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此免责声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
------------------------------------------
*/

const $ = new Env("趣淘优选");
//notify
const notify = $.isNode() ? require('./sendNotify') : '';
const ckName = "qwyx_data";
const userCookie = $.toObj($.isNode() ? process.env[ckName] : $.getdata(ckName)) || [];

//用户多账号配置
$.userIdx = 0, $.userList = [], $.notifyMsg = [];
//成功个数
$.succCount = 0;
//debug
$.is_debug = ($.isNode() ? process.env.IS_DEDUG : $.getdata('is_debug')) || 'false';

//视频任务配置
const VIDEO_TASK_COUNT = 10; // 每天视频任务次数

//------------------------------------------
async function main() {
    for (let user of $.userList) {
        $.log(\n------------- 账号${user.index} -------------\n)
        try {
            await user.Login();
            if (user.ckStatus) {
                let pointF = await user.getPoint() ?? 0;
                
                // 1. 获取任务列表并完成签到任务
                let taskList = await user.getTaskList();
                if (taskList && taskList.length > 0) {
                    for (let item of taskList) {
                        // 特殊处理"获取更多积分"任务（可重复10次）
                        if (/获取更多积分/.test(item.name)) {
                            for (let i = 1; i <= 10; i++) {
                                let taskMsg = await user.taskSuccess(item);
                                if (/重复/.test(taskMsg)) break;
                                await $.wait(2000); // 延迟2秒
                            }
                        } else {
                            // 其他任务执行一次
                            await user.taskSuccess(item);
                            await $.wait(1000);
                        }
                    }
                }
                
                // 2. 完成视频任务（10次）
                $.log(\n[${user.userName}] 开始执行视频任务...);
                let videoSuccessCount = 0;
                for (let i = 1; i <= VIDEO_TASK_COUNT; i++) {
                    let result = await user.completeVideoTask(i);
                    if (result) {
                        videoSuccessCount++;
                        await $.wait(2000); // 延迟2秒
                    } else {
                        // 如果连续失败3次，可能今日任务已完成
                        if (i - videoSuccessCount >= 3) break;
                    }
                }
                $.log([${user.userName}] 视频任务完成: ${videoSuccessCount}/${VIDEO_TASK_COUNT});
                
                // 3. 收割
                await user?.reap();
                await $.wait(1000);
                
                // 4. 播种
                await user?.race();
                await $.wait(1000);
                
                // 5. 获取最终积分
                let pointE = await user.getPoint() ?? 0;
                let pointDiff = parseInt(pointE) - parseInt(pointF);
                $.notifyMsg.push([${user.userName}] 积分:${pointF}→${pointE} (${pointDiff >= 0 ? '+' : ''}${pointDiff}));
                $.succCount++;
            } else {
                $.error([${user?.userName}] ck已失效，请重新登录小程序);
                $.notifyMsg.push([${user?.userName}] ck已失效，需要重新登录);
            }
        } catch (e) {
            $.error([账号${user.index}] 执行出错: ${e.message});
            $.notifyMsg.push([账号${user.index}] 执行失败);
        }
    }
    
    $.title = 共${$.userList.length}个账号 成功${$.succCount}个 失败${$.userList.length - $.succCount}个
    
    //notify
    await sendMsg($.notifyMsg.join("\n"), { $media: $.avatar });
}

//用户类
class UserInfo {
    constructor(user) {
        //-------------------------- 固定不动区域 ---------------------------------
        this.index = ++$.userIdx;
        this.avatar = user.avatar;
        this.ckStatus = true;
        this.userId = "" || user.userId;
        this.openId = user?.openId;
        this.unionId = user?.unionId;
        this.userName = user.userName || this.userId || this.index;
        this.token = "" || user.token || user;
        
        //-------------------------- 请求封装区域 ---------------------------------
        this.baseUrl = https://api.quwayouxuan.com;
        this.headers = {
            "Host": "api.quwayouxuan.com",
            "Connection": "keep-alive",
            "content-type": "application/x-www-form-urlencoded",
            "X-Device-Id": this.openId || "",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.70(0x1800463a) NetType/WIFI Language/zh_CN",
            "Referer": "https://servicewechat.com/wxddaa0832e6acc5f1/133/page-frame.html"
        };
        
        return createProxy(this, this.handleError);
    }
    
    //-------------------------- 工具函数区域 ---------------------------------
    // 生成32位随机请求ID
    generateRequestId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // 通用错误处理
    handleError(error) {
        this.ckStatus = false;
        $.error([${this.userName}] 发生错误：${error.message});
    }
    
    // 通用请求方法
    async fetch(o) {
        const options = typeof o === 'string' ? { url: o } : o;
        const url = new URL(options.url || '', this.baseUrl).href;
        
        // 添加X-Request-Id
        const headers = {
            ...this.headers,
            "X-Request-Id": this.generateRequestId(),
            "X-Token": this.token || "",
            ...(options.headers || {})
        };
        
        const res = await Request({
            ...options,
            headers: headers,
            url: url
        });
        
        debug(res, url.replace(/\/+$/, '').substring(url.lastIndexOf('/') + 1));
        return res;
    }
    
    //-------------------------- 脚本函数区域 ---------------------------------
    // 登录获取token
    async Login() {
        let timestamp = (new Date).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "miniprogram_os": "iOS",
            "miniOpenId": this.openId,
            "unionId": this.unionId
        }
        
        const opts = {
            url: "/login/third.do",
            params: {
                ...data,
                "key": encrypt(data)
            },
            type: "get"
        }
        
        let res = await this.fetch(opts);
        if (!res?.data?.token) throw new Error(res?.message || "登录失败");
        
        this.token = res?.data?.token;
        this.userName = res?.data?.username || this.userName;
        $.info([${this.userName}] 登录成功);
    }
    
    // 完成任务（签到）
    async taskSuccess(task) {
        let timestamp = (new Date).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "taskid": task?.id,
            "subtask_id": task["subtask_id"]
        }
        
        const opts = {
            url: "/task/task/taskSuccrss.do",
            params: {
                ...data,
                "key": encrypt(data)
            },
            type: "get"
        }
        
        let res = await this.fetch(opts);
        $.info([${this.userName}] [${task?.name}]: ${res?.message});
        return res?.message;
    }
    
    // 完成视频任务（新增）
    async completeVideoTask(taskNumber) {
        try {
            let timestamp = (new Date).getTime();
            let data = {
                "current_time": timestamp,
                "os": "miniProgram",
                "deviceabout": "miniProgram",
                "version": "1.3.03",
                "token": this.token
            }
            
            const opts = {
                url: "/task/task/taskSuccrss.do",
                params: {
                    ...data,
                    "key": encrypt(data)
                },
                type: "get"
            }
            
            let res = await this.fetch(opts);
            
            if (res?.code === 1) {
                $.info([${this.userName}] 视频任务${taskNumber}: ${res?.message});
                return true;
            } else if (/已完成|重复/.test(res?.message)) {
                $.info([${this.userName}] 视频任务${taskNumber}: 今日已完成);
                return false;
            } else {
                $.warn([${this.userName}] 视频任务${taskNumber}: ${res?.message});
                return false;
            }
        } catch (e) {
            $.error([${this.userName}] 视频任务${taskNumber}失败: ${e.message});
            return false;
        }
    }
    
    // 获取任务列表
    async getTaskList() {
        let timestamp = (new Date).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "source": "3",
        }
        
        const opts = {
            url: "/task/task/taskList.do",
            params: {
                ...data,
                "key": encrypt(data)
            },
            type: "get"
        }
        
        let res = await this.fetch(opts);
        
        // 注意：响应数据可能是加密的，这里尝试解析
        try {
            let taskList = [];
            if (res?.data?.tasklist) {
                taskList = [...(res.data.tasklist.day || []), ...(res.data.tasklist.new || [])];
            }
            // 过滤掉分享和运营任务
            taskList = taskList.filter(e => !/分享|运营/.test(e?.name));
            return taskList;
        } catch (e) {
            $.warn([${this.userName}] 任务列表解析失败，可能需要更新脚本);
            return [];
        }
    }
    
    // 获取积分
    async getPoint() {
        let timestamp = (new Date).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "source": "2",
        }
        
        const opts = {
            url: "/member/points/get.do",
            params: {
                ...data,
                "key": encrypt(data)
            },
            type: "get"
        }
        
        let res = await this.fetch(opts);
        return res?.data?.points || 0;
    }
    
    // 播种
    async race() {
        let timestamp = (new Date).getTime();
        let data = {
            "sj_h5": "1",
            "token": this.token,
            "num": "100",
            "version": "2.0.0",
            "os": "h5",
            "current_time": timestamp,
        }
        data.key = objKeySort(data);
        
        const opts = {
            url: "/rice/buy.do",
            type: "post",
            "dataType": "form",
            "body": data
        }
        
        let res = await this.fetch(opts);
        $.info([${this.userName}] 播种: ${res?.message});
    }
    
    // 收割
    async reap() {
        let timestamp = (new Date).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "type": "1",
        }
        data.key = encrypt(data);
        
        const opts = {
            url: "/rice/reap.do",
            type: "post",
            "dataType": "form",
            "body": data
        }
        
        let res = await this.fetch(opts);
        $.info([${this.userName}] 收割: ${res?.message});
    }
}

//-------------------------- 工具函数区域 ---------------------------------

// 远程通知
async function getNotice() {
    const urls = [
        "https://fastly.jsdelivr.net/gh/Sliverkiss/GoodNight@main/notice.json",
        "https://raw.githubusercontent.com/Sliverkiss/GoodNight/main/notice.json"
    ];
    
    for (const url of urls) {
        try {
            const notice = await $.getScript(url);
            return JSON.parse(notice);
        } catch (e) {
            continue;
        }
    }
    return null;
}

// 获取Cookie
async function getCookie() {
    if ($.isNode()) {
        if (process.env[ckName]) {
            return JSON.parse(process.env[ckName]);
        }
    } else {
        // QuantumultX环境
        const data = $.getdata(ckName);
        if (data) {
            return JSON.parse(data);
        }
    }
    return [];
}

// 加密函数
function encrypt(a) {
    // 1. 对键排序并拼接为 key=value
    const keys = Object.keys(a).sort();
    let t = "";
    for (let i = 0; i < keys.length; i++) {
        t += keys[i] + "=" + a[keys[i]];
    }
    
    // 2. 拼接后缀 + 去除空白
    let n = (t + "superjing").replace(/\s+/g, "");
    
    // 3. URL 编码 + 特殊字符手动编码
    let i = encodeURIComponent(n)
        .replace(/%20/gi, "")
        .replace(/(!)|(')|(\()|(\))|(\~)|(\*)/gi, function (a) {
            return "%" + a.charCodeAt(0).toString(16).toUpperCase();
        });
    
    // 4. 使用 crypto-js 生成 sha1 签名
    return $.CryptoJS.SHA1(i).toString($.CryptoJS.enc.Hex);
}

function objKeySort(obj) {
    var extra_str = "superjing";
    
    // 1. 排序
    let keys = Object.keys(obj).sort();
    let result = "";
    
    for (let key of keys) {
        result += key + "=" + obj[key];
    }
    
    // 2. 添加后缀
    result += extra_str;
    
    // 3. 去除空白
    result = result.replace(/\s+/g, "");
    
    // 4. URL编码
    let encoded = encodeURIComponent(result)
        .replace(/%20/gi, "")
        .replace(/(!)|(')|(\()|(\))|(\~)|(\*)/gi, function (a) {
            return "%" + a.charCodeAt(0).toString(16).toUpperCase();
        });
    
    // 5. sha1
    return $.CryptoJS.SHA1(encoded).toString($.CryptoJS.enc.Hex);
}

// 加载CryptoJS
async function loadCryptoJS() {
    // QuantumultX环境下加载CryptoJS
    if (typeof $.CryptoJS === 'undefined') {
        try {
            const code = await $.getScript('https://fastly.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.js');
            eval(code);
            $.CryptoJS = CryptoJS;
        } catch (e) {
            $.error('CryptoJS加载失败');
            throw e;
        }
    }
}

// 创建代理（错误处理）
function createProxy(t, n) {
    return new Proxy(t, {
        get(t, r) {
            const c = t[r];
            return "function" == typeof c ? async function (...r) {
                try {
                    return await c.apply(t, r)
                } catch (r) {
                    n.call(t, r)
                }
            } : c
        }
    })
}

// 发送通知
async function sendMsg(a, e) {
    a && ($.isNode() ? await notify.sendNotify($.name, a) : $.msg($.name, $.title || "", a, e))
}

// 检查环境
async function checkEnv() {
    try {
        if (!userCookie?.length) throw new Error("no available accounts found");
        $.log(\n[INFO] 检测到 ${userCookie?.length ?? 0} 个账号\n);
        $.userList.push(...userCookie.map((o => new UserInfo(o))).filter(Boolean))
    } catch (o) {
        throw o
    }
}

// 调试输出
function debug(g, e = "debug") {
    "true" === $.is_debug && (
        $.log(\n-----------${e}------------\n),
        $.log("string" == typeof g ? g : $.toStr(g) || debug error => t=${g}),
        $.log(\n-----------${e}------------\n)
    )
}

//-------------------------- 请求函数 ---------------------------------
async function Request(t) {
    "string" == typeof t && (t = { url: t });
    
    try {
        if (!t?.url) throw new Error("[URL][ERROR] 缺少 url 参数");
        
        let {
            url: o,
            type: e,
            headers: r = {},
            body: s,
            params: a,
            dataType: n = "form",
            resultType: u = "data"
        } = t;
        
        const p = e ? e?.toLowerCase() : "body" in t ? "post" : "get";
        const c = o.concat("post" === p ? "?" + $.queryStr(a) : "");
        const i = t.timeout ? ($.isSurge() ? t.timeout / 1e3 : t.timeout) : 1e4;
        
        "json" === n && (r["Content-Type"] = "application/json;charset=UTF-8");
        
        const y = "string" == typeof s ? s : (s && "form" == n ? $.queryStr(s) : $.toStr(s));
        const l = {
            ...t,
            ...t?.opts ? t.opts : {},
            url: c,
            headers: r,
            ..."post" === p && { body: y },
            ..."get" === p && a && { params: a },
            timeout: i
        };
        
        const m = $.http[p.toLowerCase()](l)
            .then((t => "data" == u ? $.toObj(t.body) || t.body : $.toObj(t) || t))
            .catch((t => $.log([${p.toUpperCase()}][ERROR] ${t}\n)));
        
        return Promise.race([
            new Promise(((t, o) => setTimeout((() => o("当前请求已超时")), i))),
            m
        ])
    } catch (t) {
        console.log([${p.toUpperCase()}][ERROR] ${t}\n)
    }
}

//-------------------------- 主程序入口 ---------------------------------
!(async () => {
    // 检查是否是重写获取Cookie
    if (typeof $request !== "undefined") {
        await getCk();
        return;
    }
    
    try {
        // 加载CryptoJS
        await loadCryptoJS();
        
        // 检查环境
        await checkEnv();
        
        // 获取远程通知
        const notice = await getNotice();
        if (notice) {
            $.log(\n📢 通知: ${notice.title}\n${notice.content}\n);
        }
        
        // 执行主程序
        await main();
        
    } catch (e) {
        $.logErr(e);
        $.msg($.name, "", 执行失败: ${e.message});
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done());

//-------------------------- Cookie获取 ---------------------------------
async function getCk() {
    if ($request && $request.url.indexOf("login/third.do") > -1) {
        try {
            const body = $.toObj($response.body);
            
            if (body?.data?.token) {
                const ck = {
                    openId: body.data.openid || "",
                    unionId: body.data.unionid || "",
                    token: body.data.token,
                    userName: body.data.username || ""
                };
                
                // 读取现有数据
                let cookies = $.getdata(ckName);
                let cookieArr = cookies ? JSON.parse(cookies) : [];
                
                // 检查是否已存在
                const index = cookieArr.findIndex(e => e.openId === ck.openId);
                
                if (index === -1) {
                    cookieArr.push(ck);
                    $.msg($.name, "", 新增账号成功: ${ck.userName});
                } else {
                    cookieArr[index] = ck;
                    $.msg($.name, "", 更新账号成功: ${ck.userName});
                }
                
                // 保存
                $.setdata(JSON.stringify(cookieArr), ckName);
            }
        } catch (e) {
            $.logErr(e);
        }
    }
    $.done();
}

