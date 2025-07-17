/*
@Author: Sliverkiss
@Date: 2023-05-16 18:30:27
@homepage: https://github.com/Sliverkiss 

2024-02-26 修复青龙无法读取以@开头的环境变量的问题，codeServer_address，codeServer_open，codeServer_fun
2024.03.11 修复无法答题的问题

ck有效期只有半小时,每周一获取ck后手动运行脚本

@Description:
微信小程序 米其林会员俱乐部 v2.0.1 每月能跑积分1500+ 积分兑换实物
捉ulp.michelin.com.cn域名任意包下的Authorization,填写到michelin_data中，多账号用#号连接
 
脚本兼容：Surge、QuantumultX、Loon、Shadowrocket、Node.js
只测试过QuantumultX，其它环境请自行尝试

重写：打开微信小程序,点击探索+获取

[Script]
cron "0 15 13 * * 1" script-path=https://gist.githubusercontent.com/Sliverkiss/49c5d5176cad6e47919ffe058606ed0d/raw/michelin.js, timeout=300, tag=米其林会员俱乐部
http-request ^https:\/\/ulp\.michelin\.com\.cn\/bff\/profile script-path=https://gist.githubusercontent.com/Sliverkiss/49c5d5176cad6e47919ffe058606ed0d/raw/michelin.js, timeout=10, tag=米其林俱乐部token

[Mitm]
 hostname=ulp.michelin.com.cn 

 */


// env.js 全局
const $ = new Env("米其林会员俱乐部");
const ckName = "michelin_data";
$.appid = "wx14413dafd16b9540";
//-------------------- 一般不动变量区域 -------------------------------------
const Notify = 1;//0为关闭通知,1为打开通知,默认为1
const notify = $.isNode() ? require('./sendNotify') : '';
let envSplitor = ["@"]; //多账号分隔符
var userCookie = ($.isNode() ? process.env[ckName] : $.getdata(ckName)) || '';
let userList = [];
let userIdx = 0;
let userCount = 0;
// 调试
$.is_debug = ($.isNode() ? process.env.IS_DEDUG : $.getdata('is_debug')) || 'false';
// 为多用户准备的通知数组
$.notifyList = [];
// 为通知准备的空数组
$.notifyMsg = [];
//------------------------ code server -------------------------------------
$.codeServer = ($.isNode() ? process.env["codeServer_address"] : $.getdata("@codeServer.address")) || '';
$.codeOpen = ($.isNode() ? process.env["codeServer_open"] : $.getdata("@codeServer.open")) || 'false';
$.wxCode = $.codeOpen != "false" && $.codeServer && $.appid;

//---------------------- 自定义变量区域 -----------------------------------
//脚本入口函数main()
async function main() {
    try {
        await getNotice();
        $.log('\n================== 任务 ==================\n');
        for (let user of userList) {
            await executeSingleUserTasks(user); // 调用新的单用户任务执行函数
            //账号通知
            $.notifyList.push({ "id": user.index, "avatar": user.avatar, "message": $.notifyMsg });
            //清空数组
            $.notifyMsg = [];
        }
    } catch (e) {
        $.log(`❌main run error => ${e}`);
    }
}

// 提取单个用户任务执行逻辑，方便复用
async function executeSingleUserTasks(user) {
    console.log(`🔷账号${user.index} >> Start work`);
    console.log(`随机延迟${user.getRandomTime()}ms`);

    //签到
    let points = await user.userInfo() ?? {};
    await user.getPaper();

    if (user.ckStatus) {
        //答题任务
        await user.doPaper();
        //转发任务
        for (let i = 0; i < 10; i++) {
            await user.share();
        }
        //寻找米其林
        for (let i = 0; i < 20; i++) {
            await user.luckyDraw();
        }
        // //新品畅游
        // await user.getScore();
        //打印通知
        let userRes = await user.userInfo();
        DoubleLog(`运行结果:本次共获得${userRes - points}积分\n当前积分:${userRes}`);
    } else {
        //将ck过期消息存入消息数组
        $.notifyMsg.push(`❌账号${user.index} >> Check ck error!`)
    }
}


