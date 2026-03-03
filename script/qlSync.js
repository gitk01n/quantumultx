(async () => {
  if (globalThis.__sync_installed) return;
  globalThis.__sync_installed = true;

  const LOG_TAG = "[自动同步青龙]";
  const IGNORE = ["QL_HOST", "QL_ID", "QL_SEC", "AUTO_SYNC"];

  // 读取配置
  function getCfg() {
    return {
      host: ($persistentStore.read("QL_HOST") || "").trim(),
      id: ($persistentStore.read("QL_ID") || "").trim(),
      sec: ($persistentStore.read("QL_SEC") || "").trim(),
      enable: $persistentStore.read("AUTO_SYNC") === "true"
    };
  }

  // 同步单个变量到青龙
  async function sync(key, value) {
    const cfg = getCfg();
    if (!cfg.enable || !cfg.host || !cfg.id || !cfg.sec) return;
    if (IGNORE.includes(key) || value == null || value === "") return;

    try {
      // 获取 token
      const tokenRes = await $task.fetch({
        url: `${cfg.host}/open/auth/token?client_id=${cfg.id}&client_secret=${cfg.sec}`
      });
      const tokenData = JSON.parse(tokenRes.body);
      const token = tokenData?.data?.token;
      if (!token) throw new Error("token 获取失败");

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // 查询是否存在
      const search = await $task.fetch({
        url: `${cfg.host}/open/envs?searchValue=${key}`,
        headers
      });
      const list = JSON.parse(search.body)?.data || [];
      const item = list.find(i => i.name === key);

      if (item) {
        await $task.fetch({
          method: "PUT",
          url: `${cfg.host}/open/envs`,
          headers,
          body: JSON.stringify({ id: item.id, name: key, value })
        });
        console.log(`${LOG_TAG} ✅ 更新: ${key}`);
      } else {
        await $task.fetch({
          method: "POST",
          url: `${cfg.host}/open/envs`,
          headers,
          body: JSON.stringify({ name: key, value })
        });
        console.log(`${LOG_TAG} ✅ 新增: ${key}`);
      }
    } catch (e) {
      console.log(`${LOG_TAG} ❌ ${key} 同步失败`);
    }
  }

  // ------------------------------
  // 劫持所有写入方式（全能捕获）
  // ------------------------------

  // 1. 劫持 $persistentStore.write
  const oriWrite = $persistentStore.write;
  $persistentStore.write = function (v, k) {
    const r = oriWrite.call(this, v, k);
    sync(k, v);
    return r;
  };

  // 2. 劫持 $store.set
  if (globalThis.$store?.set) {
    const oriSet = $store.set;
    $store.set = function (k, v) {
      const r = oriSet.call(this, k, v);
      sync(k, v);
      return r;
    };
  }

  // 3. 定时全量同步（兜底：任何变量变化都能抓到）
  let lastSnapshot = {};
  setInterval(() => {
    const cfg = getCfg();
    if (!cfg.enable) return;

    const now = {};
    for (const k in $persistentStore.storage) {
      if (!IGNORE.includes(k)) now[k] = $persistentStore.read(k);
    }

    for (const k in now) {
      if (now[k] !== lastSnapshot[k]) {
        sync(k, now[k]);
      }
    }
    lastSnapshot = { ...now };
  }, 2000);

  console.log(`${LOG_TAG} ✅ 全局自动同步已启动`);
})();
