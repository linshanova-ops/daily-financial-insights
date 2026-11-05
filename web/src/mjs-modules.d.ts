declare module "*.mjs" {
  export function dropRestatedScale(text: string): string;
  export function otherHasSameAmount(n: string, other: string): boolean;
  export function stripInternalShorthand(text: string): string;
  export function readerLine(text: string): string;
}