class UserInfo {
    constructor(user) {
        //默认属性
        this.index = ++userIdx;
        this.token = user.token || user;
        this.userId = user.userId;
        this.userName = user.userName;
        this.avatar = user.avatar;
        this.paperStatus = true;
        this.ckStatus = true;
        //请求封装
        this.baseUrl = ``;
        this.headers = {
            "Authorization": this.token,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001f37) NetType/4G Language/zh_CNMozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001f37) NetType/4G Language/zh_CN",
        }
        this.getRandomTime = () => randomInt(1e3, 3e3);
        this.fetch = async (o) => {
            try {
                if (typeof o === 'string') o = { url: o };
                const res = await Request({ ...o, headers: o.headers || this.headers, url: o.url || this.baseUrl })
                debug(res, o?.url?.replace(/\/+$/, '').substring(o?.url?.lastIndexOf('/') + 1));
                //if (res?.code != 200) throw new Error(`用户需要去登录`);
                return res;
            } catch (e) {
                this.ckStatus = false;
                $.log(`❌请求发起失败！${e}`);
            }
        }
    }
    //完成问卷任务
    async doPaper() {
        //获取问卷
        await this.getPaper();
        //是否已完成问卷
        if (this.paperStatus) {
            //获取本期问卷题目
            await this.getOpenTpaper($.npsPaperCode);
            let index = 1;
            for (let question of $.questionList) {
                $.log(`问题${index}:${question?.questionChoise?.stemHtml}\n`);
                let options = question?.questionChoise.options;
                for (let option of options) {
                    $.log(`- ${option.optionHtml}`);
                }
                let theQuestion = question.questionChoise.npsQuestionPk;
                //查找对应题目答案
                let detail = $.stdAnswers.find(answer => theQuestion == answer.npsQuestionChoisePk) || {};
                let answer = options.find(o => o.npsQuestionChoiseOptionPk == detail.npsQuestionChoiseOptionPk);
                if (!answer) answer = options[0];
                //提交答案
                let answerRes = await this.answer(theQuestion, answer?.npsQuestionChoiseOptionPk);
                $.log(`\n答案: ${answer.optionHtml} => ${answerRes}`);
            }
            //提交问卷
            await this.paperScore($.paperCode);
        } else {
            $.log(`答题任务:本周奖励领取已达到上限，跳过执行`);
        }
    }
    //获取本期问卷
    async getPaper() {
        try {
            const options = {
                url: `https://ulp.michelin.com.cn/campaign/paper/user`,
                dataType: "json",
                body: "{\n\n}"
            };
            //post方法
            let result = await this.fetch(options);
            if (result?.code == 200) {
                $.log(`帐号[${this.index}]本次调查问卷为${result?.data?.npsPaperCode}，总共${result?.data?.questionNum}道题目,状态为${result?.data?.status}`);
                //如果已经答题，则跳过执行答题任务
                if (result?.data?.status == 'DONE') this.paperStatus = false;
                //获取本期问卷期数
                $.npsPaperCode = result?.data?.npsPaperCode;
                //获取本期问卷验证编号
                $.paperCode = result?.data?.paperCode;
            } else {
                this.ckStatus = false;
            }
        } catch (e) {
            console.log(`❌获取本期问卷错误！原因为:${e}`);
        }
    }
    //获取问卷题目
    async getOpenTpaper(npsPaperCode) {
        try {
            //post方法
            let result = await this.fetch(`https://ulp.michelin.com.cn/npspaper/nps-admin/open/api/cp/public/get_open_tpaper/${npsPaperCode}`);
            debug(result, "获取问卷题目")
            if (result?.success) {
                //答案
                $.stdAnswers = result?.data?.stdAnswers;
                //题目
                $.questionList = result?.data?.questionList;
            } else {
                $.log(`\n🔴帐号[${this.index}]获取问卷列表失败！${result?.message}`)
            }
        } catch (e) {
            console.log(`❌获取获取问卷题目错误！原因为:${e}`);
        }
    }
    //回答问题
    async answer(question, answer) {
        try {
            const options = {
                url: `https://ulp.michelin.com.cn/campaign/paper/user/answer`,
                dataType: "json",
                body: `{"answerOptionId": ["${answer}"],"paperCode": "${$.paperCode}","questionId": "${question}"}`
            };
            //post方法
            let result = await this.fetch(options);
            return result?.code == 200 ? "回答成功！" : `回答失败！${result?.message}`
        } catch (e) {
            console.log(`❌回答问题失败！原因为:${e}`);
        }
    }
    //提交问卷
    async paperScore(paperCode) {
        try {
            const options = {
                url: `https://ulp.michelin.com.cn/campaign/paper/score/${paperCode}`,
                dataType: "json",
                body: "{\n    \n}"
            };
            //post方法
            let res = await this.fetch(options);
            $.log(`提交问卷:本期问卷正确率为${res?.data?.score}%,排名9348`);
        } catch (e) {
            console.log(`❌提交问卷失败！原因为:${e}`);
        }
    }
    //查询积分
    async userInfo() {
        try {
            let res = await this.fetch(`https://ulp.michelin.com.cn/bff/profile`);
            if (res?.code !== 200) throw new Error(`用户需要去登录`)
            return res?.data?.points;
        } catch (e) {
            this.ckStatus = false;
            console.log(`❌查询积分失败！原因为:${e}`);
        }
    }
    //转发
    async share() {
        try {
            const options = {
                url: `https://ulp.michelin.com.cn/op/points/share/have`,
                dataType: "json",
                body: `{"type" : "ARTICLE","code" : "COM-MHT-93"}`
            };
            //post方法
            let res = await this.fetch(options);
            $.log(`转发:${res?.code != 200 ? "转发失败" + res?.message : "转发成功!"}`)
        } catch (e) {
            console.log(`❌转发失败！原因为:${e}`);
        }
    }
    //寻找米其林
    async luckyDraw() {
        try {
            let res = await this.fetch(`https://ulp.michelin.com.cn/campaign/findbib/luckydraw/BIB_2022`);
            $.log(`扫码:${res?.code != 200 ? "扫码失败!" + res?.message : "扫码成功!获得" + res?.data?.name}`)
        } catch (e) {
            console.log(`❌扫码失败！原因为:${e}`);
        }
    }
    //畅游任务    
    async getScore() {
        try {
            const options = {
                url: `https://ulp.michelin.com.cn/campaign/game/userScore/getScore`,
                dataType: "json",
                body: `{"gameTimes" : 200}`
            };
            //post方法
            await this.fetch(options);
        } catch (e) {
            console.log(`❌畅游任务失败！原因为:${e}`);
        }
    }

}

