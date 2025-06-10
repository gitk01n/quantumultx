// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const $ = new Env("多米诺授权抓取");

(async () => {
  try {
    const url = $request.url;
    const headers = $request.headers;
    const auth = headers["Authorization"] || headers["authorization"];

    if (!auth) throw "未找到 Authorization 请求头";

    await $.setVal("dlmck", auth);
    $.log(`✅ 成功抓取 Authorization：${auth}`);
    $.msg("🍕 多米诺 Cookie 抓取成功", "", "变量名：dlmck 已写入 BoxJS");
  } catch (e) {
    $.log(`❌ 抓取失败: ${e}`);
  }
})();

// 兼容 Quantumult X 的 BoxJS 和 Env 环境封装
function Env(name) {
  const isQX = typeof $task !== "undefined";
  const isSurge = typeof $httpClient !== "undefined";
  const isNode = typeof require !== "undefined" && typeof $request === "undefined";
  const notify = (title, subtitle, message) => {
    if (isQX) $notify(title, subtitle, message);
    if (isSurge) $notification.post(title, subtitle, message);
  };
  const log = (...args) => console.log(`[${name}]`, ...args);

  const setVal = async (key, val) => {
    if (isQX) return $prefs.setValueForKey(val, key);
    if (isSurge) return $persistentStore.write(val, key);
  };

  return {
    msg: notify,
    log,
    setVal,
  };
}
