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
const telegramGroup = "tg://resolve?domain=你的群组用户名"; // 替换为你的Telegram群组链接

function getCookie() {
    if ($request && $request.method !== 'OPTIONS') {
        const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
        if (authHeader) {
            const bearerToken = authHeader.match(/Bearer\s+(\S+)/i)?.[1];
            if (bearerToken) {
                $.setdata(bearerToken, ckName);
                const formattedToken = `,dlm set ${bearerToken}`;
                $.setdata(formattedToken, "temp_clipboard"); // 临时存储
                $.copy(formattedToken); // 复制到系统剪贴板
                const shortcutURL = `shortcuts://run-shortcut?name=dmlck`;
         
                    $.msg($.name, "✅ Token 获取成功", `即将跳转处理...`, {
                    "open-url": finalURL
                });
                
                setTimeout(() => {
                    $.open(finalURL);
                }, 1000);
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

// Env 模板保持不变
function Env(name) {
    return new (class {
        constructor(name) {
            this.name = name;
            this.isQX = typeof $task !== "undefined";
        }

        setdata(val, key) {
            return $prefs.setValueForKey(val, key);
        }

        msg(title = this.name, subtitle = "", message = "", options = {}) {
            $notify(title, subtitle, message, options);
        }

        open(url) {
            if (this.isQX) {
                $app.openURL(url);
            } else {
                $notification.post("跳转快捷指令", "点击跳转", "", { url: url });
            }
        }
    })(name);
}