//获取Cookie
async function getCookie() {
    if ($request && $request.method != 'OPTIONS') {
        //请求头大小写转换,兼容代理软件环境
        const headers = ObjectKeys2LowerCase($request.headers);
        //获取token
        const tokenValue = headers.authorization;
        if (tokenValue) {
            $.setdata(tokenValue, ckName);
            $.msg($.name, "", "获取签到Cookie成功🎉，正在执行任务...");

            // 成功获取token后，立即执行任务
            try {
                // 创建一个 UserInfo 实例来代表当前用户
                // 这里我们假设每次捕获到的token是单个用户的，如果是多用户，需要进一步处理
                let currentUser = new UserInfo({ token: tokenValue });
                
                // 为了保证通知机制一致，我们需要清空一次全局通知数组
                $.notifyMsg = []; 

                await executeSingleUserTasks(currentUser);

                $.notifyList.push({ "id": currentUser.index, "avatar": currentUser.avatar, "message": $.notifyMsg });
                $.notifyMsg = []; // 清空数组，为下一个可能的通知做准备
                await SendMsgList($.notifyList); // 发送任务结果通知

            } catch (e) {
                $.msg($.name, "", `❌执行任务失败：${e.message || e}`);
            }

        } else {
            $.msg($.name, "", "❌获取签到Cookie失败，未找到 Authorization");
        }
    }
}
//-------------------------- 辅助函数区域 -----------------------------------
//加载模块
async function loadModule() {
    try {
        //加载Sakura多功能工具模块
        $.SakuraUtils = await loadSakuraUtils();
        return $.SakuraUtils ? true : false;
    } catch (e) {
        throw new Error(`❌loadModule run error => ${e}`)
    }
}
//自动生成token
async function getWxToken(code) {
    try {
        const options = {
            url: `https://ulp.michelin.com.cn/bff/wechat/login/${code}`,
            dataType: "json",
            headers: {
                "Host": "ulp.michelin.com.cn",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001f37) NetType/WIFI Language/zh_CN",
                "Referer": "https://servicewechat.com/wx14413dafd16b9540/130/page-frame.html"
            }
        };
        //post方法
        let result = await Request(options);
        let token = `Bearer ` + result?.data?.token?.access_token;
        return token;
    } catch (e) {
        $.log(`❌getWxToken run error => ${e}`)
    }
}
//检查code服务器
async function checkCodeServer() {
    try {
        $.codeFuc = ($.isNode() ? process.env["codeServer_fun"] : $.getdata("@codeServer.fun")) || '';

        let codeList = $.codeFuc
            ? (eval($.codeFuc), await WxCode($.appid))
            : (await Request({ url: `${$.codeServer}/?wxappid=${$.appid}` }))?.split("|") || [];

        codeList = codeList.filter(e => e.toString().length === 32);
        debug(codeList);
        !codeList.length
            ? $.log(`❌获取code授权失败！请检查服务器运行是否正常 => 尝试读取数据持久化 `)
            : $.log(`✅获取code授权成功！当前code数量为${codeList.length}`);

        let userList = await Promise.all(codeList.map(async (code) => {
            const data = await getWxToken(code);
            return { "token": data };
        }));
        userList = userList.filter(value => Object.keys(value).length !== 0)
        return userList;
    } catch (e) {
        $.log(`❌checkCodeServer run error => ${e}`)
    }
}
//检查环境变量
async function checkEnv() {
    try {
        let usersToAdd = [];

        if ($.wxCode) {
            usersToAdd = await checkCodeServer() || [];
        } else if (!userCookie || !userCookie.length) {
            console.log("未找到CK");
            return;
        }
        const e = envSplitor.find(o => userCookie.includes(o)) || envSplitor[0];
        userCookie = $.toObj(userCookie) || userCookie.split(e);
        usersToAdd.push(...userCookie.map(e => {
            return { "token": e.token || e };
        }))
        userList.push(...usersToAdd.map(n => new UserInfo(n)).filter(Boolean),);
        userCount = userList.length;
        console.log(`共找到${userCount}个账号`);
        return true;
    } catch (e) {
        throw new Error(`❌checkEnv run error => ${e}`)
    }
}
//请求二次封装
async function Request(o) {
    if (typeof o === 'string') o = { url: o };
    try {
        if (!o?.url) throw new Error('[发送请求] 缺少 url 参数');
        // type => 因为env中使用method处理post的特殊请求(put/delete/patch), 所以这里使用type
        let { url: u, type, headers = {}, body: b, params, dataType = 'form', deviceType = 'mobile', responseType = 'data' } = o;
        // post请求需要处理params参数(get不需要, env已经处理)
        const method = type ? type?.toLowerCase() : ('body' in o ? 'post' : 'get');
        const url = u.concat(method === 'post' ? '?' + $.SakuraUtils.JsonToUrl(params) : '');

        // 根据deviceType给headers添加默认UA
        headers['User-Agent'] ||= (headers['User-Agent'] = deviceType === 'pc'
            ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
        // 根据jsonType处理headers
        if (dataType === 'json') headers['Content-Type'] = 'application/json;charset=UTF-8';
        // post请求处理body
        const body = method === 'post' && b ? (o.dataType === 'form' && typeof b === 'object' ? $.SakuraUtils.JsonToUrl(b) : b) : '';
        const request = { url, headers, ...(method === 'post' && { body }), ...(method === 'get' && params && { params }) };

        const httpPromise = $.http[method.toLowerCase()](request)
            .then(response => responseType == 'data' ? ($.toObj(response.body) || response.body) : ($.toObj(response) || response))
            .catch(err => $.log(`❌请求发起失败！原因为：${err}`));
        // 使用Promise.race来强行加入超时处理
        return Promise.race([
            new Promise((_, e) => setTimeout(() => e('当前请求已超时'), o?.timeout || 1e4)),
            httpPromise
        ]);
    } catch (e) {
        console.log(`❌请求发起失败！原因为：${e}`);
    }
};
//生成随机数
function randomInt(n, r) {
    return Math.round(Math.random() * (r - n) + n)
};
//控制台打印
function DoubleLog(data) {
    if (data && $.isNode()) {
        console.log(`${data}`);
        $.notifyMsg.push(`${data}`)
    } else if (data) {
        console.log(`${data}`);
        $.notifyMsg.push(`${data}`)
    }
};
//调试
function debug(t, l = 'debug') {
    if ($.is_debug === 'true') {
        $.log(`\n-----------${l}------------\n`);
        $.log(typeof t == "string" ? t : $.toStr(t) || `debug error => t=${t}`);
        $.log(`\n-----------${l}------------\n`)
    }
};
//分割参数
function getQueries(t) {
    const [, e] = t.split("?");
    return e ? e.split("&").reduce((t, e) => {
        var [r, e] = e.split("=");
        return t[r] = e, t
    }, {}) : {}
};
//远程通知
async function getNotice() {
    const urls = [
        "https://raw.githubusercontent.com/Sliverkiss/GoodNight/main/notice.json",
        "https://raw.githubusercontent.com/Sliverkiss/GoodNight/main/tip.json"
    ];

    try {
        const responses = await Promise.all(urls.map(url => Request(url)));
        responses.map(result => console.log(result?.notice || "获取通知失败"));
    } catch (error) {
        console.log(`❌获取通知时发生错误：${error}`);
    }
}
//对多账号通知进行兼容
async function SendMsgList(l) {
    await Promise.allSettled(l?.map(u => SendMsg(u.message.join('\n'), u.avatar)));
};
//账号通知
async function SendMsg(n, o) {
    n && (0 < Notify ? $.isNode() ? await notify.sendNotify($.name, n) : $.msg($.name, $.title || "", n, {
        "media-url": o
    }) : console.log(n))
};
//将请求头转换为小写
function ObjectKeys2LowerCase(e) {
    e = Object.fromEntries(Object.entries(e).map(([e, t]) => [e.toLowerCase(), t]));
    return new Proxy(e, {
        get: function (e, t, r) {
            return Reflect.get(e, t.toLowerCase(), r)
        },
        set: function (e, t, r, n) {
            return Reflect.set(e, t.toLowerCase(), r, n)
        }
    })
};
//加载自用工具箱
async function loadSakuraUtils() {
    let code = ($.isNode() ? process.env['SakuraUtil_code'] : $.getdata('SakuraUtil_code')) || '';
    if (code && Object.keys(code).length) {
        console.log(`✅${$.name}:缓存中存在SakuraUtil代码,跳过下载`);
        eval(code);
        return creatUtils()
    }
    console.log(`🚀${$.name}:开始下载SakuraUtil代码`);
    return new Promise(async (resolve) => {
        $.getScript('https://cdn.jsdelivr.net/gh/Sliverkiss/QuantumultX@main/Utils/SakuraUtil.js').then((fn) => {
            $.setdata(fn, "SakuraUtil_code");
            eval(fn);
            const SakuraUtil = creatUtils();
            console.log(`✅SakuraUtil加载成功,请继续`);
            resolve(SakuraUtil)
        })
    })
};

//---------------------- 主程序执行入口 -----------------------------------
!(async () => {
    if (typeof $request != "undefined") {
        await getCookie(); // 如果是代理捕获请求，则执行获取Cookie并触发任务
    } else {
        // 如果是定时任务环境（Node.js），则继续加载模块和检查环境变量，然后执行main
        if (!(await loadModule())) throw new Error(`❌加载模块失败，请检查模块路径是否正常`);
        if (!(await checkEnv())) throw new Error(`❌未检测到ck，请添加环境变量`);
        if (userList.length > 0) await main();
    }
})()
    .catch(e => $.notifyMsg.push(e.message || e))
    .finally(async () => {
        // 在定时任务环境下发送通知，getCookie中已单独处理
        if (typeof $request == "undefined") {
            await SendMsgList($.notifyList);
        }
        $.done({ ok: 1 });
    });
/** ---------------------------------固定不动区域----------------------------------------- */
// prettier-ignore
//From chavyleung's Env.js
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, a) => { s.call(this, t, (t, s, r) => { t ? a(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const a = this.getdata(t); if (a) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, a) => e(a)) }) } runScript(t, e) { return new Promise(s => { let a = this.getdata("@chavy_boxjs_userCfgs.httpapi"); a = a ? a.replace(/\n/g, "").trim() : a; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [i, o] = a.split("@"), n = { url: `http://${o}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": i, Accept: "*/*" }, timeout: r }; this.post(n, (t, e, a) => s(a)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e); if (!s && !a) return {}; { const a = s ? t : e; try { return JSON.parse(this.fs.readFileSync(a)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : a ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const a = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of a) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, a) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[a + 1]) >> 0 == +e[a + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, a] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, a, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, a, r] = /^@(.*?)\.(.*?)$/.exec(e), i = this.getval(a), o = a ? "null" === i ? null : i || "{}" : "{}"; try { const e = JSON.parse(o); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), a) } catch (e) { const i = {}; this.lodash_set(i, r, t), s = this.setval(JSON.stringify(i), a) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: a, statusCode: r, headers: i, rawBody: o } = t, n = s.decode(o, this.encoding); e(null, { status: a, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: a, response: r } = t; e(a, r, r && s.decode(r.rawBody, this.encoding)) }) } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let a = require("iconv-lite"); this.initGotEnv(t); const { url: r, ...i } = t; this.got[s](r, i).then(t => { const { statusCode: s, statusCode: r, headers: i, rawBody: o } = t, n = a.decode(o, this.encoding); e(null, { status: s, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: s, response: r } = t; e(s, r, r && a.decode(r.rawBody, this.encoding)) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let a = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in a) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? a[e] : ("00" + a[e]).substr(("" + a[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let a = t[s]; null != a && "" !== a && ("object" == typeof a && (a = JSON.stringify(a)), e += `${s}=${a}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", a = "", r) { const i = t => { switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } case "Loon": { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } case "Quantumult X": { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl, a = t["update-pasteboard"] || t.updatePasteboard; return { "open-url": e, "media-url": s, "update-pasteboard": a } } case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, a, i(r)); break; case "Quantumult X": $notify(e, s, a, i(r)); break; case "Node.js": }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), a && t.push(a), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, t.stack) } } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
