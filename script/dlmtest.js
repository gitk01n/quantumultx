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
                
                // 格式化Token
                const formattedToken = `,dlm set ${bearerToken}`;
                
                // 复制到系统剪贴板（核心修改：使用 $task.execute 执行 shell 命令）
                copyToClipboardWithTask(formattedToken);
                
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

// 新增：通过 $task.execute 执行 pbcopy 命令（iOS 原生剪贴板工具）
function copyToClipboardWithTask(text) {
    if ($.isQX) { // 仅 Quantumult X 环境适用
        // pbcopy 是 iOS 系统自带的剪贴板命令，$task.execute 可执行 shell 命令
        $task.execute({
            argv: ['pbcopy'],
            stdin: text
        });
    }
}

getCookie();

// 精简版Env工具类（原逻辑不变）
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
                $prefs.setValueForKey(text, "clipboard_content");
            } 
            if (this.isSurge) {
                $persistentStore.write(text, "clipboard_content");
            }
            this.msg("📋 已复制", text.slice(0, 30) + (text.length > 30 ? "..." : ""));
        }
    })(name);
}
