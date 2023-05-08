interface QueryMeta {
	duration: number;
	changes?: number;
	lastRowId?: string;
}

export interface QueryInfo<T> {
	results: T[];
	meta: QueryMeta;
	success: boolean;
}