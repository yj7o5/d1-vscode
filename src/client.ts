import {
  DatabaseItem,
  ListResponse,
  QueryInfo,
	Response
} from "./models/cf";
import fetch, { Headers } from "node-fetch";

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts`;

export class Client {
  static executeQuery<T>(acctId: string, apiKey: string, email: string, dbId: string, sql: string): Promise<ListResponse<QueryInfo<T>>> {
    return Client.post<ListResponse<QueryInfo<T>>>(acctId, apiKey, email, `/d1/database/${dbId}/query`, { sql: sql });
  }

  static async listDatabases(acctId: string, apiKey: string, email: string, page: number, size: number): Promise<DatabaseItem[]> {
    const response = await Client.get<Response<DatabaseItem[]>>(acctId, apiKey, email, "/d1/database", { page: page, per_page: size });

    return response.result;
  }

  static async createDatabase(acctId: string, apiKey: string, email: string, database: string): Promise<DatabaseItem[]> {
		const response = await Client.post<Response<DatabaseItem>>(acctId, apiKey, email, "/d1/database", { name: database });

		return [response.result];
	}

	private static get<T>(acctId: string, apiKey: string, email: string, path: string, query: {[key:string]: any}): Promise<T> {
		path = `/${acctId}/${path}`;

		const keys = Object.keys(query);
		const queryParams = keys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join("&");
		const url = `${BASE_URL}${path}?${queryParams}`;

		return fetch(url, {
			method: "GET",
			headers: [
				["content-type", "application/json"],
				["x-auth-email", email],
				["x-auth-key", apiKey],
			]
		}).then(response => response.json()) as Promise<T>;
	}

	private static post<T>(acctId: string, apiKey: string, email: string, path: string, body: any): Promise<T> {
		path = `/${acctId}/${path}`;

		const headers = new Headers();

		headers.append("content-type", "application/json");
		headers.append("x-auth-email", email);
		headers.append("x-auth-key", apiKey);

		return fetch(BASE_URL + path, {
			method: "POST",
			headers: [
				["content-type", "application/json"],
				["x-auth-email", email],
				["x-auth-key", apiKey],
			],
			body: JSON.stringify(body)
		}).then(response => response.json()) as Promise<T>;
  }
}