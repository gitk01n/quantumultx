/*
QuantumultX 
功能：
日期：
适配：QuantumultX

【重写规则】
[rewrite_local]
^https://api\.quwayouxuan\.com/login/third\.do url script-response-body https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/jxzh.js

[mitm]
hostname = api.quwayouxuan.com


*/

const $ = new Env("趣蛙优选");
const notify = $.isNode() ? require('./sendNotify') : '';
const ckName = "qwyx_data";
const userCookie = $.toObj($.isNode() ? process.env[ckName] : $.getdata(ckName)) || [];

$.userIdx = 0;
$.userList = [];
$.notifyMsg = [];
$.succCount = 0;
$.is_debug = ($.isNode() ? process.env.IS_DEDUG : $.getdata('is_debug')) || 'false';

const VIDEO_TASK_COUNT = 10; // 每天视频任务次数

//========================================
// 主程序
//========================================
async function main() {
    for (let user of $.userList) {
        $.log(`\n------------- 账号${user.index} -------------\n`);
        try {
            await user.Login();
            if (user.ckStatus) {
                let pointF = await user.getPoint() ?? 0;
                
                // 1. 获取任务列表并完成签到任务
                let taskList = await user.getTaskList();
                if (taskList && taskList.length > 0) {
                    for (let item of taskList) {
                        if (/获取更多积分/.test(item.name)) {
                            for (let i = 1; i <= 10; i++) {
                                let taskMsg = await user.taskSuccess(item);
                                if (/重复/.test(taskMsg)) break;
                                await $.wait(2000);
                            }
                        } else {
                            await user.taskSuccess(item);
                            await $.wait(1000);
                        }
                    }
                }
                
                // 2. 完成视频任务
                $.log(`\n[${user.userName}] 开始执行视频任务...`);
                let videoSuccessCount = 0;
                for (let i = 1; i <= VIDEO_TASK_COUNT; i++) {
                    let result = await user.completeVideoTask(i);
                    if (result) {
                        videoSuccessCount++;
                        await $.wait(2000);
                    } else {
                        if (i - videoSuccessCount >= 3) break;
                    }
                }
                $.log(`[${user.userName}] 视频任务完成: ${videoSuccessCount}/${VIDEO_TASK_COUNT}`);
                
                // 3. 收割
                await user?.reap();
                await $.wait(1000);
                
                // 4. 播种
                await user?.race();
                await $.wait(1000);
                
                // 5. 获取最终积分
                let pointE = await user.getPoint() ?? 0;
                let pointDiff = parseInt(pointE) - parseInt(pointF);
                $.notifyMsg.push(`[${user.userName}] 积分:${pointF}→${pointE} (${pointDiff >= 0 ? '+' : ''}${pointDiff})\n`);
                $.succCount++;
            } else {
                $.error(`[${user?.userName}] ck已失效，请重新登录小程序`);
                $.notifyMsg.push(`[${user?.userName}] ck已失效，需要重新登录`);
            }
        } catch (e) {
            $.error(`[账号${user.index}] 执行出错: ${e.message}`);
            $.notifyMsg.push(`[账号${user.index}] 执行失败`);
        }
    }
}

