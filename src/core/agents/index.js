const {
  AGENT_INTERPRETER,
  AGENT_RESEARCH,
  AGENT_EXECUTOR,
  KNOWN_AGENTS,
  DEFAULT_PIPELINE_ORDER,
  parsePipelineOrder,
  resolveAgentPipelineSteps
} = require("./registry");
const { buildAgentPrompt } = require("./prompts");
const { runAgentPipeline } = require("./run-pipeline");

module.exports = {
  AGENT_INTERPRETER,
  AGENT_RESEARCH,
  AGENT_EXECUTOR,
  KNOWN_AGENTS,
  DEFAULT_PIPELINE_ORDER,
  parsePipelineOrder,
  resolveAgentPipelineSteps,
  buildAgentPrompt,
  runAgentPipeline
};
