function buildPluginGraph(seed = {}) {
  const plugins = Array.isArray(seed.plugins) ? seed.plugins : [];
  const mimeTypes = Array.isArray(seed.mimeTypes) ? seed.mimeTypes : [];

  const pluginArray = [];
  const mimeTypeArray = [];

  for (const pluginSeed of plugins) {
    const plugin = {
      name: pluginSeed.name || "",
      filename: pluginSeed.filename || "",
      description: pluginSeed.description || "",
      length: 0,
      items: [],
    };
    pluginArray.push(plugin);
  }

  for (const mimeSeed of mimeTypes) {
    const mime = {
      type: mimeSeed.type || "",
      suffixes: mimeSeed.suffixes || "",
      description: mimeSeed.description || "",
      enabledPluginName: mimeSeed.enabledPluginName || "",
      enabledPlugin: null,
    };
    mimeTypeArray.push(mime);
  }

  for (const mime of mimeTypeArray) {
    const plugin = pluginArray.find((item) => item.name === mime.enabledPluginName);
    if (plugin) {
      mime.enabledPlugin = plugin;
      plugin.items.push(mime);
      plugin.length = plugin.items.length;
    }
  }

  return {
    pluginArray,
    mimeTypeArray,
  };
}

module.exports = {
  buildPluginGraph,
};