//========================================
// 用户类
//========================================
class UserInfo {
    constructor(user) {
        this.index = ++$.userIdx;
        this.ckStatus = true;
        this.userId = user?.userId || "";
        this.openId = user?.openId || "";
        this.unionId = user?.unionId || "";
        this.userName = user?.userName || this.userId || this.index;
        this.token = "";
        
        this.baseUrl = "https://api.quwayouxuan.com";
        this.headers = {
            "Host": "api.quwayouxuan.com",
            "Connection": "keep-alive",
            "content-type": "application/x-www-form-urlencoded",
            "Accept-Encoding": "gzip,compress,br,deflate",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x18003237) NetType/WIFI Language/zh_CN"
        };
    }
    
    generateRequestId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    async fetch(options) {
        const url = new URL(options.url || '', this.baseUrl).href;
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
        
        debug(res, url.substring(url.lastIndexOf('/') + 1));
        return res;
    }
    
    async Login() {
        let timestamp = (new Date()).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "miniOpenId": this.openId,
            "unionId": this.unionId
        };
        
        const opts = {
            url: "/login/third.do",
            params: {
                ...data,
                "key": encrypt(data)
            },
            type: "get"
        };
        
        let res = await this.fetch(opts);
        if (!res?.data?.token) throw new Error(res?.message || "登录失败");
        
        this.token = res?.data?.token;
        this.userName = res?.data?.username || this.userName;
        $.info(`[${this.userName}] 登录成功`);
    }
    
    async taskSuccess(task) {
        let timestamp = (new Date()).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "taskid": task?.id,
            "subtask_id": task["subtask_id"]
        };
        data.key = encrypt(data);
        
        const opts = {
            url: "/task/task/taskSuccrss.do",
            params: data,
            type: "get"
        };
        
        let res = await this.fetch(opts);
        $.info(`[${this.userName}] [${task?.name}]: ${res?.message}`);
        return res?.message;
    }
    
    async completeVideoTask(taskNumber) {
        try {
            let timestamp = (new Date()).getTime();
            let data = {
                "current_time": timestamp,
                "os": "miniProgram",
                "deviceabout": "miniProgram",
                "version": "1.3.03",
                "token": this.token
            };
            
            const opts = {
                url: "/task/task/taskSuccrss.do",
                params: {
                    ...data,
                    "key": encrypt(data)
                },
                type: "get"
            };
            
            let res = await this.fetch(opts);
            
            if (res?.code === 1) {
                $.info(`[${this.userName}] 视频任务${taskNumber}: ${res?.message}`);
                return true;
            } else if (/已完成|重复/.test(res?.message)) {
                $.info(`[${this.userName}] 视频任务${taskNumber}: 今日已完成`);
                return false;
            } else {
                $.warn(`[${this.userName}] 视频任务${taskNumber}: ${res?.message}`);
                return false;
            }
        } catch (e) {
            $.error(`[${this.userName}] 视频任务${taskNumber}失败: ${e.message}`);
            return false;
        }
    }
    
    async getTaskList() {
        let timestamp = (new Date()).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "source": "2"
        };
        data.key = encrypt(data);
        
        const opts = {
            url: "/task/task/taskList.do",
            params: data,
            type: "get"
        };
        
        let res = await this.fetch(opts);
        return res?.data || [];
    }
    
    async getPoint() {
        let timestamp = (new Date()).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "source": "3"
        };
        data.key = encrypt(data);
        
        const opts = {
            url: "/member/points/get.do",
            params: data,
            type: "get"
        };
        
        let res = await this.fetch(opts);
        return res?.data?.points || 0;
    }
    
    async race() {
        let timestamp = (new Date()).getTime();
        let data = {
            "sj_h5": "1",
            "token": this.token,
            "num": "100",
            "version": "2.0.0",
            "os": "h5",
            "current_time": timestamp
        };
        data.key = objKeySort(data);
        
        const opts = {
            url: "/rice/buy.do",
            type: "post",
            "dataType": "form",
            "body": data
        };
        
        let res = await this.fetch(opts);
        $.info(`[${this.userName}] 播种: ${res?.message}`);
    }
    
    async reap() {
        let timestamp = (new Date()).getTime();
        let data = {
            "current_time": timestamp,
            "os": "miniProgram",
            "deviceabout": "miniProgram",
            "version": "1.3.03",
            "token": this.token,
            "type": "1"
        };
        data.key = encrypt(data);
        
        const opts = {
            url: "/rice/reap.do",
            type: "post",
            "dataType": "form",
            "body": data
        };
        
        let res = await this.fetch(opts);
        $.info(`[${this.userName}] 收割: ${res?.message}`);
    }
}

