import { ResultInfo } from "./resultInfo";

export interface ListResponse<T> {
	result: T[];
	result_info: ResultInfo;
	success: boolean;
	errors: string[]
	messages: string[]
}