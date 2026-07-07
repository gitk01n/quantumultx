/*
------------------------------------------
@Date: 2026.5.27
@Description: 趣蛙优选 一天700+积分
------------------------------------------
脚本兼容：Surge、QuantumultX、Loon、Shadowrocket、Node.js
只测试过QuantumultX，其它环境请自行尝试

new Env("趣蛙优选");
cron 15 8,16 * * *  qwyx.js

@Description:
脚本兼容：Surge、QuantumultX、Loon、Shadowrocket，不支持青龙

重写：打开app，进入我的页面。

[rewrite_local]
^https:\/\/api\.quwayouxuan\.com\/mini_program\/get_openid\.do url script-response-body https://gist.github.com/Koxiu/d40b43bc0e2a194b1b7c18905c301963/raw/qwyx.js

[MITM]
hostname = api.quwayouxuan.com

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


const $ = new Env("趣蛙优选");
const ckName = "qwyx_data";
const notify = $.isNode() ? require("./sendNotify") : "";

let userCookie = $.toObj($.isNode() ? process.env[ckName] : $.getdata(ckName)) || [];
$.userIdx = 0;
$.userList = [];
$.notifyMsg = [];
$.succCount = 0;

// 主流程
async function main() {
  for (let user of $.userList) {
    $.log(`\n------------- 账号${user.index} -------------\n`);

    try {
      await user.Login();

      if (user.ckStatus) {
        // 先调用新版安全校验接口，激活当前会话
        await user.verifyRequestId();

        let pointF = (await user.getPoint()) ?? 0;
        let taskList = await user.getTaskList();

        for (let item of taskList) {
          if (/获取更多积分/.test(item.name)) {
            for (let i = 1; i <= 10; i++) {
              let msg = await user.taskSuccess(item);
              if (/重复/.test(msg)) break;
              await $.wait(1500); // 适当延迟防频繁
            }
          }
          await user.taskSuccess(item);
          await $.wait(1500);
        }

        await user.reap();
        await user.race();

        let pointE = (await user.getPoint()) ?? 0;

        $.notifyMsg.push(
          `[${user.userName}] 积分:${pointF}${pointE >= pointF ? "+" : ""}${pointE - pointF}`,
        );

        $.succCount++;
      } else {
        $.error(`[${user.userName}] token失效，请重新抓包`);
        $.notifyMsg.push(`[${user.userName}] 积分:token失效，请重新抓包`);
      }
    } catch (e) {
      $.error(e.message);
    }
  }

  $.title = `共${$.userList.length}个账号,成功${$.succCount}个,失败${$.userList.length - $.succCount}个`;
  await sendMsg($.notifyMsg.join("\n"));
}

// 用户类
class UserInfo {
  constructor(user) {
    this.index = ++$.userIdx;
    this.ckStatus = true;

    this.userId = user.userId;
    this.openId = user.openId;
    this.unionId = user.unionId;
    this.userName = user.userName;
    this.token = user.token;
    
    // 动态生成新版必须的 32 位 X-Request-Id
    this.requestId = generateRequestId(); 

    this.baseUrl = `https://api.quwayouxuan.com`;
    this.headers = {
      Host: "api.quwayouxuan.com",
      "content-type": "application/json",
      "X-Token": this.token,
      "X-Request-Id": this.requestId,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.60 NetType/WIFI Language/zh_CN",
      Referer: "https://servicewechat.com/wxddaa0832e6acc5f1/128/page-frame.html",
    };

    return createProxy(this, this.handleError);
  }

  handleError(error) {
    this.ckStatus = false;
    $.error(`[${this.userName}] 错误：${error.message}`);
  }

  async fetch(o) {
    const options = typeof o === "string" ? { url: o } : o;
    const url = new URL(options.url || "", this.baseUrl).href;

    const res = await Request({
      ...options,
      headers: options.headers || this.headers,
      url,
    });

    if (res?.code !== 1 && res?.message) {
      throw new Error(res.message);
    }

    return res;
  }

  // 登录
  async Login() {
    if (!this.token) {
      this.ckStatus = false;
      throw new Error("缺少 token，请重新抓包");
    }
    $.info(`[${this.userName}] 使用 token 登录成功`);
  }

  // 新增：新版前置安全验证接口
  async verifyRequestId() {
    const opts = {
      url: "/task/task/verifyRequestId.do",
      type: "post",
      body: {}, // 空 JSON 体
    };
    let res = await this.fetch(opts);
    $.info(`[${this.userName}] 安全会话校验 → ${res.message || "成功"}`);
    return res;
  }

  // 任务接口
  async taskSuccess(task) {
    let timestamp = Date.now();
    let data = {
      current_time: timestamp,
      os: "miniProgram",
      deviceabout: "miniProgram",
      version: "1.2.60", // 升级到新版抓包的版本号
      token: this.token,
      taskid: task.id,
      subtask_id: task.subtask_id || 0,
    };

    const opts = {
      url: "/task/task/taskSuccrss.do",
      params: { ...data, key: encrypt(data) },
      type: "get",
    };

    let res = await this.fetch(opts);
    $.info(`[${this.userName}] 完成任务[${task.name}] → ${res.message}`);
    return res.message;
  }

  async getTaskList() {
    let timestamp = Date.now();
    let data = {
      current_time: timestamp,
      os: "miniProgram",
      deviceabout: "miniProgram",
      version: "1.2.60", // 升级到新版抓包的版本号
      token: this.token,
      source: "3",
    };

    const opts = {
      url: "/task/task/taskList.do",
      params: { ...data, key: encrypt(data) },
      type: "get",
    };

    let res = await this.fetch(opts);
    let dayTasks = res?.data?.tasklist?.day || [];
    let newTasks = res?.data?.tasklist?.new || [];
    return [...dayTasks, ...newTasks].filter(
      (e) => !/分享|运营/.test(e.name),
    );
  }

  async getPoint() {
    let timestamp = Date.now();
    let data = {
      current_time: timestamp,
      os: "miniProgram",
      deviceabout: "miniProgram",
      version: "1.2.60", // 升级到新版抓包的版本号
      token: this.token,
      source: "2",
    };

    const opts = {
      url: "/member/points/get.do",
      params: { ...data, key: encrypt(data) },
      type: "get",
    };

    let res = await this.fetch(opts);
    return res?.data?.points;
  }

  async race() {
    let timestamp = Date.now();
    let data = {
      sj_h5: "1",
      token: this.token,
      num: "100",
      version: "2.0.0",
      os: "h5",
      current_time: timestamp,
    };

    data.key = objKeySort(data);

    const opts = {
      url: "/rice/buy.do",
      type: "post",
      dataType: "form",
      body: data,
    };

    let res = await this.fetch(opts);
    $.info(`[${this.userName}] 播种 → ${res.message}`);
  }

  async reap() {
    let timestamp = Date.now();
    let data = {
      current_time: timestamp,
      os: "miniProgram",
      deviceabout: "miniProgram",
      version: "1.2.60", // 升级到新版抓包的版本号
      token: this.token,
      type: "1",
    };

    data.key = encrypt(data);

    const opts = {
      url: "/rice/reap.do",
      type: "post",
      dataType: "form",
      body: data,
    };

    let res = await this.fetch(opts);
    $.info(`[${this.userName}] 收割 → ${res.message}`);
  }
}

// 辅助函数：生成 32 位随机安全 RequestId
function generateRequestId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// CK 获取
async function getCookie() {
  try {
    if ($request && $request.method === "OPTIONS") return;

    let body = $.toObj($response.body);
    let data = body?.data;

    if (!data?.userID || !data?.token) {
      $.msg($.name, "❌ 获取失败", "未找到 userID 或 token");
      return;
    }

    let newData = {
      userId: data.userID,
      openId: data.openid,
      unionId: data.unionid,
      userName: data.username,
      token: data.token,
    };

    let ckList = $.toObj($.getdata(ckName)) || [];
    let index = ckList.findIndex((e) => e.userId == newData.userId);

    index >= 0 ? (ckList[index] = newData) : ckList.push(newData);

    $.setdata(JSON.stringify(ckList), ckName);

    $.msg($.name, `🎉 [${newData.userName}] CK 获取成功`);
  } catch (e) {
    $.msg($.name, "❌ CK 获取异常", e.message);
  }
}

// CryptoJS 加载
async function loadCryptoJS() {
  let code = ($.isNode() ? require("crypto-js") : $.getdata("CryptoJS_code")) || "";

  if ($.isNode()) return code;

  if (code && Object.keys(code).length) {
    eval(code);
    return createCryptoJS();
  }

  return new Promise(async (resolve) => {
    $.getScript(
      "https://fastly.jsdelivr.net/gh/Sliverkiss/QuantumultX@main/Utils/CryptoJS.min.js",
    ).then((fn) => {
      $.setdata(fn, "CryptoJS_code");
      eval(fn);
      resolve(createCryptoJS());
    });
  });
}

// 加密函数
function encrypt(a) {
  const keys = Object.keys(a).sort();
  let t = "";
  for (let i of keys) t += i + "=" + a[i];

  let n = (t + "superjing").replace(/\s+/g, "");
  let i = encodeURIComponent(n)
    .replace(/%20/gi, "")
    .replace(
      /(!)|(')|(`\()|(\)`)|(\~)|(\*)/gi,
      (a) => "%" + a.charCodeAt(0).toString(16).toUpperCase(),
    );

  return $.CryptoJS.SHA1(i).toString($.CryptoJS.enc.Hex);
}

function objKeySort(obj) {
  var extra_str = "superjing";
  var newkey = Object.keys(obj).sort();
  var newObj = {};

  for (var i of newkey) {
    if (i !== "key") newObj[i] = obj[i];
  }

  var jsonstr = JSON.stringify(newObj);
  var str = jsonstr.replace(/":/g, "=").replace(/,"/g, "").replace(/"/g, "");
  var newstr = str.substring(1, str.length - 1) + extra_str;

  return $.CryptoJS.SHA1(newstr).toString($.CryptoJS.enc.Hex);
}

// 主入口
!(async () => {
  if (typeof $request != "undefined") {
    await getCookie();
  } else {
    $.CryptoJS = await loadCryptoJS();
    await checkEnv();
    await main();
  }
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done());

// 环境检查
async function checkEnv() {
  if ($.isNode()) {
    userCookie = $.toObj(process.env[ckName]) || [];
  }

  if (!Array.isArray(userCookie) || userCookie.length === 0) {
    throw new Error("未找到 CK，请先抓包 /mini_program/get_openid.do");
  }

  $.userList = userCookie.map((e) => new UserInfo(e));
}

/** ---------------------------------固定不动区域----------------------------------------- */
//prettier-ignore
function createProxy(t, n) { return new Proxy(t, { get(t, r) { const c = t[r]; return "function" == typeof c ? async function (...r) { try { return await c.apply(t, r) } catch (r) { n.call(t, r) } } : c } }) }
async function sendMsg(a, e) { a && ($.isNode() ? await notify.sendNotify($.name, a) : $.msg($.name, $.title || "", a, e)) }
function DoubleLog(o) { o && ($.log(`${o}`), $.notifyMsg.push(`${o}`)) };
function debug(g, e = "debug") { "true" === $.is_debug && ($.log(`\n-----------${e}------------\n`), $.log("string" == typeof g ? g : $.toStr(g) || `debug error => t=${g}`), $.log(`\n-----------${e}------------\n`)) }
function ObjectKeys2LowerCase(obj) { return !obj ? {} : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])) };
async function Request(t) { "string" == typeof t && (t = { url: t }); try { if (!t?.url) throw new Error("[URL][ERROR] 缺少 url 参数"); let { url: o, type: e, headers: r = {}, body: s, params: a, dataType: n = "form", resultType: u = "data" } = t; const p = e ? e?.toLowerCase() : "body" in t ? "post" : "get", c = o.concat("post" === p ? "?" + $.queryStr(a) : ""), i = t.timeout ? $.isSurge() ? t.timeout / 1e3 : t.timeout : 1e4; "json" === n && (r["Content-Type"] = "application/json;charset=UTF-8"); const y = "string" == typeof s ? s : (s && "form" == n ? $.queryStr(s) : $.toStr(s)), l = { ...t, ...t?.opts ? t.opts : {}, url: c, headers: r, ..."post" === p && { body: y }, ..."get" === p && a && { params: a }, timeout: i }, m = $.http[p.toLowerCase()](l).then((t => "data" == u ? $.toObj(t.body) || t.body : $.toObj(t) || t)).catch((t => $.log(`[${p.toUpperCase()}][ERROR] ${t}\n`))); return Promise.race([new Promise(((t, o) => setTimeout((() => o("当前请求已超时")), i))), m]) } catch (t) { console.log(`[${p.toUpperCase()}][ERROR] ${t}\n`) } }
function parseJwt(t) { const e = t.split("."); if (3 !== e.length) throw new Error("Invalid JWT token"); const a = JSON.parse(o(e[0])), r = JSON.parse(o(e[1])), n = new Date(1e3 * r.exp), p = new Date(parseInt(r.create_date)); return { header: a, payload: r, expDate: g(n), createDate: g(p) }; function o(t) { let e = t.replace(/-/g, "+").replace(/_/g, "/"), a = e.length % 4; a && (e += "=".repeat(4 - a)); const r = atob(e); return decodeURIComponent(escape(r)) } function g(t) { return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")} ${String(t.getDate()).padStart(2, "0")} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}` } }
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise(((e, i) => { s.call(this, t, ((t, s, o) => { t ? i(t) : e(s) })) })) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 }, this.logLevelPrefixs = { debug: "[DEBUG] ", info: "[INFO] ", warn: "[WARN] ", error: "[ERROR] " }, this.logLevel = "info", this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null, ...s) { try { return JSON.stringify(t, ...s) } catch { return e } } getjson(t, e) { let s = e; if (this.getdata(t)) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise((e => { this.get({ url: t }, ((t, s, i) => e(i))) })) } runScript(t, e) { return new Promise((s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let o = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); o = o ? 1 * o : 20, o = e && e.timeout ? e.timeout : o; const [r, a] = i.split("@"), n = { url: `http://${a}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: o }, headers: { "X-Key": r, Accept: "*/*" }, timeout: o }; this.post(n, ((t, e, i) => s(i))) })).catch((t => this.logErr(t))) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), o = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, o) : i ? this.fs.writeFileSync(e, o) : this.fs.writeFileSync(t, o) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let o = t; for (const t of i) if (o = Object(o)[t], void 0 === o) return s; return o } lodash_set(t, e, s) { return Object(t) !== t || (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce(((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}), t)[e[e.length - 1]] = s), t } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), o = s ? this.getval(s) : ""; if (o) try { const t = JSON.parse(o); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, o] = /^@(.*?)\.(.*?)$/.exec(e), r = this.getval(i), a = i ? "null" === r ? null : r || "{}" : "{}"; try { const e = JSON.parse(a); this.lodash_set(e, o, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const r = {}; this.lodash_set(r, o, t), s = this.setval(JSON.stringify(r), i) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.cookie && void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), void 0 === t.followRedirect || t.followRedirect || ((this.isSurge() || this.isLoon()) && (t["auto-redirect"] = !1), this.isQuanX() && (t.opts ? t.opts.redirection = !1 : t.opts = { redirection: !1 })), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, ((t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) })); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then((t => { const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = t; e(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a) }), (t => e(t && t.error || "UndefinedError"))); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", ((t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } })).then((t => { const { statusCode: i, statusCode: o, headers: r, rawBody: a } = t, n = s.decode(a, this.encoding); e(null, { status: i, statusCode: o, headers: r, rawBody: a, body: n }, n) }), (t => { const { message: i, response: o } = t; e(i, o, o && s.decode(o.rawBody, this.encoding)) })); break } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), void 0 === t.followRedirect || t.followRedirect || ((this.isSurge() || this.isLoon()) && (t["auto-redirect"] = !1), this.isQuanX() && (t.opts ? t.opts.redirection = !1 : t.opts = { redirection: !1 })), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, ((t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) })); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then((t => { const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = t; e(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a) }), (t => e(t && t.error || "UndefinedError"))); break; case "Node.js": let i = require("iconv-lite"); this.initGotEnv(t); const { url: o, ...r } = t; this.got[s](o, r).then((t => { const { statusCode: s, statusCode: o, headers: r, rawBody: a } = t, n = i.decode(a, this.encoding); e(null, { status: s, statusCode: o, headers: r, rawBody: a, body: n }, n) }), (t => { const { message: s, response: o } = t; e(s, o, o && i.decode(o.rawBody, this.encoding)) })); break } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let i = t[s]; null != i && "" !== i && ("object" == typeof i && (i = JSON.stringify(i)), e += `${s}=${i}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", i = "", o = {}) { const r = t => { const { $open: e, $copy: s, $media: i, $mediaMime: o } = t; switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: { const r = {}; let a = t.openUrl || t.url || t["open-url"] || e; a && Object.assign(r, { action: "open-url", url: a }); let n = t["update-pasteboard"] || t.updatePasteboard || s; if (n && Object.assign(r, { action: "clipboard", text: n }), i) { let t, e, s; if (i.startsWith("http")) t = i; else if (i.startsWith("data:")) { const [t] = i.split(";"), [, o] = i.split(","); e = o, s = t.replace("data:", "") } else { e = i, s = (t => { const e = { JVBERi0: "application/pdf", R0lGODdh: "image/gif", R0lGODlh: "image/gif", iVBORw0KGgo: "image/png", "/9j/": "image/jpg" }; for (var s in e) if (0 === t.indexOf(s)) return e[s]; return null })(i) } Object.assign(r, { "media-url": t, "media-base64": e, "media-base64-mime": o ?? s }) } return Object.assign(r, { "auto-dismiss": t["auto-dismiss"], sound: t.sound }), r } case "Loon": { const s = {}; let o = t.openUrl || t.url || t["open-url"] || e; o && Object.assign(s, { openUrl: o }); let r = t.mediaUrl || t["media-url"]; return i?.startsWith("http") && (r = i), r && Object.assign(s, { mediaUrl: r }), console.log(JSON.stringify(s)), s } case "Quantumult X": { const o = {}; let r = t["open-url"] || t.url || t.openUrl || e; r && Object.assign(o, { "open-url": r }); let a = t["media-url"] || t.mediaUrl; i?.startsWith("http") && (a = i), a && Object.assign(o, { "media-url": a }); let n = t["update-pasteboard"] || t.updatePasteboard || s; return n && Object.assign(o, { "update-pasteboard": n }), console.log(JSON.stringify(o)), o } case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, i, r(o)); break; case "Quantumult X": $notify(e, s, i, r(o)); break; case "Node.js": break }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } debug(...t) { this.logLevels[this.logLevel] <= this.logLevels.debug && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.debug}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } info(...t) { this.logLevels[this.logLevel] <= this.logLevels.info && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.info}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } warn(...t) { this.logLevels[this.logLevel] <= this.logLevels.warn && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.warn}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } error(...t) { this.logLevels[this.logLevel] <= this.logLevels.error && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.error}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.map((t => t ?? String(t))).join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, e, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, e, void 0 !== t.message ? t.message : t, t.stack); break } } wait(t) { return new Promise((e => setTimeout(e, t))) } done(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${e} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
