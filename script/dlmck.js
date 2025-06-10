// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
console.log("🔥 dlmck.js 脚本已执行");

const $ = new Env("多米诺授权抓取");

(async () => {
  try {
    const headers = $request.headers;
    const auth = headers["Authorization"] || headers["authorization"];
    if (!auth) throw "未找到 Authorization";

    await $.setVal("dlmck", auth);
    $.log(`✅ 成功抓取 Authorization：${auth}`);
    $.msg("🍕 多米诺 Cookie 抓取成功", "", `变量已写入：dlmck`);
  } catch (e) {
    $.log(`❌ 抓取失败: ${e}`);
  }
})();

function Env(name) {
  const isQX = typeof $task !== "undefined";
  const isSurge = typeof $httpClient !== "undefined";
  const notify = (title, subtitle, message) => {
    if (isQX) $notify(title, subtitle, message);
    if (isSurge) $notification.post(title, subtitle, message);
  };
  const log = (...args) => console.log(`[${name}]`, ...args);
  const setVal = async (key, val) => {
    if (isQX) return $prefs.setValueForKey(val, key);
    if (isSurge) return $persistentStore.write(val, key);
  };
  return { msg: notify, log, setVal };
}
