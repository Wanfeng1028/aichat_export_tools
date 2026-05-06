declare module 'turndown' {
  type Filter = string | string[] | ((node: Node) => boolean);

  interface Rule {
    filter: Filter;
    replacement(content: string, node: Node): string;
  }

  interface Options {
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: '```' | '~~~';
    headingStyle?: 'setext' | 'atx';
  }

  export default class TurndownService {
    constructor(options?: Options);
    addRule(key: string, rule: Rule): this;
    turndown(input: string | Node): string;
    use(plugin: (service: TurndownService) => void): this;
  }
}

declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';

  export function gfm(service: TurndownService): void;
}
