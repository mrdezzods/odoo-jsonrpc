"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCredentialsResponse = exports.Try = void 0;
const Try = async (fn) => {
    try {
        const result = await fn();
        return [result, null];
    }
    catch (e) {
        const error = e;
        return [null, error];
    }
};
exports.Try = Try;
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
const isCredentialsResponse = (response) => {
    return response && 'username' in response;
};
exports.isCredentialsResponse = isCredentialsResponse;
class OdooJSONRpc {
    url = undefined;
    is_connected = false;
    session_id = undefined;
    auth_response = null;
    uid = undefined;
    api_key = undefined;
    config = {};
    constructor(config = {}) {
        this.initialize(config);
    }
    get uId() {
        return this.uid ?? this.auth_response?.uid;
    }
    get authResponse() {
        return this.auth_response;
    }
    get sessionId() {
        return this.session_id;
    }
    get port() {
        return this.config?.port;
    }
    //Initializes the OdooJSONRpc instance with the provided configuration.
    initialize(config) {
        this.config = config;
        if (config.baseUrl && config.port) {
            this.url = `${config.baseUrl}:${config.port}`;
        }
        if ('sessionId' in config && config.sessionId) {
            this.session_id = config.sessionId;
        }
        else if ('apiKey' in config && config.apiKey) {
            this.api_key = config.apiKey;
        }
        this.is_connected = false;
        this.auth_response = undefined;
        this.uid = undefined;
    }
    //Connects to the Odoo server using the provided or existing configuration.
    async connect(config) {
        if (config) {
            this.initialize(config);
        }
        if (!this.config.baseUrl || !this.config.port || !this.config.db) {
            throw new Error('Incomplete configuration. Please provide baseUrl, port, and db.');
        }
        const result = await ('sessionId' in this.config
            ? this.connectWithSessionId()
            : 'apiKey' in this.config
                ? this.connectWithApiKey(this.config)
                : this.connectWithCredentials(this.config));
        if (!result) {
            throw new Error('Authentication failed. Please check your credentials.');
        }
        if ((0, exports.isCredentialsResponse)(result)) {
            this.auth_response = result;
        }
        else {
            this.auth_response = result;
            this.uid = result.uid;
        }
        this.is_connected = true;
        return this.auth_response;
    }
    //Connects to the Odoo server using an API key.
    async connectWithApiKey(config) {
        const endpoint = `${this.url}/jsonrpc`;
        const params = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'common',
                method: 'authenticate',
                args: [config.db, config.username, config.apiKey, {}],
            },
            id: new Date().getTime(),
        };
        const [response, auth_error] = await (0, exports.Try)(() => fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'omit',
            body: JSON.stringify(params),
        }));
        if (auth_error) {
            throw auth_error;
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const [body, body_parse_error] = await (0, exports.Try)(() => response.json());
        if (body_parse_error) {
            throw body_parse_error;
        }
        const { result, odoo_error } = body;
        if (odoo_error) {
            throw new Error(body?.error?.data?.message);
        }
        this.uid = result;
        return { uid: result };
    }
    //Connects to the Odoo server using username and password credentials.
    async connectWithCredentials(config) {
        const endpoint = `${this.url}/web/session/authenticate`;
        const params = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                db: config.db,
                login: config.username,
                password: config.password,
            },
            id: new Date().getTime(),
        };
        const [response, auth_error] = await (0, exports.Try)(() => fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        }));
        if (auth_error) {
            throw auth_error;
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const [body, body_parse_error] = await (0, exports.Try)(() => response.json());
        if (body_parse_error) {
            throw body_parse_error;
        }
        const { result, odoo_error } = body;
        if (odoo_error) {
            throw new Error(body?.error?.data?.message);
        }
        const cookies = response.headers.get('set-cookie');
        if (!cookies) {
            throw new Error('Cookie not found in response headers, please check your credentials');
        }
        if (!cookies.includes('session_id')) {
            throw new Error('session_id not found in cookies');
        }
        const sessionId = cookies
            .split(';')
            .find((cookie) => cookie.includes('session_id'))
            .split('=')[1];
        this.session_id = sessionId;
        this.auth_response = result;
        return result;
    }
    //Connects to the Odoo server using an existing session ID.
    async connectWithSessionId() {
        const endpoint = `${this.url}/web/session/get_session_info`;
        const params = {
            jsonrpc: '2.0',
            method: 'call',
            params: {},
            id: new Date().getTime(),
        };
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.session_id) {
            headers['X-Openerp-Session-Id'] = this.session_id;
            headers['Cookie'] = `session_id=${this.session_id}`;
        }
        else {
            throw new Error('session_id not found. Please connect first.');
        }
        const [response, auth_error] = await (0, exports.Try)(() => fetch(endpoint, {
            method: 'POST',
            headers,
            credentials: 'omit',
            body: JSON.stringify(params),
        }));
        if (auth_error) {
            throw auth_error;
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const [body, body_parse_error] = await (0, exports.Try)(() => response.json());
        if (body_parse_error) {
            throw body_parse_error;
        }
        const { result, odoo_error } = body;
        if (odoo_error) {
            throw new Error(body?.error?.data?.message);
        }
        this.auth_response = result;
        return result;
    }
    //Calls a method on the Odoo server using the RPC protocol.
    async call_kw(model, method, args, kwargs = {}) {
        if (!this.is_connected) {
            this.auth_response = await this.connect();
        }
        if (!this.session_id && !this.uid) {
            this.is_connected = false;
            throw new Error('Please connect with credentials or api key first.');
        }
        if (this.session_id) {
            return this.callWithSessionId(model, method, args, kwargs);
        }
        else if (this.uid) {
            return this.callWithUid(model, method, args, kwargs);
        }
    }
    //Calls a method on the Odoo server using UID and API key authentication.
    async callWithUid(model, method, args, kwargs = {}) {
        const endpoint = `${this.url}/jsonrpc`;
        const params = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute_kw',
                args: [this.config.db, this.uid, this.api_key, model, method, args, kwargs],
            },
            id: new Date().getTime(),
        };
        const headers = {
            'Content-Type': 'application/json',
        };
        const [response, request_error] = await (0, exports.Try)(() => fetch(endpoint, {
            headers,
            method: 'POST',
            credentials: 'omit',
            body: JSON.stringify(params),
        }));
        if (request_error) {
            throw request_error;
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const [body, body_parse_error] = await (0, exports.Try)(() => response.json());
        if (body_parse_error) {
            throw body_parse_error;
        }
        const { result, error } = body;
        if (error) {
            throw new Error(body?.error?.data?.message);
        }
        return result;
    }
    //Calls a method on the Odoo server using session ID authentication.
    async callWithSessionId(model, method, args, kwargs = {}) {
        const endpoint = `${this.url}/web/dataset/call_kw`;
        const params = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                model,
                method,
                args,
                kwargs,
            },
            id: new Date().getTime(),
        };
        const headers = {
            'Content-Type': 'application/json',
            'X-Openerp-Session-Id': this.session_id,
            Cookie: `session_id=${this.session_id}`,
        };
        const [response, request_error] = await (0, exports.Try)(() => fetch(endpoint, {
            headers,
            method: 'POST',
            credentials: 'omit',
            body: JSON.stringify(params),
        }));
        if (request_error) {
            throw request_error;
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const [body, body_parse_error] = await (0, exports.Try)(() => response.json());
        if (body_parse_error) {
            throw body_parse_error;
        }
        const { result, error } = body;
        if (error) {
            throw new Error(body?.error?.data?.message);
        }
        return result;
    }
    //Creates a new record in the specified Odoo model.
    async create(model, values) {
        return this.call_kw(model, 'create', [values]);
    }
    //Reads records from the specified Odoo model.
    async read(model, id, fields) {
        return this.call_kw(model, 'read', [id, fields]);
    }
    //Updates a record in the specified Odoo model.
    async update(model, id, values) {
        return this.call_kw(model, 'write', [[id], values]);
    }
    /**
     * Updates the translations for a field in the specified Odoo model.
     * @param model Model to update eg. product.template
     * @param id Id of the model to update
     * @param field field to update eg. name
     * @param translations object with translations eg. {de_DE: "Neuer Name", en_GB: "Name"}
     */
    async updateFieldTranslations(model, id, field, translations) {
        return this.call_kw(model, 'update_field_translations', [[id], field, translations]);
    }
    //Deletes a record from the specified Odoo model.
    async delete(model, id) {
        return this.call_kw(model, 'unlink', [[id]]);
    }
    //Searches and reads records from the specified Odoo model.
    async searchRead(model, domain, fields, opts) {
        return (await this.call_kw(model, 'search_read', [domain, fields], opts)) || [];
    }
    //Searches for records in the specified Odoo model.
    async search(model, domain) {
        return (await this.call_kw(model, 'search', [domain])) || [];
    }
    //Retrieves the fields information for the specified Odoo model.
    async getFields(model) {
        return this.call_kw(model, 'fields_get', []);
    }
    //Executes an action on the specified Odoo model for given record IDs.
    async action(model, action, ids) {
        return this.call_kw(model, action, ids);
    }
    //Creates an external ID for a record in the specified Odoo model.
    async createExternalId(model, recordId, externalId, moduleName) {
        return await this.call_kw('ir.model.data', 'create', [
            [
                {
                    model: model,
                    name: `${externalId}`,
                    res_id: recordId,
                    module: moduleName || '__api__',
                },
            ],
        ]);
    }
    //Searches for a record by its external ID.
    async searchByExternalId(externalId) {
        const irModelData = await this.searchRead('ir.model.data', [['name', '=', externalId]], ['res_id']);
        if (!irModelData.length) {
            throw new Error(`No matching record found for external identifier ${externalId}`);
        }
        return irModelData[0]['res_id'];
    }
    //Reads a record by its external ID.
    async readByExternalId(externalId, fields = []) {
        const irModelData = await this.searchRead('ir.model.data', [['name', '=', externalId]], ['res_id', 'model']);
        if (!irModelData.length) {
            throw new Error(`No matching record found for external identifier ${externalId}`);
        }
        return (await this.read(irModelData[0].model, [irModelData[0].res_id], fields))[0];
    }
    //Updates a record by its external ID.
    async updateByExternalId(externalId, params = {}) {
        const irModelData = await this.searchRead('ir.model.data', [['name', '=', externalId]], ['res_id', 'model']);
        if (!irModelData.length) {
            throw new Error(`No matching record found for external identifier ${externalId}`);
        }
        return await this.update(irModelData[0].model, irModelData[0].res_id, params);
    }
    //Deletes a record by its external ID.
    async deleteByExternalId(externalId) {
        const irModelData = await this.searchRead('ir.model.data', [['name', '=', externalId]], ['res_id', 'model']);
        if (!irModelData.length) {
            throw new Error(`No matching record found for external ID ${externalId}`);
        }
        return await this.delete(irModelData[0].model, irModelData[0].res_id);
    }
    //Disconnects from the Odoo server
    async disconnect() {
        const endpoint = `${this.url}/web/session/destroy`;
        const params = {
            jsonrpc: '2.0',
            method: 'call',
            params: {},
            id: new Date().getTime(),
        };
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.session_id) {
            headers['X-Openerp-Session-Id'] = this.session_id;
            headers['Cookie'] = `session_id=${this.session_id}`;
        }
        else {
            throw new Error('session_id not found. Please connect first.');
        }
        const [response, auth_error] = await (0, exports.Try)(() => fetch(endpoint, {
            method: 'POST',
            headers,
            credentials: 'omit',
            body: JSON.stringify(params),
        }));
        if (auth_error) {
            throw auth_error;
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const [body, body_parse_error] = await (0, exports.Try)(() => response.json());
        if (body_parse_error) {
            throw body_parse_error;
        }
        const { error } = body;
        if (error) {
            throw new Error(body?.error?.data?.message);
        }
        this.is_connected = false;
        this.auth_response = undefined;
        this.uid = undefined;
        this.session_id = undefined;
        return true;
    }
}
exports.default = OdooJSONRpc;
