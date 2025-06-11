//达美乐小游戏token获取
//配合快捷指令转发tg群组
//半自动上传ck
/**
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/[^\/]+\/v2\/getUser\?openid=undefined url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmtest.js
[MITM]
hostname = game.dominos.com.cn
**/

const $ = new Env("达美乐小游戏");
const ckName = "dml_ck";

function getCookie() {
    if ($request && $request.method !== 'OPTIONS') {
        const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
        if (authHeader) {
            const bearerToken = authHeader.match(/Bearer\s+(\S+)/i)?.[1];
            if (bearerToken) {
                $.setdata(bearerToken, ckName);

                const formatted = `,dlm set ${bearerToken}`;
                $.copy(formatted); // ✅ 正确复制
                const shortcutURL = "shortcuts://run-shortcut?name=dmlck";
                $.open(shortcutURL); // ✅ 正确打开快捷指令

                $.msg($.name, "✅ Token 获取成功", `内容已复制并唤起快捷指令`);
            } else {
                $.msg($.name, "❌ Token 获取失败", "Authorization 格式错误");
            }
        } else {
            $.msg($.name, "❌ Token 获取失败", "未找到 Authorization 头");
        }
    }
    $done();
}

getCookie();

// ✅ 完整版 Env 模板（适配 Quantumult X）
function Env(name) {
    return new (class {
        constructor(name) {
            this.name = name;
            this.isQX = typeof $task !== "undefined";
        }

        setdata(val, key) {
            return $prefs.setValueForKey(val, key);
        }

        msg(title = this.name, subtitle = "", message = "") {
            $notify(title, subtitle, message);
        }

        copy(str) {
            if (this.isQX) $clipboard.set(str);
        }

        open(url) {
            if (this.isQX) $app.openURL(url);
        }
    })(name);
}
