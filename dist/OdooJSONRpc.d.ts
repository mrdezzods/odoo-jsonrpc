export type OdooSearchDomain = any | any[];
export interface OdooSearchReadOptions {
    offset?: number;
    limit?: number;
    order?: string;
    context?: any;
}
export type OdooAuthenticateWithApiKeyResponse = {
    uid: number;
};
export type OdooAuthenticateWithCredentialsResponse = {
    uid: number;
    is_system: boolean;
    is_admin: boolean;
    is_internal_user: boolean;
    user_context: UserContext;
    db: string;
    user_settings: UserSettings;
    server_version: string;
    server_version_info: [number, number, number, string, number, string];
    support_url: string;
    name: string;
    username: string;
    partner_display_name: string;
    partner_id: number;
    'web.base.url': string;
    active_ids_limit: number;
    profile_session: any;
    profile_collectors: any;
    profile_params: any;
    max_file_upload_size: number;
    home_action_id: boolean;
    cache_hashes: any;
    currencies: any;
    bundle_params: any;
    user_companies: any;
    show_effect: boolean;
    display_switch_company_menu: boolean;
    user_id: number[];
    max_time_between_keys_in_ms: number;
    web_tours: any[];
    tour_disable: boolean;
    notification_type: string;
    warning: string;
    expiration_date: string;
    expiration_reason: string;
    map_box_token: boolean;
    odoobot_initialized: boolean;
    iap_company_enrich: boolean;
    ocn_token_key: boolean;
    fcm_project_id: boolean;
    inbox_action: number;
    is_quick_edit_mode_enabled: string;
    dbuuid: string;
    multi_lang: boolean;
};
export type UserContext = {
    lang: string;
    tz: string;
    uid: number;
};
export type UserSettings = {
    id: number;
    user_id: UserId;
    is_discuss_sidebar_category_channel_open: boolean;
    is_discuss_sidebar_category_chat_open: boolean;
    push_to_talk_key: boolean;
    use_push_to_talk: boolean;
    voice_active_duration: number;
    volume_settings_ids: [string, any[]][];
    homemenu_config: boolean;
};
export type UserId = {
    id: number;
};
export type OdooConnectionBase = {
    baseUrl?: string;
    port?: number;
    db?: string;
};
export interface ConnectionWithSession extends OdooConnectionBase {
    sessionId?: string;
}
export interface ConnectionWithCredentials extends OdooConnectionBase {
    username?: string;
    password?: string;
    apiKey?: string;
}
export type OdooConnection = ConnectionWithSession | ConnectionWithCredentials;
export declare const Try: <T>(fn: () => Promise<T>) => Promise<[T, null] | [null, Error]>;
/**
 * Type guard to determine if the authentication response is a full credentials response.
 *
 * This function distinguishes between the two possible authentication response types:
 * - OdooAuthenticateWithCredentialsResponse (full response with user details)
 * - OdooAuthenticateWithApiKeyResponse (simple response with just the user ID)
 *
 * It checks for the presence of the 'username' property, which is only available
 * in the full credentials response.
 *
 * @param response - The authentication response to check
 * @returns true if the response is a full credentials response, false otherwise
 *
 * @example
 * const authResponse = await odoo.connect();
 * if (isCredentialsResponse(authResponse)) {
 *   console.log("Authenticated user:", authResponse.username);
 * } else {
 *   console.log("Authenticated with API key, user ID:", authResponse.uid);
 * }
 */
export declare const isCredentialsResponse: (response: OdooAuthenticateWithCredentialsResponse | OdooAuthenticateWithApiKeyResponse) => response is OdooAuthenticateWithCredentialsResponse;
export default class OdooJSONRpc {
    url: string | undefined;
    is_connected: boolean;
    private session_id;
    private auth_response;
    private uid;
    private api_key;
    private config;
    constructor(config?: OdooConnection);
    get uId(): number | undefined;
    get authResponse(): OdooAuthenticateWithCredentialsResponse | undefined;
    get sessionId(): string | undefined;
    get port(): number | undefined;
    initialize(config: OdooConnection): void;
    connect(config?: OdooConnection): Promise<OdooAuthenticateWithCredentialsResponse | OdooAuthenticateWithApiKeyResponse>;
    private connectWithApiKey;
    private connectWithCredentials;
    private connectWithSessionId;
    call_kw(model: string, method: string, args: any[], kwargs?: any): Promise<any>;
    private callWithUid;
    private callWithSessionId;
    create(model: string, values: any): Promise<number>;
    read<T>(model: string, id: number | number[], fields: string[]): Promise<T[]>;
    update(model: string, id: number, values: any): Promise<boolean>;
    /**
     * Updates the translations for a field in the specified Odoo model.
     * @param model Model to update eg. product.template
     * @param id Id of the model to update
     * @param field field to update eg. name
     * @param translations object with translations eg. {de_DE: "Neuer Name", en_GB: "Name"}
     */
    updateFieldTranslations(model: string, id: number, field: string, translations: {
        [key: string]: string;
    }): Promise<boolean>;
    delete(model: string, id: number): Promise<boolean>;
    searchRead<T>(model: string, domain: OdooSearchDomain, fields: string[], opts?: OdooSearchReadOptions): Promise<T[]>;
    search(model: string, domain: OdooSearchDomain): Promise<number[]>;
    getFields(model: string): Promise<any>;
    action(model: string, action: string, ids: number[]): Promise<boolean>;
    createExternalId(model: string, recordId: number, externalId: string, moduleName?: string): Promise<number>;
    searchByExternalId(externalId: string): Promise<number>;
    readByExternalId<T>(externalId: string, fields?: string[]): Promise<T>;
    updateByExternalId(externalId: string, params?: any): Promise<any>;
    deleteByExternalId(externalId: string): Promise<any>;
    disconnect(): Promise<any>;
}
