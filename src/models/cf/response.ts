import { ResultInfo } from "./resultInfo";

export interface Response<T> {
	result: T;
	result_info: ResultInfo;
	success: boolean;
	errors: Array<string>;
	messages: Array<string>;
}