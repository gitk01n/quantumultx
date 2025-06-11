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
                // 存储原始Token
                $.setdata(bearerToken, ckName);
                
                // 格式化Token用于快捷指令
                const formattedToken = `,dlm set ${bearerToken}`;
                
                // 存储到临时剪贴板
                $.setdata(formattedToken, "temp_clipboard");
                $.copy(formattedToken);
                
                // 准备跳转URL
                const finalURL = `shortcuts://run-shortcut?name=dmlck&input=clipboard`;
                
                // 显示成功通知
                $.msg($.name, "✅ Token获取成功", `Token已自动复制\n即将跳转快捷指令...`, {
                    "open-url": finalURL
                });
                
                // 1.5秒后自动跳转
                setTimeout(() => {
                    $.open(finalURL);
                }, 1500);
            } else {
                $.msg($.name, "❌ 获取失败", "Authorization格式不正确");
            }
        } else {
            $.msg($.name, "❌ 获取失败", "请求头中未找到Authorization");
        }
    }
    $done();
}

getCookie();

// 工具类
function Env(name) {
    return new (class {
        constructor(name) {
            this.name = name;
            this.isQX = typeof $task !== "undefined"; // 判断运行环境
        }

        // 数据存储
        setdata(val, key) {
            return $prefs.setValueForKey(val, key);
        }

        // 数据读取
        getdata(key) {
            return $prefs.valueForKey(key);
        }

        // 显示通知
        msg(title = this.name, subtitle = "", message = "", options = {}) {
            $notify(title, subtitle, message, options);
        }

        // 打开URL
        open(url) {
            if (this.isQX) {
                $app.openURL(url);
            } else {
                $notification.post("跳转快捷指令", "点击跳转", "", { url: url });
            }
        }

        // 复制文本
        copy(text) {
            $prefs.setValueForKey(text, "clipboard_content");
            $notify("已复制", text, "");
        }
    })(name);
}
