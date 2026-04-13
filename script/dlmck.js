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
  if ($request && $request.method !== "OPTIONS") {
    const authHeader =
      $request.headers["Authorization"] || $request.headers["authorization"];

    if (authHeader) {
      const bearerToken = authHeader.match(/Bearer\s+(\S+)/i)?.[1];
      if (bearerToken) {
        $.setdata(bearerToken, ckName); // 保存 token 到变量
        const randNum = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
        const formatted = `/dml set ${bearerToken}#${randNum}`;
        $.msg($.name, "Token 获取成功 ✅", formatted);
        // 延迟一点，然后发送可点击的通知
setTimeout(() => {
  // Qx 的通知支持 action 参数（部分版本）
  const shortcutURL = `shortcuts://run-shortcut?name=复制达美乐Token&input=text&text=${encodeURIComponent(formatted)}`;
  
  // 尝试带 action 的通知（Qx、Loon、Surge 通用）
  if (typeof $notify === "function") {
    $notify("点击复制Token", "点我自动复制", formatted, {
      "action": {
        "title": "点击复制",
        "url": shortcutURL
      }
    });
  }
}, 500);


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
      return false;
    }

    // 兼容多种脚本运行环境的剪贴板写入尝试
    copy(text) {
      try {
        if (typeof $clipboard !== "undefined") {
          if (typeof $clipboard === "object") {
            if (typeof $clipboard.setData === "function") {
              $clipboard.setData({ "public.utf8-plain-text": text });
              return true;
            }
            if (typeof $clipboard.set === "function") {
              $clipboard.set(text);
              return true;
            }
            if (typeof $clipboard.write === "function") {
              $clipboard.write(text);
              return true;
            }
          }
          $clipboard = text;
          return true;
        }
      } catch (e) {
        console.log("copy failed: " + e);
      }
      return false;
    }

    msg(title = this.name, subtitle = "", message = "") {
      if (this.isQX) $notify(title, subtitle, message);
      if (this.isSurge || this.isLoon) $notification.post(title, subtitle, message);
    }
  })(name);
}