//========================================
// 加密函数
//========================================
function encrypt(a) {
    const keys = Object.keys(a).sort();
    let t = "";
    for (let i = 0; i < keys.length; i++) {
        t += keys[i] + "=" + a[keys[i]];
    }
    
    let n = (t + "superjing").replace(/\s+/g, "");
    let i = encodeURIComponent(n)
        .replace(/%20/gi, "")
        .replace(/(!)|(')|(\()|(\))|(\~)|(\*)/gi, function (a) {
            return "%" + a.charCodeAt(0).toString(16).toUpperCase();
        });
    
    return CryptoJS.SHA1(i).toString();
}

function objKeySort(obj) {
    var extra_str = "superjing";
    let keys = Object.keys(obj).sort();
    let result = "";
    
    for (let key of keys) {
        result += key + "=" + obj[key];
    }
    
    result += extra_str;
    result = result.replace(/\s+/g, "");
    
    let encoded = encodeURIComponent(result)
        .replace(/%20/gi, "")
        .replace(/(!)|(')|(\()|(\))|(\~)|(\*)/gi, function (a) {
            return "%" + a.charCodeAt(0).toString(16).toUpperCase();
        });
    
    return CryptoJS.SHA1(encoded).toString();
}

//========================================
// Cookie获取
//========================================
async function getCookie() {
    try {
        if (!$request || $request.method === 'OPTIONS') return;
        
        let url = $request.url;
        let body = $.toObj($response.body);
        
        if (!body?.data) {
            $.msg($.name, "", "获取Cookie失败：响应数据为空");
            return;
        }
        
        // 从URL中提取参数
        const urlParams = new URL(url);
        const miniOpenId = urlParams.searchParams.get('miniOpenId') || body.data.openid;
        const unionId = urlParams.searchParams.get('unionId') || body.data.unionid;
        
        const newData = {
            "userId": body.data.userID || body.data.userid || "",
            "openId": miniOpenId || "",
            "unionId": unionId || "",
            "userName": body.data.username || ""
        };
        
        if (!newData.userId || !newData.openId) {
            $.msg($.name, "", "获取Cookie失败：缺少必要参数");
            return;
        }
        
        let cookies = $.getdata(ckName);
        let cookieArr = cookies ? JSON.parse(cookies) : [];
        
        const index = cookieArr.findIndex(e => e.userId === newData.userId);
        
        if (index === -1) {
            cookieArr.push(newData);
            $.msg($.name, "", `新增账号成功: ${newData.userName}`);
        } else {
            cookieArr[index] = newData;
            $.msg($.name, "", `更新账号成功: ${newData.userName}`);
        }
        
        $.setdata(JSON.stringify(cookieArr), ckName);
    } catch (e) {
        $.logErr(e);
        $.msg($.name, "", `获取Cookie失败: ${e.message}`);
    }
}

//========================================
// 工具函数
//========================================
function getQueries(url) {
    try {
        const urlObj = new URL(url);
        const params = {};
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    } catch (e) {
        return {};
    }
}

async function loadCryptoJS() {
    let code = ($.isNode() ? require('crypto-js') : $.getdata('CryptoJS_code')) || '';
    
    if ($.isNode()) return code;
    
    if (!code || Object.keys(code).length === 0) {
        $.log("加载CryptoJS中...");
        const url = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";
        await $.getScript(url).then((fn) => {
            $.setdata(fn, 'CryptoJS_code');
            eval(fn);
            const CryptoJS = createCryptoJS();
            code = CryptoJS;
        });
    }
    return code;
}

function createCryptoJS() {
    return typeof CryptoJS !== 'undefined' ? CryptoJS : {};
}

async function sendMsg(a, e) {
    a && ($.isNode() ? await notify.sendNotify($.name, a) : $.msg($.name, $.title || "", a, e));
}

async function checkEnv() {
    try {
        if (!userCookie?.length) throw new Error("no available accounts found");
        $.log(`\n[INFO] 检测到 ${userCookie?.length ?? 0} 个账号\n`);
        $.userList.push(...userCookie.map((o => new UserInfo(o))).filter(Boolean));
    } catch (o) {
        throw o;
    }
}

