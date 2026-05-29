/**
 * Spec modification agent — public surface.
 *
 * Replaces full-spec regeneration (buildModificationSystemPrompt) with a
 * tool-calling agent that drives the tested operation engine (lib/operations).
 * The model chooses WHAT to change; the code executes and validates; the spec is
 * never rewritten by the model.
 */

export {
  runSpecAgent,
  type SpecAgentResult,
  type SpecAgentStatus,
  type ToolCallingModel,
  type ModelResponse,
  type AgentMessage,
  type AgentAssistantBlock,
  type AgentToolUseBlock,
  type AgentTextBlock,
  type AgentToolResultBlock,
  type RunSpecAgentOptions,
} from "./spec-agent";
export { OPERATION_TOOLS, TOOL_NAMES, toolUseToOperation, type ToolDefinition } from "./tools";
export { buildAgentSystemPrompt } from "./system-prompt";
export { createAnthropicModel, resolveAnthropicModel } from "./anthropic-model";
export { modifySpecWithAgent, confirmAndApply, type ModifySpecOptions } from "./modify-spec";
