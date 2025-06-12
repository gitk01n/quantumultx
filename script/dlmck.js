// Quantumult X 脚本：达美乐ck自动获取
/*
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/[^\/]+\/v2\/getUser\?openid=undefined url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
*/
const $ = new Env("达美乐小游戏");
const ckName = "dml_ck";

function getCookie() {
    if ($request && $request.method !== 'OPTIONS') {
        const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
        if (authHeader) {
            const bearerToken = authHeader.match(/Bearer\s+(\S+)/i)?.[1];
            if (bearerToken) {
                $.setdata(bearerToken, ckName); // 保存 token 到变量
                const formatted = `,dlm set ${bearerToken}`;
                $.msg($.name, "Token 获取成功 ✅", formatted);
            } else {
                $.msg($.name, "⚠️ 获取失败", "Authorization 格式错误");
            }
        } else {
            $.msg($.name, "⚠️ 获取失败", "未找到 Authorization 头");
        }
    }
    $done();
}

getCookie();

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
