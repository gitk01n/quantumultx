(async () => {
  if (globalThis.__ql_sync_running) return;
  globalThis.__ql_sync_running = true;

  const TAG = "[BoxJS2青龙]";
  const IGNORE_KEYS = ["QL_HOST", "QL_ID", "QL_SEC", "AUTO_SYNC"];

  // 读取配置
  function getConfig() {
    return {
      enable: $persistentStore.read("AUTO_SYNC") === "true",
      host: ($persistentStore.read("QL_HOST") || "").trim(),
      id: ($persistentStore.read("QL_ID") || "").trim(),
      sec: ($persistentStore.read("QL_SEC") || "").trim(),
    };
  }

  // 同步单个变量（新增/更新 自动判断）
  async function syncVar(key, value) {
    const cfg = getConfig();
    if (!cfg.enable || !cfg.host || !cfg.id || !cfg.sec) return;
    if (IGNORE_KEYS.includes(key) || value === undefined || value === null) return;

    try {
      // 获取 token
      const tokenRes = await $task.fetch({
        url: `${cfg.host}/open/auth/token?client_id=${cfg.id}&client_secret=${cfg.sec}`
      });
      const tokenData = JSON.parse(tokenRes.body);
      const token = tokenData?.data?.token;
      if (!token) return;

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // 查是否已存在
      const searchRes = await $task.fetch({
        url: `${cfg.host}/open/envs?searchValue=${key}`,
        headers
      });
      const list = JSON.parse(searchRes.body)?.data || [];
      const exist = list.find(i => i.name === key);

      if (exist) {
        // 更新
        await $task.fetch({
          method: "PUT",
          url: `${cfg.host}/envs`,
          headers,
          body: JSON.stringify({ id: exist.id, name: key, value })
        });
        console.log(`${TAG} ✅ 更新变量: ${key}`);
      } else {
        // 新增
        await $task.fetch({
          method: "POST",
          url: `${cfg.host}/envs`,
          headers,
          body: JSON.stringify({ name: key, value })
        });
        console.log(`${TAG} ✅ 新增变量: ${key}`);
      }
    } catch (e) {
      console.log(`${TAG} ❌ 同步失败: ${key}`);
    }
  }

  // ==============================================
  // 劫持所有写入方式，确保 新增/更新 都能捕获
  // ==============================================

  // 1. 劫持 $persistentStore.write（最常用）
  const originalWrite = $persistentStore.write;
  $persistentStore.write = function (val, key) {
    const result = originalWrite.call(this, val, key);
    syncVar(key, val);
    return result;
  };

  // 2. 劫持 $store.set
  if (globalThis.$store?.set) {
    const oriSet = $store.set;
    $store.set = function (key, val) {
      const r = oriSet.call(this, key, val);
      syncVar(key, val);
      return r;
    };
  }

  // 3. 兜底实时监听：任何变化都能抓到（新增 + 更新）
  let lastCache = {};
  setInterval(() => {
    const cfg = getConfig();
    if (!cfg.enable) return;

    const current = {};
    for (const k in $persistentStore.storage) {
      if (!IGNORE_KEYS.includes(k)) {
        current[k] = $persistentStore.read(k);
      }
    }

    // 对比所有变量：新增 或 内容变化 都同步
    for (const k in current) {
      if (current[k] !== lastCache[k]) {
        syncVar(k, current[k]);
      }
    }

    lastCache = { ...current };
  }, 1500);

  console.log(`${TAG} ✅ 启动成功：新增/更新自动同步`);
})();
