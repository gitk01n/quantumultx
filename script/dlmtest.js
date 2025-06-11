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
                // 1. 优先确保Token存储成功
                $.setdata(bearerToken, ckName);
                console.log("Token已存储");
                
                // 2. 改进剪贴板写入方式
                const formattedToken = `dlm set ${bearerToken}`;
                if ($.isQX) {
                    // Quantumult X环境
                    $prefs.setValueForKey(formattedToken, "clipboard_content");
                    console.log("QX剪贴板写入成功");
                } else {
                    // Surge/Loon环境
                    $persistentStore.write(formattedToken, "clipboard_content");
                    console.log("Surge/Loon剪贴板写入成功");
                }
                
                // 3. 更可靠的快捷指令跳转
                const finalURL = `shortcuts://run-shortcut?name=dmlck&input=${encodeURIComponent(formattedToken)}`;
                console.log("跳转URL: " + finalURL);
                
                // 4. 改进的通知提示
                $.msg($.name, "✅ Token获取成功", `点击通知即可跳转快捷指令\nToken: ${bearerToken.slice(0, 6)}...`, {
                    "open-url": finalURL,
                    "media-url": "https://example.com/icon.png" // 可选图标
                });
                
                // 5. 双重跳转保障
                setTimeout(() => {
                    $.open(finalURL);
                    $done();
                }, 1000);
                return;
            }
        }
    }
    $.msg($.name, "❌ 获取失败", "请检查请求头或网络环境");
    $done();
}

getCookie();

// 增强版Env类
function Env(name) {
    return new (class {
        constructor(name) {
            this.name = name;
            this.isQX = typeof $task !== "undefined";
            this.isSurge = typeof $httpClient !== "undefined";
            console.log(`运行环境: ${this.isQX ? 'Quantumult X' : this.isSurge ? 'Surge' : 'Loon'}`);
        }

        setdata(val, key) {
            if (this.isQX) return $prefs.setValueForKey(val, key);
            if (this.isSurge) return $persistentStore.write(val, key);
        }

        getdata(key) {
            if (this.isQX) return $prefs.valueForKey(key);
            if (this.isSurge) return $persistentStore.read(key);
        }

        msg(title = this.name, subtitle = "", message = "", options = {}) {
            if (this.isQX) $notify(title, subtitle, message, options);
            if (this.isSurge) $notification.post(title, subtitle, message, options);
        }

        open(url) {
            if (this.isQX) $app.openURL(url);
            if (this.isSurge) $notification.post("跳转", "", "", { url: url });
        }

        copy(text) {
            if (this.isQX) {
                $prefs.setValueForKey(text, "clipboard_content");
                console.log("QX复制成功: " + text);
            }
            if (this.isSurge) {
                $persistentStore.write(text, "clipboard_content");
                console.log("Surge复制成功: " + text);
            }
            this.msg("已复制", text.slice(0, 20) + (text.length > 20 ? "..." : ""));
        }
    })(name);
}
