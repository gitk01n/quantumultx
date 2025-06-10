// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const $ = new Env("达美乐小游戏");

(async () => {
  try {
    const headers = $request.headers;
    const authHeader = headers['Authorization'] || headers['authorization'];

    if (!authHeader) throw new Error("未找到 Authorization 头");

    const key = "dmlck";
    await $.setData(authHeader, key);
    $.msg("🎉 达美乐 CK 获取成功", "", `已写入变量 dmlck`);
  } catch (err) {
    $.msg("❌ 达美乐 CK 获取失败", "", err.message || err);
  }
})().finally(() => $done());

function Env(name) {
  return new (class {
    constructor(name) {
      this.name = name;
    }

    async setData(val, key) {
      return $prefs.setValueForKey(val, key);
    }

    msg(title, subtitle = "", message = "") {
      $notify(title, subtitle, message);
    }
  })(name);
}
