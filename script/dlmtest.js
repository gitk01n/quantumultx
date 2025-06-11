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
                
                // 格式化Token（示例：你可自定义格式）
                const formattedToken = `dlm_token=${bearerToken}`; // 假设格式为 "参数=值"
                
                // 复制到系统剪贴板（核心修改点）
                copyToSystemClipboard(formattedToken); // 新增函数
                
                // 显示成功通知
                $.msg($.name, "✅ Token获取成功", `已复制到剪贴板:\n${formattedToken.slice(0, 20)}...`);
                
                $done();
                return;
            }
        }
    }
    $.msg($.name, "❌ 获取失败", "未检测到有效Token");
    $done();
}

// 新增：系统剪贴板复制函数（适配 QX/Surge）
function copyToSystemClipboard(text) {
    if ($.isQX) { // Quantumult X 环境
        // 使用 QX 原生剪贴板接口（需 iOS 14+，QX 版本支持）
        $clipboard.writeText(text);
    } else if ($.isSurge) { // Surge 环境
        // Surge 需通过 $notification 间接触发剪贴板（部分版本支持）
        $notification.post("📋 复制Token", "", text, {
            sound: "default",
            action: "copy",
            userInfo: {
                "clipboard": text
            }
        });
    }
    // 通用提示（保留原逻辑）
    $.msg("📋 已复制", text.slice(0, 30) + (text.length > 30 ? "..." : ""));
}

getCookie();

// 精简版Env工具类（原逻辑保留，新增剪贴板适配）
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

        // 原 .copy() 方法保留（用于工具类内部存储，新增函数直接操作系统剪贴板）
        copy(text) {
            if (this.isQX) {
                $prefs.setValueForKey(text, "clipboard_content");
            } 
            if (this.isSurge) {
                $persistentStore.write(text, "clipboard_content");
            }
            this.msg("📋 已复制", text.slice(0, 30) + (text.length > 30 ? "..." : ""));
        }
    })(name);
}
