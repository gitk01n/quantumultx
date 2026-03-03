const $ = new Env("gitk01n_BoxJS变量实时同步青龙");

// 读取配置
const QL_HOST = $.getenv("QL_HOST")?.trim();
const QL_ID = $.getenv("QL_ID")?.trim();
const QL_SEC = $.getenv("QL_SEC")?.trim();
const AUTO_SYNC = $.getenv("AUTO_SYNC") === "true";

// 不同步的内置变量
const ignoreKeys = [
  "QL_HOST",
  "QL_ID",
  "QL_SEC",
  "AUTO_SYNC"
];

// 缓存上一次变量，用于对比变化
let lastEnv = {};

!(async () => {
  if (!QL_HOST || !QL_ID || !QL_SEC) {
    console.log("❌ 请先填写 QL_HOST、QL_ID、QL_SEC");
    $.done();
    return;
  }

  if (!AUTO_SYNC) {
    console.log("ℹ️ 自动同步已关闭");
    $.done();
    return;
  }

  console.log("✅ 已启动 BoxJS 变量监听，新增/修改将自动同步青龙");

  // 先获取一次 token
  const token = await getQlToken();
  if (!token) {
    console.log("❌ 青龙 Token 获取失败");
    $.done();
    return;
  }

  // 初始化环境快照
  lastEnv = getAllEnv();

  // 开始轮询监听（BoxJS 无原生 hook，用轻量监听实现）
  setInterval(async () => {
    if (!AUTO_SYNC) return;

    const currentEnv = getAllEnv();
    const changedKeys = [];

    // 对比：新增 / 修改
    for (const key in currentEnv) {
      if (ignoreKeys.includes(key)) continue;
      const oldVal = lastEnv[key];
      const newVal = currentEnv[key];
      if (newVal !== undefined && oldVal !== newVal) {
        changedKeys.push(key);
      }
    }

    // 有变化立即同步
    if (changedKeys.length > 0) {
      console.log(`\n🔍 检测到变量变化：${changedKeys.join(", ")}`);
      for (const key of changedKeys) {
        await syncOneKey(key, currentEnv[key], token);
        await sleep(150);
      }
      // 更新快照
      lastEnv = { ...currentEnv };
    }
  }, 1000);

})().catch(e => {
  console.log("❌ 异常：", e);
  $.done();
});

// ==============================================
// 同步单个变量（存在=更新，不存在=新增）
// ==============================================
async function syncOneKey(name, value, token) {
  try {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    // 查询是否已存在
    const searchRes = await $.get(`${QL_HOST}/open/envs?searchValue=${name}`, headers);
    const searchData = JSON.parse(searchRes);
    const item = searchData?.data?.find(i => i.name === name);

    if (item) {
      await $.put(`${QL_HOST}/open/envs`, headers, JSON.stringify({
        id: item.id,
        name: name,
        value: value
      }));
      console.log(`✅ 已更新：${name}`);
    } else {
      await $.post(`${QL_HOST}/open/envs`, headers, JSON.stringify({ name, value }));
      console.log(`✅ 已新增：${name}`);
    }
  } catch (e) {
    console.log(`❌ 同步失败：${name}`);
  }
}

// ==============================================
// 获取青龙 OpenApi Token
// ==============================================
async function getQlToken() {
  try {
    const url = `${QL_HOST}/open/auth/token?client_id=${QL_ID}&client_secret=${QL_SEC}`;
    const res = await $.get(url);
    const data = JSON.parse(res);
    return data?.data?.token;
  } catch (e) {
    return null;
  }
}

// ==============================================
// 获取全部环境变量（排除系统）
// ==============================================
function getAllEnv() {
  const env = {};
  try {
    for (const key in process.env) {
      if (ignoreKeys.includes(key)) continue;
      env[key] = process.env[key];
    }
  } catch (e) {}
  return env;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ==============================================
// BoxJS 运行环境
// ==============================================
function Env(name) {
  this.name = name;
  this.env = {};
  this.getenv = (key) => process.env[key] || "";
  this.log = console.log;
  this.done = () => {};

  this.get = (url, headers) => {
    return new Promise((resolve) => {
      require("http").get(url, { headers }, (res) => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => resolve(d));
      }).on("error", () => resolve(""));
    });
  };

  this.post = (url, headers, body) => {
    return new Promise((resolve) => {
      const u = new URL(url);
      const req = require("http").request({
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "POST",
        headers
      }, res => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => resolve(d));
      });
      req.write(body);
      req.end();
    });
  };

  this.put = (url, headers, body) => {
    return new URL(url);
    return new Promise((resolve) => {
      const u = new URL(url);
      const req = require("http").request({
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "PUT",
        headers
      }, res => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => resolve(d));
      });
      req.write(body);
      req.end();
    });
  };
}
