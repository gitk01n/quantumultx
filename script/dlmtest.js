//达美乐小游戏token获取

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
                
                // 格式化Token
                const formattedToken = `dlm set ${bearerToken}`;
                
                // 复制到 QX 内置剪贴板（旧版 QX 需通过 $prefs 写入特定键值）
                $prefs.setValueForKey(formattedToken, "clipboard_content"); // 旧版 QX 剪贴板键值
                
                // 显示成功通知（提示用户手动粘贴，因旧版无法自动触发系统剪贴板）
                $.msg($.name, "✅ Token获取成功", `已保存到 QX 剪贴板\n请手动粘贴：\n${formattedToken.slice(0, 20)}...`);
                
                $done();
                return;
            }
        }
    }
    $.msg($.name, "❌ 获取失败", "未检测到有效Token");
    $done();
}

getCookie();

// 精简版Env工具类（原逻辑不变，依赖 $prefs 适配旧版）
function Env(name) {
    return new (class {
        constructor(name) {
            this.name = name;
            this.isQX = typeof $task !== "undefined";
            this.isSurge = typeof $httpClient !== "undefined";
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
            const notice = this.isQX ? $notify : $notification.post;
            notice(title, subtitle, message, options);
        }

        copy(text) {
            if (this.isQX) {
                $prefs.setValueForKey(text, "clipboard_content"); // 旧版 QX 剪贴板键值
            } 
            if (this.isSurge) {
                $persistentStore.write(text, "clipboard_content");
            }
            this.msg("📋 已复制", text.slice(0, 30) + (text.length > 30 ? "..." : ""));
        }
    })(name);
}
