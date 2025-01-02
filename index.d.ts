declare function getTime(): any;
declare function logMem(): void;
declare function formatD(duration: bigint): string;
declare function calcDeviation(list: bigint[]): number;
declare function calcCorrelation(x: any, y: any): number;
declare function calcStats(list: bigint[]): {
    rme: number;
    min: bigint;
    max: bigint;
    mean: bigint;
    median: bigint;
    formatted: string;
};
declare const utils: {
    getTime: typeof getTime;
    logMem: typeof logMem;
    formatD: typeof formatD;
    calcStats: typeof calcStats;
    calcDeviation: typeof calcDeviation;
    calcCorrelation: typeof calcCorrelation;
};
export default function mark(label: any, samples: any, callback: any): Promise<void>;
declare function compare(title: string, samples: number, cases: any): Promise<void>;
export { mark, compare, utils };
//# sourceMappingURL=index.d.ts.map