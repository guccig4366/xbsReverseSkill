function scaffoldModule(name) {
  return {
    name,
    patchPlan: [],
    patchCode: "",
    runtimeState: {},
    validation: [],
    residualRisk: [],
  };
}

module.exports = {
  scaffoldModule,
};
