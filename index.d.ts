declare function setMaxRunTime(val: number): void;
declare function logMem(): void;
declare function formatDuration(duration: any): string;
declare function calcDeviation<T extends number | bigint>(list: T[]): number;
declare function calcCorrelation<T extends number | bigint>(x: T[], y: T[]): number;
declare function calcStats<T extends number | bigint>(list: T[]): {
    rme: number;
    min: T;
    max: T;
    mean: any;
    median: T;
    formatted: string;
};
export type BenchStats = {
    stats: {
        rme: number;
        min: number | bigint;
        max: number | bigint;
        mean: number | bigint;
        median: number | bigint;
        formatted: string;
    };
    perSecStr: string;
    perSec: bigint;
    perItemStr: string;
    measurements: bigint[];
};
declare function getTime(): bigint;
declare function benchmarkRaw(samples: number | undefined, callback: Func): Promise<BenchStats>;
export type Func = (iteration?: number) => {};
export declare function mark(label: string, samples: number, callback: Func): Promise<undefined>;
export declare function mark(label: string, callback: Func): Promise<undefined>;
export default mark;
export declare const utils: {
    getTime: typeof getTime;
    setMaxRunTime: typeof setMaxRunTime;
    logMem: typeof logMem;
    formatDuration: typeof formatDuration;
    calcStats: typeof calcStats;
    calcDeviation: typeof calcDeviation;
    calcCorrelation: typeof calcCorrelation;
    benchmarkRaw: typeof benchmarkRaw;
};
//# sourceMappingURL=index.d.ts.map