function debug(g, e = "debug") {
    "true" === $.is_debug && (
        $.log(`\n-----------${e}------------\n`),
        $.log("string" == typeof g ? g : $.toStr(g) || `debug error => t=${g}`),
        $.log(`\n-----------${e}------------\n`)
    );
}

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
            .catch((t => $.log(`[${p.toUpperCase()}][ERROR] ${t}\n`)));
        
        return Promise.race([
            new Promise(((t, o) => setTimeout((() => o("当前请求已超时")), i))),
            m
        ]);
    } catch (t) {
        console.log(`[${p.toUpperCase()}][ERROR] ${t}\n`);
    }
}

//========================================
// 主程序入口
//========================================
!(async () => {
    if (typeof $request !== "undefined") {
        await getCookie();
        return;
    }
    
    try {
        await loadCryptoJS();
        await checkEnv();
        await main();
        
        if ($.notifyMsg.length > 0) {
            let msg = `✅ 成功: ${$.succCount}/${$.userList.length}\n\n${$.notifyMsg.join('\n')}`;
            await sendMsg(msg);
        }
    } catch (e) {
        $.logErr(e);
        $.msg($.name, "", `执行失败: ${e.message}`);
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done());
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise(((e,i)=>{s.call(this,t,((t,s,o)=>{t?i(t):e(s)}))}))}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null,...s){try{return JSON.stringify(t,...s)}catch{return e}}getjson(t,e){let s=e;if(this.getdata(t))try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise((e=>{this.get({url:t},((t,s,i)=>e(i)))}))}runScript(t,e){return new Promise((s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},timeout:o};this.post(n,((t,e,i)=>s(i)))})).catch((t=>this.logErr(t)))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t||(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce(((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{}),t)[e[e.length-1]]=s),t}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.cookie&&void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar)))}get(t,e=(()=>)){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",((t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}})).then((t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,n=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))}));break}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then((t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,n=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))}));break}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",i="",o={}){const r=t=>{const{$open:e,$copy:s,$media:i,$mediaMime:o}=t;switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{const r={};let a=t.openUrl||t.url||t["open-url"]||e;a&&Object.assign(r,{action:"open-url",url:a});let n=t["update-pasteboard"]||t.updatePasteboard||s;if(n&&Object.assign(r,{action:"clipboard",text:n}),i){let t,e,s;if(i.startsWith("http"))t=i;else if(i.startsWith("data:")){const[t]=i.split(";")[,o]=i.split(",");e=o,s=t.replace("data:","")}else{e=i,s=(t=>{const e={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in e)if(0===t.indexOf(s))return e[s];return null})(i)}Object.assign(r,{"media-url":t,"media-base64":e,"media-base64-mime":o??s})}return Object.assign(r,{"auto-dismiss":t["auto-dismiss"],sound:t.sound}),r}case"Loon":{const s={};let o=t.openUrl||t.url||t["open-url"]||e;o&&Object.assign(s,{openUrl:o});let r=t.mediaUrl||t["media-url"];return i?.startsWith("http")&&(r=i),r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=t["open-url"]||t.url||t.openUrl||e;r&&Object.assign(o,{"open-url":r});let a=t["media-url"]||t.mediaUrl;i?.startsWith("http")&&(a=i),a&&Object.assign(o,{"media-url":a});let n=t["update-pasteboard"]||t.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,i,r(o));break;case"Quantumult X":$notify(e,s,i,r(o));break;case"Node.js":break}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}debug(...t){this.logLevels[this.logLevel]<=this.logLevels.debug&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.debug}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}info(...t){this.logLevels[this.logLevel]<=this.logLevels.info&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.info}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}warn(...t){this.logLevels[this.logLevel]<=this.logLevels.warn&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.warn}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}error(...t){this.logLevels[this.logLevel]<=this.logLevels.error&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.error}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.map((t=>t??String(t))).join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,e,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,e,void 0!==t.message?t.message:t,t.stack);break}}wait(t){return new Promise((e=>setTimeout(e,t)))}done(t={}){const e=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${e} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
