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
                
                // 修改后的快捷指令URL生成方式
                const shortcutURL = `shortcuts://run-shortcut?name=dmlck&input=text&text=${encodeURIComponent(bearerToken)}`;
                
                $.msg($.name, "✅ Token 获取成功", `点击通知跳转快捷指令`, {
                    "open-url": shortcutURL
                });
                
                // 添加延迟确保通知显示后再跳转
                setTimeout(() => {
                    $.open(shortcutURL);
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
                // 兼容Surge等其他环境
                $notification.post("跳转快捷指令", "点击跳转", "", { url: url });
            }
        }
    })(name);
}
