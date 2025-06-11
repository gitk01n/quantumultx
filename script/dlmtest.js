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
                const formatted = `,dlm set '${bearerToken}'`;
                const encoded = encodeURIComponent(formatted); // 对内容进行 URL 编码
                const shortcutURL = `shortcuts://run-shortcut?name=dmlck&input=${encoded}`;

                $.msg($.name, "✅ Token 获取成功", `已准备跳转快捷指令`);
                $.open(shortcutURL);
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

// 修正后的 Env 模板
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

        open(url) {
            if (this.isQX) $app.openURL(url);
        }
    })(name);
}
