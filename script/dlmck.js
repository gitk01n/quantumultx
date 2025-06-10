// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
console.log("🔥 脚本触发成功");
console.log("🌐 请求 URL:", $request.url);
console.log("📦 请求头:", JSON.stringify($request.headers));

let auth = $request.headers["Authorization"] || $request.headers["authorization"];

if (auth) {
  console.log("✅ Authorization:", auth);
  $prefs.setValueForKey(auth, "dlmck");
  $notify("🍕 Authorization 抓取成功", "", `已保存至变量 dlmck`);
} else {
  $notify("❌ 抓取失败", "", "未发现 Authorization 字段");
}

$done({});
