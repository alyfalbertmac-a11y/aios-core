/**
 * Type definitions for the Lovable-AIOS MCP Server.
 *
 * These types define the input/output contracts for tools exposed
 * to Lovable via MCP protocol, matching the API contract in
 * docs/integration/lovable-api-contract.md.
 */
export interface AiosError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
}
export interface ErrorResponse {
    error: AiosError;
}
export interface DesignArchitectureInput {
    spec: string;
    requirements?: Record<string, unknown>;
    stack_preference?: string;
}
export interface StackDefinition {
    frontend: string;
    backend: string;
    deployment: string;
}
export interface EntityField {
    name: string;
    type: string;
    primary?: boolean;
    unique?: boolean;
}
export interface DataEntity {
    name: string;
    fields: EntityField[];
}
export interface DataRelationship {
    from: string;
    to: string;
    type: string;
}
export interface DataModel {
    entities: DataEntity[];
    relationships: DataRelationship[];
}
export interface ApiEndpoint {
    method: string;
    path: string;
    description: string;
}
export interface SecurityDesign {
    auth_strategy: string;
    rls_policies: string[];
}
export interface Architecture {
    stack: StackDefinition;
    data_model: DataModel;
    api_design: {
        endpoints: ApiEndpoint[];
    };
    security: SecurityDesign;
}
export interface DesignArchitectureOutput {
    architecture: Architecture;
    architecture_markdown: string;
}
export interface GenerateCodeInput {
    spec: string;
    architecture?: Record<string, unknown>;
    ux_spec?: Record<string, unknown>;
    target_files?: string[];
    framework?: string;
}
export interface GeneratedFile {
    path: string;
    content: string;
    language: string;
}
export interface GenerateCodeOutput {
    files: GeneratedFile[];
    dependencies: {
        production: Record<string, string>;
        development: Record<string, string>;
    };
    setup_instructions: string;
}
export interface AgentRequest {
    tool: string;
    input: Record<string, unknown>;
    timeout_ms: number;
}
export interface AgentResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: AiosError;
    duration_ms: number;
}
//# sourceMappingURL=lovable.d.ts.map