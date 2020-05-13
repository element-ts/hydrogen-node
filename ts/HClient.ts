/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {HEndpointParam, HEndpointReturn, HServerRequests, HError} from "@element-ts/hydrogen-core";
import {Neon} from "@element-ts/neon";
import {PdMethod, PdRequest} from "@element-ts/palladium";
import {OAny, OStandardType} from "@element-ts/oxygen";

export interface HClientConfig {
	host: string;
	debug?: boolean;
}

export class HClient<T extends HServerRequests<T>> {

	private _token: string | undefined;
	private readonly _config: HClientConfig;
	public static logger: Neon = new Neon();

	public constructor(config: HClientConfig) {

		HClient.logger.log("Initializing HClient.");

		this._config = config;

		if (this._config.debug === true) {
			HClient.logger.enable();
			HClient.logger.setTitle("@element-ts/hydrogen-node");
		}

	}

	public setToken(value: string | undefined): void { this._token = value; }

	public async invoke<E extends keyof T & string, M extends keyof T[E] & string>
	(endpoint: E, method: M, param: HEndpointParam<T, E, M>, wildcard?: string): Promise<HEndpointReturn<T, E, M>> {
		try {

			HClient.logger.log("Initializing new request object.");

			let req = PdRequest.init(method.toUpperCase() as PdMethod).debug();

			if (this._token) {
				HClient.logger.log("Found token to use, adding to request headers.");
				req = req.token(this._token);
			}

			let url = this._config.host + endpoint;
			if (url.includes("*") && wildcard === undefined) throw new Error("Using wildcard url but did not supply wildcard parameter.");
			url = url.replace("*", wildcard || "");

			if (method === "get" && param !== undefined) url +=  "?param=" + param;
			else {
				req = req.body({param});
				HClient.logger.log(`Set body.`);
			}

			req = req.url(url);
			HClient.logger.log("Will send request.");
			const res = await req.request();
			HClient.logger.log(`Did receive response with status code: '${res.status()}'.`);

			if (res.status() !== 200) {

				const body: {error: string} | undefined = res.json({error: OStandardType.string});
				if (!body) throw new Error("Response was not 200 and could not parse error.");
				throw new HError(res.status(), body.error);

			}

			HClient.logger.log("Will parse response.");
			const body: {value: any} | undefined = res.json({value: OAny.any()});
			if (body === undefined) throw new Error("Could not parse response.");
			HClient.logger.log("Did parse response.");

			return body.value as HEndpointReturn<T, E, M>;

		} catch (e) {
			HClient.logger.err(e);
			throw new Error("Internal protocol error. Enable debug to view error message.");
		}
	}

}