export type BenchmarkRow = {
  name: string;
  iterations: number;
  run: () => void;
};

export type BenchmarkModule = {
  component: string;
  iterations?: number;
  parse: (input: unknown) => unknown;
  verify?: (input: unknown) => void;
};

export function createContractParseRow(module: BenchmarkModule, fixture: unknown): BenchmarkRow {
  return {
    name: `contract.parse.${module.component}`,
    iterations: module.iterations ?? 20_000,
    run: () => {
      module.parse(fixture);
      module.verify?.(fixture);
    },
  };
}
